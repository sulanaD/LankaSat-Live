/**
 * Shelter service for LankaSat Live
 * Handles all shelter-related API operations
 */

import { getAuthHeaders } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Create a new shelter
 * @param {object} shelterData - Shelter information
 * @param {string} shelterData.name - Shelter name (required)
 * @param {string} [shelterData.description] - Description
 * @param {number} shelterData.lat - Latitude (required)
 * @param {number} shelterData.lon - Longitude (required)
 * @param {number} [shelterData.capacity] - Maximum capacity
 * @param {string} [shelterData.contact_phone] - Contact phone
 * @param {string} [shelterData.contact_email] - Contact email
 * @param {string} [shelterData.address] - Physical address
 * @param {string[]} [shelterData.amenities] - List of amenities
 * @returns {Promise<object>} Created shelter
 */
export async function createShelter(shelterData) {
  const response = await fetch(`${API_BASE_URL}/shelters`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(shelterData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create shelter');
  }
  
  return response.json();
}

/**
 * Get all shelters with optional filtering
 * @param {object} [options] - Query options
 * @param {string} [options.status='active'] - Filter by status
 * @param {number} [options.limit=100] - Maximum results
 * @param {number} [options.offset=0] - Pagination offset
 * @returns {Promise<object>} Shelters list and total count
 */
export async function getAllShelters(options = {}) {
  const { status = 'active', limit = 100, offset = 0 } = options;
  
  const params = new URLSearchParams({
    status,
    limit: limit.toString(),
    offset: offset.toString()
  });
  
  const response = await fetch(`${API_BASE_URL}/shelters?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch shelters');
  }
  
  return response.json();
}

/**
 * Get shelters formatted for map display
 * @returns {Promise<object>} Shelters with minimal data for map markers
 */
export async function getSheltersForMap() {
  const response = await fetch(`${API_BASE_URL}/shelters/map`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch map shelters');
  }
  
  return response.json();
}

/**
 * Get shelter statistics
 * @returns {Promise<object>} Shelter counts and capacity stats
 */
export async function getShelterStats() {
  const response = await fetch(`${API_BASE_URL}/shelters/stats`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch shelter stats');
  }
  
  return response.json();
}

/**
 * Search for shelters near a location
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} [radiusKm=50] - Search radius in kilometers
 * @returns {Promise<object>} Nearby shelters sorted by distance
 */
export async function searchSheltersByLocation(lat, lon, radiusKm = 50) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius_km: radiusKm.toString()
  });
  
  const response = await fetch(`${API_BASE_URL}/shelters/search?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to search shelters');
  }
  
  return response.json();
}

/**
 * Get a shelter by ID
 * @param {string} shelterId - Shelter UUID
 * @returns {Promise<object>} Shelter details
 */
export async function getShelterById(shelterId) {
  const response = await fetch(`${API_BASE_URL}/shelters/${shelterId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Shelter not found');
  }
  
  return response.json();
}

/**
 * Update a shelter (requires authentication)
 * @param {string} shelterId - Shelter UUID
 * @param {object} updateData - Fields to update
 * @returns {Promise<object>} Updated shelter
 */
export async function updateShelter(shelterId, updateData) {
  const response = await fetch(`${API_BASE_URL}/shelters/${shelterId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update shelter');
  }
  
  return response.json();
}

/**
 * Delete a shelter (requires authentication)
 * @param {string} shelterId - Shelter UUID
 * @returns {Promise<object>} Success message
 */
export async function deleteShelter(shelterId) {
  const response = await fetch(`${API_BASE_URL}/shelters/${shelterId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete shelter');
  }
  
  return response.json();
}

// List of available amenities for shelter registration
export const SHELTER_AMENITIES = [
  'water',
  'food',
  'medical',
  'beds',
  'electricity',
  'wifi',
  'parking',
  'wheelchair_accessible',
  'pet_friendly',
  'child_care',
  'showers',
  'toilets',
  'kitchen',
  'first_aid',
  'generator'
];

// Export as default object for convenience
export const shelterService = {
  createShelter,
  getAllShelters,
  getSheltersForMap,
  getShelterStats,
  searchSheltersByLocation,
  getShelterById,
  updateShelter,
  deleteShelter,
  SHELTER_AMENITIES
};

export default shelterService;
