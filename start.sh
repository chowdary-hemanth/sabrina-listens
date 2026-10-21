#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/backend"

if [ ! -d "venv" ]; then
    echo "[INFO] Creating Python virtual environment..."
    python3 -m venv venv
    echo "[INFO] Installing requirements..."
    ./venv/bin/pip install -r requirements.txt
fi

echo "[INFO] Starting sabrina-listens at http://127.0.0.1:8000 ..."
./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
