/**
 * Shelter Map Page
 * Displays all registered shelters on a non-satellite map
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { getSheltersForMap, getShelterStats } from '../services/shelters';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom shelter marker icons by status
const createShelterIcon = (status) => {
  const colors = {
    active: 'green',
    full: 'orange',
    inactive: 'grey'
  };
  const color = colors[status] || 'blue';
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Sri Lanka configuration
const SRI_LANKA_CENTER = [7.8731, 80.7718];
const SRI_LANKA_BOUNDS = [[5.9, 79.4], [10.1, 82.2]];

// Component to fly to a location
function FlyToLocation({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 12, { duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

function ShelterMapPage() {
  const { isAuthenticated, isGuest, user, logout } = useAuth();
  
  const [shelters, setShelters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  // Fetch shelters and stats on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sheltersResponse, statsResponse] = await Promise.all([
          getSheltersForMap(),
          getShelterStats()
        ]);
        setShelters(sheltersResponse.shelters || []);
        setStats(statsResponse);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle shelter click in sidebar
  const handleShelterClick = useCallback((shelter) => {
    setSelectedShelter(shelter);
    setFlyTo([shelter.lat, shelter.lon]);
  }, []);

  // Format amenities for display
  const formatAmenity = (amenity) => {
    return amenity.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 z-[1001]">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-lg">🛰️</span>
            </div>
            <h1 className="text-lg font-bold text-white">
              LankaSat <span className="text-primary">Live</span>
            </h1>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link 
              to="/register-shelter" 
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Register Shelter
            </Link>
            {!isAuthenticated ? (
              <Link to="/login" className="text-gray-400 hover:text-white text-sm">
                Sign In
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">
                  {isGuest ? 'Guest' : user?.display_name || user?.email}
                </span>
                <button 
                  onClick={logout}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Shelter List */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
          {/* Stats Header */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white mb-3">Disaster Relief Shelters</h2>
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-green-900/30 rounded-lg p-2 text-center">
                  <div className="text-green-400 font-bold">{stats.active}</div>
                  <div className="text-gray-400 text-xs">Active</div>
                </div>
                <div className="bg-orange-900/30 rounded-lg p-2 text-center">
                  <div className="text-orange-400 font-bold">{stats.full}</div>
                  <div className="text-gray-400 text-xs">Full</div>
                </div>
                <div className="bg-blue-900/30 rounded-lg p-2 text-center col-span-2">
                  <div className="text-blue-400 font-bold">{stats.total_capacity?.toLocaleString() || 0}</div>
                  <div className="text-gray-400 text-xs">Total Capacity</div>
                </div>
              </div>
            )}
          </div>

          {/* Shelter List */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-gray-400">
                Loading shelters...
              </div>
            )}
            
            {error && (
              <div className="p-4 text-center text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && shelters.length === 0 && (
              <div className="p-4 text-center text-gray-400">
                <p>No shelters registered yet.</p>
                <Link to="/register-shelter" className="text-primary hover:underline mt-2 inline-block">
                  Register the first one!
                </Link>
              </div>
            )}

            {shelters.map(shelter => (
              <div
                key={shelter.id}
                onClick={() => handleShelterClick(shelter)}
                className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-700 ${
                  selectedShelter?.id === shelter.id ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1 ${
                    shelter.status === 'active' ? 'bg-green-500' :
                    shelter.status === 'full' ? 'bg-orange-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{shelter.name}</h3>
                    {shelter.capacity && (
                      <p className="text-sm text-gray-400">
                        Capacity: {shelter.capacity} people
                      </p>
                    )}
                    {shelter.description && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {shelter.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            center={SRI_LANKA_CENTER}
            zoom={8}
            maxBounds={SRI_LANKA_BOUNDS}
            maxBoundsViscosity={1.0}
            className="h-full w-full"
          >
            {/* Standard OpenStreetMap tiles (non-satellite) */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Fly to selected shelter */}
            {flyTo && <FlyToLocation center={flyTo} zoom={14} />}

            {/* Shelter Markers */}
            {shelters.map(shelter => (
              <Marker
                key={shelter.id}
                position={[shelter.lat, shelter.lon]}
                icon={createShelterIcon(shelter.status)}
                eventHandlers={{
                  click: () => setSelectedShelter(shelter)
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-lg mb-2">{shelter.name}</h3>
                    
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                      shelter.status === 'active' ? 'bg-green-100 text-green-800' :
                      shelter.status === 'full' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {shelter.status?.toUpperCase()}
                    </div>
                    
                    {shelter.description && (
                      <p className="text-sm text-gray-600 mb-2">{shelter.description}</p>
                    )}
                    
                    {shelter.capacity && (
                      <p className="text-sm">
                        <strong>Capacity:</strong> {shelter.capacity} people
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {shelter.lat.toFixed(4)}, {shelter.lon.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-sm border border-gray-700 z-[1000]">
            <div className="font-medium text-white mb-2">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Active Shelter</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-300">Full</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-gray-300">Inactive</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShelterMapPage;
