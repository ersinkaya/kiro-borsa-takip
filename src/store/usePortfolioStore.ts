import { create } from 'zustand';
import { PortfolioItem, Transaction, Account } from '../types';
import { getAuthHeaders } from './useAuthStore';

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location?.port === '8081') {
    return 'http://localhost:3001';
  }
  return '';
};

const API_BASE = getApiBase();

interface PortfolioState {
  portfolio: PortfolioItem[];
  transactions: Transaction[];
  account: Account;
  interestRate: number;
  totalRealizedPnL: number;
  loading: boolean;

  loadData: () => Promise<void>;
  addToPortfolio: (item: Omit<PortfolioItem, 'id' | 'currentPrice'>) => Promise<void>;
  sellFromPortfolio: (params: { symbol: string; name: string; quantity: number; sellPrice: number; sellDate: string; affectBalance: boolean }) => Promise<{ success: boolean; realizedPnL?: number; message?: string }>;
  removeFromPortfolio: (id: string) => Promise<void>;
  updateCurrentPrices: (prices: Record<string, number>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  setInterestRate: (rate: number) => Promise<void>;
  clearPortfolio: () => Promise<void>;
  resetAll: () => Promise<void>;
  undoLastTransaction: () => Promise<{ success: boolean; message?: string }>;
  deleteTransaction: (transactionId: string) => Promise<{ success: boolean; message?: string }>;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...headers, ...options.headers },
  });
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolio: [],
  transactions: [],
  account: { balance: 0, totalDeposit: 0, totalWithdraw: 0 },
  interestRate: 50,
  totalRealizedPnL: 0,
  loading: false,

  loadData: async () => {
    set({ loading: true });
    try {
      const res = await apiFetch('/api/portfolio/data');
      if (res.ok) {
        const data = await res.json();
        set({
          portfolio: data.portfolio || [],
          transactions: data.transactions || [],
          account: data.account || { balance: 0, totalDeposit: 0, totalWithdraw: 0 },
          interestRate: data.interestRate || 50,
          totalRealizedPnL: data.totalRealizedPnL || 0,
        });
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      set({ loading: false });
    }
  },

  addToPortfolio: async (item) => {
    const res = await apiFetch('/api/portfolio/buy', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const data = await res.json();
      set((state) => ({
        portfolio: [data.portfolioItem, ...state.portfolio],
        transactions: [data.transaction, ...state.transactions],
        account: data.account,
      }));
    }
  },

  sellFromPortfolio: async (params) => {
    const res = await apiFetch('/api/portfolio/sell', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      set((state) => ({
        portfolio: data.portfolio,
        transactions: [data.transaction, ...state.transactions],
        account: data.account,
        totalRealizedPnL: state.totalRealizedPnL + (data.realizedPnL || 0),
      }));
      return { success: true, realizedPnL: data.realizedPnL };
    }
    const err = await res.json().catch(() => ({ error: 'Satış hatası' }));
    return { success: false, message: err.error };
  },

  removeFromPortfolio: async (id) => {
    await apiFetch(`/api/portfolio/${id}`, { method: 'DELETE' });
    set((state) => ({ portfolio: state.portfolio.filter((p) => p.id !== id) }));
  },

  updateCurrentPrices: (prices) => {
    set((state) => ({
      portfolio: state.portfolio.map((item) => ({
        ...item,
        currentPrice: prices[item.symbol] ?? item.currentPrice,
      })),
    }));
  },

  addTransaction: async (transaction) => {
    // Bu artık addToPortfolio içinde yapılıyor
  },

  deposit: async (amount) => {
    const res = await apiFetch('/api/portfolio/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    if (res.ok) {
      const data = await res.json();
      set({ account: data.account });
    }
  },

  withdraw: async (amount) => {
    const res = await apiFetch('/api/portfolio/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    if (res.ok) {
      const data = await res.json();
      set({ account: data.account });
    }
  },

  setInterestRate: async (rate) => {
    await apiFetch('/api/portfolio/interest-rate', {
      method: 'POST',
      body: JSON.stringify({ rate }),
    });
    set({ interestRate: rate });
  },

  clearPortfolio: async () => {
    await apiFetch('/api/portfolio/clear', { method: 'POST' });
    set({ portfolio: [], transactions: [], account: { balance: 0, totalDeposit: 0, totalWithdraw: 0 } });
  },

  resetAll: async () => {
    await apiFetch('/api/portfolio/reset', { method: 'POST' });
    set({
      portfolio: [],
      transactions: [],
      account: { balance: 0, totalDeposit: 0, totalWithdraw: 0 },
    });
  },

  undoLastTransaction: async () => {
    const { transactions } = get();
    if (transactions.length === 0) return { success: false, message: 'Geri alınacak işlem yok' };
    return get().deleteTransaction(transactions[0].id);
  },

  deleteTransaction: async (transactionId) => {
    const res = await apiFetch(`/api/portfolio/transaction/${transactionId}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      set({
        portfolio: data.portfolio,
        transactions: data.transactions,
        account: data.account,
      });
      return { success: true };
    }
    const err = await res.json();
    return { success: false, message: err.error };
  },
}));
