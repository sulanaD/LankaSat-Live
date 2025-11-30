import { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getTileUrl } from '../services/api';

// Custom tile layer component that updates when layer/date changes
function SatelliteTileLayer({ layer, date }) {
  const map = useMap();
  const tileLayerRef = useRef(null);
  
  useEffect(() => {
    // Remove existing satellite layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    
    // Create new tile layer
    const tileUrl = getTileUrl(layer, date);
    
    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 15,
      minZoom: 7,
      tileSize: 256,
      opacity: 0.9,
      attribution: '&copy; Copernicus Sentinel Data',
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      className: 'satellite-tile-layer'
    });
    
    tileLayerRef.current.addTo(map);
    
    // Cleanup on unmount
    return () => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
    };
  }, [layer, date, map]);
  
  return null;
}

// Map bounds restriction component
function MapBoundsRestriction({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    const leafletBounds = L.latLngBounds(
      [bounds.south, bounds.west],
      [bounds.north, bounds.east]
    );
    
    map.setMaxBounds(leafletBounds.pad(0.1));
  }, [map, bounds]);
  
  return null;
}

// Loading indicator component
function LoadingIndicator() {
  const [loading, setLoading] = useState(false);
  const map = useMap();
  
  useEffect(() => {
    const handleLoading = () => setLoading(true);
    const handleLoad = () => setLoading(false);
    
    map.on('loading', handleLoading);
    map.on('load', handleLoad);
    
    return () => {
      map.off('loading', handleLoading);
      map.off('load', handleLoad);
    };
  }, [map]);
  
  if (!loading) return null;
  
  return (
    <div className="absolute top-4 right-4 bg-dark/80 backdrop-blur-sm rounded-lg px-3 py-2 z-[1000] flex items-center gap-2">
      <div className="loading-spinner"></div>
      <span className="text-sm text-gray-300">Loading tiles...</span>
    </div>
  );
}

// Coordinates display component
function CoordinatesDisplay() {
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const map = useMap();
  
  useEffect(() => {
    const handleMove = (e) => {
      const center = map.getCenter();
      setCoords({ lat: center.lat, lng: center.lng });
    };
    
    map.on('move', handleMove);
    handleMove(); // Initial position
    
    return () => {
      map.off('move', handleMove);
    };
  }, [map]);
  
  return (
    <div className="absolute bottom-4 right-4 bg-dark/80 backdrop-blur-sm rounded-lg px-3 py-2 z-[1000] text-xs text-gray-400">
      <span>Lat: {coords.lat.toFixed(4)}</span>
      <span className="mx-2">|</span>
      <span>Lng: {coords.lng.toFixed(4)}</span>
    </div>
  );
}

function MapView({ selectedLayer, selectedDate, config }) {
  const dateStr = selectedDate instanceof Date 
    ? selectedDate.toISOString().split('T')[0]
    : selectedDate;

  return (
    <MapContainer
      center={config.center}
      zoom={config.defaultZoom}
      minZoom={config.minZoom}
      maxZoom={config.maxZoom}
      className="h-full w-full"
      zoomControl={true}
      attributionControl={true}
    >
      {/* Base map layer - dark theme */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      
      {/* Satellite imagery layer */}
      <SatelliteTileLayer layer={selectedLayer} date={dateStr} />
      
      {/* Map bounds restriction */}
      <MapBoundsRestriction bounds={config.bounds} />
      
      {/* Loading indicator */}
      <LoadingIndicator />
      
      {/* Coordinates display */}
      <CoordinatesDisplay />
    </MapContainer>
  );
}

export default MapView;
