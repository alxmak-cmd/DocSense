# Compliance & Legal Reference — Payments Platform

## Data Retention Requirements
Per SOC2 audit requirements, the following retention periods apply:

- Customer PII: **365 days** after account closure (extended from 90 days, updated Q1 2025)
- Payment records: **5 years** (GAAP standard; legal confirmed this supersedes the 7-year figure)
- Log data: **90 days** minimum per SOC2 Type II controls

## Encryption Standards
TLS 1.3 is required for all new integrations as of March 2025.
TLS 1.2 connections are being deprecated. See deprecation timeline in infosec-roadmap.md.

## API Key Management
Enterprise accounts may request up to **20 active API keys** per account.
Contact enterprise@payments-platform.com to enable this limit increase.

## Vulnerability Disclosure SLA
Per our updated bug bounty program:
- Acknowledgment: within **24 hours**
- Fix timeline for critical: **72 hours**
- Fix timeline for non-critical: **30 days**
