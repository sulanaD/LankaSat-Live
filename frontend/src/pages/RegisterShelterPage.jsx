/**
 * Register Shelter Page
 * Allows users to register new disaster relief shelters with map-based location selection
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { createShelter, SHELTER_AMENITIES } from '../services/shelters';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom shelter marker icon
const shelterIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Sri Lanka center and bounds
const SRI_LANKA_CENTER = [7.8731, 80.7718];
const SRI_LANKA_BOUNDS = [[5.9, 79.4], [10.1, 82.2]];

// Map click handler component
function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function RegisterShelterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isGuest, user, loading: authLoading } = useAuth();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [capacity, setCapacity] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Handle map click to select location
  const handleLocationSelect = useCallback((latitude, longitude) => {
    setLat(latitude.toFixed(6));
    setLon(longitude.toFixed(6));
  }, []);

  // Redirect to home if not authenticated or is guest (after auth loading completes)
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || isGuest)) {
      navigate('/');
    }
  }, [authLoading, isAuthenticated, isGuest, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || isGuest) {
    return null;
  }

  // Toggle amenity selection
  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!name.trim()) {
      setError('Shelter name is required');
      return;
    }

    if (!lat || !lon) {
      setError('Please select a location on the map');
      return;
    }

    setLoading(true);

    try {
      const shelterData = {
        name: name.trim(),
        description: description.trim() || null,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        capacity: capacity ? parseInt(capacity, 10) : null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        address: address.trim() || null,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : null
      };

      await createShelter(shelterData);
      setSuccess(true);
      
      // Reset form
      setName('');
      setDescription('');
      setLat(null);
      setLon(null);
      setCapacity('');
      setContactPhone('');
      setContactEmail('');
      setAddress('');
      setSelectedAmenities([]);

      // Navigate to shelter map after a short delay
      setTimeout(() => {
        navigate('/shelters-map');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format amenity name for display
  const formatAmenityName = (amenity) => {
    return amenity.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-dark overflow-y-auto" style={{ height: '100vh', overflowY: 'auto' }}>
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-lg">🛰️</span>
            </div>
            <h1 className="text-lg font-bold text-white">
              LankaSat <span className="text-primary">Live</span>
            </h1>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link to="/shelters-map" className="text-gray-400 hover:text-white text-sm">
              Shelter Map
            </Link>
            {!isAuthenticated ? (
              <Link to="/login" className="text-primary hover:underline text-sm">
                Sign In
              </Link>
            ) : (
              <span className="text-gray-400 text-sm">
                {isGuest ? 'Guest' : user?.display_name || user?.email}
              </span>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Register a Shelter</h2>
          <p className="text-gray-400 mt-1">
            Help disaster relief efforts by registering a shelter location.
            {isGuest && ' (You are registering as a guest)'}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-medium text-white">Select Location</h3>
              <p className="text-sm text-gray-400 mt-1">
                Click on the map to place the shelter marker
              </p>
            </div>
            <div className="h-[400px]">
              <MapContainer
                center={SRI_LANKA_CENTER}
                zoom={8}
                maxBounds={SRI_LANKA_BOUNDS}
                maxBoundsViscosity={1.0}
                className="h-full w-full"
              >
                {/* Standard OpenStreetMap tiles (no satellite) */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker onLocationSelect={handleLocationSelect} />
                {lat && lon && (
                  <Marker position={[parseFloat(lat), parseFloat(lon)]} icon={shelterIcon} />
                )}
              </MapContainer>
            </div>
            {lat && lon && (
              <div className="p-3 bg-gray-900 border-t border-gray-700 text-sm">
                <span className="text-gray-400">Selected: </span>
                <span className="text-white font-mono">{lat}, {lon}</span>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Success Message */}
              {success && (
                <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm">
                  Shelter registered successfully! Redirecting to map...
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Shelter Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Shelter Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Colombo Community Center"
                  disabled={loading}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Brief description of the shelter..."
                  disabled={loading}
                />
              </div>

              {/* Coordinates (read-only, set by map) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Latitude <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={lat || ''}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-400 font-mono"
                    placeholder="Click map to set"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Longitude <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={lon || ''}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-400 font-mono"
                    placeholder="Click map to set"
                  />
                </div>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Capacity (people)
                </label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min="0"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Maximum number of people"
                  disabled={loading}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Street address"
                  disabled={loading}
                />
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+94 XX XXX XXXX"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="contact@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Available Amenities
                </label>
                <div className="flex flex-wrap gap-2">
                  {SHELTER_AMENITIES.map(amenity => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedAmenities.includes(amenity)
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      disabled={loading}
                    >
                      {formatAmenityName(amenity)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !lat || !lon}
                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Registering...' : 'Register Shelter'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RegisterShelterPage;
