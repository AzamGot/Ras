"""
Claude AI Client - Wrapper around Anthropic SDK with retry logic and streaming support
"""
import time
import json
import asyncio
from typing import AsyncIterator, Any
import anthropic

from app.config import settings

MODEL = "claude-sonnet-4-6"
MAX_RETRIES = 3


def _get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _get_async_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def call_ai(
    system: str,
    messages: list[dict],
    max_tokens: int = 4096,
    temperature: float = 0.3,
) -> tuple[str, dict]:
    """
    Single-turn AI call with retry logic.
    Returns (response_text, usage_info)
    """
    client = _get_async_client()
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            response = await client.messages.create(
                model=MODEL,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=messages,
            )
            text = response.content[0].text
            usage = {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
            return text, usage
        except anthropic.RateLimitError:
            wait_time = 2 ** attempt
            await asyncio.sleep(wait_time)
            last_error = "rate_limit"
        except anthropic.APIError as e:
            if attempt == MAX_RETRIES - 1:
                raise
            await asyncio.sleep(2 ** attempt)
            last_error = str(e)

    raise RuntimeError(f"AI call failed after {MAX_RETRIES} retries: {last_error}")


async def call_ai_json(
    system: str,
    messages: list[dict],
    max_tokens: int = 4096,
) -> tuple[dict, dict]:
    """
    AI call expecting JSON output.
    Returns (parsed_dict, usage_info)
    """
    text, usage = await call_ai(system, messages, max_tokens)
    # Extract JSON from response (handle markdown code blocks)
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    parsed = json.loads(text)
    return parsed, usage


async def stream_ai(
    system: str,
    messages: list[dict],
    max_tokens: int = 4096,
) -> AsyncIterator[str]:
    """
    Streaming AI call. Yields text chunks as they arrive.
    """
    client = _get_async_client()
    async with client.messages.stream(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text
