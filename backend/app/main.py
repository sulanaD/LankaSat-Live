"""FastAPI main application module for LankaSat Live."""

from fastapi import FastAPI, HTTPException, Query, Response, Body, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import time

from .config import get_settings
from .sentinel import (
    get_access_token,
    fetch_tile,
    get_available_layers,
    validate_date,
    LAYERS
)
from .cache import tile_cache, token_cache, weather_cache
from .chatbot import get_chat_response, analyze_flood_conditions, get_layer_explanation, fetch_satellite_statistics
from .weather import (
    get_sri_lanka_weather_summary,
    get_location_weather,
    fetch_forecast,
    SRI_LANKA_LOCATIONS
)
from .flood_api import (
    fetch_stations,
    fetch_latest_water_levels,
    fetch_active_alerts,
    fetch_alert_summary,
    fetch_rivers,
    fetch_basins,
    fetch_station_by_name,
    get_flood_data_summary,
    get_stations_on_river,
    get_flood_map_url,
    get_station_chart_url
)
# Import auth and shelter modules
from .auth import (
    register_user,
    login_user,
    guest_login,
    get_user_by_id,
    get_current_user_from_token,
    UserRegister,
    UserLogin,
    TokenResponse
)
from .shelters import (
    create_shelter,
    get_all_shelters,
    get_shelter_by_id,
    update_shelter,
    delete_shelter,
    search_shelters_by_location,
    get_shelters_for_map,
    get_shelter_stats,
    ShelterCreate,
    ShelterUpdate
)
from .relief_directory import (
    get_relief_directory,
    get_relief_by_category,
    search_relief_organizations,
    get_google_sheet_url
)

settings = get_settings()

# Initialize FastAPI app
app = FastAPI(
    title="LankaSat Live API",
    description="Backend API for Sri Lanka Satellite Dashboard",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple rate limiting storage
rate_limit_store: dict = {}


def check_rate_limit(client_id: str) -> bool:
    """Simple rate limiting check."""
    current_time = time.time()
    window_start = current_time - settings.RATE_LIMIT_WINDOW
    
    if client_id not in rate_limit_store:
        rate_limit_store[client_id] = []
    
    # Clean old entries
    rate_limit_store[client_id] = [
        t for t in rate_limit_store[client_id] if t > window_start
    ]
    
    if len(rate_limit_store[client_id]) >= settings.RATE_LIMIT_REQUESTS:
        return False
    
    rate_limit_store[client_id].append(current_time)
    return True


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "LankaSat Live API",
        "version": "1.0.0",
        "description": "Backend API for Sri Lanka Satellite Dashboard",
        "endpoints": {
            "health": "/health",
            "layers": "/layers",
            "tile": "/tile",
            "token": "/token",
            "chat": "/chat",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for deployment platforms."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "cache_stats": {
            "tile_cache": tile_cache.stats(),
            "token_cache": token_cache.stats(),
            "weather_cache": weather_cache.stats()
        }
    }


@app.get("/layers")
async def get_layers():
    """Get all available satellite layers."""
    return {
        "layers": get_available_layers(),
        "sri_lanka": {
            "center": settings.SRI_LANKA_CENTER,
            "bounds": {
                "north": 10.1,
                "south": 5.9,
                "east": 82.2,
                "west": 79.4
            },
            "default_zoom": 7,
            "min_zoom": 7,
            "max_zoom": 15
        }
    }


@app.get("/token")
async def get_token():
    """
    Get authentication status (does not expose actual token).
    Used to verify the backend can authenticate with Sentinel Hub.
    """
    try:
        token = await get_access_token()
        return {
            "authenticated": True,
            "message": "Successfully authenticated with Sentinel Hub"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication failed: {str(e)}"
        )


