from typing import Dict
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db, RecentUrlRecord
from app.schemas.types import ResolveRequest, ResourceResponse
from app.services.url_parser import parse_music_url
from app.services.metadata_service import MetadataService
from app.core.logging import logger

router = APIRouter()

# In-memory resource cache
RESOLVED_RESOURCES: Dict[str, ResourceResponse] = {}

@router.post("/resolve", response_model=ResourceResponse)
async def resolve_url(req: ResolveRequest, db: Session = Depends(get_db)):
    """
    Accepts a music URL and resolves provider, resource type, and full track metadata.
    """
    logger.info(f"Resolving URL request: {req.url}")
    parsed = await parse_music_url(req.url)

    if not parsed.is_valid:
        raise HTTPException(
            status_code=400,
            detail=parsed.error or "Invalid or unsupported music URL."
        )

    try:
        resource = await MetadataService.resolve_resource(parsed)
    except Exception as e:
        logger.error(f"Metadata resolution error for {req.url}: {e}", exc_info=True)
        raise HTTPException(
            status_code=422,
            detail=f"Unable to resolve metadata: {str(e)}"
        )

    # Cache for later retrieval
    RESOLVED_RESOURCES[resource.resource_id] = resource

    # Record in recent URLs database
    try:
        recent = db.query(RecentUrlRecord).filter(RecentUrlRecord.url == resource.original_url).first()
        if not recent:
            recent = RecentUrlRecord(
                url=resource.original_url,
                title=resource.title,
                provider=resource.provider.value,
                resource_type=resource.resource_type.value,
                cover_url=resource.cover_url,
            )
            db.add(recent)
        else:
            recent.title = resource.title
            recent.cover_url = resource.cover_url
        db.commit()
    except Exception as e:
        logger.error(f"Error saving recent URL: {e}")
        db.rollback()

    return resource
