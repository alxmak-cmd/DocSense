# PRFAQ: DocSense — AI-Powered Documentation Agent
**Classification:** Portfolio Artifact | Principal PM IC Candidate  
**Format:** Amazon-style PRFAQ  
**Version:** 3.0  
**Target Roles:** Principal PM IC — AI platform and backend spaces (Twilio Copilot Backend, IDC AI Discovery Platform)

---

## PRESS RELEASE

### AI Tools Are Making Your Documentation Problem Worse. DocSense Fixes It.

*New RAG documentation agent puts trust — not speed — at the center of how engineering teams query internal knowledge.*

**[City, April 2026]** — AI assistants have made it faster than ever to get a confident answer from your internal documentation. They've also made it easier than ever to act on an answer that's wrong.

Every major AI documentation tool — Glean, Guru, Notion AI — optimizes for answer coverage. They synthesize across sources, smooth over contradictions, and return fluent responses regardless of whether the underlying documentation is accurate, current, or internally consistent. The result is a system that engineers learn to distrust, because they've been burned by it.

DocSense is built on a different premise: **the problem isn't retrieval speed. It's retrieval trust.**

DocSense doesn't synthesize. It exposes.

Every answer is grounded in a specific, citable passage from your indexed documentation corpus. Every response carries a confidence signal based on retrieval quality, not LLM fluency. When two documents contradict each other — different timeout values, conflicting retry policies, version-drifted parameter specs — DocSense surfaces the conflict instead of picking a winner. Engineers see both values, both sources, and can make an informed decision.

"Before DocSense, onboarding a new engineer meant two weeks of Slack pings to senior teammates," said one engineering manager in early testing. "Now they ask DocSense first — and when DocSense says it doesn't know, they trust that too."

DocSense is available today as a self-hosted web application. It supports Markdown, plain text, and PDF ingestion with GitHub and Confluence connectors planned for Phase 2.

---

## FREQUENTLY ASKED QUESTIONS

### Customer FAQs

**Q: Who is DocSense for?**  
A: Primary users are software engineers, platform engineers, and technical PMs at companies with 50+ engineers where documentation fragmentation is a real productivity bottleneck. Secondary users are developer-facing teams (DevRel, Solutions Engineering) who need fast, auditable access to product and API documentation.

**Q: How is DocSense different from Glean, Guru, or Notion AI?**

| Dimension | Glean / Guru / Notion AI | DocSense |
|---|---|---|
| Answer source | Synthesized across sources | Single grounded chunk, cited |
| Conflict handling | Hidden or averaged | Surfaced explicitly |
| Confidence signal | Response fluency | Retrieval similarity score |
| "I don't know" behavior | Rare — always tries to answer | First-class NOT_FOUND state |
| Trust model | Trust the answer | Trust the source |

**Q: How is this different from just asking ChatGPT or Claude?**  
A: Three critical differences: (1) **Grounding** — DocSense only answers from your indexed corpus, never from training data. (2) **Citations** — every answer links to the exact source chunk, enabling verification. (3) **Conflict detection** — DocSense identifies when two sources disagree, which general-purpose LLMs never do.

**Q: What does "conflict detection" mean in practice?**  
A: When two indexed documents contain contradictory values for the same concept — e.g., "retry attempts: 3" in the API spec vs. "retry attempts: 5" in the runbook — DocSense flags the discrepancy and returns both values with their sources rather than synthesizing a single answer. The conflict taxonomy covers three types: explicit contradiction (same field, different values), version drift (outdated doc referencing deprecated behavior), and parameter mismatch (config values inconsistent across services).

**Q: How accurate are the answers?**  
A: DocSense is designed for high-precision retrieval, not broad coverage. Phase 1 eval results: 70% response type accuracy across 10 structured test queries. "Not Found" Precision (% of NOT_FOUND responses where the corpus genuinely lacked coverage vs. retrieval miss) target is ≥90%.

**Q: What document types are supported?**  
A: Phase 1 supports Markdown, plain text (.txt), and PDF. GitHub connector and Confluence space export are Phase 2 roadmap items.

---

### Business FAQs

**Q: What is the core product bet?**  
A: That engineering teams will accept lower answer coverage in exchange for higher answer trustworthiness — and that "I don't know" is a more valuable response than a confident wrong answer. This is a direct counter-positioning to every incumbent tool.

**Q: Why will this win against incumbents?**

| Incumbent weakness | DocSense response |
|---|---|
| Glean optimizes for recall over precision | DocSense optimizes for trust over coverage |
| Guru requires manual curation to stay accurate | DocSense surfaces staleness automatically via conflict detection |
| Notion AI has no grounding — hallucinates from training data | DocSense is 100% grounded in indexed corpus |
| All incumbents hide "I don't know" | DocSense makes NOT_FOUND a first-class, trusted response |

**Q: What does the flywheel look like?**  
A: Queries → reveal documentation gaps → prompt doc improvement → better retrieval → more usage → more queries. Conflict detection accelerates the flywheel: surfaced conflicts create direct incentive for doc owners to resolve inconsistencies, improving corpus quality over time.

**Q: What are the key failure modes?**

| Failure mode | Mitigation |
|---|---|
| Over-trust in system | Confidence badges + NOT_FOUND state make uncertainty visible |
| Stale corpus | Incremental re-indexing on doc change (Phase 2) |
| Retrieval miss on valid query | Similarity threshold tuning + coverage scoring |
| Conflict false positive | Explicit conflict taxonomy with threshold controls |
| Hallucination | Strict grounding prompt — model instructed to cite only, never synthesize |

**Q: What is the expansion path?**  
A: Wedge (trust layer for static docs) → Gap Detection (identify undocumented areas) → Conflict Resolution Workflow (alert doc owners, track resolution) → Auto-Documentation suggestions (Phase 4, long-term).

---

## ARTIFACT METADATA

| Field | Value |
|---|---|
| Target Roles | Twilio Principal PM (Copilot Backend), IDC Principal PM-T (AI Discovery Platform) |
| Portfolio Signal | RAG pipeline design, trust-layer architecture, eval rigor, developer tooling intuition |
| Build Method | BMAD Method v6.3 + Claude Code |
| Stack | React / Vite / FastAPI / Voyage AI / Qdrant / Claude API |
| Version | 3.0 — final for Phase 1 |
