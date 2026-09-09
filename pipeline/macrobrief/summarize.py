"""LLM summarisation with hard grounding rules.

Rules baked into every prompt:
  1. Only quote numbers that appear verbatim in the supplied text. Never infer or compute.
  2. If consensus is not in the text, say "consensus not stated" (the calendar connector supplies it separately).
  3. Return strict JSON. No prose outside JSON.
  4. Max one sentence per field.

Cost: Haiku-class models at ~2k input tokens/doc × ~60 docs/day ≈ $0.15–0.40/day. A daily budget guard
stops calls once exceeded; the brief then falls back to titles + first paragraph.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional

from .config import env, load

_spent_today = 0.0


def _budget_ok() -> bool:
    return _spent_today < float(load().get("llm", {}).get("daily_budget_usd", 1.0))


def _record(usage_in: int, usage_out: int) -> None:
    global _spent_today
    # Haiku-class pricing approximation ($0.80/M in, $4/M out)
    _spent_today += usage_in * 0.8e-6 + usage_out * 4e-6


def spent_today() -> float:
    return round(_spent_today, 4)


SYSTEM = (
    "You are a sell-side economist's assistant writing one-line summaries for a hedge-fund macro analyst. "
    "Ground rules: quote only figures present verbatim in the text; never infer or calculate numbers; "
    "if a field is not supported by the text, write 'not stated'; British English; return strict JSON only."
)


def _call(prompt: str, max_tokens: int = 300) -> Optional[str]:
    if not _budget_ok():
        return None
    model = env("LLM_MODEL", load().get("llm", {}).get("model", "claude-3-5-haiku-latest"))
    if env("ANTHROPIC_API_KEY"):
        import anthropic  # optional dependency
        client = anthropic.Anthropic()
        msg = client.messages.create(model=model, max_tokens=max_tokens, system=SYSTEM,
                                     messages=[{"role": "user", "content": prompt}])
        _record(msg.usage.input_tokens, msg.usage.output_tokens)
        return "".join(getattr(b, "text", "") for b in msg.content)
    if env("OPENAI_API_KEY"):
        from openai import OpenAI  # optional dependency
        client = OpenAI()
        model = model if model.startswith("gpt") else "gpt-4o-mini"
        r = client.chat.completions.create(model=model, max_tokens=max_tokens, temperature=0,
                                           messages=[{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
                                           response_format={"type": "json_object"})
        _record(r.usage.prompt_tokens, r.usage.completion_tokens)
        return r.choices[0].message.content
    return None  # no LLM configured → callers fall back to extractive text


def _json(s: Optional[str]) -> Dict[str, Any]:
    if not s:
        return {}
    m = re.search(r"\{.*\}", s, re.S)
    try:
        return json.loads(m.group(0) if m else s)
    except Exception:
        return {}


def summarize_release(title: str, text: str, consensus_hint: Optional[str]) -> Dict[str, str]:
    prompt = (
        f"Release: {title}\nConsensus (from calendar, may be empty): {consensus_hint or ''}\n\n"
        f"TEXT:\n{text[:9000]}\n\n"
        'Return JSON {"outcome": "<one line: the headline figures with units>", '
        '"consensus": "<one line: consensus and whether the print beat/missed/was in line>", '
        '"surprise": "beat|miss|inline|na"}'
    )
    j = _json(_call(prompt))
    if not j:
        first = re.split(r"(?<=[.!?])\s", text.strip())[:2]
        return {"outcome": " ".join(first)[:280], "consensus": f"Consensus {consensus_hint}" if consensus_hint else "Consensus not stated",
                "surprise": "na"}
    return {"outcome": j.get("outcome", ""), "consensus": j.get("consensus", ""), "surprise": j.get("surprise", "na")}


def summarize_document(institution: str, title: str, text: str) -> Dict[str, Any]:
    prompt = (
        f"Institution: {institution}\nDocument: {title}\n\nTEXT:\n{text[:9000]}\n\n"
        'Return JSON {"summary": "<max 2 sentences: what it says and why a rates/FX investor cares>", '
        '"tags": ["<3-5 lower-case topic tags>"]}'
    )
    j = _json(_call(prompt))
    if not j:
        return {"summary": text[:280], "tags": []}
    return {"summary": j.get("summary", ""), "tags": j.get("tags", [])[:5]}


def one_liner(bundle_text: str) -> str:
    j = _json(_call(f"Facts:\n{bundle_text[:6000]}\n\nReturn JSON {{\"line\": \"<one 35-word 'overnight in one line' for the top of a morning email>\"}}", 120))
    return j.get("line", "")
