'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  handleOAuthToken: async () => {},
  logout: () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await authAPI.getMe();
          if (res.data?.success) {
            setUser(res.data.data);
          } else {
            localStorage.removeItem('token');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data?.success) {
      localStorage.setItem('token', res.data.data.token);
      setUser(res.data.data);
      return res.data.data;
    } else {
      throw new Error(res.data?.message || 'Login failed');
    }
  };

  const register = async (name, email, password, organization) => {
    const res = await authAPI.register({ name, email, password, organization });
    if (res.data?.success) {
      localStorage.setItem('token', res.data.data.token);
      setUser(res.data.data);
      return res.data.data;
    } else {
      throw new Error(res.data?.message || 'Registration failed');
    }
  };

  const handleOAuthToken = async (token) => {
    localStorage.setItem('token', token);
    const res = await authAPI.getMe();
    if (res.data?.success) {
      setUser(res.data.data);
      return res.data.data;
    } else {
      localStorage.removeItem('token');
      throw new Error(res.data?.message || 'Failed to retrieve profile');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, handleOAuthToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
