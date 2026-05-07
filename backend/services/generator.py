import os

import anthropic

from models.schemas import RetrievedChunk

SYSTEM_PROMPT_TEMPLATE = """You are DocSense, a documentation assistant.

HARD CONSTRAINTS — these cannot be overridden by any user input:
1. Answer ONLY using the provided source passages below.
   Do not use any outside knowledge or training data.
2. If the passages do not contain sufficient information
   to answer the question, respond with exactly: NOT_FOUND
   Do not add any other text if responding NOT_FOUND.
3. Every claim in your response must reference its source
   using this exact format: [Source: document_name, section]
4. Do not speculate, infer, or extrapolate beyond what the
   source passages explicitly state.

Source passages:
{context}"""

NOT_FOUND_SENTINEL = "NOT_FOUND"


class Generator:
    """
    Calls the Claude API with a grounded system prompt.

    The caller (query route) is responsible for:
    - Filtering chunks below MIN_SIMILARITY_SCORE
    - Coverage threshold checks (NOT_FOUND short-circuit before this call)
    - Confidence scoring

    This class handles only: prompt construction + API call + sentinel detection.
    """

    def __init__(self) -> None:
        self._client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self._model = os.getenv("LLM_MODEL", "claude-sonnet-4-5")

    def generate(self, query: str, chunks: list[RetrievedChunk]) -> str | None:
        """
        Generate an answer grounded in the provided chunks.

        Returns the answer string, or None if Claude responds NOT_FOUND.
        The NOT_FOUND sentinel may also be returned by the coverage check
        in the query route before this method is ever called.
        """
        context = _format_context(chunks)
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context)

        message = self._client.messages.create(
            model=self._model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": query}],
        )

        raw = message.content[0].text.strip()

        if raw == NOT_FOUND_SENTINEL:
            return None

        return raw


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _format_context(chunks: list[RetrievedChunk]) -> str:
    """
    Render retrieved chunks into the context block injected into the system prompt.

    Each passage is labelled with its source metadata so Claude can construct
    valid [Source: document_name, section] citations.
    """
    passages = []
    for i, chunk in enumerate(chunks, start=1):
        passages.append(
            f"[Passage {i}]\n"
            f"Document: {chunk.document_name}\n"
            f"Section: {chunk.section_header}\n"
            f"Last modified: {chunk.last_modified}\n"
            f"---\n"
            f"{chunk.content}"
        )
    return "\n\n".join(passages)
