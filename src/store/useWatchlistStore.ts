import { create } from 'zustand';
import { supabase } from '../services/supabase';

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

  // Grup yönetimi
  addGroup: (name: string) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  renameGroup: (id: string, name: string) => Promise<void>;
  setActiveGroup: (id: string) => void;

  // Hisse yönetimi
  addToGroup: (groupId: string, symbol: string) => Promise<void>;
  removeFromGroup: (groupId: string, symbol: string) => Promise<void>;
  isInGroup: (groupId: string, symbol: string) => boolean;

  // Aktif gruptaki hisseler
  getActiveSymbols: () => string[];
  addToActive: (symbol: string) => Promise<void>;
  removeFromActive: (symbol: string) => Promise<void>;

  // Eski uyumluluk
  watchlist: string[];
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  isInWatchlist: (symbol: string) => boolean;

  loadWatchlist: () => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  groups: [],
  activeGroupId: '',
  loading: false,

  get watchlist() {
    return get().getActiveSymbols();
  },

  loadWatchlist: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ loading: true });
    try {
      // Grupları çek
      const { data: groupsData } = await supabase
        .from('watchlist_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!groupsData || groupsData.length === 0) {
        set({ loading: false });
        return;
      }

      // Tüm hisseleri çek
      const { data: itemsData } = await supabase
        .from('watchlist_items')
        .select('*')
        .eq('user_id', user.id);

      // Grupları hisseleriyle birleştir
      const groups: WatchlistGroup[] = groupsData.map((g) => ({
        id: g.id,
        name: g.name,
        is_default: g.is_default,
        symbols: itemsData?.filter((i) => i.group_id === g.id).map((i) => i.symbol) || [],
      }));

      const defaultGroup = groups.find((g) => g.is_default) || groups[0];

      set({
        groups,
        activeGroupId: get().activeGroupId || defaultGroup?.id || '',
      });
    } catch (error) {
      console.error('Watchlist yükleme hatası:', error);
    } finally {
      set({ loading: false });
    }
  },

  addGroup: async (name) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('watchlist_groups')
      .insert({ user_id: user.id, name, is_default: false })
      .select()
      .single();

    if (error || !data) return;

    set((state) => ({
      groups: [...state.groups, { id: data.id, name: data.name, symbols: [], is_default: false }],
    }));
  },

  removeGroup: async (id) => {
    const group = get().groups.find((g) => g.id === id);
    if (!group || group.is_default) return;

    await supabase.from('watchlist_groups').delete().eq('id', id);

    set((state) => {
      const newGroups = state.groups.filter((g) => g.id !== id);
      const newActiveId = state.activeGroupId === id
        ? newGroups.find((g) => g.is_default)?.id || newGroups[0]?.id || ''
        : state.activeGroupId;
      return { groups: newGroups, activeGroupId: newActiveId };
    });
  },

  renameGroup: async (id, name) => {
    await supabase.from('watchlist_groups').update({ name }).eq('id', id);
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)),
    }));
  },

  setActiveGroup: (id) => {
    set({ activeGroupId: id });
  },

  addToGroup: async (groupId, symbol) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const group = get().groups.find((g) => g.id === groupId);
    if (!group || group.symbols.includes(symbol)) return;

    const { error } = await supabase
      .from('watchlist_items')
      .insert({ user_id: user.id, group_id: groupId, symbol });

    if (error) return;

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, symbols: [...g.symbols, symbol] } : g
      ),
    }));
  },

  removeFromGroup: async (groupId, symbol) => {
    await supabase
      .from('watchlist_items')
      .delete()
      .eq('group_id', groupId)
      .eq('symbol', symbol);

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, symbols: g.symbols.filter((s) => s !== symbol) } : g
      ),
    }));
  },

  isInGroup: (groupId, symbol) => {
    const group = get().groups.find((g) => g.id === groupId);
    return group?.symbols.includes(symbol) || false;
  },

  getActiveSymbols: () => {
    const { groups, activeGroupId } = get();
    return groups.find((g) => g.id === activeGroupId)?.symbols || [];
  },

  addToActive: (symbol) => get().addToGroup(get().activeGroupId, symbol),
  removeFromActive: (symbol) => get().removeFromGroup(get().activeGroupId, symbol),

  // Eski uyumluluk
  addToWatchlist: (symbol) => get().addToActive(symbol),
  removeFromWatchlist: (symbol) => get().removeFromActive(symbol),
  isInWatchlist: (symbol) => get().isInGroup(get().activeGroupId, symbol),
}));
