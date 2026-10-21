from fastapi import APIRouter, HTTPException
from app.schemas.types import ResourceResponse
from app.api.routes.resolve import RESOLVED_RESOURCES

router = APIRouter()

@router.get("/resources/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: str):
    """
    Returns cached collection details and track listings by resource_id.
    """
    resource = RESOLVED_RESOURCES.get(resource_id)
    if not resource:
        raise HTTPException(
            status_code=404,
            detail=f"Resource '{resource_id}' not found or session expired. Please re-enter the URL."
        )
    return resource
