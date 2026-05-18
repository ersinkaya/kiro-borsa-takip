import { create } from 'zustand';
import { getAuthHeaders } from './useAuthStore';

export interface WatchlistGroup {
  id: string;
  name: string;
  symbols: string[];
  is_default?: boolean;
}

interface WatchlistState {
  groups: WatchlistGroup[];
  activeGroupId: string;
  loading: boolean;

  addGroup: (name: string) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  renameGroup: (id: string, name: string) => Promise<void>;
  setActiveGroup: (id: string) => void;
  addToGroup: (groupId: string, symbol: string) => Promise<void>;
  removeFromGroup: (groupId: string, symbol: string) => Promise<void>;
  isInGroup: (groupId: string, symbol: string) => boolean;
  getActiveSymbols: () => string[];
  addToActive: (symbol: string) => Promise<void>;
  removeFromActive: (symbol: string) => Promise<void>;
  watchlist: string[];
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  isInWatchlist: (symbol: string) => boolean;
  loadWatchlist: () => Promise<void>;
}

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location?.port === '8081') {
    return 'http://localhost:3001';
  }
  return '';
};

const API_BASE = getApiBase();

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...headers, ...options.headers },
  });
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  groups: [],
  activeGroupId: '',
  loading: false,

  get watchlist() { return get().getActiveSymbols(); },

  loadWatchlist: async () => {
    set({ loading: true });
    try {
      const res = await apiFetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        const groups = data.groups || [];
        const defaultGroup = groups.find((g: WatchlistGroup) => g.is_default) || groups[0];
        set({ groups, activeGroupId: get().activeGroupId || defaultGroup?.id || '' });
      }
    } catch (error) {
      console.error('Watchlist yükleme hatası:', error);
    } finally {
      set({ loading: false });
    }
  },

  addGroup: async (name) => {
    const res = await apiFetch('/api/watchlist/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      set((state) => ({ groups: [...state.groups, { ...data.group, symbols: [] }] }));
    }
  },

  removeGroup: async (id) => {
    const group = get().groups.find((g) => g.id === id);
    if (!group || group.is_default) return;
    await apiFetch(`/api/watchlist/groups/${id}`, { method: 'DELETE' });
    set((state) => {
      const newGroups = state.groups.filter((g) => g.id !== id);
      const newActiveId = state.activeGroupId === id
        ? newGroups.find((g) => g.is_default)?.id || newGroups[0]?.id || ''
        : state.activeGroupId;
      return { groups: newGroups, activeGroupId: newActiveId };
    });
  },

  renameGroup: async (id, name) => {
    await apiFetch(`/api/watchlist/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)),
    }));
  },

  setActiveGroup: (id) => set({ activeGroupId: id }),

  addToGroup: async (groupId, symbol) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group || group.symbols.includes(symbol)) return;
    await apiFetch(`/api/watchlist/groups/${groupId}/items`, {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    });
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, symbols: [...g.symbols, symbol] } : g
      ),
    }));
  },

  removeFromGroup: async (groupId, symbol) => {
    await apiFetch(`/api/watchlist/groups/${groupId}/items/${symbol}`, { method: 'DELETE' });
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, symbols: g.symbols.filter((s) => s !== symbol) } : g
      ),
    }));
  },

  isInGroup: (groupId, symbol) => {
    return get().groups.find((g) => g.id === groupId)?.symbols.includes(symbol) || false;
  },

  getActiveSymbols: () => {
    const { groups, activeGroupId } = get();
    return groups.find((g) => g.id === activeGroupId)?.symbols || [];
  },

  addToActive: (symbol) => get().addToGroup(get().activeGroupId, symbol),
  removeFromActive: (symbol) => get().removeFromGroup(get().activeGroupId, symbol),
  addToWatchlist: (symbol) => get().addToActive(symbol),
  removeFromWatchlist: (symbol) => get().removeFromActive(symbol),
  isInWatchlist: (symbol) => get().isInGroup(get().activeGroupId, symbol),
}));
