import os
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.models.database import get_db, HistoryRecord, RecentUrlRecord
from app.schemas.types import HistoryItem, RecentUrlItem

router = APIRouter()

@router.get("/history", response_model=List[HistoryItem])
async def get_history(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Returns download history with optional search and status filtering.
    """
    query = db.query(HistoryRecord)

    if status:
        query = query.filter(HistoryRecord.status == status)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (HistoryRecord.title.ilike(search_pattern)) |
            (HistoryRecord.artist.ilike(search_pattern)) |
            (HistoryRecord.album.ilike(search_pattern))
        )

    records = query.order_by(HistoryRecord.completed_at.desc()).limit(limit).all()

    return [
        HistoryItem(
            id=r.id,
            track_id=r.track_id,
            title=r.title,
            artist=r.artist,
            album=r.album,
            cover_url=r.cover_url,
            file_path=r.file_path,
            file_size_bytes=r.file_size_bytes,
            quality_id=r.quality_id,
            status=r.status,
            completed_at=r.completed_at.isoformat(),
        )
        for r in records
    ]

@router.delete("/history")
async def clear_history(
    delete_files: bool = Query(False, description="Whether to also delete downloaded files from disk"),
    db: Session = Depends(get_db),
):
    """
    Clears download history. Does not delete output files unless delete_files=true.
    """
    records = db.query(HistoryRecord).all()
    count = len(records)

    if delete_files:
        for r in records:
            if r.file_path and os.path.exists(r.file_path):
                try:
                    os.unlink(r.file_path)
                except Exception:
                    pass

    db.query(HistoryRecord).delete()
    db.commit()

    return {"message": f"Cleared {count} history records", "deleted_files": delete_files}

@router.get("/recents", response_model=List[RecentUrlItem])
async def get_recent_urls(limit: int = 10, db: Session = Depends(get_db)):
    """
    Returns recently resolved URLs for quick access on the Home screen.
    """
    recents = db.query(RecentUrlRecord).order_by(RecentUrlRecord.visited_at.desc()).limit(limit).all()
    return [
        RecentUrlItem(
            url=r.url,
            title=r.title,
            provider=r.provider,
            resource_type=r.resource_type,
            cover_url=r.cover_url,
            visited_at=r.visited_at.isoformat(),
        )
        for r in recents
    ]
