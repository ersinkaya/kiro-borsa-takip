import { create } from 'zustand';
import { PortfolioItem, Transaction, Account } from '../types';
import { supabase } from '../services/supabase';

interface PortfolioState {
  portfolio: PortfolioItem[];
  transactions: Transaction[];
  account: Account;
  interestRate: number;
  loading: boolean;

  // Actions
  loadData: () => Promise<void>;
  addToPortfolio: (item: Omit<PortfolioItem, 'id' | 'currentPrice'>) => Promise<void>;
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

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolio: [],
  transactions: [],
  account: { balance: 0, totalDeposit: 0, totalWithdraw: 0 },
  interestRate: 50,
  loading: false,

  loadData: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ loading: true });
    try {
      // Profile (bakiye, faiz oranı)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        set({
          account: {
            balance: parseFloat(profile.balance) || 0,
            totalDeposit: parseFloat(profile.total_deposit) || 0,
            totalWithdraw: parseFloat(profile.total_withdraw) || 0,
          },
          interestRate: parseFloat(profile.interest_rate) || 50,
        });
      }

      // Portfolio
      const { data: portfolioData } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (portfolioData) {
        set({
          portfolio: portfolioData.map((item) => ({
            id: item.id,
            symbol: item.symbol,
            name: item.name,
            quantity: item.quantity,
            buyPrice: parseFloat(item.buy_price),
            buyDate: item.buy_date,
            currentPrice: parseFloat(item.buy_price),
          })),
        });
      }

      // Transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['BUY', 'SELL'])
        .order('date', { ascending: false });

      if (transactionsData) {
        set({
          transactions: transactionsData.map((t) => ({
            id: t.id,
            type: t.type as 'BUY' | 'SELL',
            symbol: t.symbol,
            name: t.name,
            quantity: t.quantity,
            price: parseFloat(t.price),
            totalAmount: parseFloat(t.total_amount),
            date: t.date,
          })),
        });
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      set({ loading: false });
    }
  },

  addToPortfolio: async (item) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('portfolio')
      .insert({
        user_id: user.id,
        symbol: item.symbol,
        name: item.name,
        quantity: item.quantity,
        buy_price: item.buyPrice,
        buy_date: item.buyDate,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Portföye ekleme hatası:', error);
      return;
    }

    set((state) => ({
      portfolio: [
        {
          id: data.id,
          symbol: data.symbol,
          name: data.name,
          quantity: data.quantity,
          buyPrice: parseFloat(data.buy_price),
          buyDate: data.buy_date,
          currentPrice: parseFloat(data.buy_price),
        },
        ...state.portfolio,
      ],
    }));
  },

  removeFromPortfolio: async (id) => {
    await supabase.from('portfolio').delete().eq('id', id);
    set((state) => ({
      portfolio: state.portfolio.filter((item) => item.id !== id),
    }));
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // İşlemi DB'ye kaydet
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: transaction.type,
        symbol: transaction.symbol,
        name: transaction.name,
        quantity: transaction.quantity,
        price: transaction.price,
        total_amount: transaction.totalAmount,
        date: transaction.date,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('İşlem kaydetme hatası:', error);
      return;
    }

    // Bakiyeyi güncelle
    const newBalance = transaction.type === 'BUY'
      ? get().account.balance - transaction.totalAmount
      : get().account.balance + transaction.totalAmount;

    await supabase
      .from('profiles')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    set((state) => ({
      transactions: [
        {
          id: data.id,
          type: data.type as 'BUY' | 'SELL',
          symbol: data.symbol,
          name: data.name,
          quantity: data.quantity,
          price: parseFloat(data.price),
          totalAmount: parseFloat(data.total_amount),
          date: data.date,
        },
        ...state.transactions,
      ],
      account: { ...state.account, balance: newBalance },
    }));
  },

  deposit: async (amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newBalance = get().account.balance + amount;
    const newTotalDeposit = get().account.totalDeposit + amount;

    await supabase
      .from('profiles')
      .update({
        balance: newBalance,
        total_deposit: newTotalDeposit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // İşlem kaydı ekle
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'DEPOSIT',
      total_amount: amount,
      date: new Date().toISOString(),
    });

    set((state) => ({
      account: {
        ...state.account,
        balance: newBalance,
        totalDeposit: newTotalDeposit,
      },
    }));
  },

  withdraw: async (amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newBalance = get().account.balance - amount;
    const newTotalWithdraw = get().account.totalWithdraw + amount;

    await supabase
      .from('profiles')
      .update({
        balance: newBalance,
        total_withdraw: newTotalWithdraw,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'WITHDRAW',
      total_amount: amount,
      date: new Date().toISOString(),
    });

    set((state) => ({
      account: {
        ...state.account,
        balance: newBalance,
        totalWithdraw: newTotalWithdraw,
      },
    }));
  },

  setInterestRate: async (rate) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ interest_rate: rate, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    set({ interestRate: rate });
  },

  clearPortfolio: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sadece hisseleri sil
    await supabase.from('portfolio').delete().eq('user_id', user.id);

    set({ portfolio: [] });
  },

  resetAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Tüm hisseleri ve işlemleri sil
    await supabase.from('portfolio').delete().eq('user_id', user.id);
    await supabase.from('transactions').delete().eq('user_id', user.id);

    // Profili sıfırla
    await supabase
      .from('profiles')
      .update({
        balance: 0,
        total_deposit: 0,
        total_withdraw: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    set({
      portfolio: [],
      transactions: [],
      account: { balance: 0, totalDeposit: 0, totalWithdraw: 0 },
    });
  },

  undoLastTransaction: async () => {
    const { transactions } = get();
    if (transactions.length === 0) {
      return { success: false, message: 'Geri alınacak işlem yok' };
    }
    return get().deleteTransaction(transactions[0].id);
  },

  deleteTransaction: async (transactionId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Oturum yok' };

    const { transactions, portfolio, account } = get();
    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction) {
      return { success: false, message: 'İşlem bulunamadı' };
    }

    let newBalance = account.balance;
    let updatedPortfolio = [...portfolio];

    if (transaction.type === 'BUY') {
      // Alımı geri al: portföyden düş, bakiyeyi geri ver
      // O hisseden bu işlemden eklenen kaydı bul ve sil
      // Karmaşık: aynı sembolden birden fazla alım olabilir
      // Strateji: Aynı sembolden ve aynı fiyattan ve aynı tarihten olan kaydı bul
      const matchingItem = portfolio.find(
        (p) =>
          p.symbol === transaction.symbol &&
          p.buyPrice === transaction.price &&
          new Date(p.buyDate).getTime() === new Date(transaction.date).getTime() &&
          p.quantity === transaction.quantity
      );

      if (matchingItem) {
        // Portföyden sil
        await supabase.from('portfolio').delete().eq('id', matchingItem.id);
        updatedPortfolio = portfolio.filter((p) => p.id !== matchingItem.id);
      } else {
        return {
          success: false,
          message: 'Bu alım işlemi sonrası satış yapılmış, geri alınamaz',
        };
      }

      // Bakiyeyi geri ver
      newBalance = account.balance + transaction.totalAmount;
    } else if (transaction.type === 'SELL') {
      // Satışı geri al: bakiyeden düş, portföye geri ekle
      newBalance = account.balance - transaction.totalAmount;

      // Portföye ekle (alış fiyatı bilinmiyor, satış fiyatından ekleyelim - kullanıcı sonra düzeltsin)
      const { data: newItem } = await supabase
        .from('portfolio')
        .insert({
          user_id: user.id,
          symbol: transaction.symbol,
          name: transaction.name,
          quantity: transaction.quantity,
          buy_price: transaction.price,
          buy_date: transaction.date,
        })
        .select()
        .single();

      if (newItem) {
        updatedPortfolio = [
          {
            id: newItem.id,
            symbol: newItem.symbol,
            name: newItem.name,
            quantity: newItem.quantity,
            buyPrice: parseFloat(newItem.buy_price),
            buyDate: newItem.buy_date,
            currentPrice: parseFloat(newItem.buy_price),
          },
          ...updatedPortfolio,
        ];
      }
    } else if (transaction.type === 'DEPOSIT') {
      newBalance = account.balance - transaction.totalAmount;
    } else if (transaction.type === 'WITHDRAW') {
      newBalance = account.balance + transaction.totalAmount;
    }

    // Bakiyeyi güncelle
    await supabase
      .from('profiles')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // İşlemi sil
    await supabase.from('transactions').delete().eq('id', transactionId);

    set({
      transactions: transactions.filter((t) => t.id !== transactionId),
      portfolio: updatedPortfolio,
      account: { ...account, balance: newBalance },
    });

    return { success: true };
  },
}));
