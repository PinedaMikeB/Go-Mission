#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WWW_DIR="$ROOT_DIR/www"

FILES=(
  "index.html"
  "admin.html"
  "install.html"
  "privacy.html"
  "delete-account.html"
  "watch.html"
  "manifest.json"
  "offline.html"
  "firebase-messaging-sw.js"
  "Go Mission Logo.png"
)

DIRS=(
  "assets"
  "data"
  "icons"
  "js"
  "modules"
  "shared"
  "watch"
  "yt-landing-install"
  "yt-messenger"
  "standalone-messenger-site"
)

rm -rf "$WWW_DIR"
mkdir -p "$WWW_DIR"

for file in "${FILES[@]}"; do
  if [[ -f "$ROOT_DIR/$file" ]]; then
    cp "$ROOT_DIR/$file" "$WWW_DIR/$file"
  fi
done

for dir in "${DIRS[@]}"; do
  if [[ -d "$ROOT_DIR/$dir" ]]; then
    rsync -a \
      --exclude='.*' \
      --exclude='*.tmp' \
      --exclude='*.swp' \
      --exclude='*.swo' \
      --exclude='*~' \
      "$ROOT_DIR/$dir" "$WWW_DIR/"
  fi
done

printf 'Staged Capacitor web assets in %s\n' "$WWW_DIR"
