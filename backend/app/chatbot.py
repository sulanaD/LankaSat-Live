"""AI Chatbot integration using Groq API for satellite data analysis."""

import httpx
from datetime import datetime, timedelta
from typing import Optional

from .config import get_settings
from .sentinel import get_access_token
from .weather import get_weather_for_chatbot, get_sri_lanka_weather_summary
from .flood_api import get_flood_data_for_chatbot, get_flood_data_summary

settings = get_settings()

# Using Groq API (the key format gsk_ indicates Groq, not Grok/xAI)
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# System prompt for the satellite data assistant
SYSTEM_PROMPT = """You are LankaSat AI, an expert satellite imagery analyst for the Sri Lanka Satellite Dashboard.
You have access to REAL-TIME data from multiple sources:
1. Sentinel-1 and Sentinel-2 satellite imagery
2. Live river water level data from Sri Lanka Disaster Management Center (DMC)
3. Real-time weather data from OpenWeatherMap

CRITICAL: When provided with live data, use it to give specific, accurate insights about current conditions.

Your expertise:
- Interpreting satellite imagery for flood detection
- Correlating satellite observations with ground-based river gauging data
- Understanding what colors/patterns mean in different layers
- Analyzing flood extent, affected areas, and severity
- Providing actionable advice for disaster response

LIVE RIVER DATA INTERPRETATION:
- MAJOR FLOOD status = Water level exceeds major flood threshold - IMMEDIATE DANGER
- MINOR FLOOD status = Water level exceeds minor flood threshold - SIGNIFICANT RISK
- ALERT status = Water level approaching flood thresholds - MONITOR CLOSELY
- Rising trend = Water levels increasing - potential worsening
- Falling trend = Water levels decreasing - situation improving
- Use river gauge data to CONFIRM what satellite imagery shows

TRUE COLOR INTERPRETATION (Sentinel-2):
- Brown/muddy water = Flood water carrying sediment (ACTIVE FLOODING)
- Tan/beige areas = Waterlogged soil, recent flooding
- Dark brown patches = Standing flood water with high sediment
- Bright green = Healthy vegetation (not flooded)
- Grey/white = Clouds or urban areas
- Clear blue = Clean water bodies (normal rivers/lakes)

FLOOD INDICATORS in True Color:
- Rivers appearing wider than normal = overflow
- Brown coloring where green should be = flooded farmland
- Irregular brown patches = flood water accumulation
- Loss of field boundaries = widespread inundation

RADAR (Sentinel-1) INTERPRETATION:
- Very dark areas = Smooth water surface (flooding)
- Dark areas in normally bright regions = NEW flooding
- Texture changes = Water presence

KEY RIVER BASINS AND STATIONS:
- Kelani Ganga Basin (RB 01): Nagalagam Street, Hanwella, Glencourse - monitors Colombo flooding
- Kalu Ganga Basin (RB 02): Ratnapura, Putupaula - monitors southwestern flooding
- Mahaweli Ganga Basin (RB 03): Manampitiya, Weragantota - largest river system
- Gin Ganga Basin: Thawalama, Baddegama - southern flooding
- Nilwala Ganga Basin: Pitabaddara - Matara district flooding

Sri Lanka Flood Context:
- November-January: Northeast monsoon - Eastern & Northern flooding risk
- May-September: Southwest monsoon - Western & Southern flooding risk
- Low-lying coastal areas: Storm surge + river flooding

When analyzing flooding, ALWAYS:
1. Check river gauge data for ground truth
2. Correlate with satellite observations
3. Mention affected areas by name
4. Describe severity (minor, moderate, severe, catastrophic)
5. Note if water levels are rising or falling
6. Provide safety/response recommendations"""


