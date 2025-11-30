/**
 * API service for LankaSat Live
 * Handles all communication with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch available layers from the backend
 */
export async function fetchLayers() {
  const response = await fetch(`${API_BASE_URL}/layers`);
  if (!response.ok) {
    throw new Error(`Failed to fetch layers: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Check backend health status
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Verify authentication status
 */
export async function verifyAuth() {
  const response = await fetch(`${API_BASE_URL}/token`);
  if (!response.ok) {
    throw new Error(`Auth verification failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get the tile URL for a given layer, coordinates, and date
 */
export function getTileUrl(layer, date) {
  const dateStr = date instanceof Date 
    ? date.toISOString().split('T')[0] 
    : date;
  return `${API_BASE_URL}/tile?layer=${layer}&date=${dateStr}&z={z}&x={x}&y={y}`;
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const response = await fetch(`${API_BASE_URL}/cache/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cache stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch weather summary for all Sri Lanka
 */
export async function fetchWeather() {
  const response = await fetch(`${API_BASE_URL}/weather`);
  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch weather for a specific location
 */
export async function fetchLocationWeather(location) {
  const response = await fetch(`${API_BASE_URL}/weather/${location}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch weather for ${location}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch weather forecast for a location
 */
export async function fetchForecast(location) {
  const response = await fetch(`${API_BASE_URL}/weather/forecast/${location}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get all monitored weather locations
 */
export async function fetchWeatherLocations() {
  const response = await fetch(`${API_BASE_URL}/weather/locations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.statusText}`);
  }
  return response.json();
}

export default {
  fetchLayers,
  checkHealth,
  verifyAuth,
  getTileUrl,
  getCacheStats,
  fetchWeather,
  fetchLocationWeather,
  fetchForecast,
  fetchWeatherLocations,
  API_BASE_URL
};
