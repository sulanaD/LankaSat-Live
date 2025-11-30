"""Sentinel Hub API integration module."""

import httpx
from datetime import datetime, timedelta
from typing import Optional
import hashlib

from .config import get_settings
from .cache import token_cache, tile_cache

settings = get_settings()


# Layer definitions with evalscripts
LAYERS = {
    "S1_VV": {
        "name": "Sentinel-1 VV",
        "description": "Radar VV polarization",
        "type": "sentinel-1-grd",
        "evalscript": """//VERSION=3
function setup() {
    return {
        input: ["VV"],
        output: { bands: 1, sampleType: "AUTO" }
    };
}

function evaluatePixel(sample) {
    return [2 * sample.VV];
}""",
        "mosaickingOrder": "mostRecent",
        "maxCloudCoverage": 100
    },
    "S1_VH": {
        "name": "Sentinel-1 VH",
        "description": "Radar VH polarization",
        "type": "sentinel-1-grd",
        "evalscript": """//VERSION=3
function setup() {
    return {
        input: ["VH"],
        output: { bands: 1, sampleType: "AUTO" }
    };
}

function evaluatePixel(sample) {
    return [2 * sample.VH];
}""",
        "mosaickingOrder": "mostRecent",
        "maxCloudCoverage": 100
    },
    "S1_FLOOD": {
        "name": "Sentinel-1 Flood Detection",
        "description": "Enhanced VV+VH for flood visualization",
        "type": "sentinel-1-grd",
        "evalscript": """//VERSION=3
function setup() {
    return {
        input: ["VV", "VH"],
        output: { bands: 3, sampleType: "AUTO" }
    };
}

function evaluatePixel(sample) {
    let vv = sample.VV;
    let vh = sample.VH;
    let water = (vv < 0.05 && vh < 0.05) ? 1 : 0;
    return [vv * 3, vh * 3, water * 0.8];
}""",
        "mosaickingOrder": "mostRecent",
        "maxCloudCoverage": 100
    },
    "S2_TRUE_COLOR": {
        "name": "Sentinel-2 True Color",
        "description": "Natural color RGB",
        "type": "sentinel-2-l2a",
        "evalscript": """//VERSION=3
function setup() {
    return {
        input: ["B04", "B03", "B02"],
        output: { bands: 3, sampleType: "AUTO" }
    };
}

function evaluatePixel(sample) {
    return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}""",
        "mosaickingOrder": "leastCC",
        "maxCloudCoverage": 30
    },
    "S2_FALSE_COLOR": {
        "name": "Sentinel-2 False Color",
        "description": "Vegetation highlighting",
        "type": "sentinel-2-l2a",
        "evalscript": """//VERSION=3
function setup() {
    return {
        input: ["B08", "B04", "B03"],
        output: { bands: 3, sampleType: "AUTO" }
    };
}

function evaluatePixel(sample) {
    return [2.5 * sample.B08, 2.5 * sample.B04, 2.5 * sample.B03];
}""",
        "mosaickingOrder": "leastCC",
        "maxCloudCoverage": 30
    },
    "S2_NDVI": {
        "name": "Sentinel-2 NDVI",
        "description": "Vegetation index",
        "type": "sentinel-2-l2a",
        "evalscript": """//VERSION=3
function setup() {
    return {
        input: ["B04", "B08"],
        output: { bands: 3, sampleType: "AUTO" }
    };
}

function evaluatePixel(sample) {
    let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
    if (ndvi < 0) return [0.8, 0.2, 0.2];
    if (ndvi < 0.2) return [0.9, 0.8, 0.4];
    if (ndvi < 0.4) return [0.8, 0.9, 0.4];
    if (ndvi < 0.6) return [0.4, 0.8, 0.2];
    return [0.1, 0.5, 0.1];
}""",
        "mosaickingOrder": "leastCC",
        "maxCloudCoverage": 30
    },
    "S2_NDWI": {
        "name": "Sentinel-2 NDWI",
        "description": "Water detection index",
        "type": "sentinel-2-l2a",
        "evalscript": """//VERSION=3
function setup() {
    return {
        input: ["B03", "B08"],
        output: { bands: 3, sampleType: "AUTO" }
    };
}

function evaluatePixel(sample) {
    let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
    if (ndwi > 0.3) return [0.1, 0.3, 0.9];
    if (ndwi > 0.1) return [0.3, 0.5, 0.8];
    if (ndwi > 0) return [0.5, 0.6, 0.7];
    return [0.6, 0.5, 0.4];
}""",
        "mosaickingOrder": "leastCC",
        "maxCloudCoverage": 30
    }
}


