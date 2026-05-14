import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { useStockStore } from '../store/useStockStore';
import { Stock } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';

export function MarketScreen() {
  const navigation = useNavigation<any>();
  const [showQR, setShowQR] = useState(false);
  const { stocks, isLoading, lastUpdated, error, searchQuery, fetchPrices, setSearchQuery, getFilteredStocks } =
    useStockStore();

  useEffect(() => {
    fetchPrices();
    // Her 60 saniyede bir güncelle
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredStocks = getFilteredStocks();

  const renderStockItem = useCallback(
    ({ item }: { item: Stock }) => (
      <TouchableOpacity
        style={styles.stockItem}
        onPress={() => navigation.navigate('StockDetail', { stock: item })}
        activeOpacity={0.7}
      >
        <View style={styles.stockLeft}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <Text style={styles.stockName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.stockRight}>
          <Text style={styles.stockPrice}>
            {item.price > 0 ? `₺${item.price.toFixed(2)}` : '—'}
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
      </TouchableOpacity>
    ),
    [navigation]
  );

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const date = new Date(lastUpdated);
    return `Son güncelleme: ${date.toLocaleTimeString('tr-TR')}`;
  };

  return (
    <View style={styles.container}>
      {/* QR Code Modal */}
      <QRCodeModal visible={showQR} onClose={() => setShowQR(false)} />

      {/* Arama */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Hisse ara (örn: THYAO)"
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setShowQR(true)} style={styles.qrButton}>
          <Ionicons name="qr-code" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Bilgi Satırı */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {filteredStocks.length} hisse · 15dk gecikmeli
        </Text>
        <Text style={styles.infoText}>{formatLastUpdated()}</Text>
      </View>

      {/* Hata Mesajı */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={16} color={COLORS.warning} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Hisse Listesi */}
      {isLoading && stocks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fiyatlar yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStocks}
          keyExtractor={(item) => item.symbol}
          renderItem={renderStockItem}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
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
  qrButton: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    marginHorizontal: SPACING.md,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.warning,
    fontSize: 13,
    marginLeft: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  stockRight: {
    alignItems: 'flex-end',
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
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
