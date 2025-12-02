/**
 * Relief Directory Service
 * Handles fetching flood relief donation data from the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch the full relief directory
 * @param {boolean} refresh - Force refresh from Google Sheets
 * @returns {Promise<Object>} Relief directory data
 */
export async function getReliefDirectory(refresh = false) {
  try {
    const url = new URL(`${API_BASE_URL}/relief-directory`);
    if (refresh) {
      url.searchParams.append('refresh', 'true');
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch relief directory: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching relief directory:', error);
    throw error;
  }
}

/**
 * Fetch relief organizations by category
 * @param {string} category - Category name (general, animal_rescue, meals, overseas)
 * @returns {Promise<Object>} Category data
 */
export async function getReliefByCategory(category) {
  try {
    const response = await fetch(`${API_BASE_URL}/relief-directory/category/${category}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch category: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
}

/**
 * Search relief organizations
 * @param {string} query - Search query
 * @returns {Promise<Object>} Search results
 */
export async function searchReliefOrganizations(query) {
  try {
    const url = new URL(`${API_BASE_URL}/relief-directory/search`);
    url.searchParams.append('q', query);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching relief organizations:', error);
    throw error;
  }
}

/**
 * Get the Google Sheet URL for interactive access
 * @returns {Promise<Object>} URL and message
 */
export async function getGoogleSheetUrl() {
  try {
    const response = await fetch(`${API_BASE_URL}/relief-directory/sheet-url`);
    if (!response.ok) {
      throw new Error(`Failed to get sheet URL: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting sheet URL:', error);
    throw error;
  }
}
