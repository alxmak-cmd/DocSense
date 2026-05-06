"""
DocSense Evaluation Runner — Phase 1

Runs all queries in eval_queries.json against the live backend,
grades automated fields, and writes a structured JSON results file.

Usage:
    python eval_runner.py [--base-url http://localhost:8000]

Output:
    eval_results/results_<timestamp>.json

Manual grade fields (correctness, citation_valid, hallucination_detected)
are initialised to null and must be filled in by a human reviewer.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

EVAL_DIR = Path(__file__).parent
RESULTS_DIR = EVAL_DIR / "eval_results"
QUERIES_FILE = EVAL_DIR / "eval_queries.json"

SESSION_ID = str(uuid.uuid4())


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def post_json(url: str, payload: dict) -> tuple[dict | None, int, str | None]:
    """
    POST JSON payload. Returns (response_dict, latency_ms, error_str).
    error_str is None on success, set on any failure.
    Never raises.
    """
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            latency_ms = int((time.monotonic() - t0) * 1000)
            return json.loads(resp.read()), latency_ms, None
    except urllib.error.HTTPError as e:
        latency_ms = int((time.monotonic() - t0) * 1000)
        try:
            body = json.loads(e.read())
            msg = body.get("detail") or body.get("error") or str(body)
        except Exception:
            msg = str(e)
        return None, latency_ms, f"HTTP {e.code}: {msg}"
    except Exception as e:
        latency_ms = int((time.monotonic() - t0) * 1000)
        return None, latency_ms, str(e)


# ---------------------------------------------------------------------------
# Grading helpers
# ---------------------------------------------------------------------------

def grade_source_match(expected: list[str], actual_citations: list[dict]) -> bool:
    """
    Partial match: True if at least one expected source appears in
    actual citation document names. Empty expected_sources always matches.
    """
    if not expected:
        return True
    actual_names = {c.get("document_name", "") for c in actual_citations}
    return any(src in actual_names for src in expected)


def compute_p95(values: list[float]) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = int(len(sorted_vals) * 0.95)
    return sorted_vals[min(idx, len(sorted_vals) - 1)]


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def run_eval(base_url: str) -> None:
    RESULTS_DIR.mkdir(exist_ok=True)

    with open(QUERIES_FILE) as f:
        eval_set = json.load(f)

    queries = eval_set["queries"]
    print(f"DocSense Eval Runner — {len(queries)} queries | session {SESSION_ID}\n")

    results = []

    RATE_LIMIT_DELAY = 25  # seconds — Voyage AI free tier cap is 3 RPM

    for i, q in enumerate(queries):
        if i > 0:
            print(f"  (waiting {RATE_LIMIT_DELAY}s — Voyage free tier rate limit)", flush=True)
            time.sleep(RATE_LIMIT_DELAY)
        print(f"  [{q['id']}] {q['query'][:60]}...", end=" ", flush=True)

        response, latency_ms, err = post_json(
            f"{base_url}/query",
            {"query": q["query"], "session_id": SESSION_ID},
        )

        if err:
            print(f"FAIL | error | {latency_ms}ms | {err}")
            results.append({
                "query_id": q["id"],
                "category": q["category"],
                "query": q["query"],
                "expected_response_type": q["expected_response_type"],
                "actual_response_type": "error",
                "response_type_match": False,
                "expected_sources": q["expected_sources"],
                "actual_sources": [],
                "source_match": False,
                "answer_text": None,
                "confidence": "none",
                "latency_ms": latency_ms,
                "error": err,
                "manual_grade": {
                    "correctness": None,
                    "citation_valid": None,
                    "hallucination_detected": None,
                    "notes": None,
                },
            })
            continue

        actual_type = response.get("response_type", "error")
        actual_citations = response.get("citations", [])
        actual_sources = [c.get("document_name") for c in actual_citations]

        response_type_match = actual_type == q["expected_response_type"]
        source_match = grade_source_match(q["expected_sources"], actual_citations)

        result = {
            "query_id": q["id"],
            "category": q["category"],
            "query": q["query"],
            "expected_response_type": q["expected_response_type"],
            "actual_response_type": actual_type,
            "response_type_match": response_type_match,
            "expected_sources": q["expected_sources"],
            "actual_sources": actual_sources,
            "source_match": source_match,
            "answer_text": response.get("answer"),
            "confidence": response.get("confidence", "none"),
            "latency_ms": latency_ms,
            "manual_grade": {
                "correctness": None,
                "citation_valid": None,
                "hallucination_detected": None,
                "notes": None,
            },
        }

        results.append(result)

        status = "PASS" if response_type_match else "FAIL"
        print(f"{status} | {actual_type} | {latency_ms}ms")

    # Summary stats
    latencies = [r["latency_ms"] for r in results]
    type_matches = [r["response_type_match"] for r in results]
    source_matches = [r["source_match"] for r in results]

    summary = {
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "session_id": SESSION_ID,
        "total_queries": len(results),
        "response_type_accuracy": round(sum(type_matches) / len(type_matches), 4),
        "source_match_rate": round(sum(source_matches) / len(source_matches), 4),
        "avg_latency_ms": round(sum(latencies) / len(latencies), 1),
        "p95_latency_ms": round(compute_p95(latencies), 1),
        "pending_manual_grades": len(results),
        "results": results,
    }

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    out_path = RESULTS_DIR / f"results_{ts}.json"
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2)

    # Print summary
    print(f"\n{'='*50}")
    print(f"Response type accuracy : {summary['response_type_accuracy']:.0%}")
    print(f"Source match rate      : {summary['source_match_rate']:.0%}")
    print(f"Avg latency            : {summary['avg_latency_ms']} ms")
    print(f"P95 latency            : {summary['p95_latency_ms']} ms")
    print(f"Pending manual grades  : {summary['pending_manual_grades']}")
    print(f"Results written to     : {out_path}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DocSense eval runner")
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8000",
        help="Backend base URL (default: http://localhost:8000)",
    )
    args = parser.parse_args()
    run_eval(args.base_url)
