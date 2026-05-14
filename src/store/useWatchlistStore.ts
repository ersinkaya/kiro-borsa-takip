import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WatchlistState {
  watchlist: string[]; // Takip edilen hisse sembolleri
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  loadWatchlist: () => Promise<void>;
  saveWatchlist: () => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  watchlist: [],

  addToWatchlist: (symbol) => {
    set((state) => {
      if (state.watchlist.includes(symbol)) return state;
      return { watchlist: [...state.watchlist, symbol] };
    });
    get().saveWatchlist();
  },

  removeFromWatchlist: (symbol) => {
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== symbol),
    }));
    get().saveWatchlist();
  },

  isInWatchlist: (symbol) => {
    return get().watchlist.includes(symbol);
  },

  loadWatchlist: async () => {
    try {
      const data = await AsyncStorage.getItem('watchlist-data');
      if (data) {
        set({ watchlist: JSON.parse(data) });
      }
    } catch (error) {
      console.error('Takip listesi yüklenirken hata:', error);
    }
  },

  saveWatchlist: async () => {
    try {
      await AsyncStorage.setItem('watchlist-data', JSON.stringify(get().watchlist));
    } catch (error) {
      console.error('Takip listesi kaydedilirken hata:', error);
    }
  },
}));
