"""
Shelters module for shelter registration and management.

Provides:
- Create new shelter
- Get all shelters
- Get shelter by ID
- Update shelter
- Delete shelter
- Search shelters by location
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field
from .config import get_settings
from .supabase_client import get_supabase_client

settings = get_settings()


# ============================================
# PYDANTIC MODELS
# ============================================

class ShelterCreate(BaseModel):
    """Model for creating a new shelter."""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    capacity: Optional[int] = Field(None, ge=0)
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    amenities: Optional[List[str]] = None


class ShelterUpdate(BaseModel):
    """Model for updating an existing shelter."""
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    capacity: Optional[int] = Field(None, ge=0)
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    amenities: Optional[List[str]] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive|full)$")


class ShelterResponse(BaseModel):
    """Model for shelter response."""
    id: str
    name: str
    description: Optional[str]
    lat: float
    lon: float
    capacity: Optional[int]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    address: Optional[str]
    amenities: Optional[List[str]]
    status: str
    added_by: Optional[str]
    created_at: str
    updated_at: str


class ShelterListResponse(BaseModel):
    """Model for shelter list response."""
    shelters: List[ShelterResponse]
    total: int


# ============================================
# SHELTER CRUD FUNCTIONS
# ============================================

async def create_shelter(
    shelter_data: ShelterCreate,
    user_id: Optional[str] = None,
    is_guest: bool = False
) -> Dict[str, Any]:
    """
    Create a new shelter.
    
    Args:
        shelter_data: Shelter creation data
        user_id: ID of user creating the shelter (None for guests without stored user)
        is_guest: Whether this is a guest user
        
    Returns:
        Created shelter dict
    """
    supabase = get_supabase_client()
    
    # Prepare shelter record
    shelter_record = {
        "id": str(uuid.uuid4()),
        "name": shelter_data.name,
        "description": shelter_data.description,
        "lat": shelter_data.lat,
        "lon": shelter_data.lon,
        "capacity": shelter_data.capacity,
        "contact_phone": shelter_data.contact_phone,
        "contact_email": shelter_data.contact_email,
        "address": shelter_data.address,
        "amenities": shelter_data.amenities or [],
        "status": "active",
        "added_by": None if is_guest else user_id  # Guest shelters have NULL added_by
    }
    
    result = supabase.table("shelters").insert(shelter_record).execute()
    
    if not result.data:
        raise ValueError("Failed to create shelter")
    
    return result.data[0]


async def get_all_shelters(
    status: Optional[str] = "active",
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Get all shelters with optional filtering.
    
    Args:
        status: Filter by status (active, inactive, full, or None for all)
        limit: Maximum number of results
        offset: Pagination offset
        
    Returns:
        Dict with shelters list and total count
    """
    supabase = get_supabase_client()
    
    query = supabase.table("shelters").select("*", count="exact")
    
    if status:
        query = query.eq("status", status)
    
    query = query.order("created_at", desc=True)
    query = query.range(offset, offset + limit - 1)
    
    result = query.execute()
    
    return {
        "shelters": result.data or [],
        "total": result.count or 0
    }


