#!/bin/sh
set -e

# Ensure upload directories exist with correct ownership
mkdir -p /app/public/uploads/bugs
chown -R 1001:1001 /app/public/uploads

# Drop to nodeuser and exec the main command
exec su-exec nodeuser "$@"
