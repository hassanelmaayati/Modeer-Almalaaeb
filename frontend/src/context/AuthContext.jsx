import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      api.getMe()
        .then(userData => setUser(userData))
        .catch(() => {
          localStorage.removeItem('token');
          setToken('');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    setAuthModalOpen(false);
    return res.user;
  };

  const signup = async (name, email, password, sportsInterests) => {
    const res = await api.signup({ name, email, password, sports_interests: sportsInterests });
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    setAuthModalOpen(false);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      const u = await api.getMe();
      setUser(u);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      signup,
      logout,
      refreshUser,
      authModalOpen,
      setAuthModalOpen
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
