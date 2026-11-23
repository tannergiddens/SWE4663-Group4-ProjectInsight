#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "========================================================"
echo "  Launching Project Insight (SWE 4663 - Group 4)"
echo "========================================================"
echo ""

if [ ! -f "dist/index.html" ]; then
  echo "Building frontend client..."
  npm run build
fi

if [ ! -f "api-services/dist/server.js" ]; then
  echo "Compiling backend server..."
  npm --prefix api-services run build
fi

echo ""
echo "Starting Project Insight on http://localhost:3001"
echo "Opening application in your default browser..."
echo "(Press Ctrl+C to stop the server when finished)"
echo ""

node api-services/dist/server.js
