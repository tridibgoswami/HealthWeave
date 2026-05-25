"""
HealthWeave – LLM Client
Unified async client for Claude (primary) with OpenAI fallback.
All medical outputs include mandatory disclaimer injection.
"""

import time
import logging
from typing import AsyncGenerator, Optional
from dataclasses import dataclass, field

import anthropic
from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

MEDICAL_DISCLAIMER = (
    "\n\n---\n*Disclaimer: This information is for educational purposes only and does not "
    "constitute medical advice, diagnosis, or treatment. Always consult a qualified "
    "healthcare professional for medical decisions.*"
)

SYSTEM_PROMPT_BASE = """You are HealthWeave AI, an intelligent personal health memory assistant.

Your capabilities:
- Analyze and explain medical reports, lab results, and health trends
- Identify patterns across a patient's longitudinal health history
- Provide preventive health insights and risk indicators
- Summarize medical journeys clearly for patients and doctors

Strict rules you MUST follow:
1. NEVER diagnose diseases or provide definitive medical conclusions
2. NEVER prescribe medications or recommend specific treatments
3. ALWAYS frame findings as "risk indicators", "patterns", or "trends" — never as diagnosis
4. ALWAYS recommend consulting a qualified healthcare professional for any health concern
5. Use simple, clear language accessible to common people
6. When explaining numbers/lab values, always explain what "normal" means for context
7. Be empathetic, reassuring, and supportive in tone
8. Acknowledge limitations of AI-based health analysis

Patient context will be provided as structured data. Ground all analysis in the actual data.
"""


@dataclass
class LLMResponse:
    content: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0
    model: str = ""
    has_disclaimer: bool = False


class LLMClient:
    def __init__(self):
        self._anthropic = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    async def complete(
        self,
        prompt: str,
        system: str = SYSTEM_PROMPT_BASE,
        max_tokens: int = settings.MAX_TOKENS_REASONING,
        temperature: float = 0.3,
        inject_disclaimer: bool = True,
        context_messages: list | None = None,
    ) -> LLMResponse:
        t0 = time.monotonic()
        messages = context_messages or []
        messages = messages + [{"role": "user", "content": prompt}]

        try:
            response = await self._anthropic.messages.create(
                model=settings.PRIMARY_LLM,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=messages,
            )
            content = response.content[0].text
            if inject_disclaimer:
                content += MEDICAL_DISCLAIMER

            return LLMResponse(
                content=content,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                latency_ms=int((time.monotonic() - t0) * 1000),
                model=settings.PRIMARY_LLM,
                has_disclaimer=inject_disclaimer,
            )
        except Exception as exc:
            logger.error("Primary LLM failed: %s — attempting fallback", exc)
            return await self._openai_fallback(prompt, system, max_tokens, temperature, inject_disclaimer, t0)

    async def _openai_fallback(self, prompt, system, max_tokens, temperature, inject_disclaimer, t0) -> LLMResponse:
        if not self._openai:
            raise RuntimeError("No LLM available — configure ANTHROPIC_API_KEY or OPENAI_API_KEY")
        response = await self._openai.chat.completions.create(
            model="gpt-4o",
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content or ""
        if inject_disclaimer:
            content += MEDICAL_DISCLAIMER
        return LLMResponse(
            content=content,
            input_tokens=response.usage.prompt_tokens if response.usage else 0,
            output_tokens=response.usage.completion_tokens if response.usage else 0,
            latency_ms=int((time.monotonic() - t0) * 1000),
            model="gpt-4o-fallback",
            has_disclaimer=inject_disclaimer,
        )

    async def stream(
        self,
        prompt: str,
        system: str = SYSTEM_PROMPT_BASE,
        max_tokens: int = settings.MAX_TOKENS_REASONING,
        context_messages: list | None = None,
    ) -> AsyncGenerator[str, None]:
        messages = (context_messages or []) + [{"role": "user", "content": prompt}]
        async with self._anthropic.messages.stream(
            model=settings.PRIMARY_LLM,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text
        yield MEDICAL_DISCLAIMER

    async def embed(self, text: str) -> list[float]:
        """Generate embedding vector for semantic search."""
        if not self._openai:
            raise RuntimeError("OPENAI_API_KEY required for embeddings")
        response = await self._openai.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text[:8000],
        )
        return response.data[0].embedding


_llm_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
