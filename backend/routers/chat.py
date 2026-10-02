from fastapi import APIRouter, Path, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uuid
import json
from typing import Optional
from services.llm import GeminiProvider, get_system_prompt
from .estates import get_estate_map 

router = APIRouter(
    prefix="/estates",
    tags=["chat"]
)

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

# Simple in-memory store replacing Redis
chat_history_store = {}

llm_provider = GeminiProvider()

@router.post("/{estate_id}/chat")
async def chat_endpoint(request: Request, chat_msg: ChatMessage, estate_id: uuid.UUID = Path(...)):
    # 1. Auth check: verify caller is member of estate.
    # Mocking this out as we don't have an auth middleware yet.
    # if not verify_estate_member(request.user.id, estate_id):
    #     raise HTTPException(status_code=403, detail="Not a member of this estate")
    
    # 2. Get/Create conversation history
    conv_id = chat_msg.conversation_id or str(uuid.uuid4())
    history_key = f"chat:{estate_id}:{conv_id}"
    
    # Fetch from memory instead of Redis
    history_str = chat_history_store.get(history_key)
    history = json.loads(history_str) if history_str else []
    
    history.append({"role": "user", "content": chat_msg.message})
    
    # 3. Get system prompt with estate summary
    try:
        estate_map = get_estate_map(estate_id)
    except Exception:
        estate_map = None
    system_prompt = get_system_prompt(estate_map)
    
    # 4. Generate SSE response
    async def sse_generator():
        # First send the conversation id so frontend knows it
        yield f"data: {json.dumps({'conversation_id': conv_id})}\n\n"
        
        full_reply = ""
        try:
            for chunk in llm_provider.generate(history, system_prompt, stream=True):
                full_reply += chunk
                yield f"data: {json.dumps({'token': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
        yield f"data: [DONE]\n\n"
        
        # Save history (keep last 10 turns = 20 messages)
        history.append({"role": "model", "content": full_reply})
        if len(history) > 20:
            history = history[-20:]
            
        # Save to memory instead of Redis
        chat_history_store[history_key] = json.dumps(history)
        
    return StreamingResponse(sse_generator(), media_type="text/event-stream")
