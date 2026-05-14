import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { useWatchlistStore, WatchlistGroup } from '../store/useWatchlistStore';
import { useStockStore } from '../store/useStockStore';
import { BIST_STOCKS } from '../constants/stocks';
import { Stock } from '../types';
import { TradeModal } from '../components/TradeModal';
import { formatTL } from '../utils/format';

export function WatchlistScreen() {
  const navigation = useNavigation<any>();
  const {
    groups, activeGroupId, setActiveGroup,
    addGroup, removeGroup, renameGroup,
    addToActive, removeFromActive,
    getActiveSymbols, loadWatchlist,
  } = useWatchlistStore();
  const { stocks, isLoading, fetchPrices } = useStockStore();
  const [searchText, setSearchText] = useState('');
  const [tradeStock, setTradeStock] = useState<Stock | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<WatchlistGroup | null>(null);

  useEffect(() => {
    loadWatchlist();
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeSymbols = getActiveSymbols();

  // Takip listesindeki hisselerin fiyat bilgileri
  const watchlistStocks = activeSymbols
    .map((symbol) => {
      const stockData = stocks.find((s) => s.symbol === symbol);
      const stockInfo = BIST_STOCKS.find((s) => s.symbol === symbol);
      if (stockData) return stockData;
      if (stockInfo) return {
        symbol: stockInfo.symbol,
        name: stockInfo.name,
        price: 0,
        change: 0,
        volume: 0,
        lastUpdated: new Date().toISOString(),
      } as Stock;
      return null;
    })
    .filter(Boolean) as Stock[];

  // Arama sonuçları
  const searchResults = searchText.length > 0
    ? BIST_STOCKS.filter(
        (s) =>
          (s.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
          s.name.toLowerCase().includes(searchText.toLowerCase())) &&
          !activeSymbols.includes(s.symbol)
      ).slice(0, 8)
    : [];

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      addGroup(newGroupName.trim());
      setNewGroupName('');
    }
  };

  const handleDeleteGroup = (group: WatchlistGroup) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`"${group.name}" listesini silmek istiyor musunuz?`)) {
        removeGroup(group.id);
      }
    } else {
      removeGroup(group.id);
    }
  };

  const renderWatchlistItem = useCallback(
    ({ item }: { item: Stock }) => (
      <TouchableOpacity
        style={styles.stockItem}
        onPress={() => navigation.navigate('StockDetail', { stock: item })}
        activeOpacity={0.7}
      >
        <View style={styles.stockLeft}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <Text style={styles.stockName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.stockMiddle}>
          <Text style={styles.stockPrice}>
            {item.price > 0 ? formatTL(item.price) : '—'}
          </Text>
          <View
            style={[
              styles.changeBadge,
              { backgroundColor: item.change >= 0 ? COLORS.success + '20' : COLORS.danger + '20' },
            ]}
          >
            <Ionicons
              name={item.change >= 0 ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={item.change >= 0 ? COLORS.success : COLORS.danger}
            />
            <Text
              style={[
                styles.changeText,
                { color: item.change >= 0 ? COLORS.success : COLORS.danger },
              ]}
            >
              %{Math.abs(item.change).toFixed(2)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.tradeButton}
          onPress={() => setTradeStock(item)}
        >
          <Ionicons name="cart-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromActive(item.symbol)}
        >
          <Ionicons name="close-circle" size={22} color={COLORS.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [navigation, removeFromActive]
  );

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <View style={styles.container}>
      {/* Grup Seçici */}
      <View style={styles.groupSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupScroll}>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupChip,
                group.id === activeGroupId && styles.groupChipActive,
              ]}
              onPress={() => setActiveGroup(group.id)}
              onLongPress={() => {
                if (group.id !== 'default') setEditingGroup(group);
              }}
            >
              <Text
                style={[
                  styles.groupChipText,
                  group.id === activeGroupId && styles.groupChipTextActive,
                ]}
              >
                {group.name}
              </Text>
              <Text style={[styles.groupCount, group.id === activeGroupId && { color: '#fff' }]}>
                {group.symbols.length}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addGroupChip}
            onPress={() => setShowGroupModal(true)}
          >
            <Ionicons name="add" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Hisse Ekleme Alanı */}
      <View style={styles.addSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="add-circle" size={20} color={COLORS.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`"${activeGroup?.name}" listesine hisse ekle...`}
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="characters"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((s) => (
              <TouchableOpacity
                key={s.symbol}
                style={styles.searchResultItem}
                onPress={() => {
                  addToActive(s.symbol);
                  setSearchText('');
                }}
              >
                <View style={styles.searchResultLeft}>
                  <Text style={styles.searchResultSymbol}>{s.symbol}</Text>
                  <Text style={styles.searchResultName}>{s.name}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={COLORS.success} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Bilgi Satırı */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {activeSymbols.length} hisse · {activeGroup?.name}
        </Text>
        <Text style={styles.infoText}>15dk gecikmeli</Text>
      </View>

      {/* Takip Listesi */}
      {activeSymbols.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="eye-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Bu liste boş</Text>
          <Text style={styles.emptySubtext}>
            Yukarıdaki arama alanından hisse ekleyin
          </Text>
        </View>
      ) : (
        <FlatList
          data={watchlistStocks}
          keyExtractor={(item) => item.symbol}
          renderItem={renderWatchlistItem}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchPrices}
              tintColor={COLORS.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Alım/Satım Modal */}
      {tradeStock && (
        <TradeModal
          visible={!!tradeStock}
          onClose={() => setTradeStock(null)}
          symbol={tradeStock.symbol}
          name={tradeStock.name}
          currentPrice={tradeStock.price}
        />
      )}

      {/* Yeni Grup Oluşturma Modal */}
      <Modal visible={showGroupModal} transparent animationType="fade" onRequestClose={() => setShowGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Yeni Liste Oluştur</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Liste adı (örn: İzlediklerim)"
              placeholderTextColor={COLORS.textMuted}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => { setShowGroupModal(false); setNewGroupName(''); }}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => { handleAddGroup(); setShowGroupModal(false); }}
              >
                <Text style={styles.modalConfirmText}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Grup Düzenleme Modal */}
      <Modal visible={!!editingGroup} transparent animationType="fade" onRequestClose={() => setEditingGroup(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Liste Düzenle</Text>
            <Text style={styles.modalSubtitle}>{editingGroup?.name}</Text>
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  if (editingGroup) {
                    const newName = Platform.OS === 'web'
                      ? window.prompt('Yeni isim:', editingGroup.name)
                      : null;
                    if (newName) renameGroup(editingGroup.id, newName);
                  }
                  setEditingGroup(null);
                }}
              >
                <Ionicons name="pencil" size={20} color={COLORS.primary} />
                <Text style={styles.editButtonText}>Yeniden Adlandır</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, { borderColor: COLORS.danger }]}
                onPress={() => {
                  if (editingGroup) handleDeleteGroup(editingGroup);
                  setEditingGroup(null);
                }}
              >
                <Ionicons name="trash" size={20} color={COLORS.danger} />
                <Text style={[styles.editButtonText, { color: COLORS.danger }]}>Sil</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setEditingGroup(null)}
            >
              <Text style={styles.modalCancelText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  groupSection: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  groupChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  groupChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  groupChipTextActive: {
    color: '#fff',
  },
  groupCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  addGroupChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSection: {
    margin: SPACING.md,
    marginBottom: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  searchResults: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchResultSymbol: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    width: 65,
  },
  searchResultName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  stockLeft: {
    flex: 1,
  },
  stockSymbol: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stockName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  stockMiddle: {
    alignItems: 'flex-end',
    marginRight: SPACING.sm,
  },
  stockPrice: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  tradeButton: {
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  removeButton: {
    padding: SPACING.xs,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  // Modal stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '85%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editButtons: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
