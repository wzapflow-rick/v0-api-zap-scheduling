'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setToken, removeToken, getToken } from '@/lib/api';
import { clearAllOfflineData } from '@/lib/offline';
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
    
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        removeToken();
        setUser(null);
      }
    } catch {
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
      
      // Verifica se o login foi bem sucedido (tem token e user)
      if (response.success && response.data && response.data.token && response.data.user) {
        setToken(response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
      
      // Trata caso onde backend retorna success:true mas com erro dentro de data
      const errorMessage = (response.data as any)?.error || response.error || 'Erro ao fazer login';
      
      return { 
        success: false, 
        error: errorMessage,
        retryAfter: response.retryAfter,
      };
    } catch {
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      
      // Verifica se o registro foi bem sucedido (tem token e user)
      if (response.success && response.data && response.data.token && response.data.user) {
        setToken(response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
      
      // Trata caso onde backend retorna success:true mas com erro dentro de data
      // Ex: {"success":true,"data":{"error":"Email ja esta em uso"}}
      const errorMessage = (response.data as any)?.error || response.error || 'Erro ao criar conta';
      
      return { 
        success: false, 
        error: errorMessage,
        retryAfter: response.retryAfter,
      };
    } catch {
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
  };

  const logout = useCallback(async () => {
    removeToken();
    setUser(null);
    // Clear offline data on logout
    try {
      await clearAllOfflineData();
    } catch {
      // Ignore errors during cleanup
    }
    router.push('/');
  }, [router]);

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
