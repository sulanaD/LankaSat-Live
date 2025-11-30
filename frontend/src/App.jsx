import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingOverlay from './components/LoadingOverlay';
import Chatbot from './components/Chatbot';
import WeatherPanel from './components/WeatherPanel';
import FloodPanel from './components/FloodPanel';
import { fetchLayers, checkHealth } from './services/api';
import { SRI_LANKA_CONFIG, LAYER_CONFIG } from './services/layers';

function App() {
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
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen}
          layers={layers}
          selectedLayer={selectedLayer}
          onLayerChange={handleLayerChange}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          currentLayerConfig={currentLayerConfig}
        />
        
        {/* Map */}
        <div className="flex-1 relative">
          <MapView 
            selectedLayer={selectedLayer}
            selectedDate={selectedDate}
            config={SRI_LANKA_CONFIG}
          />
          
          {/* Layer info overlay */}
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
