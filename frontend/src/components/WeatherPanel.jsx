import { useState, useEffect } from 'react';
import { fetchWeather } from '../services/api';

// Weather icon mapping from OpenWeatherMap
const getWeatherIcon = (iconCode) => {
  const iconMap = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
  };
  return iconMap[iconCode] || '🌡️';
};

// Get flood risk color
const getRiskColor = (risk) => {
  switch (risk) {
    case 'HIGH': return 'bg-red-500/20 text-red-400 border-red-500/50';
    case 'MODERATE': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'ELEVATED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500/50';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  }
};

export default function WeatherPanel({ onClose }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    loadWeather();
    // Refresh every 10 minutes
    const interval = setInterval(loadWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  const loadWeather = async () => {
    try {
      setLoading(true);
      const response = await fetchWeather();
      setWeather(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !weather) {
    return (
      <div className="absolute top-20 right-4 w-80 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-4 z-[1000]">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="absolute top-20 right-4 w-80 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-4 z-[1000]">
        <div className="text-red-400 text-sm">
          <p className="font-medium">Weather data unavailable</p>
          <p className="text-xs opacity-75 mt-1">{error}</p>
          <button 
            onClick={loadWeather}
            className="mt-3 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-20 right-4 w-96 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 z-[1000] max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              🌦️ Sri Lanka Weather
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Real-time weather conditions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {/* Monsoon Status */}
        {weather?.monsoon_status && (
          <div className="p-4 border-b border-slate-700/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-300">Monsoon Season</span>
              {weather.monsoon_status.active && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-white font-medium">
              {weather.monsoon_status.season}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {weather.monsoon_status.expected_conditions}
            </p>
          </div>
        )}

        {/* Flood Risk Assessment */}
        {weather?.flood_risk_assessment && (
          <div className="p-4 border-b border-slate-700/30">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Flood Risk Assessment</h4>
            <div className={`p-3 rounded-lg border ${getRiskColor(weather.flood_risk_assessment.overall_risk)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Risk</span>
                <span className="text-lg font-bold">
                  {weather.flood_risk_assessment.overall_risk}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Active Rain:</span>
                  <span className="ml-1 text-white">
                    {weather.flood_risk_assessment.locations_with_rain}/9 locations
                  </span>
                </div>
                {weather.flood_risk_assessment.max_rainfall_mm_per_hour > 0 && (
                  <div>
                    <span className="text-slate-400">Max Rainfall:</span>
                    <span className="ml-1 text-white">
                      {weather.flood_risk_assessment.max_rainfall_mm_per_hour}mm/h
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weather Alerts */}
        {weather?.alerts && weather.alerts.length > 0 && (
          <div className="p-4 border-b border-slate-700/30">
            <h4 className="text-sm font-medium text-slate-300 mb-2">⚠️ Weather Alerts</h4>
            <div className="space-y-2">
              {weather.alerts.map((alert, idx) => (
                <div 
                  key={idx}
                  className={`p-2 rounded text-xs ${
                    alert.severity === 'high' 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : alert.severity === 'moderate'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}
                >
                  <p className="font-medium">{alert.type.replace(/_/g, ' ')}</p>
                  <p className="mt-1 opacity-90">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location Weather */}
        {weather?.locations && (
          <div className="p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Current Conditions</h4>
            <div className="space-y-2">
              {Object.entries(weather.locations).map(([id, loc]) => (
                <div 
                  key={id}
                  className={`p-3 rounded-lg transition-colors cursor-pointer ${
                    selectedLocation === id 
                      ? 'bg-slate-700/80 ring-1 ring-blue-500/50' 
                      : 'bg-slate-800/50 hover:bg-slate-700/50'
                  }`}
                  onClick={() => setSelectedLocation(selectedLocation === id ? null : id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {getWeatherIcon(loc.current?.icon)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{loc.name}</p>
                        <p className="text-xs text-slate-400">{loc.region}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">
                        {loc.current?.temperature?.toFixed(0)}°C
                      </p>
                      {loc.current?.rain_1h > 0 && (
                        <p className="text-xs text-blue-400">
                          🌧️ {loc.current.rain_1h}mm/h
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded details */}
                  {selectedLocation === id && (
                    <div className="mt-3 pt-3 border-t border-slate-600/50 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Humidity:</span>
                        <span className="ml-1 text-white">{loc.current?.humidity}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Wind:</span>
                        <span className="ml-1 text-white">{loc.current?.wind_speed?.toFixed(1)} m/s</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Clouds:</span>
                        <span className="ml-1 text-white">{loc.current?.clouds}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Pressure:</span>
                        <span className="ml-1 text-white">{loc.current?.pressure} hPa</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">Conditions:</span>
                        <span className="ml-1 text-white capitalize">{loc.current?.description}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Last updated: {new Date(weather?.timestamp).toLocaleTimeString()}</span>
          <button 
            onClick={loadWeather}
            disabled={loading}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : '↻ Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}
