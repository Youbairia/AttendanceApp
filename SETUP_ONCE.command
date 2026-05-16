#!/bin/zsh
cd "$(dirname "$0")"
echo "Installing Face Attendance dependencies..."
npm run setup
echo ""
echo "Setup complete. You can now run START_HERE.command"
read "?Press Enter to close this window."
