import os
import sys
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.models.database import get_db, JobRecord, HistoryRecord

router = APIRouter()

@router.get("/stream/{job_id}")
async def stream_audio_file(job_id: str, db: Session = Depends(get_db)):
    """
    Streams a completed audio file directly to the frontend for playback.
    """
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if not job or not job.file_path:
        # Check history
        hist = db.query(HistoryRecord).filter(HistoryRecord.id == job_id).first()
        if hist and hist.file_path:
            file_path = hist.file_path
        else:
            raise HTTPException(status_code=404, detail="Audio file not found for this job.")
    else:
        file_path = job.file_path

    path_obj = Path(file_path)
    if not path_obj.exists():
        raise HTTPException(status_code=404, detail="Audio file no longer exists on disk.")

    ext = path_obj.suffix.lower()
    media_types = {
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
        ".ogg": "audio/ogg",
        ".opus": "audio/opus",
        ".wav": "audio/wav",
    }
    media_type = media_types.get(ext, "audio/mpeg")

    return FileResponse(
        path=str(path_obj),
        media_type=media_type,
        filename=path_obj.name,
    )

@router.get("/download-file/{job_id}")
async def download_audio_attachment(job_id: str, db: Session = Depends(get_db)):
    """
    Triggers browser file download (attachment) for local disk saving, essential for Cloud mode.
    """
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    file_path = job.file_path if job else None

    if not file_path:
        hist = db.query(HistoryRecord).filter(HistoryRecord.id == job_id).first()
        file_path = hist.file_path if hist else None

    if not file_path:
        raise HTTPException(status_code=404, detail="Audio file not found for this job.")

    path_obj = Path(file_path)
    if not path_obj.exists():
        raise HTTPException(status_code=404, detail="Audio file no longer exists on server.")

    ext = path_obj.suffix.lower()
    media_types = {
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
    }
    media_type = media_types.get(ext, "audio/mpeg")

    return FileResponse(
        path=str(path_obj),
        media_type=media_type,
        filename=path_obj.name,
        content_disposition_type="attachment",
    )

@router.post("/open-folder/{job_id}")
async def open_containing_folder(job_id: str, db: Session = Depends(get_db)):
    """
    Reveals the downloaded audio file in Windows Explorer / system file manager.
    """
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    file_path = job.file_path if job else None

    if not file_path:
        hist = db.query(HistoryRecord).filter(HistoryRecord.id == job_id).first()
        file_path = hist.file_path if hist else None

    norm_path = os.path.normpath(os.path.abspath(file_path)) if file_path else ""
    target_to_open = None

    if norm_path and os.path.exists(norm_path):
        target_to_open = norm_path
    else:
        # Fallback to configured SabrinaListens output directory
        target_to_open = os.path.normpath(str(settings.resolved_output_dir))

    try:
        if os.name == 'nt':
            if os.path.isfile(target_to_open):
                # /select,"path" where quote is strictly AFTER comma so explorer doesn't fail back to Documents
                subprocess.Popen(f'explorer.exe /select,"{target_to_open}"', shell=True)
            else:
                subprocess.Popen(f'explorer.exe "{target_to_open}"', shell=True)
        elif sys.platform == 'darwin':
            if os.path.isfile(target_to_open):
                subprocess.Popen(['open', '-R', target_to_open])
            else:
                subprocess.Popen(['open', target_to_open])
        else:
            folder = os.path.dirname(target_to_open) if os.path.isfile(target_to_open) else target_to_open
            subprocess.Popen(['xdg-open', folder])
    except Exception as e:
        logger.error(f"Failed to open folder: {e}")
        raise HTTPException(status_code=500, detail=f"Could not open folder: {e}")

    return {"message": "Folder opened", "path": target_to_open}

@router.get("/download-desktop-app")
async def download_desktop_app():
    """
    Downloads the pre-compiled Windows Desktop App (SabrinaListens.exe).
    Serves the binary directly if bundled on disk, or redirects to the latest GitHub release.
    """
    base_backend = Path(__file__).resolve().parents[3]
    base_project = Path(__file__).resolve().parents[4] if len(Path(__file__).resolve().parents) > 4 else base_backend

    candidates = [
        base_backend / "desktop_dist" / "SabrinaListens.exe",
        base_project / "dist" / "SabrinaListens.exe",
        Path("desktop_dist/SabrinaListens.exe"),
        Path("backend/desktop_dist/SabrinaListens.exe"),
        Path("/app/backend/desktop_dist/SabrinaListens.exe"),
        Path("/app/dist/SabrinaListens.exe"),
    ]
    for p in candidates:
        if p.is_file():
            return FileResponse(
                path=str(p),
                filename="SabrinaListens.exe",
                media_type="application/vnd.microsoft.portable-executable",
                content_disposition_type="attachment",
            )

    # Redirect to GitHub Releases download
    return RedirectResponse(
        url="https://github.com/chowdary-hemanth/sabrina-listens/releases/latest/download/SabrinaListens.exe",
        status_code=307,
    )

