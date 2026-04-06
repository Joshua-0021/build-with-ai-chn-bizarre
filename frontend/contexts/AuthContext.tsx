/**
 * AuthContext — Manages authentication state, login/logout, and token persistence.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { authAPI } from '../services/api';

interface AuthUser {
  house_id: string;
  role: 'user' | 'greenarmy';
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (house_id: string, password: string) => Promise<void>;
  register: (house_id: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage helpers (cross-platform)
async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('pachapp_token', token);
  } else {
    await SecureStore.setItemAsync('pachapp_token', token);
  }
}

async function saveUserData(user: AuthUser): Promise<void> {
  const data = JSON.stringify(user);
  if (Platform.OS === 'web') {
    localStorage.setItem('pachapp_user', data);
  } else {
    await SecureStore.setItemAsync('pachapp_user', data);
  }
}

async function getStoredUser(): Promise<AuthUser | null> {
  try {
    let data: string | null;
    if (Platform.OS === 'web') {
      data = localStorage.getItem('pachapp_user');
    } else {
      data = await SecureStore.getItemAsync('pachapp_user');
    }
    if (data) return JSON.parse(data);
  } catch {}
  return null;
}

async function clearStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem('pachapp_token');
    localStorage.removeItem('pachapp_user');
  } else {
    await SecureStore.deleteItemAsync('pachapp_token');
    await SecureStore.deleteItemAsync('pachapp_user');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored session on mount
  useEffect(() => {
    (async () => {
      const storedUser = await getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (house_id: string, password: string) => {
    const response = await authAPI.login(house_id, password);
    const { access_token, role } = response.data;

    const authUser: AuthUser = {
      house_id,
      role,
      token: access_token,
    };

    await saveToken(access_token);
    await saveUserData(authUser);
    setUser(authUser);
  };

  const register = async (house_id: string, password: string, role: string) => {
    await authAPI.register(house_id, password, role);
  };

  const logout = async () => {
    await clearStorage();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
