#!/bin/bash
# Ensure Node.js is available and run mops through it
export PATH="/usr/local/lib/node_modules/ic-mops/bin:/usr/local/bin:$PATH"
exec node /usr/local/lib/node_modules/ic-mops/dist/bin/mops.js "$@"