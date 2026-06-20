# Security Policy

## Reporting a vulnerability

**Please do not open public issues for security vulnerabilities.**

Report them privately through GitHub's
[private vulnerability reporting](https://github.com/HUB-STAGE/HUB-ACADEMY/security/advisories/new),
or by email to **security@hub-h4ck.com**.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept if possible)
- Affected component / URL / commit SHA
- Any suggested remediation

We aim to acknowledge reports within **3 business days** and to provide a
remediation timeline after triage. Please give us a reasonable window to fix
the issue before any public disclosure.

## Scope

This policy covers the HUB-ACADEMY application in this repository. The platform
intentionally hosts deliberately vulnerable challenge/sandbox environments for
education — issues confined to those isolated challenge containers are **out of
scope**. Vulnerabilities in the core platform (auth, data access, multi-tenancy,
sandbox escape affecting the host) are **in scope**.

## Supported versions

Only the latest `main` is actively maintained and patched.
