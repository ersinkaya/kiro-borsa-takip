import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PortfolioItem, Transaction, Account } from '../types';

interface PortfolioState {
  portfolio: PortfolioItem[];
  transactions: Transaction[];
  account: Account;
  interestRate: number; // Yıllık faiz oranı (%)

  // Actions
  addToPortfolio: (item: Omit<PortfolioItem, 'id' | 'currentPrice'>) => void;
  removeFromPortfolio: (id: string) => void;
  updateCurrentPrices: (prices: Record<string, number>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
  setInterestRate: (rate: number) => void;
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolio: [],
  transactions: [],
  account: { balance: 0, totalDeposit: 0, totalWithdraw: 0 },
  interestRate: 50, // Varsayılan %50 yıllık faiz

  addToPortfolio: (item) => {
    const newItem: PortfolioItem = {
      ...item,
      id: generateId(),
      currentPrice: item.buyPrice,
    };
    set((state) => ({
      portfolio: [...state.portfolio, newItem],
    }));
    get().saveData();
  },

  removeFromPortfolio: (id) => {
    set((state) => ({
      portfolio: state.portfolio.filter((item) => item.id !== id),
    }));
    get().saveData();
  },

  updateCurrentPrices: (prices) => {
    set((state) => ({
      portfolio: state.portfolio.map((item) => ({
        ...item,
        currentPrice: prices[item.symbol] ?? item.currentPrice,
      })),
    }));
  },

  addTransaction: (transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
    };

    set((state) => {
      let newBalance = state.account.balance;

      if (transaction.type === 'BUY') {
        newBalance -= transaction.totalAmount;
      } else {
        newBalance += transaction.totalAmount;
      }

      return {
        transactions: [newTransaction, ...state.transactions],
        account: { ...state.account, balance: newBalance },
      };
    });
    get().saveData();
  },

  deposit: (amount) => {
    set((state) => ({
      account: {
        ...state.account,
        balance: state.account.balance + amount,
        totalDeposit: state.account.totalDeposit + amount,
      },
    }));
    get().saveData();
  },

  withdraw: (amount) => {
    set((state) => ({
      account: {
        ...state.account,
        balance: state.account.balance - amount,
        totalWithdraw: state.account.totalWithdraw + amount,
      },
    }));
    get().saveData();
  },

  setInterestRate: (rate) => {
    set({ interestRate: rate });
    get().saveData();
  },

  loadData: async () => {
    try {
      const data = await AsyncStorage.getItem('portfolio-data');
      if (data) {
        const parsed = JSON.parse(data);
        set({
          portfolio: parsed.portfolio || [],
          transactions: parsed.transactions || [],
          account: parsed.account || { balance: 0, totalDeposit: 0, totalWithdraw: 0 },
          interestRate: parsed.interestRate || 50,
        });
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    }
  },

  saveData: async () => {
    try {
      const state = get();
      const data = JSON.stringify({
        portfolio: state.portfolio,
        transactions: state.transactions,
        account: state.account,
        interestRate: state.interestRate,
      });
      await AsyncStorage.setItem('portfolio-data', data);
    } catch (error) {
      console.error('Veri kaydedilirken hata:', error);
    }
  },
}));
