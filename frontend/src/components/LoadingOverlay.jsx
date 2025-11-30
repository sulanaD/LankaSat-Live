function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-dark/90 backdrop-blur-sm flex items-center justify-center z-[2000]">
      <div className="text-center">
        {/* Animated satellite icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl animate-bounce">🛰️</span>
          </div>
          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary rounded-full -translate-x-1/2" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
            <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-secondary rounded-full -translate-x-1/2" />
          </div>
        </div>

        {/* Loading text */}
        <h2 className="text-xl font-semibold text-white mb-2">
          LankaSat Live
        </h2>
        <p className="text-gray-400 mb-4">
          Connecting to satellite data...
        </p>

        {/* Loading bar */}
        <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden mx-auto">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"
            style={{ width: '60%', animation: 'loading-bar 1.5s ease-in-out infinite' }}
          />
        </div>

        <style>{`
          @keyframes loading-bar {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}

export default LoadingOverlay;