@app.get("/tile")
async def get_tile(
    layer: str = Query(..., description="Layer ID (e.g., S1_VV, S2_TRUE_COLOR)"),
    z: int = Query(..., ge=0, le=18, description="Zoom level"),
    x: int = Query(..., ge=0, description="Tile X coordinate"),
    y: int = Query(..., ge=0, description="Tile Y coordinate"),
    date: str = Query(default=None, description="Date in YYYY-MM-DD format")
):
    """
    Fetch a satellite tile from Sentinel Hub.
    
    This endpoint proxies requests to Sentinel Hub, handling authentication
    and caching internally.
    """
    # Validate layer
    if layer not in LAYERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid layer. Available layers: {list(LAYERS.keys())}"
        )
    
    # Validate and normalize date
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    else:
        date = validate_date(date)
    
    try:
        tile_data = await fetch_tile(layer, z, x, y, date)
        
        if tile_data is None:
            # Return transparent tile if no data
            raise HTTPException(
                status_code=404,
                detail="No imagery available for this tile/date combination"
            )
        
        return Response(
            content=tile_data,
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=300",
                "X-Tile-Layer": layer,
                "X-Tile-Date": date
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching tile: {str(e)}"
        )


@app.get("/cache/stats")
async def cache_stats():
    """Get cache statistics."""
    return {
        "tile_cache": tile_cache.stats(),
        "token_cache": token_cache.stats()
    }


@app.post("/cache/clear")
async def clear_cache():
    """Clear all caches (admin endpoint)."""
    tile_cache.clear()
    token_cache.clear()
    return {"message": "Cache cleared successfully"}


# Pydantic models for chat
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    history: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI chatbot endpoint for satellite data questions.
    
    Send a message and optionally include dashboard context
    (selected layer, date, etc.) for more relevant responses.
    """
    try:
        # Convert history to dict format
        history = None
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]
        
        response = await get_chat_response(
            message=request.message,
            context=request.context,
            conversation_history=history
        )
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chat error: {str(e)}"
        )


@app.get("/chat/analyze-floods")
async def analyze_floods(
    date: str = Query(default=None, description="Date in YYYY-MM-DD format"),
    region: Optional[str] = Query(default=None, description="Specific region in Sri Lanka")
):
    """Get AI analysis of flood conditions for a given date."""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    else:
        date = validate_date(date)
    
    try:
        analysis = await analyze_flood_conditions(date, region)
        return {
            "date": date,
            "region": region or "All Sri Lanka",
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis error: {str(e)}"
        )


@app.get("/chat/layer-info/{layer_id}")
async def get_layer_info(layer_id: str):
    """Get quick explanation of a satellite layer."""
    if layer_id not in LAYERS:
        raise HTTPException(
            status_code=404,
            detail=f"Layer not found. Available: {list(LAYERS.keys())}"
        )
    
    explanation = get_layer_explanation(layer_id)
    return {
        "layer_id": layer_id,
        "name": LAYERS[layer_id]["name"],
        "explanation": explanation
    }


@app.get("/satellite/stats")
async def get_satellite_stats(
    date: str = Query(default=None, description="Date in YYYY-MM-DD format")
):
    """
    Get real-time satellite statistics for Sri Lanka.
    
    Returns water index, flood indicators, turbidity, and vegetation metrics
    derived from actual Sentinel-2 imagery.
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    else:
        date = validate_date(date)
    
    try:
        stats = await fetch_satellite_statistics(date)
        return {
            "date": date,
            "statistics": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Statistics error: {str(e)}"
        )


# ===== WEATHER ENDPOINTS =====

@app.get("/weather")
async def get_weather():
    """
    Get comprehensive weather summary for Sri Lanka.
    
    Returns current conditions for key locations, monsoon status,
    flood risk assessment, and weather alerts.
    """
    try:
        summary = await get_sri_lanka_weather_summary()
        return {
            "status": "success",
            "data": summary,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Weather fetch error: {str(e)}"
        )


@app.get("/weather/locations")
async def get_weather_locations():
    """Get list of monitored weather locations in Sri Lanka."""
    return {
        "locations": [
            {
                "id": loc_id,
                "name": loc_info["name"],
                "region": loc_info["region"],
                "coordinates": {"lat": loc_info["lat"], "lon": loc_info["lon"]}
            }
            for loc_id, loc_info in SRI_LANKA_LOCATIONS.items()
        ]
    }


