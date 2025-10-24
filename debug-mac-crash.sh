#!/bin/bash

echo "🔍 Debugging TrueSpan Living Mac App Crash"
echo "=========================================="
echo ""

# Check architecture
echo "1. System Architecture:"
uname -m
echo ""

# Check crash reports
echo "2. Recent Crash Reports:"
ls -lt ~/Library/Logs/DiagnosticReports/ 2>/dev/null | grep -i truespan | head -5
echo ""

# Try to get crash info
LATEST_CRASH=$(ls -t ~/Library/Logs/DiagnosticReports/*TrueSpan* 2>/dev/null | head -1)
if [ -n "$LATEST_CRASH" ]; then
    echo "3. Latest Crash Report:"
    echo "   File: $LATEST_CRASH"
    echo ""
    echo "   First 30 lines:"
    head -30 "$LATEST_CRASH"
else
    echo "3. No crash reports found"
fi
echo ""

# Check if app exists
echo "4. App Location:"
ls -lh ~/Desktop/TrueSpan\ Living.app 2>/dev/null || echo "   App not found on Desktop"
echo ""

# Check app signature
echo "5. Code Signature:"
codesign -dvv ~/Desktop/TrueSpan\ Living.app 2>&1 | head -10
echo ""

# Try to launch and capture error
echo "6. Attempting to launch (this may fail):"
~/Desktop/TrueSpan\ Living.app/Contents/MacOS/TrueSpan\ Living 2>&1 &
sleep 2
echo ""

# Check Console logs
echo "7. Recent Console Logs:"
log show --predicate 'process == "TrueSpan Living"' --last 2m --info 2>/dev/null | tail -20
echo ""

echo "=========================================="
echo "✅ Debug complete! Share this output."

