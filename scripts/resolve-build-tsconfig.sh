#!/bin/sh
# Pick tsconfig when dist/ is owned by Docker (nobody) and cannot be overwritten.
CONFIG=tsconfig.build.json

dist_unusable() {
  if [ ! -d dist ]; then
    mkdir -p dist 2>/dev/null || return 0
    return 1
  fi
  if ! touch dist/.write_test 2>/dev/null; then
    return 0
  fi
  rm -f dist/.write_test 2>/dev/null || true
  # Directory writable but existing files may be owned by another user (Docker nobody on bind mount)
  if [ -f dist/main.js ] && ! touch dist/main.js 2>/dev/null; then
    return 0
  fi
  return 1
}

if dist_unusable; then
  CONFIG=tsconfig.build.host.json
  echo "dist/ is not writable (often Docker-owned). Building to dist-local/." >&2
  echo "Fix: sudo rm -rf dist   (or: sudo chown -R \$(id -u):\$(id -g) dist)" >&2
fi

printf '%s' "$CONFIG"
