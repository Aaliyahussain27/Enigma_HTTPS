import os
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel

from backend.database import get_db
from backend.models import User, EstateMember, Asset, ChatMessage
from backend.auth.dependencies import require_estate_access
from backend.classification.gemini import get_gemini_client

router = APIRouter(prefix="/estates", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

def format_estate_context(estate_id: UUID, db: Session) -> str:
    assets = db.query(Asset).filter(Asset.estate_id == estate_id).all()
    context = []
    for a in assets:
        context.append(f"- Category: {a.category}, Institution: {a.institution_name}, Value: {a.estimated_value}, Status: {a.status}, Action: {a.next_step_text}")
    return "\n".join(context) if context else "No assets found."

@router.get("/{estate_id}/chat")
def get_chat_history(estate_id: UUID, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    messages = db.query(ChatMessage).filter(ChatMessage.estate_id == estate_id).order_by(ChatMessage.created_at.asc()).all()
    return [{"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in messages]


@router.post("/{estate_id}/chat")
async def send_chat_message(estate_id: UUID, req: ChatRequest, db: Session = Depends(get_db), membership: EstateMember = Depends(require_estate_access)):
    # 1. Save user message to database
    user_msg = ChatMessage(estate_id=estate_id, role="user", content=req.message)
    db.add(user_msg)
    db.commit()

    # 2. Get history to feed to Gemini
    history = db.query(ChatMessage).filter(ChatMessage.estate_id == estate_id).order_by(ChatMessage.created_at.asc()).all()
    
    # 3. Format context
    context = format_estate_context(estate_id, db)
    
    # 4. Prepare system prompt and messages
    system_prompt = f"""You are an empathetic estate processing assistant for EstateClear.
Use the following estate context to answer questions:
{context}

Respond in plain text (or markdown if appropriate) and stream the output. Do not hallucinate facts outside the context. If you don't know, say so politely."""

    gemini_history = []
    for m in history:
        gemini_history.append({"role": "user" if m.role == "user" else "model", "parts": [m.content]})
    
    client = get_gemini_client()
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    
    async def event_stream():
        try:
            # We use synchronous generator for generate_content_stream in threading/asyncio wrapper
            # But the new google-genai supports asyncio/sync seamlessly if we just loop it.
            # Usually we need to use a thread pool or run_in_executor for sync client,
            # but let's try the stream wrapper provided by genai.
            response_stream = client.models.generate_content_stream(
                model=model_name,
                contents=gemini_history,
                config={"system_instruction": system_prompt, "temperature": 0.2}
            )
            
            full_response = ""
            for chunk in response_stream:
                if chunk.text:
                    full_response += chunk.text
                    # SSE format: data: {"chunk": "text"}
                    yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                    # Small sleep to yield to event loop if needed
                    await asyncio.sleep(0.01)

            # End of stream event
            yield "data: [DONE]\n\n"
            
            # Save assistant message to database synchronously
            with get_db() as db_session:
                asst_msg = ChatMessage(estate_id=estate_id, role="assistant", content=full_response)
                db_session.add(asst_msg)
                db_session.commit()
                
        except Exception as e:
            print(f"Chat stream error: {e}")
            yield f"data: {json.dumps({'error': 'An error occurred while generating the response.'})}\n\n"
            
    return StreamingResponse(event_stream(), media_type="text/event-stream")
