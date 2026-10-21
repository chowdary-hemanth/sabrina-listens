import asyncio
import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Any
import yt_dlp
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.core.ytdlp_utils import get_default_ydl_opts
from app.models.database import SessionLocal, JobRecord, HistoryRecord
from app.schemas.types import JobStatus, TrackMetadata, DownloadJobStatus
from app.services.audio_resolver import AudioResolver
from app.services.transcoding_service import TranscodingService
from app.services.tagging_service import TaggingService
from app.storage.file_manager import FileManager

class DownloadJob:
    def __init__(
        self,
        job_id: str,
        track: TrackMetadata,
        quality_id: str,
        target_format: str,
        target_bitrate_kbps: Optional[int],
        custom_output_dir: Optional[str] = None,
    ):
        self.job_id = job_id
        self.track = track
        self.quality_id = quality_id
        self.target_format = target_format
        self.target_bitrate_kbps = target_bitrate_kbps
        self.custom_output_dir = custom_output_dir

        self.status: JobStatus = JobStatus.PENDING
        self.progress_percent: float = 0.0
        self.download_speed: Optional[str] = None
        self.eta_seconds: Optional[int] = None
        self.error_message: Optional[str] = None
        self.file_path: Optional[str] = None
        self.file_size_bytes: Optional[int] = None
        self.actual_source_bitrate: Optional[int] = None
        self.is_transcoded: bool = False
        self.created_at: datetime = datetime.utcnow()
        self.updated_at: datetime = datetime.utcnow()

        self.is_cancelled: bool = False
        self.temp_file: Optional[Path] = None

    def to_status(self) -> DownloadJobStatus:
        return DownloadJobStatus(
            job_id=self.job_id,
            track_id=self.track.id,
            title=self.track.title,
            artist=self.track.artist,
            album=self.track.album,
            cover_url=self.track.album_art_url,
            status=self.status,
            progress_percent=round(self.progress_percent, 1),
            download_speed=self.download_speed,
            eta_seconds=self.eta_seconds,
            error_message=self.error_message,
            file_path=self.file_path,
            file_size_bytes=self.file_size_bytes,
            quality_id=self.quality_id,
            format=self.target_format,
            actual_source_bitrate=self.actual_source_bitrate,
            is_transcoded=self.is_transcoded,
            created_at=self.created_at.isoformat(),
            updated_at=self.updated_at.isoformat(),
        )

