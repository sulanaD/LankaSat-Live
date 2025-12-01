/**
 * Login Page Component
 * Handles user login and guest access
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login, loginAsGuest, loading, error, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleGuestLogin = async () => {
    setFormError('');
    clearError();
    
    try {
      await loginAsGuest();
      navigate('/');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 overflow-y-auto" style={{ height: '100vh', overflowY: 'auto' }}>
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
            <span className="text-3xl">🛰️</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            LankaSat <span className="text-primary">Live</span>
          </h1>
          <p className="text-gray-400 mt-2">Sign in to access the dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {(formError || error) && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {formError || error}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">Or</span>
            </div>
          </div>

          {/* Guest Login Button */}
          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white font-medium rounded-lg transition-colors border border-gray-600"
          >
            {loading ? 'Please wait...' : 'Continue as Guest'}
          </button>

          {/* Register Link */}
          <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Back to Dashboard */}
        <p className="mt-6 text-center">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