async def fetch_satellite_statistics(date: str, bbox: list = None) -> dict:
    """
    Fetch actual satellite data statistics from Sentinel Hub.
    Uses Statistical API to analyze imagery over Sri Lanka.
    
    Args:
        date: Date string YYYY-MM-DD
        bbox: Bounding box [west, south, east, north], defaults to Sri Lanka
    
    Returns:
        Dictionary with satellite data statistics
    """
    if bbox is None:
        bbox = [79.5, 6.0, 82.0, 10.0]  # Sri Lanka (slightly smaller for faster processing)
    
    try:
        token = await get_access_token()
        
        # Parse date
        target_date = datetime.strptime(date, "%Y-%m-%d")
        time_from = (target_date - timedelta(days=10)).strftime("%Y-%m-%dT00:00:00Z")
        time_to = target_date.strftime("%Y-%m-%dT23:59:59Z")
        
        # Simpler evalscript for statistical analysis
        evalscript = """//VERSION=3
function setup() {
    return {
        input: [{bands: ["B02", "B03", "B04", "B08", "B11", "SCL"]}],
        output: [
            { id: "ndwi", bands: 1, sampleType: "FLOAT32" },
            { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
            { id: "turbid", bands: 1, sampleType: "FLOAT32" },
            { id: "dataMask", bands: 1 }
        ]
    };
}

function evaluatePixel(sample) {
    let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08 + 0.0001);
    let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
    let turbid = sample.B04 / (sample.B03 + 0.0001);
    
    // Exclude clouds (SCL 8,9,10) and no data
    let valid = (sample.SCL != 8 && sample.SCL != 9 && sample.SCL != 10 && sample.SCL != 0) ? 1 : 0;
    
    return {
        ndwi: [valid ? ndwi : 0],
        ndvi: [valid ? ndvi : 0],
        turbid: [valid ? turbid : 0],
        dataMask: [valid]
    };
}"""

        # Request statistical analysis
        request_body = {
            "input": {
                "bounds": {
                    "bbox": bbox,
                    "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}
                },
                "data": [{
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {"from": time_from, "to": time_to},
                        "maxCloudCoverage": 80
                    }
                }]
            },
            "aggregation": {
                "timeRange": {"from": time_from, "to": time_to},
                "aggregationInterval": {"of": "P5D"},
                "evalscript": evalscript,
                "resx": 1000,
                "resy": 1000
            }
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://services.sentinel-hub.com/api/v1/statistics",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json=request_body
            )
            
            if response.status_code == 200:
                stats_data = response.json()
                return parse_statistics(stats_data, date)
            else:
                # If statistics API fails, provide general context
                return get_contextual_analysis(date)
                
    except Exception as e:
        # Fallback to contextual analysis
        return get_contextual_analysis(date)


