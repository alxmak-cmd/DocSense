# Engineering Runbook — Payments Platform

## Overview
This runbook covers operational procedures for the Payments Platform backend.

## Authentication Notes
Tokens are valid for **24 hours** in production. The 60-minute figure in the API docs
is outdated and refers to the legacy v1.0 system. Do not refresh tokens unless they
are actually expired.

## Rate Limit Handling
Production rate limits are configured as follows:

- Standard tier: **1,000 requests per minute**
- Premium tier: **5,000 requests per minute**

When a client hits 429, the Retry-After header specifies the exact wait time.
Default backoff in the load balancer config is set to **60 seconds**, not 30.

## Pagination
Internal services use a page size of **100 records** as the default.
The 50-record default in the API spec applies to external clients only.

## Incident Response
For rate limit incidents, check the Redis cache for key exhaustion before
assuming a traffic spike. See runbook section 4.2 for escalation path.
