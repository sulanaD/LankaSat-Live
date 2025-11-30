"""
OpenWeatherMap API integration for Sri Lanka weather data.
Provides current weather, forecasts, and historical data for flood analysis context.
"""

import httpx
from datetime import datetime, timedelta
from typing import Optional
from .config import get_settings
from .cache import weather_cache

settings = get_settings()


# Key locations in Sri Lanka for weather monitoring
SRI_LANKA_LOCATIONS = {
    "colombo": {"lat": 6.93, "lon": 79.85, "name": "Colombo", "region": "Western Province"},
    "kandy": {"lat": 7.29, "lon": 80.63, "name": "Kandy", "region": "Central Province"},
    "jaffna": {"lat": 9.66, "lon": 80.01, "name": "Jaffna", "region": "Northern Province"},
    "trincomalee": {"lat": 8.57, "lon": 81.23, "name": "Trincomalee", "region": "Eastern Province"},
    "batticaloa": {"lat": 7.73, "lon": 81.70, "name": "Batticaloa", "region": "Eastern Province"},
    "galle": {"lat": 6.05, "lon": 80.22, "name": "Galle", "region": "Southern Province"},
    "anuradhapura": {"lat": 8.31, "lon": 80.41, "name": "Anuradhapura", "region": "North Central Province"},
    "ratnapura": {"lat": 6.68, "lon": 80.40, "name": "Ratnapura", "region": "Sabaragamuwa Province"},
    "badulla": {"lat": 6.99, "lon": 81.06, "name": "Badulla", "region": "Uva Province"},
}

# Sri Lanka center coordinates
SRI_LANKA_CENTER = {"lat": 7.8731, "lon": 80.7718}


