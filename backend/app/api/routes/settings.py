from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.database import get_db, AppSettingRecord
from app.schemas.types import SettingsModel, SettingsUpdate
from app.workers.queue_manager import QueueManager

router = APIRouter()

def get_setting_from_db(db: Session, key: str, default: str) -> str:
    rec = db.query(AppSettingRecord).filter(AppSettingRecord.key == key).first()
    return rec.value if rec else default

def set_setting_in_db(db: Session, key: str, value: str):
    rec = db.query(AppSettingRecord).filter(AppSettingRecord.key == key).first()
    if not rec:
        rec = AppSettingRecord(key=key, value=value)
        db.add(rec)
    else:
        rec.value = value
    db.commit()

@router.get("/settings", response_model=SettingsModel)
async def get_settings(db: Session = Depends(get_db)):
    """
    Returns current application settings and environment detection status.
    """
    output_dir = get_setting_from_db(db, "output_directory", settings.OUTPUT_DIRECTORY)
    temp_dir = get_setting_from_db(db, "temp_directory", settings.TEMP_DIRECTORY)
    concurrency_str = get_setting_from_db(db, "max_concurrent_downloads", str(settings.MAX_CONCURRENT_DOWNLOADS))
    default_quality = get_setting_from_db(db, "default_quality", "mp3_320")
    naming_template = get_setting_from_db(db, "naming_template", "{track} - {title}")

    detected_ffmpeg = settings.detected_ffmpeg

    return SettingsModel(
        output_directory=output_dir,
        temp_directory=temp_dir,
        max_concurrent_downloads=int(concurrency_str),
        default_quality=default_quality,
        naming_template=naming_template,
        ffmpeg_detected=detected_ffmpeg is not None,
        ffmpeg_path=detected_ffmpeg,
        spotify_configured=bool(settings.SPOTIFY_CLIENT_ID and settings.SPOTIFY_CLIENT_SECRET),
    )

@router.put("/settings", response_model=SettingsModel)
async def update_settings(update: SettingsUpdate, db: Session = Depends(get_db)):
    """
    Updates validated user preferences.
    """
    if update.output_directory is not None:
        set_setting_in_db(db, "output_directory", update.output_directory)
        settings.OUTPUT_DIRECTORY = update.output_directory

    if update.temp_directory is not None:
        set_setting_in_db(db, "temp_directory", update.temp_directory)
        settings.TEMP_DIRECTORY = update.temp_directory

    if update.max_concurrent_downloads is not None:
        set_setting_in_db(db, "max_concurrent_downloads", str(update.max_concurrent_downloads))
        settings.MAX_CONCURRENT_DOWNLOADS = update.max_concurrent_downloads
        QueueManager.get_instance().update_concurrency(update.max_concurrent_downloads)

    if update.default_quality is not None:
        set_setting_in_db(db, "default_quality", update.default_quality)

    if update.naming_template is not None:
        set_setting_in_db(db, "naming_template", update.naming_template)

    if update.ffmpeg_path is not None:
        settings.FFMPEG_PATH = update.ffmpeg_path

    if update.spotify_client_id is not None:
        settings.SPOTIFY_CLIENT_ID = update.spotify_client_id

    if update.spotify_client_secret is not None:
        settings.SPOTIFY_CLIENT_SECRET = update.spotify_client_secret

    return await get_settings(db)
