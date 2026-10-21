import os
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"
PYTHON_EXE = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
if not PYTHON_EXE.exists():
    PYTHON_EXE = Path(sys.executable)

def build():
    print("=" * 60)
    print("  STEP 1: Compiling React Production Frontend")
    print("=" * 60)
    subprocess.run(["npm", "run", "build"], cwd=str(FRONTEND_DIR), check=True, shell=True)

    print("\n" + "=" * 60)
    print("  STEP 2: Packaging Standalone Desktop Executable (.exe)")
    print("=" * 60)
    
    icon_path = FRONTEND_DIR / "public" / "favicon.ico"
    sep = ";" if os.name == "nt" else ":"

    cmd = [
        str(PYTHON_EXE),
        "-m",
        "PyInstaller",
        "--name=SabrinaListens",
        "--onefile",
        "--clean",
        f"--add-data={DIST_DIR}{sep}dist",
        f"--add-data={BACKEND_DIR / 'app'}{sep}app",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespans",
        "--hidden-import=uvicorn.lifespans.on",
        "--hidden-import=imageio_ffmpeg",
        "--hidden-import=spotifyscraper",
        "--hidden-import=yt_dlp",
        "--hidden-import=mutagen",
        "--hidden-import=sqlalchemy",
        "--hidden-import=sqlite3",
        "--hidden-import=pydantic_settings",
        f"--icon={icon_path}",
        str(BACKEND_DIR / "desktop_launcher.py"),
    ]

    subprocess.run(cmd, cwd=str(ROOT_DIR), check=True)
    print("\n" + "=" * 60)
    print("  SUCCESS: Standalone executable created!")
    print(f"  Location: {ROOT_DIR / 'dist' / 'SabrinaListens.exe'}")
    print("=" * 60)

if __name__ == "__main__":
    build()
