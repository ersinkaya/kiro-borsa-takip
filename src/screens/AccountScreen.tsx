import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Transaction } from '../types';
import { formatTL } from '../utils/format';

export function AccountScreen() {
  const { transactions } = usePortfolioStore();

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isBuy = item.type === 'BUY';
    const date = new Date(item.date);

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.transactionIcon,
              { backgroundColor: isBuy ? COLORS.success + '20' : COLORS.danger + '20' },
            ]}
          >
            <Ionicons
              name={isBuy ? 'arrow-down' : 'arrow-up'}
              size={16}
              color={isBuy ? COLORS.success : COLORS.danger}
            />
          </View>
          <View style={styles.transactionInfo}>
            <View style={styles.transactionTopRow}>
              <Text style={styles.transactionSymbol}>{item.symbol}</Text>
              <View style={[styles.typeBadge, { backgroundColor: isBuy ? COLORS.success + '20' : COLORS.danger + '20' }]}>
                <Text style={[styles.typeText, { color: isBuy ? COLORS.success : COLORS.danger }]}>
                  {isBuy ? 'ALIŞ' : 'SATIŞ'}
                </Text>
              </View>
            </View>
            <Text style={styles.transactionName}>{item.name}</Text>
            <Text style={styles.transactionDetail}>
              {item.quantity} adet x {formatTL(item.price)}
            </Text>
            <Text style={styles.transactionDate}>
              {date.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })} · {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: isBuy ? COLORS.danger : COLORS.success },
          ]}
        >
          {isBuy ? '-' : '+'}{formatTL(item.totalAmount)}
        </Text>
      </View>
    );
  };

  // Özet bilgiler
  const totalBuys = transactions.filter(t => t.type === 'BUY').reduce((sum, t) => sum + t.totalAmount, 0);
  const totalSells = transactions.filter(t => t.type === 'SELL').reduce((sum, t) => sum + t.totalAmount, 0);
  const buyCount = transactions.filter(t => t.type === 'BUY').length;
  const sellCount = transactions.filter(t => t.type === 'SELL').length;

  return (
    <View style={styles.container}>
      {/* Özet */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>İşlem Özeti</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="arrow-down-circle" size={18} color={COLORS.success} />
            <Text style={styles.summaryLabel}>Alışlar</Text>
            <Text style={styles.summaryValue}>{formatTL(totalBuys, 0)}</Text>
            <Text style={styles.summaryCount}>{buyCount} işlem</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Ionicons name="arrow-up-circle" size={18} color={COLORS.danger} />
            <Text style={styles.summaryLabel}>Satışlar</Text>
            <Text style={styles.summaryValue}>{formatTL(totalSells, 0)}</Text>
            <Text style={styles.summaryCount}>{sellCount} işlem</Text>
          </View>
        </View>
      </View>

      {/* İşlem Listesi */}
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Henüz işlem yapılmadı</Text>
          <Text style={styles.emptySubtext}>
            Takip veya Piyasa sekmesinden hisse alıp sattığınızda işlemleriniz burada görünecek
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryCount: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: COLORS.border,
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
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  transactionSymbol: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  transactionName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  transactionDetail: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  transactionDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
});