async def get_shelter_by_id(shelter_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a shelter by its ID.
    
    Args:
        shelter_id: Shelter UUID
        
    Returns:
        Shelter dict or None if not found
    """
    supabase = get_supabase_client()
    
    result = supabase.table("shelters").select("*").eq("id", shelter_id).execute()
    
    if result.data:
        return result.data[0]
    return None


async def update_shelter(
    shelter_id: str,
    update_data: ShelterUpdate,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update an existing shelter.
    
    Args:
        shelter_id: Shelter UUID
        update_data: Fields to update
        user_id: ID of user making the update (for authorization)
        
    Returns:
        Updated shelter dict
        
    Raises:
        ValueError: If shelter not found or unauthorized
    """
    supabase = get_supabase_client()
    
    # Check if shelter exists
    existing = await get_shelter_by_id(shelter_id)
    if not existing:
        raise ValueError("Shelter not found")
    
    # Check authorization (user must own the shelter or be admin)
    if user_id and existing.get("added_by") and existing["added_by"] != user_id:
        raise ValueError("Not authorized to update this shelter")
    
    # Build update dict (only include non-None fields)
    update_dict = {}
    for field, value in update_data.model_dump().items():
        if value is not None:
            update_dict[field] = value
    
    if not update_dict:
        return existing
    
    result = supabase.table("shelters").update(update_dict).eq("id", shelter_id).execute()
    
    if not result.data:
        raise ValueError("Failed to update shelter")
    
    return result.data[0]


async def delete_shelter(shelter_id: str, user_id: Optional[str] = None) -> bool:
    """
    Delete a shelter.
    
    Args:
        shelter_id: Shelter UUID
        user_id: ID of user making the deletion (for authorization)
        
    Returns:
        True if deleted successfully
        
    Raises:
        ValueError: If shelter not found or unauthorized
    """
    supabase = get_supabase_client()
    
    # Check if shelter exists
    existing = await get_shelter_by_id(shelter_id)
    if not existing:
        raise ValueError("Shelter not found")
    
    # Check authorization
    if user_id and existing.get("added_by") and existing["added_by"] != user_id:
        raise ValueError("Not authorized to delete this shelter")
    
    supabase.table("shelters").delete().eq("id", shelter_id).execute()
    
    return True


async def search_shelters_by_location(
    lat: float,
    lon: float,
    radius_km: float = 50.0,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Search for shelters near a location.
    Uses a simple bounding box approximation.
    
    Args:
        lat: Center latitude
        lon: Center longitude
        radius_km: Search radius in kilometers
        limit: Maximum results
        
    Returns:
        List of nearby shelters sorted by approximate distance
    """
    supabase = get_supabase_client()
    
    # Approximate degrees for the radius
    # 1 degree latitude ≈ 111 km
    # 1 degree longitude ≈ 111 * cos(lat) km
    import math
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
    
    # Bounding box
    min_lat = lat - lat_delta
    max_lat = lat + lat_delta
    min_lon = lon - lon_delta
    max_lon = lon + lon_delta
    
    result = supabase.table("shelters")\
        .select("*")\
        .eq("status", "active")\
        .gte("lat", min_lat)\
        .lte("lat", max_lat)\
        .gte("lon", min_lon)\
        .lte("lon", max_lon)\
        .limit(limit)\
        .execute()
    
    shelters = result.data or []
    
    # Calculate approximate distance and sort
    def calc_distance(shelter):
        dlat = shelter["lat"] - lat
        dlon = shelter["lon"] - lon
        return math.sqrt(dlat**2 + dlon**2)
    
    shelters.sort(key=calc_distance)
    
    return shelters


async def get_shelters_for_map() -> List[Dict[str, Any]]:
    """
    Get all active shelters formatted for map display.
    Returns minimal data needed for map markers.
    
    Returns:
        List of shelter dicts with id, name, lat, lon, capacity, status
    """
    supabase = get_supabase_client()
    
    result = supabase.table("shelters")\
        .select("id, name, lat, lon, capacity, status, description")\
        .eq("status", "active")\
        .execute()
    
    return result.data or []


async def get_shelter_stats() -> Dict[str, Any]:
    """
    Get shelter statistics for dashboard.
    
    Returns:
        Dict with shelter counts by status
    """
    supabase = get_supabase_client()
    
    # Get counts by status
    all_shelters = supabase.table("shelters").select("status", count="exact").execute()
    active = supabase.table("shelters").select("id", count="exact").eq("status", "active").execute()
    full = supabase.table("shelters").select("id", count="exact").eq("status", "full").execute()
    inactive = supabase.table("shelters").select("id", count="exact").eq("status", "inactive").execute()
    
    # Get total capacity
    capacity_result = supabase.table("shelters")\
        .select("capacity")\
        .eq("status", "active")\
        .not_.is_("capacity", "null")\
        .execute()
    
    total_capacity = sum(s.get("capacity", 0) for s in (capacity_result.data or []))
    
    return {
        "total": all_shelters.count or 0,
        "active": active.count or 0,
        "full": full.count or 0,
        "inactive": inactive.count or 0,
        "total_capacity": total_capacity
    }