async def fetch_weather_data(lat: float, lon: float, exclude: str = "minutely") -> Optional[dict]:
    """
    Fetch comprehensive weather data from OpenWeatherMap One Call API 3.0.
    
    Args:
        lat: Latitude
        lon: Longitude
        exclude: Comma-separated list to exclude (minutely, hourly, daily, alerts)
    
    Returns:
        Weather data dict or None if failed
    """
    if not settings.OPENWEATHER_API_KEY:
        return None
    
    cache_key = f"weather_{lat}_{lon}_{exclude}"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    url = "https://api.openweathermap.org/data/3.0/onecall"
    params = {
        "lat": lat,
        "lon": lon,
        "exclude": exclude,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                weather_cache.set(cache_key, data, ttl=600)  # Cache for 10 minutes
                return data
            else:
                print(f"OpenWeatherMap API error: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        print(f"Weather fetch error: {e}")
        return None


async def fetch_weather_simple(lat: float, lon: float) -> Optional[dict]:
    """
    Fetch current weather using the simple 2.5 API (free tier).
    Falls back to this if One Call 3.0 is not available.
    """
    if not settings.OPENWEATHER_API_KEY:
        return None
    
    cache_key = f"weather_simple_{lat}_{lon}"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                weather_cache.set(cache_key, data, ttl=600)
                return data
            else:
                print(f"Weather API error: {response.status_code}")
                return None
    except Exception as e:
        print(f"Weather fetch error: {e}")
        return None


async def fetch_forecast(lat: float, lon: float) -> Optional[dict]:
    """
    Fetch 5-day/3-hour forecast data.
    """
    if not settings.OPENWEATHER_API_KEY:
        return None
    
    cache_key = f"forecast_{lat}_{lon}"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                weather_cache.set(cache_key, data, ttl=1800)  # Cache for 30 min
                return data
            else:
                return None
    except Exception as e:
        print(f"Forecast fetch error: {e}")
        return None


async def get_sri_lanka_weather_summary() -> dict:
    """
    Get comprehensive weather summary for all key Sri Lanka locations.
    Used to provide context to the AI chatbot.
    """
    cache_key = "sri_lanka_weather_summary"
    cached = weather_cache.get(cache_key)
    if cached:
        return cached
    
    summary = {
        "timestamp": datetime.utcnow().isoformat(),
        "locations": {},
        "alerts": [],
        "monsoon_status": get_monsoon_status(),
        "flood_risk_assessment": {}
    }
    
    total_rainfall_24h = 0
    locations_with_rain = 0
    max_rainfall = 0
    max_rainfall_location = None
    
    for location_id, loc_info in SRI_LANKA_LOCATIONS.items():
        weather = await fetch_weather_simple(loc_info["lat"], loc_info["lon"])
        
        if weather:
            rain_1h = weather.get("rain", {}).get("1h", 0)
            rain_3h = weather.get("rain", {}).get("3h", 0)
            
            location_data = {
                "name": loc_info["name"],
                "region": loc_info["region"],
                "coordinates": {"lat": loc_info["lat"], "lon": loc_info["lon"]},
                "current": {
                    "temperature": weather.get("main", {}).get("temp"),
                    "feels_like": weather.get("main", {}).get("feels_like"),
                    "humidity": weather.get("main", {}).get("humidity"),
                    "pressure": weather.get("main", {}).get("pressure"),
                    "description": weather.get("weather", [{}])[0].get("description", ""),
                    "icon": weather.get("weather", [{}])[0].get("icon", ""),
                    "wind_speed": weather.get("wind", {}).get("speed"),
                    "wind_direction": weather.get("wind", {}).get("deg"),
                    "clouds": weather.get("clouds", {}).get("all"),
                    "visibility": weather.get("visibility"),
                    "rain_1h": rain_1h,
                    "rain_3h": rain_3h,
                }
            }
            
            summary["locations"][location_id] = location_data
            
            # Track rainfall statistics
            if rain_1h > 0:
                locations_with_rain += 1
                total_rainfall_24h += rain_1h * 24  # Rough estimate
                if rain_1h > max_rainfall:
                    max_rainfall = rain_1h
                    max_rainfall_location = loc_info["name"]
    
    # Flood risk assessment based on rainfall
    flood_risk = "LOW"
    if total_rainfall_24h > 100 or max_rainfall > 20:
        flood_risk = "HIGH"
        summary["alerts"].append({
            "type": "FLOOD_WARNING",
            "message": f"Heavy rainfall detected. {max_rainfall_location} recording {max_rainfall}mm/h",
            "severity": "high"
        })
    elif total_rainfall_24h > 50 or max_rainfall > 10:
        flood_risk = "MODERATE"
        summary["alerts"].append({
            "type": "FLOOD_WATCH",
            "message": f"Moderate rainfall across Sri Lanka. Monitor flood-prone areas.",
            "severity": "moderate"
        })
    elif locations_with_rain >= 5:
        flood_risk = "ELEVATED"
        summary["alerts"].append({
            "type": "RAIN_ADVISORY",
            "message": "Widespread rainfall detected across multiple regions.",
            "severity": "low"
        })
    
    summary["flood_risk_assessment"] = {
        "overall_risk": flood_risk,
        "locations_with_rain": locations_with_rain,
        "max_rainfall_mm_per_hour": max_rainfall,
        "max_rainfall_location": max_rainfall_location,
        "estimated_24h_total_mm": round(total_rainfall_24h, 1)
    }
    
    weather_cache.set(cache_key, summary, ttl=600)  # Cache for 10 min
    return summary


def get_monsoon_status() -> dict:
    """
    Determine current monsoon status based on date.
    Sri Lanka has two monsoon seasons:
    - Southwest Monsoon (Yala): May to September
    - Northeast Monsoon (Maha): October to January
    - Inter-monsoon periods: March-April and October
    """
    now = datetime.utcnow()
    month = now.month
    
    if 5 <= month <= 9:
        return {
            "season": "Southwest Monsoon (Yala)",
            "active": True,
            "affected_regions": ["Western Province", "Southern Province", "Sabaragamuwa Province", "Central Province (western slopes)"],
            "expected_conditions": "Heavy rainfall in southwestern Sri Lanka, drier conditions in north and east",
            "flood_prone_areas": ["Colombo", "Galle", "Ratnapura", "Kalutara"]
        }
    elif month >= 10 or month <= 1:
        return {
            "season": "Northeast Monsoon (Maha)",
            "active": True,
            "affected_regions": ["Northern Province", "Eastern Province", "North Central Province", "Uva Province"],
            "expected_conditions": "Heavy rainfall in northern and eastern Sri Lanka",
            "flood_prone_areas": ["Batticaloa", "Trincomalee", "Jaffna", "Anuradhapura"]
        }
    elif 2 <= month <= 4:
        return {
            "season": "First Inter-monsoon",
            "active": False,
            "affected_regions": ["Entire island"],
            "expected_conditions": "Transitional period with scattered thunderstorms, particularly in afternoons",
            "flood_prone_areas": ["Central highlands", "Wet zone lowlands"]
        }
    else:
        return {
            "season": "Second Inter-monsoon",
            "active": False,
            "affected_regions": ["Entire island"],
            "expected_conditions": "Transitional period with afternoon thunderstorms",
            "flood_prone_areas": ["All provinces susceptible to flash floods"]
        }


async def get_weather_for_chatbot() -> str:
    """
    Generate a formatted weather summary string for the AI chatbot context.
    """
    summary = await get_sri_lanka_weather_summary()
    
    lines = [
        "=== CURRENT WEATHER CONDITIONS IN SRI LANKA ===",
        f"Report Time: {summary['timestamp']}",
        f"",
        f"MONSOON STATUS: {summary['monsoon_status']['season']}",
        f"Active: {'Yes' if summary['monsoon_status']['active'] else 'No (Inter-monsoon)'}",
        f"Affected Regions: {', '.join(summary['monsoon_status']['affected_regions'][:3])}",
        f"",
        f"FLOOD RISK ASSESSMENT:",
        f"Overall Risk Level: {summary['flood_risk_assessment']['overall_risk']}",
        f"Locations with Active Rain: {summary['flood_risk_assessment']['locations_with_rain']}/9",
    ]
    
    if summary['flood_risk_assessment']['max_rainfall_location']:
        lines.append(f"Highest Rainfall: {summary['flood_risk_assessment']['max_rainfall_mm_per_hour']}mm/h at {summary['flood_risk_assessment']['max_rainfall_location']}")
    
    lines.append("")
    lines.append("CURRENT CONDITIONS BY LOCATION:")
    
    for loc_id, loc_data in summary["locations"].items():
        current = loc_data.get("current", {})
        rain_info = ""
        if current.get("rain_1h", 0) > 0:
            rain_info = f" | Rain: {current['rain_1h']}mm/h"
        
        lines.append(
            f"• {loc_data['name']}: {current.get('temperature', 'N/A')}°C, "
            f"{current.get('humidity', 'N/A')}% humidity, "
            f"{current.get('description', 'N/A')}{rain_info}"
        )
    
    if summary["alerts"]:
        lines.append("")
        lines.append("⚠️ WEATHER ALERTS:")
        for alert in summary["alerts"]:
            lines.append(f"  [{alert['severity'].upper()}] {alert['message']}")
    
    return "\n".join(lines)


async def get_location_weather(location: str) -> Optional[dict]:
    """
    Get weather for a specific location by name.
    """
    location_lower = location.lower()
    
    # Check if it's a known location
    if location_lower in SRI_LANKA_LOCATIONS:
        loc = SRI_LANKA_LOCATIONS[location_lower]
        return await fetch_weather_simple(loc["lat"], loc["lon"])
    
    # Try to find a partial match
    for loc_id, loc_info in SRI_LANKA_LOCATIONS.items():
        if location_lower in loc_info["name"].lower() or location_lower in loc_info["region"].lower():
            return await fetch_weather_simple(loc_info["lat"], loc_info["lon"])
    
    return None
