'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setToken, removeToken, getToken } from '@/lib/api';
import type { User, LoginRequest, RegisterRequest } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<{ success: boolean; error?: string; retryAfter?: number }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string; retryAfter?: number }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const token = getToken();
    console.log('[v0] refreshUser called, token exists:', !!token);
    
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      console.log('[v0] authApi.me response:', response);
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        console.log('[v0] Auth failed, clearing token');
        removeToken();
        setUser(null);
      }
    } catch (error) {
      console.error('[v0] Auth error:', error);
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data);
      console.log('[v0] Login response:', response);
      
      if (response.success && response.data) {
        setToken(response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
      return { 
        success: false, 
        error: response.error || 'Erro ao fazer login',
        retryAfter: response.retryAfter,
      };
    } catch (error) {
      console.error('[v0] Login error:', error);
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      console.log('[v0] Register response:', response);
      
      if (response.success && response.data) {
        setToken(response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
      return { 
        success: false, 
        error: response.error || 'Erro ao criar conta',
        retryAfter: response.retryAfter,
      };
    } catch (error) {
      console.error('[v0] Register error:', error);
      return { success: false, error: 'Erro ao criar conta' };
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
    router.push('/');
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
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
