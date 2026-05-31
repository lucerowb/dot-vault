# Contributing to DotVault

Thank you for your interest in DotVault. This project is open source under the [MIT License](./LICENSE).

## Getting started

1. Fork the repository and clone your fork.
2. Copy `.env.example` to `.env.local` and fill in required values (see [README](./README.md)).
3. `pnpm install`, `pnpm run db:migrate`, `pnpm dev`.

## Pull requests

- Keep changes focused; match existing TypeScript and ESLint style.
- Do not commit `.env`, `.env.local`, or real secrets.
- Update docs when you change env vars, API routes, or CLI behavior.

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).

## Code of conduct

Be respectful and constructive in issues and reviews.
