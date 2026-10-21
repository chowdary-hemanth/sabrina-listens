# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:/Users/heman/.gemini/antigravity/scratch/sabrina-listens/backend/desktop_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[('C:/Users/heman/.gemini/antigravity/scratch/sabrina-listens/frontend/dist', 'dist'), ('C:/Users/heman/.gemini/antigravity/scratch/sabrina-listens/backend/app', 'app')],
    hiddenimports=['uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespans', 'uvicorn.lifespans.on', 'imageio_ffmpeg', 'spotifyscraper', 'yt_dlp', 'mutagen', 'sqlalchemy', 'sqlite3', 'pydantic_settings'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='SabrinaListens',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['C:/Users/heman/.gemini/antigravity/scratch/sabrina-listens/frontend/public/favicon.ico'],
)
