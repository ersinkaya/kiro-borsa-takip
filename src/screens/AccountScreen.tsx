import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Transaction } from '../types';
import { formatTL } from '../utils/format';

type FilterType = 'ALL' | 'BUY' | 'SELL' | string; // string = symbol filtresi

export function AccountScreen() {
  const { transactions, deleteTransaction, totalRealizedPnL } = usePortfolioStore();
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selectedSymbolDetail, setSelectedSymbolDetail] = useState<string | null>(null);

  // Benzersiz semboller
  const uniqueSymbols = useMemo(() => {
    const symbols = [...new Set(transactions.map(t => t.symbol).filter(Boolean))];
    return symbols.sort();
  }, [transactions]);

  // Hisse bazlı özet
  const symbolSummaries = useMemo(() => {
    const map: Record<string, {
      symbol: string;
      name: string;
      totalBuyQty: number;
      totalBuyAmount: number;
      totalSellQty: number;
      totalSellAmount: number;
      realizedPnL: number;
      avgBuyPrice: number;
      avgSellPrice: number;
      transactions: Transaction[];
    }> = {};

    for (const t of transactions) {
      if (!t.symbol) continue;
      if (!map[t.symbol]) {
        map[t.symbol] = {
          symbol: t.symbol,
          name: t.name,
          totalBuyQty: 0,
          totalBuyAmount: 0,
          totalSellQty: 0,
          totalSellAmount: 0,
          realizedPnL: 0,
          avgBuyPrice: 0,
          avgSellPrice: 0,
          transactions: [],
        };
      }
      const s = map[t.symbol];
      s.transactions.push(t);
      if (t.type === 'BUY') {
        s.totalBuyQty += t.quantity;
        s.totalBuyAmount += t.totalAmount;
      } else if (t.type === 'SELL') {
        s.totalSellQty += t.quantity;
        s.totalSellAmount += t.totalAmount;
        if ((t as any).realizedPnL) {
          s.realizedPnL += (t as any).realizedPnL;
        }
      }
    }

    // Ortalama fiyatları hesapla
    for (const key of Object.keys(map)) {
      const s = map[key];
      s.avgBuyPrice = s.totalBuyQty > 0 ? s.totalBuyAmount / s.totalBuyQty : 0;
      s.avgSellPrice = s.totalSellQty > 0 ? s.totalSellAmount / s.totalSellQty : 0;
    }

    return Object.values(map).sort((a, b) => b.transactions.length - a.transactions.length);
  }, [transactions]);

  // Filtrelenmiş işlemler
  const filteredTransactions = useMemo(() => {
    if (filter === 'ALL') return transactions;
    if (filter === 'BUY') return transactions.filter(t => t.type === 'BUY');
    if (filter === 'SELL') return transactions.filter(t => t.type === 'SELL');
    // Symbol filtresi
    return transactions.filter(t => t.symbol === filter);
  }, [transactions, filter]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteTransaction(confirmDelete.id);
    setConfirmDelete(null);
    if (!result.success && result.message) {
      setErrorMsg(result.message);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Özet bilgiler
  const totalBuys = transactions.filter(t => t.type === 'BUY').reduce((sum, t) => sum + t.totalAmount, 0);
  const totalSells = transactions.filter(t => t.type === 'SELL').reduce((sum, t) => sum + t.totalAmount, 0);

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isBuy = item.type === 'BUY';
    const date = new Date(item.date);
    const pnl = (item as any).realizedPnL;

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIcon, { backgroundColor: isBuy ? COLORS.success + '20' : COLORS.danger + '20' }]}>
            <Ionicons name={isBuy ? 'arrow-down' : 'arrow-up'} size={16} color={isBuy ? COLORS.success : COLORS.danger} />
          </View>
          <View style={styles.transactionInfo}>
            <View style={styles.transactionTopRow}>
              <TouchableOpacity onPress={() => setFilter(item.symbol)}>
                <Text style={styles.transactionSymbol}>{item.symbol}</Text>
              </TouchableOpacity>
              <View style={[styles.typeBadge, { backgroundColor: isBuy ? COLORS.success + '20' : COLORS.danger + '20' }]}>
                <Text style={[styles.typeText, { color: isBuy ? COLORS.success : COLORS.danger }]}>
                  {isBuy ? 'ALIŞ' : 'SATIŞ'}
                </Text>
              </View>
            </View>
            <Text style={styles.transactionDetail}>
              {item.quantity} adet x {formatTL(item.price)} = {formatTL(item.totalAmount)}
            </Text>
            {!isBuy && pnl !== undefined && pnl !== null && (
              <Text style={[styles.transactionPnL, { color: pnl >= 0 ? COLORS.success : COLORS.danger }]}>
                K/Z: {pnl >= 0 ? '+' : ''}{formatTL(pnl)}
              </Text>
            )}
            <Text style={styles.transactionDate}>
              {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.undoButton} onPress={() => setConfirmDelete(item)}>
          <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSymbolCard = ({ item }: { item: typeof symbolSummaries[0] }) => {
    const netQty = item.totalBuyQty - item.totalSellQty;
    const hasSells = item.totalSellQty > 0;

    return (
      <TouchableOpacity
        style={styles.symbolCard}
        onPress={() => setSelectedSymbolDetail(item.symbol)}
        activeOpacity={0.7}
      >
        <View style={styles.symbolCardHeader}>
          <Text style={styles.symbolCardSymbol}>{item.symbol}</Text>
          {hasSells && (
            <Text style={[styles.symbolCardPnL, { color: item.realizedPnL >= 0 ? COLORS.success : COLORS.danger }]}>
              {item.realizedPnL >= 0 ? '+' : ''}{formatTL(item.realizedPnL)}
            </Text>
          )}
        </View>
        <View style={styles.symbolCardBody}>
          <Text style={styles.symbolCardInfo}>
            Alış: {item.totalBuyQty} ad · Ort: {formatTL(item.avgBuyPrice)}
          </Text>
          {hasSells && (
            <Text style={styles.symbolCardInfo}>
              Satış: {item.totalSellQty} ad · Ort: {formatTL(item.avgSellPrice)}
            </Text>
          )}
          {netQty > 0 && (
            <Text style={[styles.symbolCardInfo, { color: COLORS.primary }]}>
              Elde: {netQty} adet
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Seçilen hissenin detay modal verileri
  const selectedDetail = selectedSymbolDetail ? symbolSummaries.find(s => s.symbol === selectedSymbolDetail) : null;

  return (
    <View style={styles.container}>
      {/* Özet Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Toplam Alış</Text>
          <Text style={styles.summaryValue}>{formatTL(totalBuys, 0)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Toplam Satış</Text>
          <Text style={styles.summaryValue}>{formatTL(totalSells, 0)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Realize K/Z</Text>
          <Text style={[styles.summaryValue, { color: totalRealizedPnL >= 0 ? COLORS.success : COLORS.danger }]}>
            {totalRealizedPnL >= 0 ? '+' : ''}{formatTL(totalRealizedPnL, 0)}
          </Text>
        </View>
      </View>

      {/* Hisse Bazlı Özet Kartları */}
      {symbolSummaries.length > 0 && (
        <View style={styles.symbolSection}>
          <Text style={styles.sectionTitle}>Hisse Bazlı Özet</Text>
          <FlatList
            data={symbolSummaries}
            keyExtractor={(item) => item.symbol}
            renderItem={renderSymbolCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}
          />
        </View>
      )}

      {/* Filtre Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterChipText, filter === 'ALL' && styles.filterChipTextActive]}>Tümü</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'BUY' && styles.filterChipActive]}
          onPress={() => setFilter('BUY')}
        >
          <Text style={[styles.filterChipText, filter === 'BUY' && styles.filterChipTextActive]}>Alışlar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'SELL' && styles.filterChipActive]}
          onPress={() => setFilter('SELL')}
        >
          <Text style={[styles.filterChipText, filter === 'SELL' && styles.filterChipTextActive]}>Satışlar</Text>
        </TouchableOpacity>
        {uniqueSymbols.map(sym => (
          <TouchableOpacity
            key={sym}
            style={[styles.filterChip, filter === sym && styles.filterChipActive]}
            onPress={() => setFilter(filter === sym ? 'ALL' : sym)}
          >
            <Text style={[styles.filterChipText, filter === sym && styles.filterChipTextActive]}>{sym}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* İşlem Listesi */}
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            {filter === 'ALL' ? 'Henüz işlem yapılmadı' : 'Bu filtrede işlem yok'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.xs }} />}
        />
      )}

      {/* Hata Mesajı */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Hisse Detay Modal */}
      <Modal visible={!!selectedDetail} transparent animationType="slide" onRequestClose={() => setSelectedSymbolDetail(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedSymbolDetail(null)} />
          <View style={styles.detailModalContainer}>
            {selectedDetail && (
              <>
                <View style={styles.detailModalHeader}>
                  <View>
                    <Text style={styles.detailModalSymbol}>{selectedDetail.symbol}</Text>
                    <Text style={styles.detailModalName}>{selectedDetail.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSymbolDetail(null)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {/* Hisse Özet */}
                <View style={styles.detailSummary}>
                  <View style={styles.detailSummaryRow}>
                    <View style={styles.detailSummaryItem}>
                      <Text style={styles.detailSummaryLabel}>Toplam Alış</Text>
                      <Text style={styles.detailSummaryValue}>{selectedDetail.totalBuyQty} adet</Text>
                      <Text style={styles.detailSummarySubValue}>Ort: {formatTL(selectedDetail.avgBuyPrice)}</Text>
                    </View>
                    <View style={styles.detailSummaryItem}>
                      <Text style={styles.detailSummaryLabel}>Toplam Satış</Text>
                      <Text style={styles.detailSummaryValue}>{selectedDetail.totalSellQty} adet</Text>
                      <Text style={styles.detailSummarySubValue}>Ort: {formatTL(selectedDetail.avgSellPrice)}</Text>
                    </View>
                    <View style={styles.detailSummaryItem}>
                      <Text style={styles.detailSummaryLabel}>Realize K/Z</Text>
                      <Text style={[styles.detailSummaryValue, { color: selectedDetail.realizedPnL >= 0 ? COLORS.success : COLORS.danger }]}>
                        {selectedDetail.realizedPnL >= 0 ? '+' : ''}{formatTL(selectedDetail.realizedPnL)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* İşlem Geçmişi */}
                <Text style={styles.detailListTitle}>İşlem Geçmişi</Text>
                <FlatList
                  data={selectedDetail.transactions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isBuy = item.type === 'BUY';
                    const date = new Date(item.date);
                    const pnl = (item as any).realizedPnL;
                    return (
                      <View style={styles.detailTransItem}>
                        <View style={[styles.detailTransDot, { backgroundColor: isBuy ? COLORS.success : COLORS.danger }]} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.detailTransType}>{isBuy ? 'ALIŞ' : 'SATIŞ'}</Text>
                            <Text style={styles.detailTransDate}>
                              {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          </View>
                          <Text style={styles.detailTransInfo}>
                            {item.quantity} adet x {formatTL(item.price)} = {formatTL(item.totalAmount)}
                          </Text>
                          {!isBuy && pnl !== undefined && pnl !== null && (
                            <Text style={[styles.detailTransPnL, { color: pnl >= 0 ? COLORS.success : COLORS.danger }]}>
                              Kar/Zarar: {pnl >= 0 ? '+' : ''}{formatTL(pnl)}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border, marginLeft: 20 }} />}
                  style={{ maxHeight: 300 }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Silme Onay Modal */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Ionicons name="trash" size={32} color={COLORS.danger} style={{ alignSelf: 'center', marginBottom: SPACING.sm }} />
            <Text style={styles.confirmTitle}>İşlemi Sil</Text>
            <Text style={styles.confirmMessage}>
              {confirmDelete?.symbol} {confirmDelete?.type === 'BUY' ? 'alış' : 'satış'} işlemi silinecek ve portföy/bakiye geri düzeltilecek.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmDelete(null)}>
                <Text style={styles.confirmCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={handleDelete}>
                <Text style={styles.confirmDeleteText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Özet Bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: COLORS.border },
  summaryLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 2 },
  summaryValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  // Hisse Kartları
  symbolSection: { paddingTop: SPACING.sm },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginLeft: SPACING.md, marginBottom: SPACING.xs },
  symbolCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 160,
  },
  symbolCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  symbolCardSymbol: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  symbolCardPnL: { fontSize: 12, fontWeight: '700' },
  symbolCardBody: { gap: 2 },
  symbolCardInfo: { color: COLORS.textMuted, fontSize: 11 },
  // Filtre
  filterRow: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterContent: { paddingHorizontal: SPACING.md, alignItems: 'center', gap: SPACING.xs },
  filterChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  // İşlem Listesi
  listContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm + 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  transactionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  transactionInfo: { flex: 1 },
  transactionTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  transactionSymbol: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  typeText: { fontSize: 9, fontWeight: '700' },
  transactionDetail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  transactionPnL: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  transactionDate: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  undoButton: { padding: SPACING.sm },
  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 15, marginTop: SPACING.sm },
  // Error
  errorBanner: {
    position: 'absolute', bottom: SPACING.lg, left: SPACING.md, right: SPACING.md,
    backgroundColor: COLORS.warning + '20', padding: SPACING.md, borderRadius: 10,
  },
  errorText: { color: COLORS.warning, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  // Detail Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  detailModalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    maxHeight: '70%',
  },
  detailModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  detailModalSymbol: { color: COLORS.primary, fontSize: 20, fontWeight: '700' },
  detailModalName: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  detailSummary: { backgroundColor: COLORS.background, borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.md },
  detailSummaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailSummaryItem: { alignItems: 'center', flex: 1 },
  detailSummaryLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 2 },
  detailSummaryValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  detailSummarySubValue: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  detailListTitle: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: SPACING.sm },
  detailTransItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.sm, gap: SPACING.sm },
  detailTransDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  detailTransType: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  detailTransDate: { color: COLORS.textMuted, fontSize: 11 },
  detailTransInfo: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  detailTransPnL: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  // Confirm Modal
  confirmModalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '85%',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: '40%',
  },
  confirmTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.xs },
  confirmMessage: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: SPACING.md, lineHeight: 18 },
  confirmButtons: { flexDirection: 'row', gap: SPACING.sm },
  confirmCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm + 2, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  confirmCancelText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm + 2, borderRadius: 10, backgroundColor: COLORS.danger },
  confirmDeleteText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
