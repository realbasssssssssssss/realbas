#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "ยังไม่ได้ติดตั้ง Node.js (https://nodejs.org)"; exit 1; }
[ -d node_modules ] || npm install
node server.js