@app.get("/weather/{location}")
async def get_weather_by_location(location: str):
    """
    Get current weather for a specific location in Sri Lanka.
    """
    try:
        weather = await get_location_weather(location)
        if weather is None:
            raise HTTPException(
                status_code=404,
                detail=f"Location not found or weather data unavailable. Available: {list(SRI_LANKA_LOCATIONS.keys())}"
            )
        
        return {
            "location": location,
            "data": weather,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Weather fetch error: {str(e)}"
        )


@app.get("/weather/forecast/{location}")
async def get_weather_forecast(location: str):
    """
    Get 5-day weather forecast for a specific location.
    """
    location_lower = location.lower()
    if location_lower not in SRI_LANKA_LOCATIONS:
        raise HTTPException(
            status_code=404,
            detail=f"Location not found. Available: {list(SRI_LANKA_LOCATIONS.keys())}"
        )
    
    loc = SRI_LANKA_LOCATIONS[location_lower]
    
    try:
        forecast = await fetch_forecast(loc["lat"], loc["lon"])
        if forecast is None:
            raise HTTPException(
                status_code=503,
                detail="Forecast data unavailable"
            )
        
        return {
            "location": loc["name"],
            "region": loc["region"],
            "forecast": forecast,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Forecast fetch error: {str(e)}"
        )


# ===== FLOOD DATA ENDPOINTS (Sri Lanka DMC) =====

@app.get("/flood/summary")
async def get_flood_summary():
    """
    Get comprehensive flood data summary for Sri Lanka.
    Combines water level data, alerts, and risk assessment.
    Data sourced from Sri Lanka Disaster Management Center (DMC).
    """
    try:
        summary = await get_flood_data_summary()
        return {
            "status": "success",
            "data": summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Flood data fetch error: {str(e)}"
        )


@app.get("/flood/stations")
async def get_all_stations():
    """
    Get all gauging stations with their metadata and threshold levels.
    Returns 39 monitoring stations across Sri Lanka.
    """
    try:
        stations = await fetch_stations()
        return {
            "status": "success",
            "count": len(stations),
            "stations": stations
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Stations fetch error: {str(e)}"
        )


@app.get("/flood/levels")
async def get_water_levels():
    """
    Get the latest water level readings for all stations.
    This is the primary endpoint for real-time flood monitoring.
    """
    try:
        levels = await fetch_latest_water_levels()
        return {
            "status": "success",
            "count": len(levels),
            "readings": levels,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Water levels fetch error: {str(e)}"
        )


@app.get("/flood/alerts")
async def get_alerts():
    """
    Get all stations currently in ALERT, MINOR, or MAJOR status.
    Sorted by severity: MAJOR > MINOR > ALERT
    """
    try:
        alerts = await fetch_active_alerts()
        return {
            "status": "success",
            "count": len(alerts),
            "alerts": alerts,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Alerts fetch error: {str(e)}"
        )


@app.get("/flood/alerts/summary")
async def get_alerts_summary():
    """
    Get a summary count of stations by alert level.
    Returns count of MAJOR, MINOR, ALERT, NORMAL, NO_DATA stations.
    """
    try:
        summary = await fetch_alert_summary()
        return {
            "status": "success",
            "summary": summary,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Alert summary fetch error: {str(e)}"
        )


@app.get("/flood/rivers")
async def get_rivers():
    """Get all rivers with their basin assignments."""
    try:
        rivers = await fetch_rivers()
        return {
            "status": "success",
            "count": len(rivers),
            "rivers": rivers
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Rivers fetch error: {str(e)}"
        )


@app.get("/flood/basins")
async def get_basins():
    """Get all river basins."""
    try:
        basins = await fetch_basins()
        return {
            "status": "success",
            "count": len(basins),
            "basins": basins
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Basins fetch error: {str(e)}"
        )


@app.get("/flood/station/{station_name}")
async def get_station(station_name: str):
    """Get a specific station by name with its latest water level reading."""
    try:
        station = await fetch_station_by_name(station_name)
        if station is None:
            raise HTTPException(
                status_code=404,
                detail=f"Station '{station_name}' not found"
            )
        return {
            "status": "success",
            "data": station
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Station fetch error: {str(e)}"
        )


@app.get("/flood/river/{river_name}/stations")
async def get_river_stations(river_name: str):
    """Get all stations on a specific river."""
    try:
        stations = await get_stations_on_river(river_name)
        return {
            "status": "success",
            "river": river_name,
            "count": len(stations),
            "stations": stations
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"River stations fetch error: {str(e)}"
        )


