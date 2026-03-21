#!/bin/sh
# Docker dev: tránh "nest start --watch" spawn node trước khi dist/main.js tồn tại (race trên bind mount).
set -e
export NODE_OPTIONS="${NODE_OPTIONS:+${NODE_OPTIONS} }--enable-source-maps"
nest build
exec concurrently -k -n compile,api -c blue,green \
  "nest build --watch --preserveWatchOutput" \
  "nodemon -q --watch dist --ext js --delay 1 dist/main.js"
