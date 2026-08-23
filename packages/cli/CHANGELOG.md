# Changelog

## 0.3.0

- **New: `dv diff <a> <b>`** — compare two env sources (local file or vault label). Label-vs-label uses the new server diff endpoint; values always masked.
- **New: `dv share [file|label]`** — zero-knowledge quick-share links from the terminal (AES-256-GCM, key in URL fragment, optional passphrase / one-time / TTL).
- **New: `dv scan [file]`** — offline secrets audit (provider tokens, weak/duplicate/placeholder values, insecure URLs). Exits 1 on high-severity findings for CI.
- **New: `dv example [file]`** — generate `.env.example` with values replaced by placeholders.
- **Changed:** `push` now runs the scan first and asks for confirmation on findings (`--force` / `--no-scan` to skip).

## 0.2.3

- **Interactive session:** `dv` with no args stays open until Exit; remembers active project in `~/.dotvault/session.json`.
- **API fixes:** pull resolves env by label then fetches by id; push uses POST upsert (fixes HTTP 405).
- **UX:** project vs environment hints; searchable project/env pickers; `project-create` command.
- **Logo:** typographic ASCII based on brand mark (cloud + vault), not random glyphs.
- **Removed:** one-shot menu that exited after a single action.

## 0.2.2 and earlier

See git history and [GitHub Releases](https://github.com/lucerowb/dot-vault/releases).
