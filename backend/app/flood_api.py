"""
Sri Lanka Flood Data API Integration.
Fetches real-time river water level and flood monitoring data from the
lk-flood-api (https://lk-flood-api.vercel.app).

Data is sourced from Sri Lanka's Disaster Management Center (DMC) via
the nuuuwan/lk_dmc_vis data pipeline.
"""

import httpx
from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel
from .cache import weather_cache


# API Base URL - The deployed lk_flood_api
LK_FLOOD_API_URL = "https://lk-flood-api.vercel.app"


# Data Models
class AlertLevel(str, Enum):
    MAJOR = "MAJOR"
    MINOR = "MINOR"
    ALERT = "ALERT"
    NORMAL = "NORMAL"
    NO_DATA = "NO_DATA"


class GaugingStation(BaseModel):
    name: str
    river_name: str
    lat_lng: List[float]
    alert_level: float
    minor_flood_level: float
    major_flood_level: float


class WaterLevelReading(BaseModel):
    station_name: str
    river_name: str
    water_level: Optional[float]
    previous_water_level: Optional[float]
    alert_status: AlertLevel
    flood_score: Optional[float]
    rising_or_falling: Optional[str]
    rainfall_mm: Optional[float]
    remarks: Optional[str]
    timestamp: str


class AlertSummary(BaseModel):
    alert_level: AlertLevel
    count: int
    stations: List[str]


class River(BaseModel):
    name: str
    river_basin_name: str
    location_names: List[str] = []


class RiverBasin(BaseModel):
    name: str
    code: str


# API Functions
async def fetch_stations() -> List[dict]:
    """
    Get all gauging stations with their metadata and threshold levels.
    Returns list of 39 stations across Sri Lanka.
    """
    cache_key = "lk_flood_stations"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/stations")
            response.raise_for_status()
            data = response.json()
            weather_cache.set(cache_key, data, ttl=900)  # Cache for 15 minutes
            return data
    except Exception as e:
        print(f"Error fetching stations: {e}")
        return []


async def fetch_latest_water_levels() -> List[dict]:
    """
    Get the latest water level readings for all stations.
    This is the primary endpoint for real-time flood monitoring.
    """
    cache_key = "lk_flood_latest_levels"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/levels/latest")
            response.raise_for_status()
            data = response.json()
            weather_cache.set(cache_key, data, ttl=300)  # Cache for 5 minutes
            return data
    except Exception as e:
        print(f"Error fetching water levels: {e}")
        return []


async def fetch_active_alerts() -> List[dict]:
    """
    Get all stations currently in ALERT, MINOR, or MAJOR status.
    Sorted by severity: MAJOR > MINOR > ALERT
    """
    cache_key = "lk_flood_active_alerts"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/alerts")
            response.raise_for_status()
            data = response.json()
            weather_cache.set(cache_key, data, ttl=300)  # Cache for 5 minutes
            return data
    except Exception as e:
        print(f"Error fetching alerts: {e}")
        return []


async def fetch_alert_summary() -> List[dict]:
    """
    Get a summary count of stations by alert level.
    Returns count of MAJOR, MINOR, ALERT, NORMAL, NO_DATA stations.
    """
    cache_key = "lk_flood_alert_summary"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/alerts/summary")
            response.raise_for_status()
            data = response.json()
            weather_cache.set(cache_key, data, ttl=300)  # Cache for 5 minutes
            return data
    except Exception as e:
        print(f"Error fetching alert summary: {e}")
        return []


async def fetch_rivers() -> List[dict]:
    """Get all rivers with their basin assignments."""
    cache_key = "lk_flood_rivers"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/rivers")
            response.raise_for_status()
            data = response.json()
            weather_cache.set(cache_key, data, ttl=3600)  # Cache for 1 hour
            return data
    except Exception as e:
        print(f"Error fetching rivers: {e}")
        return []


async def fetch_basins() -> List[dict]:
    """Get all river basins."""
    cache_key = "lk_flood_basins"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/basins")
            response.raise_for_status()
            data = response.json()
            weather_cache.set(cache_key, data, ttl=3600)  # Cache for 1 hour
            return data
    except Exception as e:
        print(f"Error fetching basins: {e}")
        return []


