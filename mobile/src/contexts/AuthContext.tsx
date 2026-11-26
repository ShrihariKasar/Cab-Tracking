import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { clearSession, getSavedUser, getToken, saveSession } from '../services/secureStorage';
import { socketManager } from '../services/socket';
import { AuthUser, UserRole } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (mobileNumber: string, password: string, role: UserRole) => Promise<void>;
  updateUser: (next: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, saved] = await Promise.all([getToken(), getSavedUser()]);
        if (token && saved) {
          setUser(JSON.parse(saved));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (mobileNumber: string, password: string, role: UserRole) => {
    const res = await api.post('/auth/login', { mobileNumber, password, role });
    const { token, user: profile } = res.data.data;
    await saveSession(token, JSON.stringify(profile));
    setUser(profile);
  };

  const updateUser = (next: AuthUser) => {
    setUser(next);
  };

  const logout = async () => {
    socketManager.disconnect();
    await clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
