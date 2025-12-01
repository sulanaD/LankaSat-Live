import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header({ backendStatus, toggleSidebar, sidebarOpen, onWeatherToggle, weatherOpen, onFloodToggle, floodOpen }) {
  const { isAuthenticated, isGuest, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    // Navigate to home page after logout
    navigate('/');
  };

  const getStatusColor = () => {
    switch (backendStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500 animate-pulse';
    }
  };

  const getStatusText = () => {
    switch (backendStatus) {
      case 'connected':
        return 'API Connected';
      case 'error':
        return 'API Error';
      default:
        return 'Connecting...';
    }
  };

  return (
    <header className="bg-dark border-b border-gray-700 px-4 py-3 flex items-center justify-between z-[1001]">
      {/* Left side - Logo and title */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle button */}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-lg">🛰️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              LankaSat <span className="text-primary">Live</span>
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              Sri Lanka Satellite Dashboard
            </p>
          </div>
        </Link>
      </div>

      {/* Right side - Status, navigation, and links */}
      <div className="flex items-center gap-4">
        {/* Navigation Links - Show lock icon for restricted features if not fully authenticated */}
        <nav className="hidden md:flex items-center gap-2">
          <Link 
            to="/shelters-map"
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
          >
            {(!isAuthenticated || isGuest) && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            Shelter Map
          </Link>
          <Link 
            to="/register-shelter"
            className="px-3 py-1.5 text-sm bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-colors flex items-center gap-1"
          >
            {(!isAuthenticated || isGuest) && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            + Add Shelter
          </Link>
        </nav>

        {/* Divider */}
        <div className="hidden md:block w-px h-6 bg-gray-700"></div>

        {/* API Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-gray-400 hidden sm:inline">{getStatusText()}</span>
        </div>

        {/* Weather button */}
        <button 
          onClick={onWeatherToggle}
          className={`p-2 rounded-lg transition-colors ${
            weatherOpen 
              ? 'bg-blue-500/20 text-blue-400' 
              : 'hover:bg-gray-700 text-gray-400 hover:text-white'
          }`}
          title="Weather Data"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </button>

        {/* Flood Monitoring button */}
        <button 
          onClick={onFloodToggle}
          className={`p-2 rounded-lg transition-colors ${
            floodOpen 
              ? 'bg-cyan-500/20 text-cyan-400' 
              : 'hover:bg-gray-700 text-gray-400 hover:text-white'
          }`}
          title="Flood Monitoring"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </button>

        {/* User Menu / Login Button */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                showUserMenu 
                  ? 'bg-gray-700 text-white' 
                  : 'hover:bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isGuest ? 'bg-gray-600 text-gray-300' : 'bg-primary text-white'
              }`}>
                {isGuest ? 'G' : (user?.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <span className="hidden sm:inline text-sm">
                {isGuest ? 'Guest' : (user?.display_name || user?.email?.split('@')[0])}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-700">
                  <p className="text-sm font-medium text-white">
                    {isGuest ? 'Guest User' : user?.display_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isGuest ? 'Limited access' : user?.email}
                  </p>
                </div>
                {isGuest && (
                  <Link
                    to="/register"
                    className="block px-4 py-2 text-sm text-primary hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Create Account
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link 
            to="/login"
            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        )}

        {/* GitHub link */}
        <a 
          href="https://github.com/sulanaD/Sentinel-1-Weather-App"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="View on GitHub"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
        </a>
      </div>
    </header>
  );
}

export default Header;
