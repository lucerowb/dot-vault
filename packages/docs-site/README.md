# DotVault documentation site

[Docusaurus](https://docusaurus.io/) package that builds the guides in [`../../docs`](../../docs) into static files served by the Next.js app at `/docs/`.

## Commands

| Command | Description |
| ------- | ----------- |
| `pnpm start` | Dev server on port **3456** |
| `pnpm build` | Output to `../../public/docs` |
| `pnpm serve` | Preview the production build |

From the repo root:

- `pnpm dev:docs` — run the docs dev server
- `pnpm build:docs` — build docs only
- `pnpm build` — builds docs then Next.js (`prebuild` hook)

`pnpm dev` at the repo root starts Next.js and Docusaurus together and proxies `/docs/` to port 3456.

**Agents:** when adding or changing guides, edit `docs/` at the repo root and update `sidebars.ts` — see [`AGENTS.md`](../../AGENTS.md).
