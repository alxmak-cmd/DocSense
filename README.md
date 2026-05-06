# DocSense

> **"DocSense doesn't synthesize. It exposes."**

Most documentation tools are built to answer questions. DocSense is built to surface what your docs *can't* agree on.

When teams move fast, documentation drifts. API parameters get renamed. Versioned guides fall out of sync. Conflicting instructions accumulate across pages no one owns. Standard RAG systems summarize across all of it — confidently, invisibly wrong.

DocSense treats conflict as a first-class signal. Every query returns not just an answer, but a trust score and a conflict report: what sources disagree, why, and where the drift originated.

---

## The Problem

Documentation debt is invisible until it isn't. Teams discover conflicts at the worst moments — in support escalations, during onboarding, mid-incident. By then, the cost is already paid.

Existing tools (Glean, Guru, Notion AI) optimize for retrieval speed and answer fluency. None of them tell you when the sources they're drawing from contradict each other. That gap is the problem DocSense solves.

---

## How It Works

DocSense is a RAG (Retrieval-Augmented Generation) documentation agent with a trust layer built into the query pipeline.

```
User Query
    │
    ▼
Embedding + Retrieval (Chroma vector store)
    │
    ▼
Conflict Detection Engine
    ├── Explicit Contradiction  (sources directly disagree)
    ├── Version Drift           (same topic, different versions)
    └── Parameter Mismatch      (same parameter, different values)
    │
    ▼
Confidence-Weighted Response
    └── ConfidenceBadge UI: HIGH / MEDIUM / LOW / CONFLICT
```

Queries that hit conflicting sources return a structured conflict report alongside the answer — not instead of it. Users get the response they asked for *and* the signal they need to trust it.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Vector store | Chroma | Lightweight, local-first, fits RAG eval iteration cycles |
| Backend | Python / FastAPI | Native RAG ecosystem (LangChain, sentence-transformers) |
| Frontend | React / Vite / Vercel | Fast iteration, clean deployment path |
| LLM | Claude API | Strong instruction-following for conflict taxonomy prompts |
| Conflict detection | Pre-synthesis, not post | Surface conflict before generating an answer, not after |

The most consequential decision: conflict detection runs on retrieved chunks *before* the LLM synthesizes a response. Post-hoc conflict detection on generated text is unreliable. Pre-synthesis detection on source metadata is auditable.

---

## Conflict Detection Taxonomy

DocSense classifies conflicts into three explicit types rather than a generic "sources may disagree" hedge:

- **Explicit Contradiction** — Two sources make directly opposing claims about the same fact or behavior.
- **Version Drift** — The same topic is documented differently across versioned sources (e.g., v1 vs v2 API behavior).
- **Parameter Mismatch** — The same parameter name appears with different types, defaults, or constraints across sources.

Each type maps to a distinct resolution path, which surfaces in the UI and is logged for documentation owners.

---

## Evaluation Harness

DocSense ships with a structured evaluation harness — not just unit tests, but outcome-oriented query coverage:

- **10 structured test queries** across four categories: factual lookup, cross-doc synthesis, conflict trigger, edge case
- **Named environment variables** for retrieval threshold (`MIN_RETRIEVAL_SCORE`) and coverage threshold (`MIN_COVERAGE_SCORE`)
- **Two-tier evaluation**: retrieval quality (did we get the right chunks?) and response quality (did we use them correctly?)
- Abstraction interfaces (`EmbedderInterface`, `RetrieverInterface`) enable swap-testing across embedding models and retrievers without rewriting eval logic

The harness is designed to make model and retriever changes measurable, not just deployable.

---

## Repository Structure

```
docsense/
├── docs/
│   ├── PRFAQ_RAG_DocAgent_v3.md        # Problem framing, customer narrative, FAQs
│   ├── PRD_RAG_DocAgent_v2.md          # Requirements, success metrics, conflict detection spec
│   └── ARCHITECTURE_RAG_DocAgent_v2.md # Pipeline design, trust layer, latency budget
├── backend/                            # FastAPI app, RAG pipeline, conflict detection engine
├── frontend/                           # React/Vite app, ConfidenceBadge component
└── README.md
```

### Portfolio Artifacts

| Artifact | What It Covers |
|---|---|
| [PRFAQ](docs/PRFAQ_RAG_DocAgent_v3.md) | Contrarian problem framing, customer narrative, FAQ handling of trust objections |
| [PRD](docs/PRD_RAG_DocAgent_v2.md) | Success metrics, conflict detection mini-spec, flywheel mechanism, explicit non-goals |
| [Architecture](docs/ARCHITECTURE_RAG_DocAgent_v2.md) | End-to-end pipeline, trust layer design, latency budget with sensitivity analysis, failure modes |

---

## Build Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Vercel |
| Backend | Python, FastAPI |
| Vector Store | Chroma |
| Embeddings | sentence-transformers |
| LLM | Anthropic Claude API |
| Method | BMAD Method v6.3 |

---

## Status

| Phase | Status |
|---|---|
| Portfolio artifacts (PRFAQ, PRD, Architecture) | ✅ Complete |
| BMAD scaffold and eval harness design | ✅ Complete |
| Phase 1 build (backend + frontend + conflict detection stub) | 🔄 In progress |
| Eval harness execution | ⬜ Queued |
| Conflict detection full implementation | ⬜ Queued |

---

## Design Philosophy

DocSense is built on a single conviction: **trust is not a feature you add to a RAG system. It's a property you either design for from the start or don't have.**

The conflict detection layer, the confidence badge, the evaluation harness, the explicit taxonomy — none of these are afterthoughts. They're the architecture.

The goal isn't a smarter search. It's a documentation system that earns the right to be believed.
