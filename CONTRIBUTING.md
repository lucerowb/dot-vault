# Contributing to DotVault

Thank you for your interest in DotVault. This project is open source under the [MIT License](./LICENSE).

## Getting started

1. Fork the repository and clone your fork.
2. Copy `.env.example` to `.env.local` and fill in required values (see [README](./README.md)).
3. `pnpm install`, `pnpm run db:migrate`, `pnpm dev`.

### CLI (`packages/cli`)

```bash
pnpm build:cli    # compile TypeScript → dist/
pnpm dv           # run from repo root (alias: pnpm cli)
pnpm dv help
```

- Version lives in `packages/cli/package.json` (patch releases often auto-bump on merge to `main` when CLI paths change).
- After API route changes, verify push/pull against a running app: `dv ps` / `dv pl`.
- User-facing CLI docs: [`packages/cli/README.md`](./packages/cli/README.md) and [`docs/CLI.md`](./docs/CLI.md).

## Pull requests

- Keep changes focused; match existing TypeScript and ESLint style.
- Do not commit `.env`, `.env.local`, or real secrets.
- Update docs when you change env vars, API routes, or CLI behavior.

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).

## Code of conduct

Be respectful and constructive in issues and reviews.
