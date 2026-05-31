#!/usr/bin/env bash
# Bump Formula/dot-vault.rb to match a GitHub release (version + sha256).
# Usage: ./scripts/update-homebrew-formula.sh [VERSION]
# Default VERSION: packages/cli/package.json

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORMULA="$ROOT/Formula/dot-vault.rb"
VERSION="${1:-$(node -p "require('$ROOT/packages/cli/package.json').version")}"
TAG="v${VERSION}"
SUMS_URL="https://github.com/lucerowb/dot-vault/releases/download/${TAG}/SHA256SUMS-${VERSION}.txt"
TGZ_NAME="dotvault-cli-${VERSION}.npm.tgz"

echo "Fetching checksums from ${SUMS_URL} ..."
SUMS=$(curl -fsSL "$SUMS_URL")
SHA256=$(echo "$SUMS" | awk -v f="$TGZ_NAME" '$2 == f { print $1 }')
if [[ -z "${SHA256:-}" ]]; then
  echo "error: could not find sha256 for ${TGZ_NAME} in release assets" >&2
  echo "$SUMS" >&2
  exit 1
fi

URL="https://github.com/lucerowb/dot-vault/releases/download/${TAG}/${TGZ_NAME}"

# macOS sed vs GNU — use perl for portability
perl -i -pe "
  s|^  url \".*\"|  url \"${URL}\"| if /^  url /;
  s|^  version \".*\"|  version \"${VERSION}\"| if /^  version /;
  s|^  sha256 \".*\"|  sha256 \"${SHA256}\"| if /^  sha256 /;
" "$FORMULA"

echo "Updated ${FORMULA} → ${VERSION} (${SHA256:0:12}…)"
