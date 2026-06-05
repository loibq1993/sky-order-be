#!/bin/sh
# Docker dev: tránh "nest start --watch" spawn node trước khi dist/main.js tồn tại (race trên bind mount).
set -e
export NODE_OPTIONS="${NODE_OPTIONS:+${NODE_OPTIONS} }--enable-source-maps"

if [ -f /.dockerenv ]; then
  # /app/dist is an anonymous volume — build here, not host dist/
  CONFIG=tsconfig.build.json
  OUT_MAIN=dist/main.js
  OUT_DIR=dist
  # tsbuildinfo on bind mount may reference host dist paths → EACCES in container
  rm -f tsconfig.build.tsbuildinfo tsconfig.tsbuildinfo tsconfig.build.host.tsbuildinfo 2>/dev/null || true
else
  CONFIG=$(sh "$(dirname "$0")/resolve-build-tsconfig.sh")
  case "$CONFIG" in
    tsconfig.build.host.json) OUT_MAIN=dist-local/main.js; OUT_DIR=dist-local ;;
    *) OUT_MAIN=dist/main.js; OUT_DIR=dist ;;
  esac
fi

nest build --path "$CONFIG"
exec concurrently -k -n compile,api -c blue,green \
  "nest build --watch --preserveWatchOutput --path $CONFIG" \
  "nodemon -q --watch $OUT_DIR --ext js --delay 1 $OUT_MAIN"
