#!/usr/bin/env bash
set -e

# PitchAlignerrr Local Tunnel Launcher
# Starts the Flask API locally and exposes it via a Cloudflare Tunnel (HTTPS)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================================"
echo "    PitchAlignerrr Local Backend & Tunnel Runner        "
echo "========================================================"

# 1. Detect python binary
PYTHON_BIN=""
if [ -f ".venv-whisperx/bin/python" ]; then
    PYTHON_BIN=".venv-whisperx/bin/python"
elif [ -f ".venv/bin/python" ]; then
    PYTHON_BIN=".venv/bin/python"
elif command -v python3 &> /dev/null; then
    PYTHON_BIN="python3"
else
    echo "❌ Python 3 environment not found."
    exit 1
fi
echo "🐍 Using Python: $PYTHON_BIN"

# 2. Check for cloudflared binary
CLOUDFLARED_BIN=""
if command -v cloudflared &> /dev/null; then
    CLOUDFLARED_BIN="cloudflared"
elif [ -x "$HOME/.local/bin/cloudflared" ]; then
    CLOUDFLARED_BIN="$HOME/.local/bin/cloudflared"
elif [ -x "/tmp/cloudflared" ]; then
    CLOUDFLARED_BIN="/tmp/cloudflared"
fi

if [ -z "$CLOUDFLARED_BIN" ]; then
    echo "⬇️  Downloading cloudflared quick tunnel..."
    mkdir -p "$HOME/.local/bin"
    curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$HOME/.local/bin/cloudflared"
    chmod +x "$HOME/.local/bin/cloudflared"
    CLOUDFLARED_BIN="$HOME/.local/bin/cloudflared"
fi
echo "⚡ Using Cloudflared: $CLOUDFLARED_BIN"

# 3. Check / Start local backend
BACKEND_PID=""
if curl -s "http://127.0.0.1:5000/api/health" &> /dev/null; then
    echo "✅ Local Flask API is already active on http://127.0.0.1:5000"
else
    echo "🚀 Starting Flask API on port 5000..."
    PORT=5000 "$PYTHON_BIN" app.py > /tmp/pitchalignerrr_backend.log 2>&1 &
    BACKEND_PID=$!

    echo -n "⏳ Waiting for API to become ready..."
    for i in {1..30}; do
        if curl -s "http://127.0.0.1:5000/api/health" | grep -q "ok"; then
            echo " Ready!"
            break
        fi
        sleep 1
        echo -n "."
    done

    if ! curl -s "http://127.0.0.1:5000/api/health" | grep -q "ok"; then
        echo "❌ Backend failed to start. Logs:"
        cat /tmp/pitchalignerrr_backend.log
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
fi

cleanup() {
    echo ""
    echo "🛑 Shutting down tunnel and local backend..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    exit 0
}

trap cleanup INT TERM

echo ""
echo "🌐 Starting Cloudflare Quick Tunnel..."
echo "ℹ️  Copy the 'https://....trycloudflare.com' URL below and paste it into"
echo "   the 'Backend URL' input in PitchAlignerrr workbench header!"
echo "--------------------------------------------------------"

"$CLOUDFLARED_BIN" tunnel --url http://127.0.0.1:5000
