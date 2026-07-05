#!/usr/bin/env bash
set -euo pipefail

# exFAT helper for local native-module repairs.
# Clears Next's generated cache and installs better-sqlite3 on APFS temp space,
# then copies the prebuilt binary for the current Node ABI back into this repo.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/super-hank-bsqlite3.XXXXXX")"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$ROOT_DIR"
rm -rf .next

BETTER_SQLITE3_VERSION="$(node -p "require('./package.json').dependencies['better-sqlite3']")"
TARGET_DIR="$ROOT_DIR/node_modules/better-sqlite3/build/Release"

cd "$TMP_DIR"
printf '{"name":"super-hank-native-fix","version":"1.0.0","private":true}\n' > package.json
npm install "better-sqlite3@${BETTER_SQLITE3_VERSION}"

mkdir -p "$TARGET_DIR"
cp "$TMP_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node" "$TARGET_DIR/"

echo "Installed better-sqlite3 ${BETTER_SQLITE3_VERSION} native binary for Node ABI $(node -p 'process.versions.modules')."
