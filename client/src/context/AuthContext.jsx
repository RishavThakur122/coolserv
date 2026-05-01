import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cs_user')); } catch { return null; }
  });
  const [technicianProfile, setTechnicianProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('cs_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        setTechnicianProfile(data.technicianProfile);
        localStorage.setItem('cs_user', JSON.stringify(data.user));
      })
      .catch(() => { localStorage.removeItem('cs_token'); localStorage.removeItem('cs_user'); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('cs_token', data.token);
    localStorage.setItem('cs_user', JSON.stringify(data.user));
    setUser(data.user);
    setTechnicianProfile(data.technicianProfile || null);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('cs_token', data.token);
    localStorage.setItem('cs_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cs_token');
    localStorage.removeItem('cs_user');
    setUser(null);
    setTechnicianProfile(null);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(updated);
    localStorage.setItem('cs_user', JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider value={{ user, technicianProfile, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
