# Sample API Specification — Payments Platform

## Overview

This document describes the REST API for the payments platform. All endpoints require authentication via Bearer token.

---

## Authentication

The API uses Bearer token authentication. Include your API key in every request using the `Authorization` header:

```
Authorization: Bearer <your_api_key>
```

API keys are generated in the developer dashboard and are scoped to a specific environment (sandbox or production). Keys do not expire but can be rotated manually.

---

## Rate Limiting

The API enforces a rate limit of **100 requests per minute per API key**. Limits are applied per key, not per IP address.

When the limit is exceeded the API returns HTTP `429 Too Many Requests` with a `Retry-After` header indicating how many seconds to wait before retrying.

---

## Error Codes

| Code | Meaning                                              |
|------|------------------------------------------------------|
| 401  | Unauthorized — API key is missing or invalid         |
| 429  | Rate limit exceeded — respect the `Retry-After` header |
| 500  | Server error — safe to retry with exponential backoff |

Clients must handle all three codes gracefully. Do not retry 401 errors — the key itself is the problem.

---

## Webhooks

### Payments Webhook

The payments webhook delivers real-time event notifications to your registered endpoint when payment events occur (e.g. `payment.succeeded`, `payment.failed`, `refund.created`).

#### Timeout

Webhook requests time out after **30 seconds**. Your endpoint must return an HTTP `200` response within this window. Long-running processing should be dequeued and handled asynchronously.

#### Retry Policy

If your endpoint does not return HTTP `200`, the system will retry the delivery **3 times** using exponential backoff. The maximum backoff delay between retries is 60 seconds.

Retry schedule (approximate):
- Attempt 1: immediate
- Attempt 2: ~15 seconds after attempt 1
- Attempt 3: ~45 seconds after attempt 2

#### Failure Handling

If all 3 retry attempts fail, the event is marked `failed` and logged to the webhook event log. Failed events can be inspected and manually replayed from the developer dashboard. Events are retained for 72 hours.

---

## Request Failures

When any request fails, the API returns a structured JSON error body:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Too many requests. Retry after 60 seconds.",
    "retry_after": 60
  }
}
```

Clients should implement exponential backoff with jitter when retrying after `429` or `500` errors. Never retry `400` or `401` errors automatically — they indicate a client-side problem.

---

## Pagination

List endpoints are paginated using cursor-based pagination. Pass the `cursor` value from the previous response to retrieve the next page. Default page size is 50; maximum is 200.
