# LankaSat Live

Sri Lanka Satellite Dashboard - Real-time Sentinel-1 and Sentinel-2 imagery visualization with AI-powered flood analysis and weather integration.

## Overview

LankaSat Live is a full-stack web application that provides real-time satellite imagery visualization for Sri Lanka. It combines Copernicus Sentinel Hub satellite data with OpenWeatherMap weather information and an AI chatbot powered by Groq for intelligent flood monitoring and disaster response.

### Key Features

- Sentinel-1 Radar Imagery - SAR data that works through clouds, ideal for monsoon flood detection
- Sentinel-2 Optical Imagery - High-resolution true color and false color composites
- Flood Detection Layer - Specialized composite for identifying flooded areas
- Vegetation Index (NDVI) - Monitor crop health and vegetation damage
- Water Index (NDWI) - Detect water bodies and flooding extent
- AI Chatbot - Intelligent assistant that interprets satellite imagery and provides flood analysis
- Real-time Weather - Current conditions and flood risk assessment for 9 major Sri Lanka cities
- Historical Data - Browse satellite imagery from 2017 to present

## Architecture

```
Frontend (React + Vite + TailwindCSS)
    |
    | HTTP REST API
    |
Backend (FastAPI + Python)
    |
    |-- Sentinel Hub API (OAuth 2.0 + Process API)
    |-- OpenWeatherMap API (Weather Data)
    |-- Groq API (AI Chatbot - Llama 3.3 70B)
```

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn
- Sentinel Hub Account (https://www.sentinel-hub.com/)
- OpenWeatherMap API Key (https://openweathermap.org/api)
- Groq API Key (https://console.groq.com/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/sulanaD/Sentinel-1-Weather-App.git
cd Sentinel-1-Weather-App
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

Edit the `.env` file with your API credentials:

```env
# Sentinel Hub Credentials (from https://apps.sentinel-hub.com/dashboard/)
SENTINEL_CLIENT_ID=your_client_id_here
SENTINEL_CLIENT_SECRET=your_client_secret_here

# Sentinel Hub Endpoints
SENTINEL_AUTH_URL=https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token
SENTINEL_PROCESS_URL=https://services.sentinel-hub.com/api/v1/process

# Groq API Key for AI Chatbot
GROK_API_KEY=your_groq_api_key_here

# OpenWeatherMap API Key
OPENWEATHER_API_KEY=your_openweather_api_key_here

# CORS Settings
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Cache Settings
CACHE_TTL_SECONDS=300

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file (optional)
echo "VITE_API_URL=http://localhost:8000" > .env
```

## Running the Application

### Start the Backend Server

```bash
cd backend

# If using virtual environment
source venv/bin/activate

# Start the server
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at http://localhost:8000

API Documentation: http://localhost:8000/docs

### Start the Frontend Development Server

```bash
cd frontend

npm run dev
```

The frontend will be available at http://localhost:5173

## API Endpoints

### Satellite Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tile` | GET | Fetch satellite tile for map display |
| `/layers` | GET | Get available satellite layers |
| `/satellite/stats` | GET | Get satellite statistics for Sri Lanka |

### Weather Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/weather` | GET | Get comprehensive weather summary for Sri Lanka |
| `/weather/locations` | GET | List monitored weather locations |
| `/weather/{location}` | GET | Get weather for specific city |
| `/weather/forecast/{location}` | GET | Get 5-day forecast |

### AI Chatbot

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Send message to AI assistant |
| `/chat/analyze-floods` | GET | Get AI flood analysis |
| `/chat/layer-info/{layer_id}` | GET | Get layer explanation |

### System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/token` | GET | Verify Sentinel Hub authentication |
| `/cache/stats` | GET | Get cache statistics |

## Available Satellite Layers

| Layer ID | Name | Description |
|----------|------|-------------|
| S1_VV | Sentinel-1 VV | Radar VV polarization |
| S1_VH | Sentinel-1 VH | Radar VH polarization |
| S1_FLOOD | Flood Detection | Radar-based flood composite |
| S2_TRUE_COLOR | True Color | Natural color RGB |
| S2_FALSE_COLOR | False Color | Vegetation-highlighted |
| S2_NDVI | Vegetation Index | Plant health indicator |
| S2_NDWI | Water Index | Water body detection |

## Project Structure

```
Sentinel-1-Weather-App/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Configuration settings
│   │   ├── sentinel.py       # Sentinel Hub integration
│   │   ├── chatbot.py        # AI chatbot (Groq)
│   │   ├── weather.py        # OpenWeatherMap integration
│   │   └── cache.py          # In-memory caching
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.jsx       # Leaflet map component
│   │   │   ├── Sidebar.jsx       # Layer and date controls
│   │   │   ├── Header.jsx        # Top navigation bar
│   │   │   ├── Chatbot.jsx       # AI assistant interface
│   │   │   ├── WeatherPanel.jsx  # Weather display panel
│   │   │   ├── Legend.jsx        # Layer legends
│   │   │   ├── LayerSelector.jsx # Layer selection UI
│   │   │   └── DateSlider.jsx    # Date picker
│   │   ├── services/
│   │   │   ├── api.js            # Backend API calls
│   │   │   └── layers.js         # Layer configurations
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

## Understanding Flood Detection

### True Color Interpretation

When viewing satellite imagery during floods:

- Brown/Muddy Water: Active flood water carrying sediment - this is the most common flood appearance
- Tan/Beige Areas: Waterlogged soil or recent flooding
- Dark Brown Patches: Standing flood water with high sediment content
- Clear Blue: Normal water bodies (rivers, lakes, reservoirs)
- Bright Green: Healthy vegetation (not flooded)

### Radar (Sentinel-1) Interpretation

- Very Dark Areas: Smooth water surface indicating flooding
- Texture Changes: Areas where backscatter has changed indicating new water presence
- Blue in S1_FLOOD Layer: Detected flood water

### Monsoon Seasons

Sri Lanka has two monsoon seasons that increase flood risk:

- Southwest Monsoon (May-September): Affects Western, Southern, and Sabaragamuwa provinces
- Northeast Monsoon (October-January): Affects Northern, Eastern, and North Central provinces

## Troubleshooting

### Backend Issues

1. Authentication Error (401)
   - Verify your Sentinel Hub credentials in `.env`
   - Ensure you are using credentials from https://apps.sentinel-hub.com/dashboard/
   - Check that SENTINEL_AUTH_URL is set to `https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token`

2. No Tiles Loading
   - Check backend console for errors
   - Verify the date has available imagery (cloud-free for Sentinel-2)
   - Try switching to Sentinel-1 layers which work through clouds

3. Weather Data Not Loading
   - Verify OPENWEATHER_API_KEY is set correctly
   - Check API key is active at https://home.openweathermap.org/api_keys

### Frontend Issues

1. Blank Page
   - Check browser console for errors
   - Verify backend is running on port 8000
   - Check CORS settings in backend `.env`

2. Map Not Loading
   - Clear browser cache
   - Check network tab for failed tile requests

## Future Upgrades

### Planned Features

1. Time-lapse Animation
   - Animate satellite imagery over selected date range
   - Visual flood progression tracking

2. Custom Area of Interest
   - Draw polygons to analyze specific regions
   - Export statistics for selected areas

3. Flood Alert System
   - Email/SMS notifications for flood detection
   - Integration with Sri Lanka Disaster Management Center

4. Historical Flood Archive
   - Database of past flood events
   - Comparison tools for analyzing flood patterns

5. Mobile Application
   - React Native app for field workers
   - Offline map caching

6. Multi-language Support
   - Sinhala and Tamil translations
   - Localized weather alerts

7. Advanced Analytics Dashboard
   - Flood frequency analysis
   - Crop damage estimation
   - Population exposure calculations

8. Integration with Additional Data Sources
   - MODIS flood products
   - GPM rainfall data
   - River gauge water levels
   - Elevation data for flood modeling

9. Machine Learning Enhancements
   - Automatic flood extent classification
   - Flood prediction based on weather forecasts
   - Damage assessment from imagery

10. Collaboration Features
    - User annotations on map
    - Shared workspaces for emergency response teams
    - Report generation and export

## License

MIT License - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Acknowledgments

- European Space Agency (ESA) for Sentinel satellite data
- Sentinel Hub for the Processing API
- OpenWeatherMap for weather data
- Groq for AI inference API
