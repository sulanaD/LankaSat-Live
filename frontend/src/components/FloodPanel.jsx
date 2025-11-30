import { useState, useEffect } from 'react';
import { fetchFloodSummary, fetchWaterLevels } from '../services/api';

// Get alert status color
const getAlertColor = (status) => {
  switch (status) {
    case 'MAJOR': return 'bg-red-500/20 text-red-400 border-red-500/50';
    case 'MINOR': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'ALERT': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    case 'NORMAL': return 'bg-green-500/20 text-green-400 border-green-500/50';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  }
};

// Get trend icon
const getTrendIcon = (trend) => {
  if (trend === 'Rising') return { icon: '↑', color: 'text-red-400' };
  if (trend === 'Falling') return { icon: '↓', color: 'text-green-400' };
  return { icon: '→', color: 'text-gray-400' };
};

// Get risk level color
const getRiskColor = (risk) => {
  switch (risk) {
    case 'CRITICAL': return 'bg-red-600/30 text-red-300 border-red-500';
    case 'HIGH': return 'bg-orange-500/30 text-orange-300 border-orange-500';
    case 'ELEVATED': return 'bg-yellow-500/30 text-yellow-300 border-yellow-500';
    case 'NORMAL': return 'bg-green-500/30 text-green-300 border-green-500';
    default: return 'bg-gray-500/30 text-gray-300 border-gray-500';
  }
};

export default function FloodPanel({ onClose, onStationSelect }) {
  const [summary, setSummary] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [selectedStation, setSelectedStation] = useState(null);

  useEffect(() => {
    loadFloodData();
    // Refresh every 5 minutes
    const interval = setInterval(loadFloodData, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadFloodData = async () => {
    try {
      setLoading(true);
      const [summaryRes, levelsRes] = await Promise.all([
        fetchFloodSummary(),
        fetchWaterLevels()
      ]);
      setSummary(summaryRes.data);
      setLevels(levelsRes.readings || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLevels = levels.filter(level => {
    if (filter === 'ALL') return true;
    return level.alert_status === filter;
  });

  // Sort by severity
  const sortedLevels = [...filteredLevels].sort((a, b) => {
    const order = { MAJOR: 0, MINOR: 1, ALERT: 2, NORMAL: 3, NO_DATA: 4 };
    return (order[a.alert_status] || 5) - (order[b.alert_status] || 5);
  });

  if (loading && !summary) {
    return (
      <div className="absolute top-20 left-4 w-96 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-4 z-[1000]">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="absolute top-20 left-4 w-96 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 p-4 z-[1000]">
        <div className="text-red-400 text-sm">
          <p className="font-medium">Flood data unavailable</p>
          <p className="text-xs opacity-75 mt-1">{error}</p>
          <button 
            onClick={loadFloodData}
            className="mt-3 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-4 w-[420px] bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 z-[1000] max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              River Water Levels
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Sri Lanka Disaster Management Center
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
        {/* Overall Risk */}
        {summary && (
          <div className="p-4 border-b border-slate-700/30">
            <div className={`p-3 rounded-lg border ${getRiskColor(summary.overall_risk)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Flood Risk</span>
                <span className="text-lg font-bold">{summary.overall_risk}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Total Stations:</span>
                  <span className="ml-1 text-white">{summary.total_stations}</span>
                </div>
                <div>
                  <span className="text-slate-400">Rising Levels:</span>
                  <span className="ml-1 text-red-400">{summary.rising_count}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Summary */}
        {summary?.alert_summary && (
          <div className="p-4 border-b border-slate-700/30">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Station Status</h4>
            <div className="grid grid-cols-5 gap-2">
              {['MAJOR', 'MINOR', 'ALERT', 'NORMAL', 'NO_DATA'].map(status => {
                const data = summary.alert_summary[status] || { count: 0 };
                return (
                  <button
                    key={status}
                    onClick={() => setFilter(filter === status ? 'ALL' : status)}
                    className={`p-2 rounded text-center transition-all ${
                      filter === status ? 'ring-2 ring-white/50' : ''
                    } ${getAlertColor(status)}`}
                  >
                    <div className="text-lg font-bold">{data.count}</div>
                    <div className="text-[10px] uppercase">{status === 'NO_DATA' ? 'N/A' : status}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Critical Stations Alert */}
        {summary?.critical_stations?.length > 0 && (
          <div className="p-4 border-b border-slate-700/30 bg-red-900/20">
            <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
              <span className="animate-pulse">*</span> Critical Stations (Major Flood)
            </h4>
            <div className="space-y-2">
              {summary.critical_stations.slice(0, 3).map((station, idx) => (
                <div key={idx} className="bg-red-900/30 rounded p-2 text-xs">
                  <div className="font-medium text-red-300">{station.name}</div>
                  <div className="text-red-400/70">{station.river}</div>
                  {station.remarks && (
                    <div className="text-red-400/60 mt-1 italic">{station.remarks}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Station List */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-300">
              {filter === 'ALL' ? 'All Stations' : `${filter} Stations`}
            </h4>
            <span className="text-xs text-slate-500">{sortedLevels.length} stations</span>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {sortedLevels.map((level, idx) => {
              const trend = getTrendIcon(level.rising_or_falling);
              return (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg transition-colors cursor-pointer border-l-4 ${
                    selectedStation === level.station_name 
                      ? 'bg-slate-700/80 ring-1 ring-blue-500/50' 
                      : 'bg-slate-800/50 hover:bg-slate-700/50'
                  } ${
                    level.alert_status === 'MAJOR' ? 'border-red-500' :
                    level.alert_status === 'MINOR' ? 'border-orange-500' :
                    level.alert_status === 'ALERT' ? 'border-yellow-500' :
                    level.alert_status === 'NORMAL' ? 'border-green-500' : 'border-gray-500'
                  }`}
                  onClick={() => {
                    setSelectedStation(selectedStation === level.station_name ? null : level.station_name);
                    if (onStationSelect && level.lat_lng) {
                      onStationSelect(level);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{level.station_name}</p>
                      <p className="text-xs text-slate-400">{level.river_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-semibold text-white">
                          {level.water_level?.toFixed(2) || 'N/A'}
                        </span>
                        <span className="text-xs text-slate-400">m</span>
                        {level.rising_or_falling && (
                          <span className={`text-sm ${trend.color}`}>{trend.icon}</span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${getAlertColor(level.alert_status)}`}>
                        {level.alert_status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Expanded details */}
                  {selectedStation === level.station_name && (
                    <div className="mt-3 pt-3 border-t border-slate-600/50 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Alert Level:</span>
                        <span className="ml-1 text-white">{level.alert_level || 'N/A'}m</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Minor Flood:</span>
                        <span className="ml-1 text-white">{level.minor_flood_level || 'N/A'}m</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Major Flood:</span>
                        <span className="ml-1 text-white">{level.major_flood_level || 'N/A'}m</span>
                      </div>
                      {level.flood_score !== null && level.flood_score !== undefined && (
                        <div className="col-span-3">
                          <span className="text-slate-400">Flood Score:</span>
                          <span className="ml-1 text-white">{(level.flood_score * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      {level.remarks && (
                        <div className="col-span-3">
                          <span className="text-slate-400">Remarks:</span>
                          <span className="ml-1 text-white">{level.remarks}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Data updates every 15 min</span>
          <button 
            onClick={loadFloodData}
            disabled={loading}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}
