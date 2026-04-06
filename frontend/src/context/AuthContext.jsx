import React, { createContext, useState, useEffect } from 'react';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Initialize Auth on App Startup ──────────────────────────────────────
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // If no token, just finish loading
        if (!token) {
          setLoading(false);
          return;
        }

        // Token exists, set authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verify token by calling /api/auth/me endpoint
        console.log('[AUTH] Verifying stored token...');
        const response = await api.get('/api/auth/me');
        
        if (response.data) {
          // Extract user data (remove password if present)
          const userData = {
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            role: response.data.role,
            department: response.data.department,
            reg_no: response.data.reg_no,
            faculty_id: response.data.faculty_id,
            college_name: response.data.college_name
          };
          
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('[AUTH] User restored from token:', userData.name);
        }
      } catch (err) {
        // Token is invalid or expired
        console.warn('[AUTH] Token verification failed:', err.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // ─── Login Method ───────────────────────────────────────────────────────
  const login = (userData, token) => {
    // Store token
    localStorage.setItem('token', token);
    
    // Store user data
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Set default authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Update state
    setUser(userData);
    setError(null);
    console.log('[AUTH] User logged in:', userData.name);
  };

  // ─── Logout Method ──────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setError(null);
    console.log('[AUTH] User logged out');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
