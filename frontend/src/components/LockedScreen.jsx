/**
 * Locked Screen Component
 * Shows a lock overlay for features that require authentication
 */

import { Link } from 'react-router-dom';

function LockedScreen({ 
  title = "Authentication Required",
  message = "Please sign in to access this feature.",
  showGuestOption = false,
  featureType = "feature" // "satellite", "shelter", "shelter-map"
}) {
  // Get appropriate icon and description based on feature type
  const getFeatureContent = () => {
    switch (featureType) {
      case 'satellite':
        return {
          icon: '🛰️',
          description: 'Access real-time Sentinel-1 and Sentinel-2 satellite imagery of Sri Lanka.',
          features: [
            'True color satellite imagery',
            'NDVI vegetation analysis',
            'Moisture index monitoring',
            'Historical data access'
          ]
        };
      case 'shelter':
        return {
          icon: '🏠',
          description: 'Register disaster relief shelters to help those in need.',
          features: [
            'Add shelter locations',
            'Specify capacity & amenities',
            'Update shelter status',
            'Help disaster relief efforts'
          ]
        };
      case 'shelter-map':
        return {
          icon: '🗺️',
          description: 'View all registered disaster relief shelters across Sri Lanka.',
          features: [
            'Interactive shelter map',
            'Filter by amenities',
            'Contact information',
            'Real-time availability'
          ]
        };
      default:
        return {
          icon: '🔒',
          description: message,
          features: []
        };
    }
  };

  const content = getFeatureContent();

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Lock Icon with Animation */}
        <div className="relative mb-8">
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/20 blur-xl animate-pulse"></div>
          </div>
          
          {/* Lock container */}
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700">
            <span className="text-5xl">{content.icon}</span>
            {/* Lock badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center border-2 border-gray-800">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        
        {/* Description */}
        <p className="text-gray-400 mb-6">{content.description}</p>

        {/* Features List */}
        {content.features.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-gray-300 mb-3">What you'll get access to:</h3>
            <ul className="space-y-2">
              {content.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
          >
            Sign In to Continue
          </Link>
          
          <Link
            to="/register"
            className="block w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Create Account
          </Link>

          {showGuestOption && (
            <p className="text-sm text-gray-500 mt-4">
              Want to explore first?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Continue as guest
              </Link>
              {' '}(limited access)
            </p>
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <Link 
            to="/" 
            className="text-gray-400 hover:text-white text-sm inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LockedScreen;
