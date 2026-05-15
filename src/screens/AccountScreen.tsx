import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Transaction } from '../types';
import { formatTL } from '../utils/format';

export function AccountScreen() {
  const { transactions, deleteTransaction } = usePortfolioStore();
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteTransaction(confirmDelete.id);
    setConfirmDelete(null);
    if (!result.success && result.message) {
      setErrorMsg(result.message);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

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
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: isBuy ? COLORS.danger : COLORS.success },
            ]}
          >
            {isBuy ? '-' : '+'}{formatTL(item.totalAmount)}
          </Text>
          <TouchableOpacity
            style={styles.undoButton}
            onPress={() => setConfirmDelete(item)}
          >
            <Ionicons name="arrow-undo-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.undoText}>Geri Al</Text>
          </TouchableOpacity>
        </View>
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

      {/* Hata Mesajı */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={18} color={COLORS.warning} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Onay Modal */}
      <Modal
        visible={!!confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="arrow-undo-circle" size={36} color={COLORS.warning} />
            </View>
            <Text style={styles.modalTitle}>İşlemi Geri Al</Text>
            <Text style={styles.modalMessage}>
              {confirmDelete?.type === 'BUY'
                ? `${confirmDelete.symbol} alış işlemi geri alınacak. Hisse portföyünden silinecek, ${formatTL(confirmDelete.totalAmount)} bakiyene geri eklenecek.`
                : confirmDelete?.type === 'SELL'
                  ? `${confirmDelete.symbol} satış işlemi geri alınacak. Hisse portföyüne geri eklenecek, ${formatTL(confirmDelete.totalAmount)} bakiyenden düşülecek.`
                  : `Bu işlem geri alınacak.`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setConfirmDelete(null)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleDelete}
              >
                <Text style={styles.modalConfirmText}>Geri Al</Text>
              </TouchableOpacity>
            </View>
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
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    marginBottom: 0,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userText: {
    flex: 1,
  },
  userEmail: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  userId: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 8,
    backgroundColor: COLORS.danger + '15',
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
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
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  undoText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  errorText: {
    color: COLORS.warning,
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },
  // Modal
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
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalIconContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 18,
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
    backgroundColor: COLORS.warning,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
