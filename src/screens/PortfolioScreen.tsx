import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useStockStore } from '../store/useStockStore';
import { PortfolioItem } from '../types';
import { fetchMultipleStockPrices } from '../services/stockApi';

export function PortfolioScreen() {
  const { portfolio, account, updateCurrentPrices, loadData } = usePortfolioStore();
  const { stocks } = useStockStore();

  useEffect(() => {
    loadData();
  }, []);

  // Portföydeki hisselerin fiyatlarını güncelle
  useEffect(() => {
    if (portfolio.length > 0) {
      const symbols = [...new Set(portfolio.map((p) => p.symbol))];
      fetchMultipleStockPrices(symbols).then((prices) => {
        if (Object.keys(prices).length > 0) {
          updateCurrentPrices(prices);
        }
      });
    }
  }, [stocks]);

  // Toplam portföy değeri
  const totalValue = portfolio.reduce(
    (sum, item) => sum + item.currentPrice * item.quantity,
    0
  );

  // Toplam maliyet
  const totalCost = portfolio.reduce(
    (sum, item) => sum + item.buyPrice * item.quantity,
    0
  );

  // Toplam kar/zarar
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const renderPortfolioItem = ({ item }: { item: PortfolioItem }) => {
    const currentValue = item.currentPrice * item.quantity;
    const cost = item.buyPrice * item.quantity;
    const pnl = currentValue - cost;
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;

    return (
      <View style={styles.portfolioItem}>
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.itemSymbol}>{item.symbol}</Text>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
          <View style={styles.itemRight}>
            <Text style={styles.itemValue}>₺{currentValue.toFixed(2)}</Text>
            <Text
              style={[
                styles.itemPnL,
                { color: pnl >= 0 ? COLORS.success : COLORS.danger },
              ]}
            >
              {pnl >= 0 ? '+' : ''}₺{pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}
              {pnlPercent.toFixed(1)}%)
            </Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Adet:</Text>
            <Text style={styles.detailValue}>{item.quantity}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Alış:</Text>
            <Text style={styles.detailValue}>₺{item.buyPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Güncel:</Text>
            <Text style={styles.detailValue}>₺{item.currentPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tarih:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.buyDate).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Özet Kartı */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Portföy Özeti</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Toplam Değer</Text>
            <Text style={styles.summaryValue}>₺{totalValue.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Toplam Maliyet</Text>
            <Text style={styles.summaryValue}>₺{totalCost.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.pnlContainer}>
          <Text style={styles.summaryLabel}>Kar / Zarar</Text>
          <Text
            style={[
              styles.pnlValue,
              { color: totalPnL >= 0 ? COLORS.success : COLORS.danger },
            ]}
          >
            {totalPnL >= 0 ? '+' : ''}₺{totalPnL.toFixed(2)} (
            {totalPnLPercent >= 0 ? '+' : ''}
            {totalPnLPercent.toFixed(2)}%)
          </Text>
        </View>

        <View style={styles.balanceRow}>
          <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
          <Text style={styles.balanceText}>
            Hesap Bakiyesi: ₺{account.balance.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Portföy Listesi */}
      {portfolio.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Portföyünüz boş</Text>
          <Text style={styles.emptySubtext}>
            İşlem sekmesinden hisse alarak portföyünüzü oluşturun
          </Text>
        </View>
      ) : (
        <FlatList
          data={portfolio}
          keyExtractor={(item) => item.id}
          renderItem={renderPortfolioItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
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
  summaryCard: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  pnlContainer: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  pnlValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  balanceText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: SPACING.xs,
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
  portfolioItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  itemSymbol: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  itemName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  itemPnL: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    width: '50%',
    marginTop: 4,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginRight: 4,
  },
  detailValue: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
});