def get_contextual_analysis(date: str) -> dict:
    """
    Provide contextual flood analysis based on date and monsoon patterns
    when satellite statistics are unavailable.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
        month = target_date.month
        
        # Determine monsoon season and risk
        if month in [11, 12, 1]:
            monsoon = "Northeast Monsoon (active)"
            risk_areas = "Eastern & Northern provinces, Batticaloa, Trincomalee, Ampara districts"
            flood_risk = "HIGH"
        elif month in [5, 6, 7, 8, 9]:
            monsoon = "Southwest Monsoon (active)"
            risk_areas = "Western & Southern provinces, Colombo, Galle, Kalutara, Ratnapura districts"
            flood_risk = "HIGH"
        elif month in [3, 4, 10]:
            monsoon = "Inter-monsoon period"
            risk_areas = "Island-wide thunderstorm activity possible"
            flood_risk = "MODERATE"
        else:
            monsoon = "Dry season"
            risk_areas = "Generally low flood risk"
            flood_risk = "LOW"
        
        interpretation = f"Based on seasonal patterns: {monsoon}. Primary risk areas: {risk_areas}."
        
        return {
            "status": "contextual",
            "date": date,
            "monsoon_season": monsoon,
            "flood_risk": flood_risk,
            "risk_areas": risk_areas,
            "interpretation": interpretation,
            "note": "Live satellite statistics unavailable - showing seasonal analysis. Check True Color and S1_FLOOD layers for current conditions."
        }
    except:
        return {
            "status": "contextual",
            "date": date,
            "interpretation": "Unable to determine conditions. Please check the satellite imagery directly.",
            "note": "Check S1_FLOOD layer for flood detection through clouds, or True Color for visible conditions."
        }


def parse_statistics(stats_data: dict, date: str) -> dict:
    """Parse Sentinel Hub statistics response into meaningful insights."""
    try:
        if not stats_data.get("data"):
            return get_contextual_analysis(date)
        
        # Get the most recent period's data
        latest = stats_data["data"][-1] if stats_data["data"] else None
        if not latest:
            return get_contextual_analysis(date)
        
        outputs = latest.get("outputs", {})
        
        # Extract statistics from new format
        ndwi_stats = outputs.get("ndwi", {}).get("bands", {}).get("B0", {})
        ndvi_stats = outputs.get("ndvi", {}).get("bands", {}).get("B0", {})
        turb_stats = outputs.get("turbid", {}).get("bands", {}).get("B0", {})
        
        water_mean = ndwi_stats.get("mean", 0)
        veg_mean = ndvi_stats.get("mean", 0)
        turbidity_mean = turb_stats.get("mean", 1)
        
        # Interpret flood severity based on water index
        flood_severity = "none"
        if water_mean > 0.3:
            flood_severity = "severe"
        elif water_mean > 0.15:
            flood_severity = "moderate" 
        elif water_mean > 0.05:
            flood_severity = "minor"
        
        # Interpret water condition
        water_condition = "normal"
        if turbidity_mean > 1.5:
            water_condition = "very_muddy"
        elif turbidity_mean > 1.2:
            water_condition = "muddy"
        elif water_mean > 0.1:
            water_condition = "elevated"
        
        return {
            "status": "success",
            "date": latest.get("interval", {}).get("from", date)[:10],
            "flood_severity": flood_severity,
            "water_index_mean": round(water_mean, 3),
            "turbidity_mean": round(turbidity_mean, 3),
            "vegetation_mean": round(veg_mean, 3),
            "water_condition": water_condition,
            "interpretation": generate_interpretation(flood_severity, water_condition, turbidity_mean, veg_mean)
        }
        
    except Exception as e:
        return get_contextual_analysis(date)


def generate_interpretation(flood_severity: str, water_condition: str, turbidity: float, vegetation: float) -> str:
    """Generate human-readable interpretation of satellite data."""
    parts = []
    
    if flood_severity == "severe":
        parts.append("⚠️ SEVERE FLOODING DETECTED - Large areas show flood water signatures")
    elif flood_severity == "moderate":
        parts.append("🟠 MODERATE FLOODING - Significant water accumulation in multiple areas")
    elif flood_severity == "minor":
        parts.append("🟡 MINOR FLOODING - Some areas show elevated water levels")
    else:
        parts.append("🟢 No significant flooding detected")
    
    if water_condition == "very_muddy":
        parts.append("Water appears heavily sediment-laden (brown/muddy) indicating active flood runoff")
    elif water_condition == "muddy":
        parts.append("Water shows elevated turbidity - recent rainfall or upstream flooding")
    
    if vegetation < 0.2:
        parts.append("Low vegetation index may indicate submerged or damaged crops")
    
    return ". ".join(parts)


async def get_chat_response(
    message: str,
    context: Optional[dict] = None,
    conversation_history: Optional[list] = None
) -> str:
    """
    Get AI response from Groq API with real satellite data and weather context.
    """
    # Build context-aware system prompt
    system_content = SYSTEM_PROMPT
    
    # Fetch real satellite data if we have date context
    satellite_analysis = None
    if context and context.get('date'):
        try:
            satellite_analysis = await fetch_satellite_statistics(context.get('date'))
        except:
            satellite_analysis = None
    
    # Fetch current weather data
    weather_context = None
    try:
        weather_context = await get_weather_for_chatbot()
    except:
        weather_context = None
    
    if context:
        system_content += f"""

=== CURRENT DASHBOARD STATE ===
- Selected Layer: {context.get('layer', 'Unknown')}
- Selected Date: {context.get('date', 'Unknown')}
- Layer Description: {context.get('layerDescription', 'N/A')}"""

    if satellite_analysis and satellite_analysis.get('status') == 'success':
        system_content += f"""

=== LIVE SATELLITE ANALYSIS FOR SRI LANKA ===
📅 Analysis Date: {satellite_analysis.get('date', 'N/A')}
🌊 Flood Severity: {satellite_analysis.get('flood_severity', 'unknown').upper()}
💧 Water Index: {satellite_analysis.get('water_index_mean', 'N/A')} (>0 indicates water presence)
🟤 Turbidity: {satellite_analysis.get('turbidity_mean', 'N/A')} (>1.2 indicates muddy/sediment water)
🌿 Vegetation Index: {satellite_analysis.get('vegetation_mean', 'N/A')}
📊 Water Condition: {satellite_analysis.get('water_condition', 'N/A')}

