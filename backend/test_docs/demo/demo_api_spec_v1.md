# API Reference — Payments Platform v1.2

## Authentication
All API requests require a Bearer token in the Authorization header.
Tokens expire after **60 minutes** and must be refreshed using the /auth/refresh endpoint.

## Rate Limits
The API enforces the following rate limits per API key:

- Standard tier: **500 requests per minute**
- Premium tier: **2,000 requests per minute**
- Burst allowance: up to 200% of tier limit for 10 seconds

Exceeding the rate limit returns HTTP 429. Clients should back off for **30 seconds** before retrying.

## Pagination
All list endpoints use cursor-based pagination. The default page size is **50 records**.
Maximum page size is **200 records**.

## Webhooks
Webhook payloads are signed using HMAC-SHA256.
Signatures expire after **5 minutes** of the event timestamp.
