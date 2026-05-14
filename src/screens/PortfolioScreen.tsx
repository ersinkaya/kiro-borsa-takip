import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useStockStore } from '../store/useStockStore';
import { PortfolioItem } from '../types';
import { fetchMultipleStockPrices } from '../services/stockApi';
import { showAlert, showConfirm } from '../utils/alert';
import { formatTL } from '../utils/format';

export function PortfolioScreen() {
  const { portfolio, account, updateCurrentPrices, loadData, deposit, withdraw } = usePortfolioStore();
  const { stocks } = useStockStore();
  const [depositAmount, setDepositAmount] = useState('');

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
    const isProfit = pnl >= 0;
    const borderColor = isProfit ? COLORS.success + '60' : COLORS.danger + '60';
    const bgTint = isProfit ? COLORS.success + '08' : COLORS.danger + '08';

    return (
      <View style={[styles.portfolioItem, { borderLeftColor: borderColor, borderLeftWidth: 4, backgroundColor: bgTint }]}>
        {/* Üst Satır: Sembol ve Kar/Zarar */}
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.itemSymbol}>{item.symbol}</Text>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
          <View style={styles.pnlContainer}>
            <Text
              style={[
                styles.pnlTL,
                { color: isProfit ? COLORS.success : COLORS.danger },
              ]}
            >
              {isProfit ? '+' : ''}{formatTL(pnl)}
            </Text>
            <View
              style={[
                styles.pnlBadge,
                { backgroundColor: isProfit ? COLORS.success + '20' : COLORS.danger + '20' },
              ]}
            >
              <Ionicons
                name={isProfit ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={isProfit ? COLORS.success : COLORS.danger}
              />
              <Text
                style={[
                  styles.pnlPercent,
                  { color: isProfit ? COLORS.success : COLORS.danger },
                ]}
              >
                %{Math.abs(pnlPercent).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Alt Satır: Detaylar */}
        <View style={styles.itemDetails}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Adet</Text>
            <Text style={styles.detailValue}>{item.quantity}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Maliyet</Text>
            <Text style={styles.detailValue}>{formatTL(item.buyPrice)}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Güncel</Text>
            <Text style={[styles.detailValue, { color: isProfit ? COLORS.success : COLORS.danger }]}>
              {formatTL(item.currentPrice)}
            </Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Toplam Değer</Text>
            <Text style={styles.detailValue}>{formatTL(currentValue)}</Text>
          </View>
        </View>

        {/* Alış Tarihi */}
        <Text style={styles.dateText}>
          Alış: {new Date(item.buyDate).toLocaleDateString('tr-TR')}
        </Text>
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
            <Text style={styles.summaryValue}>{formatTL(totalValue)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Toplam Maliyet</Text>
            <Text style={styles.summaryValue}>{formatTL(totalCost)}</Text>
          </View>
        </View>

        <View style={styles.totalPnlContainer}>
          <Text style={styles.summaryLabel}>Toplam Kar / Zarar</Text>
          <View style={styles.totalPnlRow}>
            <Text
              style={[
                styles.totalPnlValue,
                { color: totalPnL >= 0 ? COLORS.success : COLORS.danger },
              ]}
            >
              {totalPnL >= 0 ? '+' : ''}{formatTL(totalPnL)}
            </Text>
            <View
              style={[
                styles.totalPnlBadge,
                { backgroundColor: totalPnL >= 0 ? COLORS.success + '20' : COLORS.danger + '20' },
              ]}
            >
              <Ionicons
                name={totalPnL >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={totalPnL >= 0 ? COLORS.success : COLORS.danger}
              />
              <Text
                style={[
                  styles.totalPnlPercent,
                  { color: totalPnL >= 0 ? COLORS.success : COLORS.danger },
                ]}
              >
                %{Math.abs(totalPnLPercent).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.balanceSection}>
          <View style={styles.balanceRow}>
            <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
            <Text style={styles.balanceText}>
              TL Bakiye: {formatTL(account.balance)}
            </Text>
          </View>
          <View style={styles.totalAssetRow}>
            <Text style={styles.totalAssetLabel}>Toplam Varlık:</Text>
            <Text style={styles.totalAssetValue}>{formatTL(totalValue + account.balance)}</Text>
          </View>
          <View style={styles.depositRow}>
            <TextInput
              style={styles.depositInput}
              placeholder="Tutar"
              placeholderTextColor={COLORS.textMuted}
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.depositButton}
              onPress={() => {
                const val = parseFloat(depositAmount);
                if (val > 0) { deposit(val); setDepositAmount(''); }
              }}
            >
              <Text style={styles.depositButtonText}>Yatır</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => {
                const val = parseFloat(depositAmount);
                if (val > 0 && val <= account.balance) { withdraw(val); setDepositAmount(''); }
              }}
            >
              <Text style={styles.withdrawButtonText}>Çek</Text>
            </TouchableOpacity>
          </View>
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
  totalPnlContainer: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  totalPnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  totalPnlValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  totalPnlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  totalPnlPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  balanceSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  totalAssetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  totalAssetLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  totalAssetValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  depositInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    color: COLORS.text,
    fontSize: 14,
  },
  depositButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 4,
    borderRadius: 8,
  },
  depositButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  withdrawButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 4,
    borderRadius: 8,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 17,
    fontWeight: '700',
  },
  itemName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  pnlContainer: {
    alignItems: 'flex-end',
  },
  pnlTL: {
    fontSize: 16,
    fontWeight: '700',
  },
  pnlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    gap: 2,
  },
  pnlPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailColumn: {
    alignItems: 'center',
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.sm,
  },
});