🔍 AUTO-INTERPRETATION:
{satellite_analysis.get('interpretation', 'No interpretation available')}

USE THIS REAL DATA to provide specific, accurate insights to the user!"""

    # Add weather context if available
    if weather_context:
        system_content += f"""

{weather_context}

IMPORTANT: Use this real-time weather data to:
1. Correlate satellite observations with current weather conditions
2. Predict areas at risk based on rainfall patterns
3. Explain why certain areas may appear flooded
4. Provide context on monsoon impacts"""

    # Fetch live river water level data from DMC
    flood_context = None
    try:
        flood_context = await get_flood_data_for_chatbot()
    except:
        flood_context = None
    
    if flood_context:
        system_content += f"""

{flood_context}

CRITICAL: This is GROUND TRUTH data from actual river gauging stations.
Use this to VALIDATE what you see in satellite imagery.
If river gauges show MAJOR/MINOR flood, the satellite should show flooding in that area.
Rising water levels = expect flooding to worsen in satellite imagery."""

    # Build messages array
    messages = [{"role": "system", "content": system_content}]
    
    # Add conversation history if provided
    if conversation_history:
        for msg in conversation_history[-10:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
    
    # Add current user message
    messages.append({"role": "user", "content": message})
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.GROK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                error_msg = f"API error: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", error_msg)
                except:
                    pass
                return f"I'm having trouble connecting right now. Please try again. ({error_msg})"
                
    except httpx.TimeoutException:
        return "The request timed out. Please try again with a shorter question."
    except Exception as e:
        return f"An error occurred: {str(e)}. Please try again."


async def analyze_flood_conditions(date: str, region: Optional[str] = None) -> str:
    """
    Generate AI analysis of current flood conditions with REAL satellite data.
    """
    # Get actual satellite statistics
    satellite_data = await fetch_satellite_statistics(date)
    
    data_summary = ""
    if satellite_data.get('status') == 'success':
        data_summary = f"""
REAL SATELLITE DATA:
- Flood Severity: {satellite_data.get('flood_severity')}
- Water Index: {satellite_data.get('water_index_mean')}
- Turbidity: {satellite_data.get('turbidity_mean')} 
- Interpretation: {satellite_data.get('interpretation')}
"""
    
    prompt = f"""Analyze current flood conditions in Sri Lanka for {date}.

{data_summary}

Provide:
1. Current flood status based on the satellite data
2. Which areas are likely most affected (based on Sri Lanka geography)
3. What users should look for in the satellite imagery
4. Recommended actions

{"Focus on the " + region + " region." if region else ""}

Be specific and use the actual satellite data provided."""

    return await get_chat_response(prompt, context={"layer": "S1_FLOOD", "date": date})


def get_layer_explanation(layer_id: str) -> str:
    """Get a quick explanation of what a layer shows."""
    explanations = {
        "S1_VV": "Sentinel-1 VV radar - Water appears DARK (smooth surface = low backscatter). Compare with historical images to spot NEW dark areas = NEW flooding.",
        "S1_VH": "Sentinel-1 VH radar - Sensitive to surface roughness changes. Flooded vegetation shows different signature than dry.",
        "S1_FLOOD": "Flood detection composite - Blue/dark blue = water/flooding. Best for seeing flood extent through clouds.",
        "S2_TRUE_COLOR": "Natural color view - IMPORTANT: Flood water often appears BROWN/TAN (sediment-laden), not blue! Look for brown patches where green farmland should be.",
        "S2_FALSE_COLOR": "False color - Healthy vegetation = bright RED. Flooded/damaged areas show as dark or grey instead of red.",
        "S2_NDVI": "Vegetation health - Sudden drops in green areas may indicate flood damage to crops. Compare with previous dates.",
        "S2_NDWI": "Water detection index - Blue = water presence. Watch for expansion of blue areas beyond normal river/lake boundaries."
    }
    return explanations.get(layer_id, "Unknown layer type.")
