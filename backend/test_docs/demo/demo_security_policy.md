# Security Policy — Payments Platform

## Data Retention
Customer PII is retained for **90 days** after account closure per our privacy policy.
Payment records are retained for **7 years** for regulatory compliance.
Log data is retained for **30 days** before automated deletion.

## Encryption
All data at rest is encrypted using AES-256.
TLS 1.2 is the minimum supported version for data in transit.

## Access Control
API keys are scoped to a single environment (sandbox or production).
Keys cannot be used across environments.
Maximum of **5 active API keys** per account.

## Vulnerability Disclosure
Report security issues to security@payments-platform.com.
We commit to acknowledging reports within **48 hours**
and providing a fix timeline within **7 days**.
