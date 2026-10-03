import json
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

from backend.classification.schemas import DocumentAnalysis


def _load_environment():
    base_dir = Path(__file__).resolve().parents[1]
    load_dotenv(base_dir / ".env", override=False)
    load_dotenv(base_dir / "venv" / ".env", override=False)


_load_environment()

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def _normalize_document_payload(raw: object) -> dict:
    if isinstance(raw, str):
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("` ")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            text = match.group(0)
        raw = json.loads(text)

    if isinstance(raw, list):
        if not raw:
            raise ValueError("Gemini returned an empty list")
        raw = raw[0]

    if not isinstance(raw, dict):
        raise ValueError("Gemini returned a non-object payload")

    payload = dict(raw)

    for wrapper_key in ("document_analysis", "analysis", "result", "data", "document_metadata", "metadata"):
        nested = payload.get(wrapper_key)
        if isinstance(nested, dict):
            payload = {**nested, **{k: v for k, v in payload.items() if k != wrapper_key}}
            break

    if isinstance(payload.get("document"), dict):
        payload = {**payload["document"], **{k: v for k, v in payload.items() if k != "document"}}

    if "document_type" not in payload and isinstance(payload.get("type"), str):
        payload["document_type"] = payload["type"]

    if "category" not in payload and isinstance(payload.get("classification"), str):
        payload["category"] = payload["classification"]

    payload.setdefault("document_type", "unknown")
    payload.setdefault("category", "other")
    payload.setdefault("institution_name", None)
    payload.setdefault("account_holder", None)
    payload.setdefault("deceased_person", None)
    payload.setdefault("account_number", None)
    payload.setdefault("policy_number", None)
    payload.setdefault("loan_number", None)
    payload.setdefault("card_number", None)
    payload.setdefault("reference_number", None)
    payload.setdefault("subcategory", None)
    payload.setdefault("amounts", {})
    payload.setdefault("statement_period", None)
    payload.setdefault("dates", {})
    payload.setdefault("nominee_information", None)
    payload.setdefault("beneficiary_information", None)
    payload.setdefault("actions", [])
    payload.setdefault("required_documents", [])
    payload.setdefault("summary", "No summary available.")
    payload.setdefault("warnings", [])
    payload.setdefault("confidence", 0.0)

    return payload


def process_document_with_gemini(file_path: str, mime_type: str) -> DocumentAnalysis:
    """
    Process a document (PDF/Image) through Gemini and validate a flat JSON structure.
    """
    client = get_gemini_client()

    uploaded_file = client.files.upload(file=file_path, config={'mime_type': mime_type})

    try:
        model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

        prompt = """
        You are an expert financial and legal document analyzer for EstateClear.
        Analyze the uploaded document and return ONLY valid JSON.

        REQUIRED JSON KEYS (flat object, no wrapper like document_metadata or document):
        - document_type: one of bank_statement, loan_statement, insurance_policy, death_certificate, identity_document, other
        - institution_name: string or null
        - account_holder: string or null
        - deceased_person: string or null
        - account_number: string or null
        - policy_number: string or null
        - loan_number: string or null
        - card_number: string or null
        - reference_number: string or null
        - category: one of asset, liability, identity, tax, other
        - subcategory: string or null
        - amounts: object with any explicit values found; use null for missing values
        - statement_period: object {start_date, end_date} or null
        - dates: object mapping date label to string, or {}
        - nominee_information: string or null
        - beneficiary_information: string or null
        - actions: array of objects with title, description, priority, required_documents
        - required_documents: array of strings
        - summary: concise human-readable summary
        - warnings: array of strings
        - confidence: number between 0.0 and 1.0

        RULES:
        1. Do not invent facts. Use null when a fact is not explicitly present.
        2. Keep the JSON flat: no outer document_metadata wrapper.
        3. Return valid JSON only. No markdown fences. No extra text.
        4. If uncertain, use null or empty arrays instead of guessing.
        5. Keep `amounts` as an object, not a string or list.
        """

        response = None
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[uploaded_file, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )
                break
            except Exception as error:
                message = str(error).lower()
                transient = any(marker in message for marker in ("503", "unavailable", "high demand", "rate limit", "429"))
                if not transient or attempt == 2:
                    raise
                time.sleep(2 ** attempt)

        if response is None or not response.text:
            raise Exception("Gemini returned an empty response.")

        normalized = _normalize_document_payload(response.text)
        return DocumentAnalysis.model_validate(normalized)

    finally:
        client.files.delete(name=uploaded_file.name)

