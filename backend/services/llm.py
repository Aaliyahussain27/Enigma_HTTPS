import google.generativeai as genai
import os

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "dummy_key"))

class LLMProvider:
    def generate(self, messages, system_prompt, stream=True):
        raise NotImplementedError

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def generate(self, messages, system_prompt, stream=True):

        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [msg["content"]]})
        
        # Add system prompt as a model instruction if supported, or prepend it
        model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_prompt)
        
        response = model.generate_content(contents, stream=stream)
        for chunk in response:
            if chunk.text:
                yield chunk.text

def get_system_prompt(estate_summary: dict = None) -> str:
    base_instructions = """You are EstateClear's AI Chat Assistant. Your purpose is to help users navigate the app, understand what documents they need, and check status on their own estate's claims.
Your tone must be calm, grief-aware, and avoid legal/financial jargon.
There are two main pathways in the app:
1. AssetGuide: Helps discover assets.
2. AssetMap: Helps organize and close known assets.

If asked something outside EstateClear's scope (like general legal/financial advice unrelated to the app), you must state honestly that you cannot provide professional advice and suggest contacting a lawyer or CA.
"""
    
    # Normally we would fetch the required documents config from the DB or a shared config.
    # For now, we use a basic representation.
    req_docs = "Required Documents: Policy Document, Death Certificate, ID Proof, Claim Form for Insurance; Will, Death Certificate for Bank Accounts."
    
    prompt = base_instructions + "\n\n" + req_docs
    
    if estate_summary:
        prompt += "\n\nCaller's Estate Status Summary (DO NOT share sensitive details, only category and status):\n"
        for asset in estate_summary.get("assets", []):
            cat = asset.get("category", "Unknown")
            status = asset.get("status", "Unknown")
            prompt += f"- {cat}: {status}\n"
            
    return prompt
