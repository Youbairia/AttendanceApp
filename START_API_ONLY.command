#!/bin/zsh
cd "$(dirname "$0")"
echo "Starting Face Attendance API..."
echo "Keep this window open."
echo "API health page: http://localhost:3001/health"
echo ""
npm run api
