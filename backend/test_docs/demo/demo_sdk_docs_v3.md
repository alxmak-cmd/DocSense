# Python SDK Documentation — v3.0 Migration Guide

## What Changed in v3.0

### Breaking Changes
The `PaymentsClient` initialization signature has changed:

```python
from payments_sdk import PaymentsClient

# v3.0 — new required parameter: region
client = PaymentsClient(
    api_key="your_api_key",
    region="us-east-1",
    timeout=60,        # default increased from 30 to 60
    max_retries=5      # default increased from 3 to 5
)
```

### Retry Behavior
Retry logic has been overhauled. Transient errors are now retried up to **5 times**
with exponential backoff starting at **2 seconds** (previously 1 second).

### New Payment Methods
v3.0 adds support for:
- Cryptocurrency (BTC, ETH)
- Buy Now Pay Later (BNPL)
- Credit card
- ACH bank transfer
- Wire transfer

### Removed Methods
`client.payments.create()` is deprecated. Use `client.payments.charge()` instead.
The old method will be removed in v3.2.
