import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useStockStore } from '../store/useStockStore';
import { PortfolioItem } from '../types';
import { fetchMultipleStockPrices } from '../services/stockApi';
import { formatTL } from '../utils/format';
import { TradeModal } from '../components/TradeModal';

export function PortfolioScreen() {
  const { portfolio, account, transactions, updateCurrentPrices, loadData, deposit, withdraw, undoLastTransaction, removeFromPortfolio, totalRealizedPnL } = usePortfolioStore();
  const { stocks } = useStockStore();
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [tradeSymbol, setTradeSymbol] = useState<{ symbol: string; name: string; price: number } | null>(null);
  const [undoMessage, setUndoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (portfolio.length > 0) {
      const symbols = [...new Set(portfolio.map((p) => p.symbol))];
      fetchMultipleStockPrices(symbols).then((prices) => {
        if (Object.keys(prices).length > 0) updateCurrentPrices(prices);
      });
    }
  }, [stocks]);

  const handleUndo = async () => {
    const result = await undoLastTransaction();
    setUndoMessage({
      text: result.success ? 'Son işlem geri alındı' : (result.message || 'Geri alınamadı'),
      type: result.success ? 'success' : 'error',
    });
    setTimeout(() => setUndoMessage(null), 4000);
  };

  // Toplam değerler
  const totalValue = portfolio.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
  const totalCost = portfolio.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Hisseleri grupla (aynı sembolden birden fazla alım olabilir)
  const groupedPortfolio = portfolio.reduce((acc, item) => {
    const existing = acc.find((g) => g.symbol === item.symbol);
    if (existing) {
      existing.totalQuantity += item.quantity;
      existing.totalCost += item.buyPrice * item.quantity;
      existing.items.push(item);
    } else {
      acc.push({
        symbol: item.symbol,
        name: item.name,
        totalQuantity: item.quantity,
        totalCost: item.buyPrice * item.quantity,
        currentPrice: item.currentPrice,
        items: [item],
      });
    }
    return acc;
  }, [] as { symbol: string; name: string; totalQuantity: number; totalCost: number; currentPrice: number; items: PortfolioItem[] }[]);

  // Seçilen hissenin detayları
  const selectedItems = selectedSymbol
    ? portfolio.filter((p) => p.symbol === selectedSymbol)
    : [];

  const renderGroupedItem = ({ item }: { item: typeof groupedPortfolio[0] }) => {
    const currentValue = item.currentPrice * item.totalQuantity;
    const pnl = currentValue - item.totalCost;
    const pnlPercent = item.totalCost > 0 ? (pnl / item.totalCost) * 100 : 0;
    const isProfit = pnl >= 0;
    const avgCost = item.totalQuantity > 0 ? item.totalCost / item.totalQuantity : 0;
    const portfolioPercent = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;

    return (
      <TouchableOpacity
        style={[styles.stockRow, { borderLeftColor: isProfit ? COLORS.success + '60' : COLORS.danger + '60', borderLeftWidth: 3 }]}
        onPress={() => setSelectedSymbol(item.symbol)}
        activeOpacity={0.7}
      >
        <View style={styles.stockRowLeft}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <Text style={styles.stockDetail}>{item.totalQuantity} adet · Ort: {formatTL(avgCost)}</Text>
        </View>
        <View style={styles.stockRowCenter}>
          <View style={styles.percentBar}>
            <View style={[styles.percentBarFill, { width: `${Math.min(portfolioPercent, 100)}%`, backgroundColor: COLORS.primary + '60' }]} />
          </View>
          <Text style={styles.percentText}>%{portfolioPercent.toFixed(1)}</Text>
        </View>
        <View style={styles.stockRowRight}>
          <Text style={[styles.stockPnL, { color: isProfit ? COLORS.success : COLORS.danger }]}>
            {isProfit ? '+' : ''}{formatTL(pnl)}
          </Text>
          <Text style={[styles.stockPnLPercent, { color: isProfit ? COLORS.success : COLORS.danger }]}>
            {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Kompakt Özet */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Portföy</Text>
          <Text style={styles.summaryValue}>{formatTL(totalValue)}</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryCenter]}>
          <Text style={styles.summaryLabel}>Açık K/Z</Text>
          <Text style={[styles.summaryValue, { color: totalPnL >= 0 ? COLORS.success : COLORS.danger, fontSize: 14 }]}>
            {totalPnL >= 0 ? '+' : ''}{formatTL(totalPnL)} ({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(1)}%)
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Realize K/Z</Text>
          <Text style={[styles.summaryValue, { color: totalRealizedPnL >= 0 ? COLORS.success : COLORS.danger, fontSize: 14 }]}>
            {totalRealizedPnL >= 0 ? '+' : ''}{formatTL(totalRealizedPnL)}
          </Text>
        </View>
      </View>

      {/* Toplam Varlık */}
      <View style={styles.totalAssetBar}>
        <Text style={styles.totalAssetLabel}>Toplam Varlık</Text>
        <Text style={styles.totalAssetValue}>{formatTL(totalValue + account.balance)}</Text>
        <Text style={[styles.totalAssetLabel, { marginLeft: SPACING.sm }]}>Bakiye</Text>
        <Text style={[styles.totalAssetValue, { color: COLORS.primary, flex: 0 }]}>{formatTL(account.balance)}</Text>
        {transactions.length > 0 && (
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
            <Ionicons name="arrow-undo" size={14} color={COLORS.warning} />
          </TouchableOpacity>
        )}
      </View>

      {/* Para Yatır/Çek (Her Zaman Görünür) */}
      <View style={styles.depositBar}>
        <TextInput
          style={styles.depositInput}
          placeholder="TL Tutar"
          placeholderTextColor={COLORS.textMuted}
          value={depositAmount}
          onChangeText={setDepositAmount}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.depositBtn} onPress={() => { const v = parseFloat(depositAmount); if (v > 0) { deposit(v); setDepositAmount(''); } }}>
          <Text style={styles.depositBtnText}>Yatır</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.withdrawBtn} onPress={() => { const v = parseFloat(depositAmount); if (v > 0 && v <= account.balance) { withdraw(v); setDepositAmount(''); } }}>
          <Text style={styles.withdrawBtnText}>Çek</Text>
        </TouchableOpacity>
      </View>

      {/* Geri Alma Mesajı */}
      {undoMessage && (
        <View style={[styles.undoBanner, { backgroundColor: undoMessage.type === 'success' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
          <Text style={[styles.undoBannerText, { color: undoMessage.type === 'success' ? COLORS.success : COLORS.warning }]}>{undoMessage.text}</Text>
        </View>
      )}

      {/* Hisse Listesi */}
      {groupedPortfolio.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Portföyünüz boş</Text>
        </View>
      ) : (
        <FlatList
          data={groupedPortfolio}
          keyExtractor={(item) => item.symbol}
          renderItem={renderGroupedItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border }} />}
        />
      )}

      {/* Hisse Detay Modal */}
      <Modal visible={!!selectedSymbol} transparent animationType="slide" onRequestClose={() => setSelectedSymbol(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedSymbol(null)} />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSymbol} - Alım Detayları</Text>
              <TouchableOpacity onPress={() => setSelectedSymbol(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedItems.length > 0 && (
              <View style={styles.modalSummary}>
                <Text style={styles.modalSummaryText}>
                  Toplam: {selectedItems.reduce((s, i) => s + i.quantity, 0)} adet · 
                  Ort. Maliyet: {formatTL(selectedItems.reduce((s, i) => s + i.buyPrice * i.quantity, 0) / selectedItems.reduce((s, i) => s + i.quantity, 0))}
                </Text>
              </View>
            )}

            <FlatList
              data={selectedItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                const pnl = (item.currentPrice - item.buyPrice) * item.quantity;
                const pnlPct = item.buyPrice > 0 ? ((item.currentPrice - item.buyPrice) / item.buyPrice) * 100 : 0;
                const isProfit = pnl >= 0;
                return (
                  <View style={styles.detailItem}>
                    <View style={styles.detailItemLeft}>
                      <Text style={styles.detailItemDate}>
                        {new Date(item.buyDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                      <Text style={styles.detailItemInfo}>
                        {item.quantity} adet x {formatTL(item.buyPrice)}
                      </Text>
                    </View>
                    <View style={styles.detailItemRight}>
                      <Text style={[styles.detailItemPnL, { color: isProfit ? COLORS.success : COLORS.danger }]}>
                        {isProfit ? '+' : ''}{formatTL(pnl)}
                      </Text>
                      <Text style={[styles.detailItemPct, { color: isProfit ? COLORS.success : COLORS.danger }]}>
                        {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs }} />}
              style={{ maxHeight: 300 }}
            />

            {/* Al/Sat Butonu */}
            <TouchableOpacity
              style={styles.tradeFromPortfolioBtn}
              onPress={() => {
                const group = groupedPortfolio.find(g => g.symbol === selectedSymbol);
                if (group) {
                  setSelectedSymbol(null);
                  setTradeSymbol({ symbol: group.symbol, name: group.name, price: group.currentPrice });
                }
              }}
            >
              <Ionicons name="swap-horizontal" size={18} color="#fff" />
              <Text style={styles.tradeFromPortfolioBtnText}>Al / Sat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Trade Modal */}
      {tradeSymbol && (
        <TradeModal
          visible={!!tradeSymbol}
          onClose={() => { setTradeSymbol(null); loadData(); }}
          symbol={tradeSymbol.symbol}
          name={tradeSymbol.name}
          currentPrice={tradeSymbol.price}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Kompakt Özet
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryItem: { flex: 1 },
  summaryCenter: { alignItems: 'center' },
  summaryLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 2 },
  summaryValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  // Toplam Varlık
  totalAssetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  totalAssetLabel: { color: COLORS.textSecondary, fontSize: 12 },
  totalAssetValue: { color: COLORS.primary, fontSize: 16, fontWeight: '700', flex: 1 },
  undoBtn: { padding: SPACING.xs },
  // Para Yatır/Çek
  depositBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  depositInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    color: COLORS.text,
    fontSize: 13,
  },
  depositBtn: { backgroundColor: COLORS.success, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2, borderRadius: 6 },
  depositBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  withdrawBtn: { backgroundColor: COLORS.danger, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2, borderRadius: 6 },
  withdrawBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  // Undo Banner
  undoBanner: { padding: SPACING.sm, marginHorizontal: SPACING.md, marginTop: SPACING.xs, borderRadius: 6 },
  undoBannerText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  // Hisse Listesi
  listContent: { paddingBottom: SPACING.xl },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  stockRowLeft: { flex: 1 },
  stockSymbol: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  stockDetail: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  stockRowCenter: { width: 55, alignItems: 'center', marginHorizontal: SPACING.xs },
  percentBar: { width: '100%', height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  percentBarFill: { height: '100%', borderRadius: 2 },
  percentText: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  stockRowRight: { alignItems: 'flex-end' },
  stockPnL: { fontSize: 14, fontWeight: '700' },
  stockPnLPercent: { fontSize: 11, marginTop: 1 },
  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 16, marginTop: SPACING.sm },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    maxHeight: '60%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  modalSummary: { backgroundColor: COLORS.background, padding: SPACING.sm, borderRadius: 8, marginBottom: SPACING.md },
  modalSummaryText: { color: COLORS.textSecondary, fontSize: 13 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm },
  detailItemLeft: {},
  detailItemDate: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  detailItemInfo: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  detailItemRight: { alignItems: 'flex-end', flexDirection: 'row', gap: SPACING.sm },
  detailItemPnL: { fontSize: 14, fontWeight: '700' },
  detailItemPct: { fontSize: 11, marginTop: 1 },
  deleteItemBtn: { padding: SPACING.xs, marginLeft: SPACING.xs },
  tradeFromPortfolioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, paddingVertical: SPACING.sm + 2, borderRadius: 10,
    marginTop: SPACING.md, gap: SPACING.xs,
  },
  tradeFromPortfolioBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
