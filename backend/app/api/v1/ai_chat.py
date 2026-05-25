"""
HealthWeave – AI Health Memory Chat API
Conversational interface powered by RAG over patient's medical history.
"""

import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.intelligence import ChatMessage, ChatSession
from app.services.ai.rag_service import RAGService

router = APIRouter(prefix="/chat", tags=["AI Health Chat"])


class NewSessionRequest(BaseModel):
    title: str | None = None
    session_type: str = "general"


class MessageRequest(BaseModel):
    message: str
    stream: bool = False


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: NewSessionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(
        user_id=uuid.UUID(user_id),
        title=payload.title or "New Conversation",
        session_type=payload.session_type,
    )
    db.add(session)
    await db.commit()
    return {"session_id": str(session.id), "title": session.title}


@router.get("/sessions")
async def list_sessions(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == uuid.UUID(user_id), ChatSession.is_active == True)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "session_type": s.session_type,
            "message_count": s.message_count,
            "updated_at": str(s.updated_at),
        }
        for s in sessions
    ]


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    payload: MessageRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Verify session ownership
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == uuid.UUID(session_id),
            ChatSession.user_id == uuid.UUID(user_id),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Load conversation history (last 10 messages for context)
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == uuid.UUID(session_id))
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
    )
    history_messages = list(reversed(history_result.scalars().all()))
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_messages
    ]

    # Save user message
    user_msg = ChatMessage(
        session_id=uuid.UUID(session_id),
        role="user",
        content=payload.message,
    )
    db.add(user_msg)
    await db.flush()

    if payload.stream:
        return StreamingResponse(
            _stream_response(
                user_id=user_id,
                session_id=session_id,
                query=payload.message,
                conversation_history=conversation_history,
                db=db,
            ),
            media_type="text/event-stream",
        )

    # Non-streaming response
    rag = RAGService(db)
    answer, sources = await rag.answer_with_memory(
        user_id=uuid.UUID(user_id),
        query=payload.message,
        conversation_history=conversation_history,
    )

    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=uuid.UUID(session_id),
        role="assistant",
        content=answer,
        sources=sources,
        has_medical_disclaimer=True,
    )
    db.add(assistant_msg)

    # Update session
    await db.execute(
        update(ChatSession)
        .where(ChatSession.id == uuid.UUID(session_id))
        .values(message_count=ChatSession.message_count + 2)
    )

    await db.commit()

    return {
        "message_id": str(assistant_msg.id),
        "content": answer,
        "sources": sources,
        "has_medical_disclaimer": True,
    }


async def _stream_response(
    user_id: str,
    session_id: str,
    query: str,
    conversation_history: list,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    from app.services.ai.llm_client import get_llm_client
    from app.services.ai.rag_service import RAGService

    rag = RAGService(db)
    context_prompt = await rag.build_context_prompt(uuid.UUID(user_id), query)

    llm = get_llm_client()
    full_response = ""

    async for chunk in llm.stream(
        prompt=context_prompt,
        context_messages=conversation_history,
    ):
        full_response += chunk
        yield f"data: {chunk}\n\n"

    # Save complete response
    assistant_msg = ChatMessage(
        session_id=uuid.UUID(session_id),
        role="assistant",
        content=full_response,
        has_medical_disclaimer=True,
    )
    db.add(assistant_msg)
    await db.commit()

    yield "data: [DONE]\n\n"


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == uuid.UUID(session_id),
            ChatSession.user_id == uuid.UUID(user_id),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    msgs = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == uuid.UUID(session_id))
        .order_by(ChatMessage.created_at.asc())
    )
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "sources": m.sources,
            "created_at": str(m.created_at),
        }
        for m in msgs.scalars().all()
    ]
