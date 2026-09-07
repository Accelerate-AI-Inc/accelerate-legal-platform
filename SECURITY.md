# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| tip of `main` | ✅ |
| anything older | ❌ |

Security fixes land on `main` only. If you are self-hosting, update to the
latest `main` before reporting — the issue may already be fixed.

## Reporting a vulnerability

Report vulnerabilities privately through GitHub, not in a public issue:

**Security tab → Report a vulnerability** on this repository, which opens
GitHub's private vulnerability reporting form.

If private reporting is not enabled on this repository yet, open a regular
issue that says only that you have a security report and asks for a private
channel. Do not include details, reproduction steps, or affected endpoints in
that issue.

Expect an acknowledgement within seven days. Fixes are prioritized by severity,
and we will coordinate a disclosure timeline with you.

## Scope

- The code in this repository, its default configuration, and the deployment
  guidance in `docs/` are all in scope.
- **Independent self-hosted installations** run by other people are out of
  scope here. A finding that only applies to how a particular operator has
  deployed Accelerate Legal — their infrastructure, their configuration, their
  provider keys — belongs with whoever runs that deployment.
- Accelerate Legal is an **LLM product handling legal documents**, so
  LLM-specific reports are explicitly welcome: prompt injection (including by
  way of an uploaded document), defeating the tool-approval gate, causing one
  user's documents or another tenant's data to surface in model output, and
  extraction of system prompts.
- Anything that crosses a tenant boundary is the highest-severity class here.
  Row-level security, project sharing, and document ownership checks are the
  relevant boundaries; see `backend/src/lib/access.ts` and the policies in
  `backend/schema.sql`.
- Secrets accidentally committed to this repository's history are worth a
  private report. `.gitleaks.toml` configures a scanner you can run locally
  with `gitleaks detect --source . --redact`.

## What not to do

Please keep testing non-destructive: only accounts and data you own, no denial
of service, and no attempt to reach another user's data beyond the minimum proof
a report needs.
