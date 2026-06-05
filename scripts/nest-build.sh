#!/bin/sh
set -e
CONFIG=$(sh "$(dirname "$0")/resolve-build-tsconfig.sh")
exec nest build --path "$CONFIG"
