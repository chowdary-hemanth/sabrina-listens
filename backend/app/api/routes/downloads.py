import json
import asyncio
from typing import List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.api.routes.resolve import RESOLVED_RESOURCES
from app.schemas.types import (
    DownloadJobCreate,
    DownloadJobStatus,
    DownloadQueueSummary,
    JobStatus,
)
from app.workers.queue_manager import QueueManager
from app.core.logging import logger

router = APIRouter()

@router.post("/downloads", response_model=List[DownloadJobStatus])
async def create_download_jobs(req: DownloadJobCreate):
    """
    Creates and enqueues download jobs for selected tracks and chosen quality.
    """
    resource = RESOLVED_RESOURCES.get(req.resource_id)
    if not resource:
        raise HTTPException(
            status_code=404,
            detail="Source resource not found in cache. Please resolve the link first."
        )

    tracks_by_id = {t.id: t for t in resource.tracks}
    enqueued_jobs = []
    qm = QueueManager.get_instance()

    for track_id in req.track_ids:
        track = tracks_by_id.get(track_id)
        if not track:
            continue

        job = await qm.enqueue(
            track=track,
            quality_id=req.quality_id,
            custom_output_dir=req.custom_output_dir,
        )
        enqueued_jobs.append(job.to_status())

    if not enqueued_jobs:
        raise HTTPException(status_code=400, detail="No matching tracks selected for download.")

    return enqueued_jobs

@router.get("/downloads", response_model=DownloadQueueSummary)
async def get_download_queue():
    """
    Returns the current download queue summary and all jobs.
    """
    qm = QueueManager.get_instance()
    all_jobs = qm.get_all_jobs()

    active = sum(1 for j in all_jobs if j.status in (
        JobStatus.PENDING, JobStatus.RESOLVING, JobStatus.QUEUED,
        JobStatus.DOWNLOADING, JobStatus.TRANSCODING, JobStatus.TAGGING
    ))
    completed = sum(1 for j in all_jobs if j.status == JobStatus.COMPLETED)
    failed = sum(1 for j in all_jobs if j.status == JobStatus.FAILED)

    return DownloadQueueSummary(
        total_jobs=len(all_jobs),
        active_jobs=active,
        completed_jobs=completed,
        failed_jobs=failed,
        jobs=all_jobs,
    )

@router.get("/downloads/{job_id}", response_model=DownloadJobStatus)
async def get_download_job(job_id: str):
    """
    Returns detailed job status and progress.
    """
    qm = QueueManager.get_instance()
    job = qm.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return job.to_status()

@router.post("/downloads/{job_id}/cancel")
async def cancel_download_job(job_id: str):
    """
    Cancels an active download job.
    """
    qm = QueueManager.get_instance()
    success = await qm.cancel_job(job_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Job cannot be cancelled (it may have already completed, failed, or was not found)."
        )
    return {"message": "Job successfully cancelled", "job_id": job_id}

@router.post("/downloads/{job_id}/retry", response_model=DownloadJobStatus)
async def retry_download_job(job_id: str):
    """
    Retries an eligible failed or cancelled download job.
    """
    qm = QueueManager.get_instance()
    job = await qm.retry_job(job_id)
    if not job:
        raise HTTPException(
            status_code=400,
            detail="Job cannot be retried (only failed or cancelled jobs can be retried)."
        )
    return job.to_status()

@router.get("/downloads/events")
async def download_events_stream():
    """
    Server-Sent Events (SSE) stream for real-time progress updates.
    """
    qm = QueueManager.get_instance()
    queue = await qm.subscribe()

    async def event_generator():
        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            qm.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
