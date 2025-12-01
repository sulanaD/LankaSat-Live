/**
 * Auth Context for LankaSat Live
 * Provides authentication state management across the app
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  getUser, 
  isAuthenticated, 
  registerUser, 
  loginUser, 
  guestLogin, 
  logout as authLogout,
  getCurrentUser
} from '../services/auth';

// Create context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Wrap your app with this to enable auth context
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isAuthenticated()) {
          // Try to validate existing token
          try {
            const userData = await getCurrentUser();
            setUser(userData);
          } catch {
            // Token invalid, use stored user data
            const storedUser = getUser();
            if (storedUser) {
              setUser(storedUser);
            }
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Register new user
  const register = useCallback(async (email, password, displayName) => {
    setLoading(true);
    setError(null);
    try {
      const result = await registerUser(email, password, displayName);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Login with email/password
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginUser(email, password);
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Guest login
  const loginAsGuest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await guestLogin();
      setUser(result.user);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    authLogout();
    setUser(null);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isGuest: user?.role === 'guest',
    register,
    login,
    loginAsGuest,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 * @returns {object} Auth context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
