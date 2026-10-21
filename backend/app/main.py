import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.logging import logger
from app.models.database import init_db
from app.api.routes import resolve, resources, downloads, settings as settings_route, history, stream
from app.storage.file_manager import FileManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    logger.info("Initializing SQLite database...")
    init_db()
    logger.info(f"Using output directory: {settings.resolved_output_dir}")
    logger.info(f"FFmpeg binary detected: {settings.detected_ffmpeg or 'NOT FOUND'}")
    yield
    # Shutdown: clean temporary files
    logger.info("Application shutting down. Cleaning up temporary files...")
    FileManager.cleanup_temp_dir()

app = FastAPI(
    title="SABRINA LISTENS API",
    description="Local Audio Downloader backend service",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(resolve.router, prefix="/api", tags=["Resolve"])
app.include_router(resources.router, prefix="/api", tags=["Resources"])
app.include_router(downloads.router, prefix="/api", tags=["Downloads"])
app.include_router(settings_route.router, prefix="/api", tags=["Settings"])
app.include_router(history.router, prefix="/api", tags=["History"])
app.include_router(stream.router, prefix="/api", tags=["Stream"])

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "app": "sabrina-listens",
        "environment": settings.APP_ENV,
        "cloud_mode": settings.CLOUD_MODE,
        "ffmpeg_detected": settings.detected_ffmpeg is not None,
        "ffmpeg_path": settings.detected_ffmpeg,
    }

# Mount static frontend build if present (supports source tree, Docker, and PyInstaller .exe)
import sys
if getattr(sys, "frozen", False):
    frontend_dist = Path(sys._MEIPASS) / "dist"
else:
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
