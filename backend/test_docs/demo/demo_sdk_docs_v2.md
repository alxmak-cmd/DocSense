# Python SDK Documentation — v2.1

## Installation
```
pip install payments-sdk==2.1.0
```

## Initialization
```python
from payments_sdk import PaymentsClient

client = PaymentsClient(
    api_key="your_api_key",
    timeout=30,
    max_retries=3
)
```

## Creating a Payment
```python
payment = client.payments.create(
    amount=1000,
    currency="usd",
    customer_id="cust_123"
)
```

## Error Handling
The SDK raises `PaymentsError` for all API errors.
Use `error.code` to identify the error type.
Transient errors (429, 500, 503) are automatically retried up to **3 times**
with exponential backoff starting at **1 second**.

## Supported Payment Methods
- Credit card
- ACH bank transfer
- Wire transfer
