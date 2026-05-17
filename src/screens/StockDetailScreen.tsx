import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { Stock } from '../types';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { TradeModal } from '../components/TradeModal';
import { formatTL, formatVolume } from '../utils/format';

interface HistoryItem {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
}

export function StockDetailScreen() {
  const route = useRoute<any>();
  const { stock } = route.params as { stock: Stock };
  const { portfolio } = usePortfolioStore();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlistStore();
  const [showTrade, setShowTrade] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const periods = [
    { label: '1 Ay', days: 30 },
    { label: '3 Ay', days: 90 },
    { label: '6 Ay', days: 180 },
    { label: '1 Yıl', days: 365 },
  ];

  const isWatched = watchlist.includes(stock.symbol);

  // Geçmiş verileri çek
  useEffect(() => {
    setHistoryLoading(true);
    const port = typeof window !== 'undefined' ? window.location?.port : '';
    const apiBase = port === '8081' ? 'http://localhost:3001' : '';
    fetch(`${apiBase}/api/history/${stock.symbol}?days=${selectedPeriod}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setHistory(data.data);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [stock.symbol, selectedPeriod]);

  // Dönem kar/zarar hesapla
  const periodPnL = (() => {
    if (history.length < 2) return null;
    const newest = history[0]?.close || 0;
    const oldest = history[history.length - 1]?.close || 0;
    if (oldest === 0) return null;
    const changeTL = newest - oldest;
    const changePercent = ((newest - oldest) / oldest) * 100;
    return { changeTL, changePercent, newest, oldest };
  })();

  // AI Analiz çek
  const fetchAiAnalysis = () => {
    setAiLoading(true);
    setAiError(null);
    const port = typeof window !== 'undefined' ? window.location?.port : '';
    const apiBase = port === '8081' ? 'http://localhost:3001' : '';
    fetch(`${apiBase}/api/ai-analysis/${stock.symbol}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.analysis) {
          setAiAnalysis(data.analysis);
        } else if (data.error) {
          setAiError(data.error);
        }
      })
      .catch(() => setAiError('Bağlantı hatası'))
      .finally(() => setAiLoading(false));
  };

  // Bu hisseden portföyde var mı?
  const portfolioItems = portfolio.filter((p) => p.symbol === stock.symbol);
  const totalOwned = portfolioItems.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = portfolioItems.reduce(
    (sum, p) => sum + p.buyPrice * p.quantity,
    0
  );
  const avgCost = totalOwned > 0 ? totalCost / totalOwned : 0;
  const currentValue = totalOwned * stock.price;
  const pnl = currentValue - totalCost;
  const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Fiyat Kartı */}
      <View style={styles.priceCard}>
        <View style={styles.priceHeader}>
          <Text style={styles.symbol}>{stock.symbol}</Text>
          <TouchableOpacity
            onPress={() => isWatched ? removeFromWatchlist(stock.symbol) : addToWatchlist(stock.symbol)}
          >
            <Ionicons
              name={isWatched ? 'eye' : 'eye-outline'}
              size={24}
              color={isWatched ? COLORS.primary : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{stock.name}</Text>

        <Text style={styles.price}>
          {stock.price > 0 ? formatTL(stock.price) : 'Veri yok'}
        </Text>

        {stock.price > 0 && (
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor:
                  stock.change >= 0 ? COLORS.success + '20' : COLORS.danger + '20',
              },
            ]}
          >
            <Ionicons
              name={stock.change >= 0 ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={stock.change >= 0 ? COLORS.success : COLORS.danger}
            />
            <Text
              style={[
                styles.changeText,
                { color: stock.change >= 0 ? COLORS.success : COLORS.danger },
              ]}
            >
              %{Math.abs(stock.change).toFixed(2)}
            </Text>
          </View>
        )}

        <Text style={styles.lastUpdated}>
          Son güncelleme: {new Date(stock.lastUpdated).toLocaleTimeString('tr-TR')}
        </Text>
      </View>

      {/* Detay Bilgileri */}
      <View style={styles.detailCard}>
        <Text style={styles.cardTitle}>Piyasa Bilgileri</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fiyat</Text>
          <Text style={styles.detailValue}>
            {stock.price > 0 ? formatTL(stock.price) : '—'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Günlük Değişim</Text>
          <Text
            style={[
              styles.detailValue,
              { color: stock.change >= 0 ? COLORS.success : COLORS.danger },
            ]}
          >
            {stock.change >= 0 ? '+' : ''}%{stock.change.toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>İşlem Hacmi</Text>
          <Text style={styles.detailValue}>
            {stock.volume > 0
              ? formatVolume(stock.volume)
              : '—'}
          </Text>
        </View>
      </View>

      {/* Portföy Bilgisi */}
      {totalOwned > 0 && (
        <View style={styles.portfolioCard}>
          <Text style={styles.cardTitle}>Portföyünüzdeki Durum</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sahip Olunan</Text>
            <Text style={styles.detailValue}>{totalOwned} adet</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ortalama Maliyet</Text>
            <Text style={styles.detailValue}>{formatTL(avgCost)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Toplam Maliyet</Text>
            <Text style={styles.detailValue}>{formatTL(totalCost)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Güncel Değer</Text>
            <Text style={styles.detailValue}>{formatTL(currentValue)}</Text>
          </View>
          <View style={[styles.detailRow, styles.pnlRow]}>
            <Text style={styles.detailLabel}>Kar / Zarar</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  styles.pnlValue,
                  { color: pnl >= 0 ? COLORS.success : COLORS.danger },
                ]}
              >
                {pnl >= 0 ? '+' : ''}{formatTL(pnl)}
              </Text>
              <Text
                style={{ color: pnl >= 0 ? COLORS.success : COLORS.danger, fontSize: 12 }}
              >
                ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* İşlem Butonları */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.success }]}
          onPress={() => setShowTrade(true)}
        >
          <Ionicons name="cart" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>AL / SAT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isWatched ? COLORS.textMuted : COLORS.primary }]}
          onPress={() => isWatched ? removeFromWatchlist(stock.symbol) : addToWatchlist(stock.symbol)}
        >
          <Ionicons name={isWatched ? 'eye-off' : 'eye'} size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {isWatched ? 'Takipten Çıkar' : 'Takip Et'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Yapay Zeka Görüşü */}
      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Ionicons name="sparkles" size={20} color="#a855f7" />
          <Text style={styles.aiTitle}>Yapay Zeka Görüşü</Text>
        </View>

        {aiAnalysis ? (
          <View>
            <Text style={styles.aiText}>{aiAnalysis}</Text>
            <Text style={styles.aiDisclaimer}>
              ⚠️ Bu bir yatırım tavsiyesi değildir. Yapay zeka tarafından üretilmiştir.
            </Text>
            <TouchableOpacity style={styles.aiRefreshButton} onPress={fetchAiAnalysis}>
              <Ionicons name="refresh" size={14} color={COLORS.textMuted} />
              <Text style={styles.aiRefreshText}>Yenile</Text>
            </TouchableOpacity>
          </View>
        ) : aiLoading ? (
          <View style={styles.aiLoadingContainer}>
            <ActivityIndicator size="small" color="#a855f7" />
            <Text style={styles.aiLoadingText}>Analiz hazırlanıyor...</Text>
          </View>
        ) : aiError ? (
          <View>
            <Text style={styles.aiErrorText}>{aiError}</Text>
            <TouchableOpacity style={styles.aiButton} onPress={fetchAiAnalysis}>
              <Text style={styles.aiButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.aiButton} onPress={fetchAiAnalysis}>
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={styles.aiButtonText}>AI Analiz İste</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Son 1 Aylık Veriler */}
      <View style={styles.historyCard}>
        {/* Dönem Seçici */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.days}
              style={[
                styles.periodButton,
                selectedPeriod === period.days && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.days)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.days && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dönem Kar/Zarar Özeti */}
        {periodPnL && (
          <View style={[styles.periodPnLCard, { backgroundColor: periodPnL.changePercent >= 0 ? COLORS.success + '10' : COLORS.danger + '10' }]}>
            <View style={styles.periodPnLRow}>
              <Text style={styles.periodPnLLabel}>
                {periods.find(p => p.days === selectedPeriod)?.label} Performans:
              </Text>
              <View style={styles.periodPnLValues}>
                <Text style={[styles.periodPnLPercent, { color: periodPnL.changePercent >= 0 ? COLORS.success : COLORS.danger }]}>
                  {periodPnL.changePercent >= 0 ? '+' : ''}{periodPnL.changePercent.toFixed(2)}%
                </Text>
                <Text style={[styles.periodPnLTL, { color: periodPnL.changePercent >= 0 ? COLORS.success : COLORS.danger }]}>
                  ({periodPnL.changeTL >= 0 ? '+' : ''}{formatTL(periodPnL.changeTL)})
                </Text>
              </View>
            </View>
            <View style={styles.periodPnLDetails}>
              <Text style={styles.periodPnLDetailText}>
                Dönem Başı: {formatTL(periodPnL.oldest)} → Dönem Sonu: {formatTL(periodPnL.newest)}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.cardTitle}>Tarihsel Veriler</Text>
        {historyLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: SPACING.lg }} />
        ) : history.length === 0 ? (
          <Text style={styles.noDataText}>Geçmiş veri bulunamadı</Text>
        ) : (
          <>
            {/* Tablo Başlığı */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Tarih</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Kapanış</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Açılış</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Yüksek</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Düşük</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Hacim</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>Fark %</Text>
            </View>

            {/* Tablo Satırları */}
            {history.map((item, index) => {
              const date = new Date(item.date);
              const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
              const isPositive = item.change >= 0;

              return (
                <View key={item.date} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{dateStr}</Text>
                  <Text style={[styles.tableCellBold, { flex: 1.5, color: isPositive ? COLORS.success : COLORS.danger }]}>
                    {item.close.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {item.open.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {item.high.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {item.low.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {formatVolume(item.volume)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCellBold,
                      { flex: 1.2, textAlign: 'right', color: isPositive ? COLORS.success : COLORS.danger },
                    ]}
                  >
                    {isPositive ? '+' : ''}{item.change.toFixed(2)}%
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </View>

      {/* Trade Modal */}
      <TradeModal
        visible={showTrade}
        onClose={() => setShowTrade(false)}
        symbol={stock.symbol}
        name={stock.name}
        currentPrice={stock.price}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  priceCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  symbol: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  name: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  price: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    marginTop: SPACING.sm,
    gap: 4,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdated: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.md,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  portfolioCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  pnlRow: {
    borderBottomWidth: 0,
    paddingTop: SPACING.md,
  },
  pnlValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md + 4,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // AI Kartı
  aiCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a855f7' + '40',
    marginBottom: SPACING.md,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  aiTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  aiText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  aiDisclaimer: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },
  aiRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  aiRefreshText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  aiLoadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  aiLoadingText: {
    color: '#a855f7',
    fontSize: 13,
  },
  aiErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f7',
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    gap: SPACING.xs,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: SPACING.md,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  periodPnLCard: {
    padding: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.md,
  },
  periodPnLRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodPnLLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  periodPnLValues: {
    alignItems: 'flex-end',
  },
  periodPnLPercent: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodPnLTL: {
    fontSize: 12,
    marginTop: 2,
  },
  periodPnLDetails: {
    marginTop: SPACING.xs,
  },
  periodPnLDetailText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  noDataText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  tableHeaderText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: COLORS.background + '80',
    borderRadius: 4,
  },
  tableCell: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  tableCellBold: {
    fontSize: 12,
    fontWeight: '700',
  },
});
