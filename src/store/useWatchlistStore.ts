import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WatchlistGroup {
  id: string;
  name: string;
  symbols: string[];
}

interface WatchlistState {
  groups: WatchlistGroup[];
  activeGroupId: string;

  // Grup yönetimi
  addGroup: (name: string) => void;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  setActiveGroup: (id: string) => void;

  // Hisse yönetimi
  addToGroup: (groupId: string, symbol: string) => void;
  removeFromGroup: (groupId: string, symbol: string) => void;
  isInGroup: (groupId: string, symbol: string) => boolean;

  // Aktif gruptaki hisseler (kısayol)
  getActiveSymbols: () => string[];
  addToActive: (symbol: string) => void;
  removeFromActive: (symbol: string) => void;

  // Eski uyumluluk
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;

  loadWatchlist: () => Promise<void>;
  saveWatchlist: () => Promise<void>;
}

const DEFAULT_GROUP: WatchlistGroup = {
  id: 'default',
  name: 'Takip Listem',
  symbols: [],
};

const generateId = () => Math.random().toString(36).substring(2, 10);

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  groups: [DEFAULT_GROUP],
  activeGroupId: 'default',

  // Eski uyumluluk - aktif grubun sembolleri
  get watchlist() {
    return get().getActiveSymbols();
  },

  addGroup: (name) => {
    const newGroup: WatchlistGroup = { id: generateId(), name, symbols: [] };
    set((state) => ({ groups: [...state.groups, newGroup] }));
    get().saveWatchlist();
  },

  removeGroup: (id) => {
    if (id === 'default') return; // Varsayılan grup silinemez
    set((state) => {
      const newGroups = state.groups.filter((g) => g.id !== id);
      const newActiveId = state.activeGroupId === id ? 'default' : state.activeGroupId;
      return { groups: newGroups, activeGroupId: newActiveId };
    });
    get().saveWatchlist();
  },

  renameGroup: (id, name) => {
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)),
    }));
    get().saveWatchlist();
  },

  setActiveGroup: (id) => {
    set({ activeGroupId: id });
    get().saveWatchlist();
  },

  addToGroup: (groupId, symbol) => {
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id === groupId && !g.symbols.includes(symbol)) {
          return { ...g, symbols: [...g.symbols, symbol] };
        }
        return g;
      }),
    }));
    get().saveWatchlist();
  },

  removeFromGroup: (groupId, symbol) => {
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id === groupId) {
          return { ...g, symbols: g.symbols.filter((s) => s !== symbol) };
        }
        return g;
      }),
    }));
    get().saveWatchlist();
  },

  isInGroup: (groupId, symbol) => {
    const group = get().groups.find((g) => g.id === groupId);
    return group?.symbols.includes(symbol) || false;
  },

  getActiveSymbols: () => {
    const { groups, activeGroupId } = get();
    const group = groups.find((g) => g.id === activeGroupId);
    return group?.symbols || [];
  },

  addToActive: (symbol) => {
    get().addToGroup(get().activeGroupId, symbol);
  },

  removeFromActive: (symbol) => {
    get().removeFromGroup(get().activeGroupId, symbol);
  },

  // Eski uyumluluk
  addToWatchlist: (symbol) => {
    get().addToActive(symbol);
  },

  removeFromWatchlist: (symbol) => {
    get().removeFromActive(symbol);
  },

  isInWatchlist: (symbol) => {
    return get().isInGroup(get().activeGroupId, symbol);
  },

  loadWatchlist: async () => {
    try {
      const data = await AsyncStorage.getItem('watchlist-groups');
      if (data) {
        const parsed = JSON.parse(data);
        set({
          groups: parsed.groups || [DEFAULT_GROUP],
          activeGroupId: parsed.activeGroupId || 'default',
        });
      } else {
        // Eski format uyumluluğu
        const oldData = await AsyncStorage.getItem('watchlist-data');
        if (oldData) {
          const symbols = JSON.parse(oldData);
          set({
            groups: [{ ...DEFAULT_GROUP, symbols }],
            activeGroupId: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Takip listesi yüklenirken hata:', error);
    }
  },

  saveWatchlist: async () => {
    try {
      const { groups, activeGroupId } = get();
      await AsyncStorage.setItem(
        'watchlist-groups',
        JSON.stringify({ groups, activeGroupId })
      );
    } catch (error) {
      console.error('Takip listesi kaydedilirken hata:', error);
    }
  },
}));
