import { create } from 'zustand';
import { Stock } from '../types';
import { fetchStockPrices } from '../services/stockApi';

interface StockState {
  stocks: Stock[];
  isLoading: boolean;
  lastUpdated: string | null;
  error: string | null;
  searchQuery: string;

  // Actions
  fetchPrices: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  getFilteredStocks: () => Stock[];
}

export const useStockStore = create<StockState>((set, get) => ({
  stocks: [],
  isLoading: false,
  lastUpdated: null,
  error: null,
  searchQuery: '',

  fetchPrices: async () => {
    set({ isLoading: true, error: null });
    try {
      const stocks = await fetchStockPrices();
      set({
        stocks,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      set({
        isLoading: false,
        error: 'Fiyatlar yüklenirken hata oluştu',
      });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  getFilteredStocks: () => {
    const { stocks, searchQuery } = get();
    if (!searchQuery.trim()) return stocks;
    const q = searchQuery.toLowerCase();
    return stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  },
}));