async def fetch_station_by_name(name: str) -> Optional[dict]:
    """Get a specific station by name with its latest water level reading."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/stations/{name}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"Error fetching station {name}: {e}")
        return None


async def get_flood_data_summary() -> dict:
    """
    Get comprehensive flood data summary for Sri Lanka.
    Combines multiple API calls for a complete picture.
    """
    cache_key = "lk_flood_summary"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    # Fetch all data in parallel
    levels = await fetch_latest_water_levels()
    summary = await fetch_alert_summary()
    
    # Process alert summary
    alert_counts = {}
    for item in summary:
        alert_counts[item.get("alert_level", "UNKNOWN")] = {
            "count": item.get("count", 0),
            "stations": item.get("stations", [])
        }
    
    # Find critical stations
    critical_stations = []
    high_risk_stations = []
    rising_stations = []
    
    for level in levels:
        status = level.get("alert_status", "NORMAL")
        if status == "MAJOR":
            critical_stations.append({
                "name": level.get("station_name"),
                "river": level.get("river_name"),
                "water_level": level.get("water_level"),
                "flood_score": level.get("flood_score"),
                "trend": level.get("rising_or_falling"),
                "remarks": level.get("remarks")
            })
        elif status == "MINOR":
            high_risk_stations.append({
                "name": level.get("station_name"),
                "river": level.get("river_name"),
                "water_level": level.get("water_level"),
                "trend": level.get("rising_or_falling")
            })
        
        if level.get("rising_or_falling") == "Rising":
            rising_stations.append({
                "name": level.get("station_name"),
                "river": level.get("river_name"),
                "status": status
            })
    
    # Calculate overall flood risk
    major_count = alert_counts.get("MAJOR", {}).get("count", 0)
    minor_count = alert_counts.get("MINOR", {}).get("count", 0)
    alert_count = alert_counts.get("ALERT", {}).get("count", 0)
    
    if major_count > 0:
        overall_risk = "CRITICAL"
    elif minor_count > 0:
        overall_risk = "HIGH"
    elif alert_count > 0:
        overall_risk = "ELEVATED"
    else:
        overall_risk = "NORMAL"
    
    result = {
        "timestamp": datetime.utcnow().isoformat(),
        "overall_risk": overall_risk,
        "total_stations": len(levels),
        "alert_summary": alert_counts,
        "critical_stations": critical_stations,
        "high_risk_stations": high_risk_stations,
        "rising_stations": rising_stations,
        "rising_count": len(rising_stations),
        "data_source": "Sri Lanka Disaster Management Center (DMC)"
    }
    
    weather_cache.set(cache_key, result, ttl=300)
    return result


async def get_flood_data_for_chatbot() -> str:
    """
    Generate a formatted flood data string for the AI chatbot context.
    """
    summary = await get_flood_data_summary()
    
    lines = [
        "=== LIVE RIVER WATER LEVEL DATA (Sri Lanka DMC) ===",
        f"Report Time: {summary['timestamp']}",
        f"Data Source: {summary['data_source']}",
        "",
        f"OVERALL FLOOD RISK: {summary['overall_risk']}",
        f"Total Monitoring Stations: {summary['total_stations']}",
        ""
    ]
    
    # Alert summary
    alert_summary = summary.get("alert_summary", {})
    lines.append("STATION STATUS BREAKDOWN:")
    if "MAJOR" in alert_summary:
        lines.append(f"  - MAJOR FLOOD: {alert_summary['MAJOR']['count']} stations")
    if "MINOR" in alert_summary:
        lines.append(f"  - MINOR FLOOD: {alert_summary['MINOR']['count']} stations")
    if "ALERT" in alert_summary:
        lines.append(f"  - ALERT LEVEL: {alert_summary['ALERT']['count']} stations")
    if "NORMAL" in alert_summary:
        lines.append(f"  - NORMAL: {alert_summary['NORMAL']['count']} stations")
    
    # Critical stations
    if summary.get("critical_stations"):
        lines.append("")
        lines.append("CRITICAL STATIONS (MAJOR FLOOD):")
        for station in summary["critical_stations"][:5]:
            trend = f" ({station['trend']})" if station.get('trend') else ""
            level = f"{station['water_level']:.2f}m" if station.get('water_level') else "N/A"
            lines.append(f"  - {station['name']} on {station['river']}: {level}{trend}")
    
    # High risk stations
    if summary.get("high_risk_stations"):
        lines.append("")
        lines.append("HIGH RISK STATIONS (MINOR FLOOD):")
        for station in summary["high_risk_stations"][:5]:
            trend = f" ({station['trend']})" if station.get('trend') else ""
            level = f"{station['water_level']:.2f}m" if station.get('water_level') else "N/A"
            lines.append(f"  - {station['name']} on {station['river']}: {level}{trend}")
    
    # Rising water levels
    if summary.get("rising_count", 0) > 0:
        lines.append("")
        lines.append(f"WARNING: {summary['rising_count']} stations showing RISING water levels")
    
    lines.append("")
    lines.append("Use this data to correlate satellite imagery observations with actual flood conditions.")
    
    return "\n".join(lines)


# Utility functions for specific queries
async def get_stations_on_river(river_name: str) -> List[dict]:
    """Get all stations on a specific river."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/rivers/{river_name}/stations")
            if response.status_code == 404:
                return []
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"Error fetching stations for river {river_name}: {e}")
        return []


async def get_rivers_in_basin(basin_name: str) -> List[dict]:
    """Get all rivers in a specific basin."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{LK_FLOOD_API_URL}/basins/{basin_name}/rivers")
            if response.status_code == 404:
                return []
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"Error fetching rivers for basin {basin_name}: {e}")
        return []


def get_flood_map_url() -> str:
    """Get the URL for the current flood map image."""
    return f"{LK_FLOOD_API_URL}/levels/map"


def get_station_chart_url(station_name: str) -> str:
    """Get the URL for a station's water level chart."""
    return f"{LK_FLOOD_API_URL}/levels/chart/{station_name}"
