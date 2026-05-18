import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface User {
  id: string | number;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
}

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location?.port === '8081') {
    return 'http://localhost:3001';
  }
  return '';
};

const API_BASE = getApiBase();

// Token'ı sakla/oku
const saveToken = async (token: string | null) => {
  if (Platform.OS === 'web') {
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
  } else {
    if (token) await AsyncStorage.setItem('auth_token', token);
    else await AsyncStorage.removeItem('auth_token');
  }
};

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return AsyncStorage.getItem('auth_token');
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    set({ loading: true });
    try {
      // URL'de access_token var mı kontrol et (Google OAuth callback)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        if (accessToken) {
          window.location.hash = '';
          await get().setToken(accessToken);
          set({ initialized: true, loading: false });
          return;
        }
      }

      // Kayıtlı token var mı?
      const token = await getToken();
      if (token) {
        // Token'ı doğrula
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          set({ user: data.user, token, initialized: true });
        } else {
          await saveToken(null);
          set({ user: null, token: null, initialized: true });
        }
      } else {
        set({ initialized: true });
      }
    } catch (error) {
      console.error('Auth init error:', error);
      set({ initialized: true });
    } finally {
      set({ loading: false });
    }
  },

  setToken: async (token: string) => {
    await saveToken(token);
    // Kullanıcı bilgisini al
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, token });
      }
    } catch {}
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();

      if (!res.ok) return { error: data.error };

      await saveToken(data.token);
      set({ user: data.user, token: data.token });
      return {};
    } catch (e: any) {
      return { error: e.message || 'Bağlantı hatası' };
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) return { error: data.error };

      await saveToken(data.token);
      set({ user: data.user, token: data.token });
      return {};
    } catch (e: any) {
      return { error: e.message || 'Bağlantı hatası' };
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: () => {
    // Google OAuth sayfasına yönlendir
    window.location.href = `${API_BASE}/auth/google`;
  },

  signOut: async () => {
    await saveToken(null);
    set({ user: null, token: null });
  },
}));

// Helper: API isteklerinde token eklemek için
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
};
