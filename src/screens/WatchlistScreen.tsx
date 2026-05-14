import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { useStockStore } from '../store/useStockStore';
import { BIST_STOCKS } from '../constants/stocks';
import { Stock } from '../types';
import { TradeModal } from '../components/TradeModal';
import { formatTL } from '../utils/format';

export function WatchlistScreen() {
  const navigation = useNavigation<any>();
  const { watchlist, addToWatchlist, removeFromWatchlist, loadWatchlist } = useWatchlistStore();
  const { stocks, isLoading, fetchPrices } = useStockStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [tradeStock, setTradeStock] = useState<Stock | null>(null);

  useEffect(() => {
    loadWatchlist();
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Takip listesindeki hisselerin fiyat bilgileri
  const watchlistStocks = watchlist
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

  // Arama sonuçları (ekleme için)
  const searchResults = searchText.length > 0
    ? BIST_STOCKS.filter(
        (s) =>
          (s.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
          s.name.toLowerCase().includes(searchText.toLowerCase())) &&
          !watchlist.includes(s.symbol)
      ).slice(0, 8)
    : [];

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
          onPress={() => removeFromWatchlist(item.symbol)}
        >
          <Ionicons name="close-circle" size={22} color={COLORS.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [navigation, removeFromWatchlist]
  );

  return (
    <View style={styles.container}>
      {/* Hisse Ekleme Alanı */}
      <View style={styles.addSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="add-circle" size={20} color={COLORS.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Takip listesine hisse ekle..."
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

        {/* Arama Sonuçları */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((s) => (
              <TouchableOpacity
                key={s.symbol}
                style={styles.searchResultItem}
                onPress={() => {
                  addToWatchlist(s.symbol);
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
          {watchlist.length} hisse takip ediliyor
        </Text>
        <Text style={styles.infoText}>15dk gecikmeli</Text>
      </View>

      {/* Takip Listesi */}
      {watchlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="eye-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Takip listeniz boş</Text>
          <Text style={styles.emptySubtext}>
            Yukarıdaki arama alanından hisse ekleyerek takip listesi oluşturun
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    fontSize: 16,
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
  removeButton: {
    padding: SPACING.xs,
  },
  tradeButton: {
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