async def get_access_token() -> str:
    """
    Get Sentinel Hub OAuth access token with caching.
    
    Returns:
        Access token string
    """
    cached_token = token_cache.get("sentinel_token")
    if cached_token:
        return cached_token
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            settings.SENTINEL_AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": settings.SENTINEL_CLIENT_ID,
                "client_secret": settings.SENTINEL_CLIENT_SECRET
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        response.raise_for_status()
        token_data = response.json()
        
        access_token = token_data["access_token"]
        token_cache.set("sentinel_token", access_token)
        
        return access_token


def tile_to_bbox(z: int, x: int, y: int) -> tuple:
    """
    Convert tile coordinates to bounding box.
    
    Args:
        z: Zoom level
        x: Tile X coordinate
        y: Tile Y coordinate
    
    Returns:
        Tuple of (west, south, east, north)
    """
    import math
    
    n = 2.0 ** z
    
    # West and East longitude
    west = x / n * 360.0 - 180.0
    east = (x + 1) / n * 360.0 - 180.0
    
    # North and South latitude
    lat_rad_n = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    north = math.degrees(lat_rad_n)
    
    lat_rad_s = math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n)))
    south = math.degrees(lat_rad_s)
    
    return (west, south, east, north)


async def fetch_tile(
    layer: str,
    z: int,
    x: int,
    y: int,
    date: str,
    width: int = 256,
    height: int = 256
) -> Optional[bytes]:
    """
    Fetch a tile from Sentinel Hub Process API.
    
    Args:
        layer: Layer identifier (e.g., 'S1_VV', 'S2_TRUE_COLOR')
        z: Zoom level
        x: Tile X coordinate
        y: Tile Y coordinate
        date: Date string in YYYY-MM-DD format
        width: Tile width in pixels
        height: Tile height in pixels
    
    Returns:
        PNG image bytes or None
    """
    # Generate cache key
    cache_key = f"{layer}_{z}_{x}_{y}_{date}"
    cache_hash = hashlib.md5(cache_key.encode()).hexdigest()
    
    # Check cache
    cached_tile = tile_cache.get(cache_hash)
    if cached_tile:
        return cached_tile
    
    # Get layer config
    layer_config = LAYERS.get(layer)
    if not layer_config:
        return None
    
    # Convert tile coordinates to bbox
    bbox = tile_to_bbox(z, x, y)
    
    # Parse date and create time range
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        target_date = datetime.now()
    
    # Create time range (7 days before to allow finding imagery)
    time_from = (target_date - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00Z")
    time_to = target_date.strftime("%Y-%m-%dT23:59:59Z")
    
    # Get access token
    token = await get_access_token()
    
    # Build Process API request
    request_body = {
        "input": {
            "bounds": {
                "bbox": list(bbox),
                "properties": {
                    "crs": "http://www.opengis.net/def/crs/EPSG/0/4326"
                }
            },
            "data": [
                {
                    "type": layer_config["type"],
                    "dataFilter": {
                        "timeRange": {
                            "from": time_from,
                            "to": time_to
                        },
                        "mosaickingOrder": layer_config["mosaickingOrder"]
                    }
                }
            ]
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [
                {
                    "identifier": "default",
                    "format": {
                        "type": "image/png"
                    }
                }
            ]
        },
        "evalscript": layer_config["evalscript"]
    }
    
    # Add cloud coverage filter for Sentinel-2
    if "sentinel-2" in layer_config["type"]:
        request_body["input"]["data"][0]["dataFilter"]["maxCloudCoverage"] = layer_config["maxCloudCoverage"]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.SENTINEL_PROCESS_URL,
                json=request_body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "image/png"
                }
            )
            
            if response.status_code == 200:
                tile_data = response.content
                # Cache the tile
                tile_cache.set(cache_hash, tile_data)
                return tile_data
            else:
                print(f"Sentinel Hub error: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        print(f"Error fetching tile: {e}")
        return None


def get_available_layers() -> list:
    """
    Get list of available layers with metadata.
    
    Returns:
        List of layer information dictionaries
    """
    return [
        {
            "id": layer_id,
            "name": layer_info["name"],
            "description": layer_info["description"],
            "type": layer_info["type"]
        }
        for layer_id, layer_info in LAYERS.items()
    ]


def validate_date(date_str: str) -> str:
    """
    Validate and normalize date string.
    
    Args:
        date_str: Date string to validate
    
    Returns:
        Normalized date string in YYYY-MM-DD format
    """
    try:
        date = datetime.strptime(date_str, "%Y-%m-%d")
        # Clamp to valid range (2017 to today)
        min_date = datetime(2017, 1, 1)
        max_date = datetime.now()
        
        if date < min_date:
            date = min_date
        elif date > max_date:
            date = max_date
        
        return date.strftime("%Y-%m-%d")
    except ValueError:
        return datetime.now().strftime("%Y-%m-%d")
