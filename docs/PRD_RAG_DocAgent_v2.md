# PRD: DocSense — RAG Documentation Agent
**Classification:** Portfolio Artifact | Principal PM IC Candidate  
**Version:** 2.0  
**Target Roles:** Twilio Principal PM (Copilot Backend), IDC Principal PM-T (AI Discovery Platform)

---

## Problem Statement

Engineering teams at companies with 50+ engineers spend an estimated 20–30% of working time searching for information across fragmented internal documentation — Confluence, Notion, GitHub READMEs, Slack threads, PDF runbooks. The problem is not that documentation doesn't exist. The problem is that it can't be trusted.

AI tools like Glean and Notion AI have made this worse, not better. They synthesize fluent answers regardless of whether the underlying documentation is accurate or internally consistent. Engineers have learned to distrust confident AI answers because they've been burned by them.

DocSense is built on a different design premise: **trustworthy answers require traceable answers**. Every response is grounded in a specific, citable source chunk. Uncertainty is surfaced, not hidden. Contradictions are exposed, not resolved by averaging.

---

## Target Users

**Primary:** Software engineers and platform engineers at 50–500 person engineering orgs. They have the most acute documentation pain and the highest cost of acting on bad information.

**Secondary:** Technical PMs and DevRel engineers who need fast, auditable access to API and product documentation for customer-facing work.

**Non-target (Phase 1):** Non-technical users, customer support, sales. The UI and response format are optimized for engineers.

---

## Goals and Non-Goals

### Goals
- Enable engineers to query internal documentation and receive grounded, cited answers
- Surface documentation conflicts instead of hiding them
- Provide a NOT_FOUND state that engineers trust as much as a positive answer
- Produce a two-tier eval harness (automated + manual) that validates system behavior

### Non-Goals (Phase 1)
- Real-time document sync or webhook-triggered re-indexing
- Multi-turn conversational context across queries
- User authentication or access control
- Answer generation from training data (strict grounding only)
- Mobile-optimized UI

---

## Product Bets

**Bet 1: Trust over coverage.** Engineers will prefer a system that says "I don't know" accurately over a system that always returns an answer. We will build NOT_FOUND as a first-class, confidence-scored response.

**Bet 2: Conflict detection is a differentiator, not a feature.** Surfacing documentation conflicts creates direct value that no incumbent provides. We will invest in an explicit conflict taxonomy before building additional connectors.

**Bet 3: Evaluation rigor is a product requirement.** We will build a structured eval harness before considering the system "working." A demo that looks good is not the same as a system that behaves predictably.

---

## Success Metrics

### Primary
- **Citation accuracy:** ≥85% of answers cite the correct source chunk (manual eval)
- **NOT_FOUND precision:** ≥90% of NOT_FOUND responses reflect genuine corpus gaps (vs. retrieval miss)
- **Hallucination rate:** 0% answers containing claims not present in retrieved chunks

### Secondary
- **P95 query latency:** ≤3000ms end-to-end
- **Retrieval coverage:** ≥2 relevant chunks retrieved per answerable query
- **Conflict detection recall:** ≥80% of seeded conflicts surfaced in eval queries

### Guardrail Metrics
- **False NOT_FOUND rate:** ≤15% (answerable queries incorrectly returning NOT_FOUND)
- **Over-confidence rate:** ≤10% (low-quality retrievals returning High confidence badge)

---

## Flywheel Mechanism

Queries → reveal documentation gaps → incentivize doc improvement → better retrieval → more usage → more queries.

Conflict detection accelerates this flywheel: surfaced conflicts create direct accountability for doc owners. A system that shows "these two docs disagree on retry count" creates more improvement incentive than a system that silently picks one value.

---

## Conflict Detection Mini-Spec

### Taxonomy

| Type | Definition | Example |
|---|---|---|
| Explicit contradiction | Same field, different values in same doc version | Timeout: 30s (API spec) vs. 60s (runbook) |
| Version drift | Doc references deprecated behavior from previous version | Auth method: API key (v1 doc) vs. OAuth (current) |
| Parameter mismatch | Config values inconsistent across services | Max retries: 3 (payments service) vs. 5 (notifications service) |

### Detection Logic (Phase 1)
- Retrieve top-K chunks for query
- Compare field values across chunks using LLM comparison prompt
- Flag conflict if same semantic field resolves to different values across sources
- Return both values with source attribution, do not synthesize

### UI Treatment
- Conflict indicator in CitationList alongside similarity bars
- Both source values displayed side by side
- "Verify before acting" label on conflicting responses

---

## Evaluation Harness

### Two-Tier Structure

**Tier 1 — Automated (runs on every eval):**
- Response type match (answered / not_found / error)
- Source document match (correct doc cited)
- Latency measurement

**Tier 2 — Manual (human graded):**
- Correctness (Y/N) — does the answer accurately reflect the source?
- Citation validity (Y/N) — does the cited chunk support the answer?
- Hallucination (Y/N) — does the answer contain any claim not in the retrieved chunks?

### Query Categories (10 total)
- Answerable — clear match in corpus (3 queries)
- Not answerable — genuine corpus gap (2 queries)
- Ambiguous — partial match, low confidence expected (2 queries)
- Conflicting sources — deliberate contradiction seeded in test docs (2 queries)
- Edge — malformed or out-of-domain input (1 query)

### Thresholds (from .env)
- `MIN_SIMILARITY_SCORE=0.35`
- `MIN_CHUNKS_FOR_ANSWER=2`
- `MIN_COVERAGE_SCORE=0.40`
- `HIGH_CONFIDENCE_THRESHOLD=0.70`
- `MED_CONFIDENCE_THRESHOLD=0.50`

---

## Phase 2 Roadmap

**P2.1 — Persistent vector store:** Switch Qdrant from in-memory to persistent local or hosted (Qdrant Cloud). One-line code change, enables production use.

**P2.2 — GitHub connector:** Ingest from GitHub repos (README, docs/ directories) on schedule or webhook trigger. Adds incremental re-indexing on doc change.

**P2.3 — Confluence connector:** Ingest from Confluence spaces via API. Priority for enterprise orgs.

**P2.4 — Conflict detection UI:** Visual conflict indicator in CitationList. Flag specific fields in conflict, show both source values side by side.

**P2.5 — Multi-turn context:** Maintain query session context for follow-up questions. Requires session state management in backend.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Voyage AI rate limits on free tier | High | Medium | 25s delay in eval runner; upgrade to paid tier for production |
| Qdrant in-memory resets on restart | High (Phase 1) | Low | Documented; P2.1 resolves |
| LLM grounding prompt drift | Medium | High | Prompt pinned in generator.py; eval harness catches regression |
| Corpus quality degrades over time | Medium | High | Conflict detection surfaces staleness; re-indexing in P2.2 |

---

## Artifact Metadata

| Field | Value |
|---|---|
| Target Roles | Twilio Principal PM (Copilot Backend), IDC Principal PM-T (AI Discovery Platform) |
| Portfolio Signal | Evaluation rigor, failure mode thinking, strategic restraint, conflict detection design |
| Build Method | BMAD Method v6.3 + Claude Code |
| Stack | React / Vite / FastAPI / Voyage AI / Qdrant / Claude API |
| Version | 2.0 — final for Phase 1 |