class QueueManager:
    _instance = None

    def __init__(self):
        self.jobs: Dict[str, DownloadJob] = {}
        self.subscribers: Set[asyncio.Queue] = set()
        self.concurrency_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_DOWNLOADS)
        self.running_tasks: Dict[str, asyncio.Task] = {}

    @classmethod
    def get_instance(cls) -> "QueueManager":
        if cls._instance is None:
            cls._instance = QueueManager()
        return cls._instance

    def update_concurrency(self, max_concurrent: int):
        self.concurrency_semaphore = asyncio.Semaphore(max_concurrent)

    async def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self.subscribers.discard(q)

    async def broadcast(self, job: DownloadJob):
        status_data = job.to_status().model_dump()
        self._sync_job_to_db(job)
        for q in list(self.subscribers):
            try:
                await q.put(status_data)
            except Exception:
                self.subscribers.discard(q)

    def _sync_job_to_db(self, job: DownloadJob):
        """Persists job status in SQLite."""
        db: Session = SessionLocal()
        try:
            rec = db.query(JobRecord).filter(JobRecord.id == job.job_id).first()
            if not rec:
                rec = JobRecord(
                    id=job.job_id,
                    track_id=job.track.id,
                    title=job.track.title,
                    artist=job.track.artist,
                    album=job.track.album,
                    cover_url=job.track.album_art_url,
                    quality_id=job.quality_id,
                    format=job.target_format,
                    created_at=job.created_at,
                )
                db.add(rec)

            rec.status = job.status.value
            rec.progress_percent = job.progress_percent
            rec.download_speed = job.download_speed
            rec.eta_seconds = job.eta_seconds
            rec.error_message = job.error_message
            rec.file_path = job.file_path
            rec.file_size_bytes = job.file_size_bytes
            rec.actual_source_bitrate = job.actual_source_bitrate
            rec.is_transcoded = job.is_transcoded
            rec.updated_at = datetime.utcnow()

            # Record in history if completed or failed
            if job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
                hist = db.query(HistoryRecord).filter(HistoryRecord.id == job.job_id).first()
                if not hist:
                    hist = HistoryRecord(
                        id=job.job_id,
                        track_id=job.track.id,
                        title=job.track.title,
                        artist=job.track.artist,
                        album=job.track.album,
                        cover_url=job.track.album_art_url,
                        file_path=job.file_path,
                        file_size_bytes=job.file_size_bytes,
                        quality_id=job.quality_id,
                        status=job.status.value,
                        completed_at=datetime.utcnow(),
                    )
                    db.add(hist)
                else:
                    hist.status = job.status.value
                    hist.file_path = job.file_path
                    hist.file_size_bytes = job.file_size_bytes

            db.commit()
        except Exception as e:
            logger.error(f"DB sync error for job {job.job_id}: {e}")
            db.rollback()
        finally:
            db.close()

    def get_job(self, job_id: str) -> Optional[DownloadJob]:
        return self.jobs.get(job_id)

    def get_all_jobs(self) -> List[DownloadJobStatus]:
        return [job.to_status() for job in self.jobs.values()]

    def is_track_active(self, track_id: str, quality_id: str) -> bool:
        """Deduplication check: returns True if an active job already exists for this track & quality."""
        for j in self.jobs.values():
            if j.track.id == track_id and j.quality_id == quality_id:
                if j.status in (JobStatus.PENDING, JobStatus.RESOLVING, JobStatus.QUEUED, JobStatus.DOWNLOADING, JobStatus.TRANSCODING, JobStatus.TAGGING):
                    return True
        return False

    async def enqueue(
        self,
        track: TrackMetadata,
        quality_id: str = "mp3_320",
        custom_output_dir: Optional[str] = None,
    ) -> DownloadJob:
        # Deduplication
        for j in self.jobs.values():
            if j.track.id == track.id and j.quality_id == quality_id:
                if j.status in (JobStatus.PENDING, JobStatus.RESOLVING, JobStatus.QUEUED, JobStatus.DOWNLOADING, JobStatus.TRANSCODING, JobStatus.TAGGING):
                    return j

        job_id = str(uuid.uuid4())

        # Determine target format and bitrate
        target_format = "mp3"
        target_bitrate = 320

        if quality_id == "original":
            target_format = "original"
            target_bitrate = None
        elif quality_id == "mp3_320":
            target_format = "mp3"
            target_bitrate = 320
        elif quality_id == "mp3_256":
            target_format = "mp3"
            target_bitrate = 256
        elif quality_id == "mp3_192":
            target_format = "mp3"
            target_bitrate = 192
        elif quality_id == "aac_256":
            target_format = "m4a"
            target_bitrate = 256
        elif quality_id == "flac":
            target_format = "flac"
            target_bitrate = None

        job = DownloadJob(
            job_id=job_id,
            track=track,
            quality_id=quality_id,
            target_format=target_format,
            target_bitrate_kbps=target_bitrate,
            custom_output_dir=custom_output_dir,
        )
        self.jobs[job_id] = job
        await self.broadcast(job)

        # Launch background execution task
        task = asyncio.create_task(self._process_job(job))
        self.running_tasks[job_id] = task
        return job

    async def cancel_job(self, job_id: str) -> bool:
        job = self.jobs.get(job_id)
        if not job:
            return False

        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
            return False

        job.is_cancelled = True
        job.status = JobStatus.CANCELLED
        job.error_message = "Cancelled by user"

        task = self.running_tasks.get(job_id)
        if task and not task.done():
            task.cancel()

        # Clean up temp files
        FileManager.cleanup_file(job.temp_file)

        await self.broadcast(job)
        return True

    async def retry_job(self, job_id: str) -> Optional[DownloadJob]:
        job = self.jobs.get(job_id)
        if not job or job.status not in (JobStatus.FAILED, JobStatus.CANCELLED):
            return None

        job.status = JobStatus.PENDING
        job.progress_percent = 0.0
        job.error_message = None
        job.is_cancelled = False
        await self.broadcast(job)

        task = asyncio.create_task(self._process_job(job))
        self.running_tasks[job_id] = task
        return job

    async def _process_job(self, job: DownloadJob):
        """Pipeline execution for a single job."""
        async with self.concurrency_semaphore:
            if job.is_cancelled:
                return

            try:
                # 1. State: RESOLVING
                job.status = JobStatus.RESOLVING
                await self.broadcast(job)

                resolution = await AudioResolver.resolve_audio_source(job.track)
                job.actual_source_bitrate = resolution.source_bitrate_kbps

                if job.is_cancelled:
                    return

                # 2. State: QUEUED
                job.status = JobStatus.QUEUED
                await self.broadcast(job)

                # 3. State: DOWNLOADING
                job.status = JobStatus.DOWNLOADING
                await self.broadcast(job)

                downloaded_file = await self._download_stream(job, resolution)

                if job.is_cancelled:
                    FileManager.cleanup_file(downloaded_file)
                    return

                # Determine actual output format
                final_ext = job.target_format
                if job.quality_id == "original":
                    final_ext = downloaded_file.suffix.lstrip('.')
                    if final_ext in ("webm", "opus", "ogg"):
                        final_ext = "opus"

                # 4. State: TRANSCODING
                # Transcode if target format differs from downloaded file extension or if converting to target quality
                needs_transcode = (
                    job.quality_id != "original" or
                    downloaded_file.suffix.lower() != f".{final_ext.lower()}"
                )

                if needs_transcode:
                    job.status = JobStatus.TRANSCODING
                    await self.broadcast(job)

                    transcoded_temp = FileManager.create_temp_file(prefix="trans_", suffix=f".{final_ext}")
                    await TranscodingService.transcode(
                        input_path=downloaded_file,
                        output_path=transcoded_temp,
                        target_format=final_ext,
                        bitrate_kbps=job.target_bitrate_kbps,
                    )
                    # Clean up initial raw download
                    FileManager.cleanup_file(downloaded_file)
                    working_file = transcoded_temp
                    job.is_transcoded = True
                else:
                    working_file = downloaded_file
                    job.is_transcoded = False

                if job.is_cancelled:
                    FileManager.cleanup_file(working_file)
                    return

                # 5. State: TAGGING
                job.status = JobStatus.TAGGING
                await self.broadcast(job)

                await TaggingService.apply_metadata_and_artwork(working_file, job.track)

                # 6. Move to final destination
                final_destination = FileManager.get_output_path(
                    track=job.track,
                    extension=final_ext,
                    custom_base_dir=job.custom_output_dir,
                )

                import shutil
                shutil.move(str(working_file), str(final_destination))

                job.file_path = str(final_destination)
                job.file_size_bytes = final_destination.stat().st_size
                job.progress_percent = 100.0
                job.download_speed = None
                job.eta_seconds = 0
                job.status = JobStatus.COMPLETED

                logger.info(f"Successfully finished download job {job.job_id}: {final_destination}")
                await self.broadcast(job)

            except asyncio.CancelledError:
                job.status = JobStatus.CANCELLED
                job.error_message = "Job cancelled"
                FileManager.cleanup_file(job.temp_file)
                await self.broadcast(job)
            except Exception as e:
                logger.error(f"Error processing job {job.job_id}: {e}", exc_info=True)
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                FileManager.cleanup_file(job.temp_file)
                await self.broadcast(job)

    async def _download_stream(self, job: DownloadJob, resolution) -> Path:
        """Downloads audio using yt-dlp with live progress hooks."""
        temp_file = FileManager.create_temp_file(prefix="dl_", suffix=".raw")
        job.temp_file = temp_file

        loop = asyncio.get_event_loop()

        def progress_hook(d):
            if job.is_cancelled:
                raise Exception("Download cancelled by user")

            if d['status'] == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 1
                downloaded = d.get('downloaded_bytes', 0)
                speed = d.get('speed')
                eta = d.get('eta')

                job.progress_percent = min(round((downloaded / total) * 100, 1), 99.0)
                if speed:
                    job.download_speed = f"{speed / (1024 * 1024):.2f} MB/s"
                if eta:
                    job.eta_seconds = int(eta)

                # Schedule broadcast without blocking yt-dlp thread
                asyncio.run_coroutine_threadsafe(self.broadcast(job), loop)

        def _run_download():
            ydl_opts = get_default_ydl_opts({
                'format': 'bestaudio/best',
                'outtmpl': str(temp_file),
                'progress_hooks': [progress_hook],
                'overwrites': True,
            })

            # If direct audio file URL
            if resolution.extractor == "direct":
                import requests
                with requests.get(resolution.stream_url, stream=True, timeout=30) as r:
                    r.raise_for_status()
                    total = int(r.headers.get('content-length', 0))
                    downloaded = 0
                    start_time = time.time()
                    with open(temp_file, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=65536):
                            if job.is_cancelled:
                                raise Exception("Download cancelled by user")
                            if chunk:
                                f.write(chunk)
                                downloaded += len(chunk)
                                if total > 0:
                                    job.progress_percent = min(round((downloaded / total) * 100, 1), 99.0)
                                    elapsed = max(time.time() - start_time, 0.1)
                                    speed = downloaded / elapsed
                                    job.download_speed = f"{speed / (1024 * 1024):.2f} MB/s"
                                    asyncio.run_coroutine_threadsafe(self.broadcast(job), loop)
                return temp_file

            url_to_download = resolution.raw_info.get('webpage_url') or resolution.stream_url
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url_to_download])
            except Exception as e:
                err_str = str(e).lower()
                if "bot" in err_str or "sign in" in err_str:
                    logger.warning(f"Bot detection challenge encountered during download ({e}). Retrying with mobile player client...")
                    downloaded_ok = False
                    try:
                        fallback_opts = get_default_ydl_opts({
                            'format': 'bestaudio/best',
                            'outtmpl': str(temp_file),
                            'progress_hooks': [progress_hook],
                            'overwrites': True,
                            'extractor_args': {
                                'youtube': {
                                    'player_client': ['android', 'ios'],
                                    'player_skip': ['webpage', 'configs'],
                                }
                            },
                        })
                        with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                            ydl.download([url_to_download])
                        downloaded_ok = True
                    except Exception as fallback_err:
                        logger.warning(f"Mobile client download also failed ({fallback_err}). Triggering SoundCloud fallback...")

                    if not downloaded_ok:
                        search_title = f"{job.track.artist} - {job.track.title}" if job.track.artist else job.track.title
                        try:
                            sc_opts = {
                                'format': 'bestaudio/best',
                                'outtmpl': str(temp_file),
                                'progress_hooks': [progress_hook],
                                'overwrites': True,
                                'quiet': True,
                                'no_warnings': True,
                            }
                            with yt_dlp.YoutubeDL(sc_opts) as sc_ydl:
                                sc_ydl.download([f"scsearch1:{search_title}"])
                            logger.info(f"Successfully downloaded audio stream via SoundCloud fallback for '{search_title}'")
                        except Exception as sc_err:
                            logger.error(f"SoundCloud fallback download failed: {sc_err}")
                            raise Exception(
                                "YouTube Bot Verification: Render's datacenter IP is blocked by YouTube. "
                                "To fix: Paste your YouTube cookies in Settings > YouTube Cookies, or download and run SabrinaListens.exe locally."
                            )
                else:
                    raise

            # In some cases yt-dlp appends extension to outtmpl
            if not temp_file.exists():
                candidates = list(temp_file.parent.glob(f"{temp_file.name}*"))
                if candidates:
                    return candidates[0]
                raise FileNotFoundError("Downloaded file was not created.")

            return temp_file

        return await loop.run_in_executor(None, _run_download)
