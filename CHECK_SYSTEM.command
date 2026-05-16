#!/bin/zsh
cd "$(dirname "$0")"
echo "Checking Face Attendance system..."
npm run check
echo ""
echo "Check finished."
read "?Press Enter to close this window."
