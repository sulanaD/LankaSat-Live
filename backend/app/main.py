"""FastAPI main application module for LankaSat Live."""

from fastapi import FastAPI, HTTPException, Query, Response, Body
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


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("🛰️ LankaSat Live API shutting down...")
    tile_cache.clear()
    token_cache.clear()
    weather_cache.clear()
