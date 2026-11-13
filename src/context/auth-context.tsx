'use client';

import React, { createContext, useContext, useState, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/issue';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginDemo: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'tykket_auth_token';
const REFRESH_TOKEN_KEY = 'tykket_refresh_token';
const USER_KEY = 'tykket_auth_user';

let cachedRawUser: string | null = null;
let cachedParsedUser: User | null = null;

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw === cachedRawUser) {
      return cachedParsedUser;
    }
    cachedRawUser = raw;
    cachedParsedUser = raw ? (JSON.parse(raw) as User) : null;
    return cachedParsedUser;
  } catch {
    cachedRawUser = null;
    cachedParsedUser = null;
    return null;
  }
}

function subscribeToAuth(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('tykket_auth_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('tykket_auth_change', callback);
  };
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const response = obj.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (typeof obj.message === 'string') return obj.message;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Synchronously subscribe to local storage token & user
  const token = useSyncExternalStore(subscribeToAuth, getStoredToken, () => null);
  const user = useSyncExternalStore(subscribeToAuth, getStoredUser, () => null);

  const saveAuthSession = (authToken: string, authUser: User, refreshToken?: string) => {
    try {
      const rawUser = JSON.stringify(authUser);
      cachedRawUser = rawUser;
      cachedParsedUser = authUser;
      localStorage.setItem(TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, rawUser);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      document.cookie = `${TOKEN_KEY}=${authToken}; path=/; max-age=604800; SameSite=Lax`;
      window.dispatchEvent(new Event('tykket_auth_change'));
    } catch {
      // Ignore storage write errors
    }
  };

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setSubmitting(true);
      try {
        const data = await authApi.login({ email, password });
        saveAuthSession(data.tokens.access_token, data.user, data.tokens.refresh_token);

        toast.success(`Welcome back, ${data.user.name}!`);
        router.push('/projects/TYK/board');
        router.refresh();
        return true;
      } catch (err: unknown) {
        toast.error('Login failed', {
          description: getErrorMessage(err, 'Invalid email or password'),
        });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [router]
  );

  const loginDemo = useCallback(
    async (email: string, password = 'password123') => {
      setSubmitting(true);
      try {
        const data = await authApi.login({
          email,
          password,
        });
        saveAuthSession(data.tokens.access_token, data.user, data.tokens.refresh_token);
        toast.success(`Logged in as ${data.user.name}`);
        router.push('/projects/TYK/board');
        router.refresh();
      } catch (err: unknown) {
        toast.error('Demo login failed', {
          description: getErrorMessage(err, 'Demo login failed. Make sure backend is running on :8081.'),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [router]
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      setSubmitting(true);
      try {
        const data = await authApi.register({ name, email, password });
        saveAuthSession(data.tokens.access_token, data.user, data.tokens.refresh_token);

        toast.success(`Account created! Welcome to Tykket, ${data.user.name}!`);
        router.push('/projects/TYK/board');
        router.refresh();
        return true;
      } catch (err: unknown) {
        toast.error('Registration failed', {
          description: getErrorMessage(err, 'Please check your information'),
        });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    try {
      cachedRawUser = null;
      cachedParsedUser = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
      window.dispatchEvent(new Event('tykket_auth_change'));
    } catch {
      // Ignore storage errors
    }
    toast.info('You have been logged out');
    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading: submitting,
        login,
        loginDemo,
        register,
        logout,
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