@app.get("/flood/map")
async def get_flood_map():
    """Get the URL to the current flood map image from DMC."""
    return {
        "url": get_flood_map_url(),
        "source": "Sri Lanka Disaster Management Center"
    }


@app.get("/flood/chart/{station_name}")
async def get_station_chart(station_name: str):
    """Get the URL to a station's water level chart."""
    return {
        "station": station_name,
        "url": get_station_chart_url(station_name),
        "source": "Sri Lanka Disaster Management Center"
    }


# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """
    Dependency to get current user from Authorization header.
    Returns None if no valid token provided.
    """
    if not authorization:
        return None
    
    # Extract token from "Bearer <token>" format
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization
    
    return get_current_user_from_token(token)


async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency that requires authentication.
    Raises 401 if not authenticated.
    """
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@app.post("/auth/register")
async def api_register_user(user_data: UserRegister):
    """
    Register a new user with email and password.
    
    Returns access token and user info on success.
    """
    try:
        result = await register_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.display_name
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/auth/login")
async def api_login_user(user_data: UserLogin):
    """
    Login with email and password.
    
    Returns access token and user info on success.
    """
    try:
        result = await login_user(
            email=user_data.email,
            password=user_data.password
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.post("/auth/guest")
async def api_guest_login():
    """
    Create a guest session without registration.
    
    Guest users can register shelters but are marked with NULL added_by.
    """
    try:
        result = await guest_login()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Guest login failed: {str(e)}")


@app.get("/auth/me")
async def api_get_current_user(current_user: dict = Depends(require_auth)):
    """
    Get current authenticated user info.
    
    Requires valid JWT token in Authorization header.
    """
    # For non-guest users, fetch full profile from database
    if current_user.get("role") != "guest" and current_user.get("id"):
        user = await get_user_by_id(current_user["id"])
        if user:
            return user
    
    return current_user


# ============================================
# SHELTER ENDPOINTS
# ============================================

@app.post("/shelters")
async def api_create_shelter(
    shelter_data: ShelterCreate,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Create a new shelter.
    
    Can be called by authenticated users or guests.
    Guests can create shelters but added_by will be NULL.
    """
    try:
        is_guest = current_user is None or current_user.get("role") == "guest"
        user_id = None if is_guest else current_user.get("id")
        
        result = await create_shelter(
            shelter_data=shelter_data,
            user_id=user_id,
            is_guest=is_guest
        )
        return {
            "status": "success",
            "message": "Shelter created successfully",
            "shelter": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create shelter: {str(e)}")


@app.get("/shelters")
async def api_get_all_shelters(
    status: Optional[str] = Query("active", description="Filter by status: active, inactive, full"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """
    Get all shelters with optional filtering.
    
    Returns list of shelters and total count for pagination.
    """
    try:
        result = await get_all_shelters(status=status, limit=limit, offset=offset)
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shelters: {str(e)}")


@app.get("/shelters/map")
async def api_get_shelters_for_map():
    """
    Get all active shelters formatted for map display.
    
    Returns minimal data needed for map markers.
    """
    try:
        shelters = await get_shelters_for_map()
        return {
            "status": "success",
            "count": len(shelters),
            "shelters": shelters
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch map shelters: {str(e)}")


@app.get("/shelters/stats")
async def api_get_shelter_stats():
    """
    Get shelter statistics for dashboard.
    
    Returns counts by status and total capacity.
    """
    try:
        stats = await get_shelter_stats()
        return {
            "status": "success",
            **stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shelter stats: {str(e)}")


@app.get("/shelters/search")
async def api_search_shelters(
    lat: float = Query(..., ge=-90, le=90, description="Center latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Center longitude"),
    radius_km: float = Query(50.0, ge=1, le=500, description="Search radius in kilometers")
):
    """
    Search for shelters near a location.
    
    Returns shelters within the specified radius, sorted by distance.
    """
    try:
        shelters = await search_shelters_by_location(lat=lat, lon=lon, radius_km=radius_km)
        return {
            "status": "success",
            "count": len(shelters),
            "center": {"lat": lat, "lon": lon},
            "radius_km": radius_km,
            "shelters": shelters
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search shelters: {str(e)}")


@app.get("/shelters/{shelter_id}")
async def api_get_shelter(shelter_id: str):
    """
    Get a shelter by its ID.
    """
    try:
        shelter = await get_shelter_by_id(shelter_id)
        if not shelter:
            raise HTTPException(status_code=404, detail="Shelter not found")
        return {
            "status": "success",
            "shelter": shelter
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shelter: {str(e)}")


@app.put("/shelters/{shelter_id}")
async def api_update_shelter(
    shelter_id: str,
    update_data: ShelterUpdate,
    current_user: dict = Depends(require_auth)
):
    """
    Update an existing shelter.
    
    Requires authentication. Only shelter owner can update.
    """
    try:
        result = await update_shelter(
            shelter_id=shelter_id,
            update_data=update_data,
            user_id=current_user.get("id")
        )
        return {
            "status": "success",
            "message": "Shelter updated successfully",
            "shelter": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update shelter: {str(e)}")


@app.delete("/shelters/{shelter_id}")
async def api_delete_shelter(
    shelter_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Delete a shelter.
    
    Requires authentication. Only shelter owner can delete.
    """
    try:
        await delete_shelter(shelter_id=shelter_id, user_id=current_user.get("id"))
        return {
            "status": "success",
            "message": "Shelter deleted successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete shelter: {str(e)}")


# =====================
# RELIEF DIRECTORY ENDPOINTS
# =====================

@app.get("/relief-directory")
async def api_get_relief_directory(refresh: bool = Query(False, description="Force refresh from Google Sheets")):
    """
    Get all relief organizations from the flood relief donation directory.
    
    This data is sourced from a public Google Sheet and cached for 5 minutes.
    The response includes organization details organized by category.
    
    For interactive features (adding/editing), users are redirected to the Google Sheet.
    """
    try:
        directory = await get_relief_directory(force_refresh=refresh)
        return directory.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch relief directory: {str(e)}")


@app.get("/relief-directory/category/{category}")
async def api_get_relief_by_category(
    category: str,
):
    """
    Get relief organizations filtered by category.
    
    Available categories: general, animal_rescue, meals, overseas
    """
    try:
        result = await get_relief_by_category(category)
        if not result.get("success"):
            raise HTTPException(status_code=404, detail=result.get("error"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch category: {str(e)}")


@app.get("/relief-directory/search")
async def api_search_relief(
    q: str = Query(..., min_length=2, description="Search query")
):
    """
    Search relief organizations by name, location, or items.
    
    Searches across all categories and returns matching organizations.
    """
    try:
        result = await search_relief_organizations(q)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/relief-directory/sheet-url")
async def api_get_sheet_url():
    """
    Get the Google Sheet URL for users who want to interact with the directory.
    
    Since this is a read-only view, users who want to add or edit entries
    should be redirected to the actual Google Sheet.
    """
    return {
        "url": get_google_sheet_url(),
        "message": "To add or edit relief organizations, please use the Google Sheet directly."
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    print("🛰️ LankaSat Live API starting...")
    print(f"📍 Sri Lanka center: {settings.SRI_LANKA_CENTER}")
    print(f"🔧 CORS origins: {settings.CORS_ORIGINS}")
    
    # Verify Sentinel Hub credentials
    try:
        await get_access_token()
        print("✅ Sentinel Hub authentication successful")
    except Exception as e:
        print(f"⚠️ Sentinel Hub authentication failed: {e}")
    
    # Verify OpenWeatherMap API
    if settings.OPENWEATHER_API_KEY:
        print("✅ OpenWeatherMap API key configured")
    else:
        print("⚠️ OpenWeatherMap API key not set - weather features disabled")
    
    # Verify Supabase configuration
    if settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY:
        print("✅ Supabase configured (non-legacy keys)")
        print(f"   URL: {settings.SUPABASE_URL}")
    else:
        print("⚠️ Supabase not configured - shelter/auth features may fail")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("🛰️ LankaSat Live API shutting down...")
    tile_cache.clear()
    token_cache.clear()
    weather_cache.clear()
