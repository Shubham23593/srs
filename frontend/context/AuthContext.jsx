'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Clear legacy persistent localStorage tokens to ensure fresh sessions
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }

        const token = sessionStorage.getItem('token');
        if (token) {
          const res = await authAPI.getMe();
          if (res.data?.success) {
            setUser(res.data.data);
          } else {
            sessionStorage.removeItem('token');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        sessionStorage.removeItem('token');
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
      sessionStorage.setItem('token', res.data.data.token);
      setUser(res.data.data);
      return res.data.data;
    } else {
      throw new Error(res.data?.message || 'Login failed');
    }
  };

  const register = async (name, email, password, organization) => {
    const res = await authAPI.register({ name, email, password, organization });
    if (res.data?.success) {
      sessionStorage.setItem('token', res.data.data.token);
      setUser(res.data.data);
      return res.data.data;
    } else {
      throw new Error(res.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
