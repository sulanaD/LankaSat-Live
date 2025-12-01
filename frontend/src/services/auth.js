/**
 * Authentication service for LankaSat Live
 * Handles user registration, login, guest sessions, and token management
 * 
 * IMPORTANT: This uses the backend API for auth, not direct Supabase client.
 * The backend uses non-legacy Supabase keys (sb_publishable_* / sb_secret_*)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token storage key
const TOKEN_KEY = 'lankasat_token';
const USER_KEY = 'lankasat_user';

/**
 * Get stored auth token
 * @returns {string|null} The stored JWT token or null
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored user info
 * @returns {object|null} The stored user object or null
 */
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Store auth token and user info
 * @param {string} token - JWT token
 * @param {object} user - User info object
 */
function storeAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear stored auth data
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has a valid token
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Check if current user is a guest
 * @returns {boolean} True if user is a guest
 */
export function isGuest() {
  const user = getUser();
  return user?.role === 'guest';
}

/**
 * Get authorization headers for API requests
 * @returns {object} Headers object with Authorization if token exists
 */
export function getAuthHeaders() {
  const token = getToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * Register a new user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password (min 6 characters)
 * @param {string} [displayName] - Optional display name
 * @returns {Promise<object>} User data and token
 */
export async function registerUser(email, password, displayName = null) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      display_name: displayName
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }
  
  const data = await response.json();
  storeAuth(data.access_token, data.user);
  return data;
}

/**
 * Login with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<object>} User data and token
 */
export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  
  const data = await response.json();
  storeAuth(data.access_token, data.user);
  return data;
}

/**
 * Create a guest session without registration
 * Guest users can still register shelters but are marked as guests
 * @returns {Promise<object>} Guest session data and token
 */
export async function guestLogin() {
  const response = await fetch(`${API_BASE_URL}/auth/guest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Guest login failed');
  }
  
  const data = await response.json();
  storeAuth(data.access_token, data.user);
  return data;
}

/**
 * Get current user info from the server
 * Validates the stored token and returns fresh user data
 * @returns {Promise<object>} Current user info
 */
export async function getCurrentUser() {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      throw new Error('Session expired');
    }
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get user info');
  }
  
  return response.json();
}

/**
 * Logout current user
 * Clears stored auth data
 */
export function logout() {
  clearAuth();
}

/**
 * Auth state change callback type
 * @callback AuthStateCallback
 * @param {object|null} user - Current user or null if logged out
 */

// Auth state listeners
const authListeners = new Set();

/**
 * Subscribe to auth state changes
 * @param {AuthStateCallback} callback - Function to call on auth changes
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  authListeners.add(callback);
  // Return unsubscribe function
  return () => authListeners.delete(callback);
}

/**
 * Notify all listeners of auth state change
 * @param {object|null} user - Current user or null
 */
function notifyAuthChange(user) {
  authListeners.forEach(callback => callback(user));
}

// Export a hook-friendly auth context helper
export const authService = {
  getToken,
  getUser,
  isAuthenticated,
  isGuest,
  getAuthHeaders,
  registerUser,
  loginUser,
  guestLogin,
  getCurrentUser,
  logout,
  clearAuth,
  onAuthStateChange
};

export default authService;
