# Security policy

## Supported versions

Security fixes are applied to the latest release on the default branch.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

1. Use [GitHub private vulnerability reporting](https://github.com/lucerowb/dot-vault/security/advisories/new) for this repository, or
2. Email the maintainer listed in `package.json` with a clear description, impact, and reproduction steps.

We aim to acknowledge reports within a few business days and will coordinate disclosure once a fix is available.

## Scope

In scope: DotVault application code, API routes, client-side crypto, authentication, and deployment configuration shipped in this repository.

Out of scope: third-party infrastructure (Upstash, Supabase, hosting provider) except where misconfiguration is documented in this repo.

## Security model (summary)

- Quick-share encryption and decryption run in the browser; the AES key material is carried in the URL **fragment** and is not sent to the server.
- Cloud vault blobs are encrypted at rest server-side with `STORAGE_ENCRYPTION_KEY` (separate from quick-share).
- Ephemeral vault payloads live in Redis with TTL and optional one-time retrieval via an atomic Lua script.
