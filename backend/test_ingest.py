import base64
import json
import urllib.request
from pathlib import Path

TEST_DOCS = Path(__file__).parent.parent / "test_docs"
URL = "http://127.0.0.1:8000/ingest"

FILES = [
    TEST_DOCS / "sample_api_spec.md",
    TEST_DOCS / "sample_runbook.md",
]


def ingest(path: Path) -> None:
    content_b64 = base64.b64encode(path.read_bytes()).decode()
    payload = json.dumps({"filename": path.name, "content_base64": content_b64}).encode()
    req = urllib.request.Request(
        URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            print(f"  OK  {path.name} → {data['chunks_indexed']} chunks")
    except urllib.error.HTTPError as e:
        data = json.loads(e.read())
        print(f"  ERR {path.name} → HTTP {e.code}: {json.dumps(data, indent=2)}")


if __name__ == "__main__":
    print(f"Ingesting {len(FILES)} documents...\n")
    for f in FILES:
        ingest(f)
    print("\nDone.")
