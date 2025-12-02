/**
 * Relief Directory Page
 * Displays flood relief donation directory from Google Sheets
 * Read-only view - redirects to Google Sheets for interaction
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getReliefDirectory, searchReliefOrganizations } from '../services/reliefDirectory';

// Category configuration
const CATEGORIES = [
  { id: 'general', name: 'Independent', icon: '👤', description: 'Independent relief initiatives' },
  { id: 'government', name: 'Government', icon: '🏛️', description: 'Government relief efforts' },
  { id: 'ngo', name: 'NGO', icon: '🤝', description: 'Non-governmental organizations' },
  { id: 'media', name: 'Media', icon: '📺', description: 'Media company relief programs' },
  { id: 'non_profit', name: 'Non-Profit', icon: '💚', description: 'Non-profit organizations' },
  { id: 'volunteer', name: 'Volunteer', icon: '🙋', description: 'Volunteer service organizations' },
  { id: 'business', name: 'Business', icon: '🏢', description: 'Private sector initiatives' }
];

// Organization Card Component
function OrganizationCard({ org }) {
  const hasDropOff = org.item_drop_off;
  const acceptsMoney = org.monetary_donations === 'Yes';
  const acceptsItems = org.dry_rations === 'Yes';
  const acceptsVolunteers = org.volunteer === 'Yes';
  const acceptsOverseas = org.overseas_donations === 'Yes';
  
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-cyan-500/50 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex-1">
          {org.organization_name}
        </h3>
        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full capitalize">
          {org.org_type || org.category?.replace('_', ' ')}
        </span>
      </div>
      
      {/* Accepts badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {acceptsMoney && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
            💰 Monetary
          </span>
        )}
        {acceptsItems && (
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
            📦 Items/Rations
          </span>
        )}
        {acceptsVolunteers && (
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
            🙋 Volunteers
          </span>
        )}
        {acceptsOverseas && (
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
            🌍 Overseas
          </span>
        )}
      </div>
      
      {/* Drop-off Location */}
      {hasDropOff && (
        <div className="mb-3">
          <p className="text-sm text-slate-300 flex items-center gap-2">
            <span className="text-slate-500">📍</span>
            {org.item_drop_off}
          </p>
        </div>
      )}
      
      {/* Links */}
      <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2">
        {org.donation_details && (
          <a 
            href={org.donation_details}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-1"
          >
            📋 Details
          </a>
        )}
        {org.org_link && (
          <a 
            href={org.org_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-1"
          >
            🔗 Website
          </a>
        )}
      </div>
    </div>
  );
}

// Main Relief Directory Page
export default function ReliefDirectoryPage() {
  const [directory, setDirectory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch directory data
  const fetchDirectory = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setLoading(true);
      
      const data = await getReliefDirectory(refresh);
      setDirectory(data);
      setLastUpdated(new Date(data.last_updated));
      setError('');
    } catch (err) {
      setError('Failed to load relief directory. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDirectory(true);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchDirectory]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    
    try {
      setIsSearching(true);
      const results = await searchReliefOrganizations(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch();
      } else {
        setSearchResults(null);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Get organizations to display
  const getDisplayOrganizations = () => {
    if (searchResults) {
      return searchResults.results || [];
    }
    if (directory?.data) {
      return directory.data[activeCategory] || [];
    }
    return [];
  };

  const organizations = getDisplayOrganizations();
  const googleSheetUrl = directory?.google_sheet_url || 'https://docs.google.com/spreadsheets/d/1Wrw6JiVzlYZ9lCeBWg70LuP4yqgMuoDH45OmYI2kLcY/edit';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading relief directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Navigation Bar */}
      <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <span className="text-lg">🛰️</span>
            </div>
            <span className="text-white font-bold">LankaSat <span className="text-cyan-400">Live</span></span>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl">🤝</span>
                Flood Relief Directory
              </h1>
              <p className="text-slate-400 mt-2">
                Find and support flood relief organizations across Sri Lanka
              </p>
              {lastUpdated && (
                <p className="text-xs text-slate-500 mt-1">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchDirectory(true)}
                disabled={isRefreshing}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
                Refresh
              </button>
              <a
                href={googleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>📝</span>
                Add/Edit Entry
              </a>
            </div>
          </div>
          
          {/* Search */}
          <div className="mt-6">
            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by organization, location, or items..."
                className="w-full px-4 py-3 pl-12 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                🔍
              </span>
              {isSearching && (
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-cyan-500"></div>
                </span>
              )}
            </div>
            {searchResults && (
              <p className="text-sm text-slate-400 mt-2">
                Found {searchResults.count} result{searchResults.count !== 1 ? 's' : ''} for "{searchQuery}"
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="ml-2 text-cyan-400 hover:text-cyan-300"
                >
                  Clear search
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Category Tabs */}
      {!searchResults && (
        <div className="flex-shrink-0 bg-slate-800/50 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((category) => {
                const count = directory?.data?.[category.id]?.length || 0;
                const isActive = activeCategory === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-6 py-4 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
                      isActive
                        ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium">{category.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Error State */}
          {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-400 font-medium">Error Loading Data</p>
              <p className="text-red-400/70 text-sm">{error}</p>
            </div>
            <button
              onClick={() => fetchDirectory(true)}
              className="ml-auto px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <p className="text-blue-400 font-medium">Read-Only View</p>
            <p className="text-blue-400/70 text-sm">
              This is a live view of the flood relief donation directory. Data updates automatically every 5 minutes. 
              To add or edit entries, please{' '}
              <a 
                href={googleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-300"
              >
                access the Google Sheet directly
              </a>.
            </p>
          </div>
        </div>
        
        {/* Organizations Grid */}
        {organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org, index) => (
              <OrganizationCard key={org.id || index} org={org} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">📭</span>
            <h3 className="text-xl font-semibold text-white mb-2">No Organizations Found</h3>
            <p className="text-slate-400 mb-4">
              {searchResults 
                ? `No results found for "${searchQuery}"`
                : `No organizations listed in this category yet.`
              }
            </p>
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
            >
              <span>➕</span>
              Add an Organization
            </a>
          </div>
        )}
        
        {/* Stats Footer */}
        {directory && (
          <div className="mt-8 pt-8 border-t border-slate-700">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">{directory.total_organizations}</span>
                Total Organizations
              </span>
              <span className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">{CATEGORIES.length}</span>
                Categories
              </span>
              <span className="flex items-center gap-2">
                🔄 Auto-refreshes every 5 minutes
              </span>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
