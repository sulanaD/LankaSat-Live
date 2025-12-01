import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingOverlay from './components/LoadingOverlay';
import Chatbot from './components/Chatbot';
import WeatherPanel from './components/WeatherPanel';
import FloodPanel from './components/FloodPanel';
import LockedScreen from './components/LockedScreen';
import { useAuth } from './context/AuthContext';
import { fetchLayers, checkHealth } from './services/api';
import { SRI_LANKA_CONFIG, LAYER_CONFIG } from './services/layers';

function App() {
  const { isAuthenticated, isGuest, loading: authLoading } = useAuth();
  
  // State
  const [selectedLayer, setSelectedLayer] = useState('S2_TRUE_COLOR');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [layers, setLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [floodOpen, setFloodOpen] = useState(false);

  // Initialize app
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        
        // Check backend health
        const health = await checkHealth();
        setBackendStatus('connected');
        
        // Fetch available layers
        const layerData = await fetchLayers();
        setLayers(layerData.layers || []);
        
        setError(null);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setBackendStatus('error');
      } finally {
        setIsLoading(false);
      }
    }
    
    initialize();
  }, []);

  // Handle layer change
  const handleLayerChange = (layerId) => {
    setSelectedLayer(layerId);
  };

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Get current layer config
  const currentLayerConfig = LAYER_CONFIG[selectedLayer] || {};

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingOverlay />;
  }

  // Check if satellite map should be locked (not authenticated as registered user)
  const isSatelliteMapLocked = !isAuthenticated || isGuest;

  return (
    <div className="h-screen w-screen flex flex-col bg-dark overflow-hidden">
      {/* Header */}
      <Header 
        backendStatus={backendStatus}
        toggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
        onWeatherToggle={() => setWeatherOpen(!weatherOpen)}
        weatherOpen={weatherOpen}
        onFloodToggle={() => setFloodOpen(!floodOpen)}
        floodOpen={floodOpen}
      />
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - disabled when satellite map is locked */}
        <div className={`${isSatelliteMapLocked ? 'pointer-events-none opacity-50' : ''}`}>
          <Sidebar 
            isOpen={sidebarOpen}
            layers={layers}
            selectedLayer={selectedLayer}
            onLayerChange={handleLayerChange}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            currentLayerConfig={currentLayerConfig}
          />
        </div>
        
        {/* Map */}
        <div className="flex-1 relative">
          <MapView 
            selectedLayer={selectedLayer}
            selectedDate={selectedDate}
            config={SRI_LANKA_CONFIG}
          />
          
          {/* Locked overlay for satellite map */}
          {isSatelliteMapLocked && (
            <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm flex items-center justify-center z-[1001]">
              <div className="text-center max-w-md p-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-700 mb-4 relative">
                  <span className="text-4xl">🛰️</span>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center border-2 border-gray-800">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Satellite Imagery Locked</h3>
                <p className="text-gray-400 mb-4">
                  {isGuest 
                    ? "Sign in or create a free account to access real-time Sentinel satellite imagery."
                    : "Sign in to access real-time Sentinel satellite imagery of Sri Lanka."}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Link 
                    to="/login"
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/register"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Weather & Flood data are still accessible
                </p>
              </div>
            </div>
          )}
          
          {/* Layer info overlay */}
          {!isSatelliteMapLocked && (
            <div className="absolute bottom-4 left-4 bg-dark/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-gray-700 z-[1000]">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Layer:</span>
                <span className="font-medium text-white">{currentLayerConfig.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400">Date:</span>
                <span className="font-medium text-white">
                  {selectedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Loading overlay */}
      {isLoading && <LoadingOverlay />}
      
      {/* AI Chatbot */}
      <Chatbot 
        selectedLayer={selectedLayer}
        selectedDate={selectedDate}
        layerConfig={currentLayerConfig}
      />
      
      {/* Weather Panel */}
      {weatherOpen && (
        <WeatherPanel onClose={() => setWeatherOpen(false)} />
      )}
      
      {/* Flood Panel */}
      {floodOpen && (
        <FloodPanel onClose={() => setFloodOpen(false)} />
      )}
      
      {/* Error toast */}
      {error && (
        <div className="absolute bottom-4 right-4 bg-red-900/90 backdrop-blur-sm text-red-100 px-4 py-3 rounded-lg shadow-lg z-[2000] max-w-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium">Connection Error</p>
              <p className="text-sm mt-1 text-red-200">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-300 hover:text-white underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
