# Operations Runbook — Payments Platform

## Overview

This runbook covers incident response, configuration reference, and recovery procedures for the payments platform. It is maintained by the platform engineering team and updated after every P1/P2 incident.

---

## Authentication

The payments platform uses Bearer token authentication, consistent with the public API specification. Tokens are validated against the auth service on every inbound request. The auth service caches token validity for 60 seconds to reduce latency.

If auth failures spike unexpectedly, check whether a key rotation was recently performed without updating downstream services.

---

## Webhook Configuration

### Timeout

The production load balancer is configured with a **60-second timeout** for webhook delivery requests. This is the server-side timeout enforced at the infrastructure layer.

> **Conflict note (for ops awareness):** The API specification documents a 30-second client-side timeout. In practice, the effective timeout is whichever limit is reached first — typically the 30-second client timeout fires before the 60-second infra timeout. The 60-second value exists to give the load balancer room to handle slow clients gracefully.

### Retry Attempts

The production webhook dispatcher is configured to attempt **5 retries** before marking a delivery as failed. This overrides the API documentation default of 3 retries. The increase was introduced after a Q3 incident where transient network instability caused a spike in false-failure events during peak load.

Retry schedule uses exponential backoff with jitter. Total retry window is approximately 8 minutes under worst-case conditions.

### Monitoring

Webhook delivery success rate is tracked in Grafana. Alert thresholds:

- **Warning**: delivery rate < 98% over 10 minutes
- **Critical**: delivery rate < 95% over 5 minutes

---

## Incident Response

### Escalation Procedure

| Severity | Trigger                          | Action                                              |
|----------|----------------------------------|-----------------------------------------------------|
| P1       | Payment processing failure       | Page on-call immediately via PagerDuty              |
| P2       | Degraded webhook delivery        | Post to #payments-alerts; respond within 15 minutes |
| P3       | Monitoring gap or slow responses | File ticket; resolve within 24 hours                |

### Common Failure Modes

**Connection reset on webhook delivery**
- Check load balancer health. If CPU > 90%, initiate a rolling restart.
- Verify the target endpoint is reachable from the production VPC.

**Auth failure spike**
- Check the token validation service health. A spike usually indicates a key rotation that was not propagated to all consumers.
- Do not roll back the rotation — update the downstream service secrets instead.

**429 cascade (internal retry loops)**
- Identify the runaway consumer via the rate-limit dashboard.
- Throttle or pause the consumer; the cascade clears within 2–3 minutes.

---

## Recovery Procedures

After any incident affecting webhook delivery:

1. Identify the affected time window from Grafana.
2. Pull the list of failed events from the dashboard (filter by `status: failed`).
3. Replay events individually or in bulk using the replay API.
4. Verify delivery success rate returns to > 99% before closing the incident.

Events are retained in the replay queue for **72 hours** after their original delivery attempt.
