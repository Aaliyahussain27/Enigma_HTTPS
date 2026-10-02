import os
import json
import re
import time
from pydantic import BaseModel, Field
from backend.classification.gemini import get_gemini_client


def _parse_json_response(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("` ")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    value = json.loads(cleaned)
    if not isinstance(value, dict):
        raise ValueError("Gemini returned a non-object response")
    return value


def _generate_with_retries(client, model: str, prompt: str):
    for attempt in range(3):
        try:
            return client.models.generate_content(
                model=model,
                contents=[prompt],
                config={'response_mime_type': 'application/json', 'temperature': 0.0}
            )
        except Exception as error:
            message = str(error).lower()
            transient = any(marker in message for marker in ("503", "unavailable", "high demand", "rate limit", "429"))
            if not transient or attempt == 2:
                raise
            time.sleep(2 ** attempt)

class DocumentExplanation(BaseModel):
    what_it_is: str = Field(..., description="What this document is")
    what_we_found: list[str] = Field(..., description="Bullet points of what was found")
    what_is_missing: str = Field(..., description="What we do not know yet")
    next_steps: str = Field(..., description="What you may need to do")

def explain_document_with_gemini(extracted_json: str) -> DocumentExplanation:
    """
    Explains a previously processed document using its extracted JSON data.
    Does not require re-uploading the PDF.
    """
    client = get_gemini_client()
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    
    prompt = f"""
    You are an estate processing assistant. 
    Explain this extracted document data in simple, calm, human-readable language for a grieving family member.
    
    Data:
    {extracted_json}
    
    Return a structured explanation. Distinguish clearly between facts and uncertainty.
    """
    
    response = _generate_with_retries(client, model, prompt)

    payload = _parse_json_response(response.text)
    payload.setdefault("what_it_is", payload.get("document_type") or "Document analysis")
    payload.setdefault("what_we_found", payload.get("findings") or payload.get("facts") or [])
    payload.setdefault("what_is_missing", payload.get("missing") or "No additional missing information was identified.")
    payload.setdefault("next_steps", payload.get("next_step") or payload.get("recommendation") or "Review the identified actions and requirements.")
    if not isinstance(payload["what_we_found"], list):
        payload["what_we_found"] = [str(payload["what_we_found"])]
    return DocumentExplanation.model_validate(payload)

class EstateAnswer(BaseModel):
    answer: str = Field(..., description="The helpful, empathetic answer to the user's question based ONLY on the provided estate data.")
    
def answer_estate_question(question: str, estate_context: str) -> EstateAnswer:
    """
    Answers a question about the estate using the structured estate data context.
    """
    client = get_gemini_client()
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    
    prompt = f"""
    You are an estate processing assistant. 
    A user has asked a question about their estate. 
    Answer it politely and empathetically using ONLY the following verified estate data.
    If the answer is not in the data, politely say you don't have that information.
    
    Estate Data:
    {estate_context}
    
    Question: {question}
    """
    
    response = _generate_with_retries(client, model, prompt)
    try:
        return EstateAnswer.model_validate(_parse_json_response(response.text))
    except (json.JSONDecodeError, TypeError, ValueError):
        text = (response.text or '').strip()
        if not text:
            raise ValueError("Gemini returned an empty answer")
        return EstateAnswer(answer=text)
