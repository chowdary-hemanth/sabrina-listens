import os
import sys
import time
import webbrowser
import threading
from pathlib import Path

# Support PyInstaller standalone bundling
if getattr(sys, 'frozen', False):
    BUNDLE_DIR = Path(sys._MEIPASS)
else:
    BUNDLE_DIR = Path(__file__).resolve().parent

sys.path.insert(0, str(BUNDLE_DIR))

import uvicorn
from app.main import app

def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:8000/#app")

def main():
    print("=" * 65)
    print("   SABRINA LISTENS — Free Local Desktop Music Downloader")
    print("=" * 65)
    print(" [✓] Starting server on http://127.0.0.1:8000")
    print(" [✓] Opening your default web browser...")
    print(" [✓] Audio downloads save to your Downloads folder: SabrinaListens")
    print(" Note: Keep this window open while downloading music.")
    print("=" * 65)
    print()

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")

if __name__ == "__main__":
    main()
