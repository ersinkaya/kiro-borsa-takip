import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { differenceInDays } from 'date-fns';
import { formatTL } from '../utils/format';

interface StockAnalysis {
  symbol: string;
  name: string;
  totalInvested: number;
  currentValue: number;
  portfolioReturn: number;
  portfolioReturnPct: number;
  interestEarning: number;
  difference: number;
  avgDaysHeld: number;
  totalQuantity: number;
  purchases: { quantity: number; buyPrice: number; buyDate: string; daysHeld: number; invested: number; interest: number }[];
}

export function AnalysisScreen() {
  const { portfolio, transactions, account, interestRate, setInterestRate, totalRealizedPnL } =
    usePortfolioStore();
  const [customRate, setCustomRate] = useState(interestRate.toString());
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const handleRateChange = () => {
    const rate = parseFloat(customRate);
    if (!isNaN(rate) && rate > 0 && rate <= 200) {
      setInterestRate(rate);
    }
  };

  // Hisse bazlı detaylı analiz
  const stockAnalyses = useMemo(() => {
    const today = new Date();
    const dailyRate = interestRate / 100 / 365;

    // Portföydeki hisseleri grupla
    const symbolMap: Record<string, StockAnalysis> = {};

    for (const item of portfolio) {
      if (!symbolMap[item.symbol]) {
        symbolMap[item.symbol] = {
          symbol: item.symbol,
          name: item.name,
          totalInvested: 0,
          currentValue: 0,
          portfolioReturn: 0,
          portfolioReturnPct: 0,
          interestEarning: 0,
          difference: 0,
          avgDaysHeld: 0,
          totalQuantity: 0,
          purchases: [],
        };
      }

      const s = symbolMap[item.symbol];
      const invested = item.buyPrice * item.quantity;
      const currentVal = item.currentPrice * item.quantity;
      const buyDate = new Date(item.buyDate);
      const daysHeld = Math.max(1, differenceInDays(today, buyDate));
      const interest = invested * dailyRate * daysHeld;

      s.totalInvested += invested;
      s.currentValue += currentVal;
      s.interestEarning += interest;
      s.totalQuantity += item.quantity;
      s.purchases.push({
        quantity: item.quantity,
        buyPrice: item.buyPrice,
        buyDate: item.buyDate,
        daysHeld,
        invested,
        interest,
      });
    }

    // Hesaplamaları tamamla
    const analyses: StockAnalysis[] = [];
    for (const key of Object.keys(symbolMap)) {
      const s = symbolMap[key];
      s.portfolioReturn = s.currentValue - s.totalInvested;
      s.portfolioReturnPct = s.totalInvested > 0 ? (s.portfolioReturn / s.totalInvested) * 100 : 0;
      s.difference = s.portfolioReturn - s.interestEarning;
      s.avgDaysHeld = s.purchases.length > 0
        ? Math.round(s.purchases.reduce((sum, p) => sum + p.daysHeld, 0) / s.purchases.length)
        : 0;
      // Alımları eskiden yeniye sırala
      s.purchases.sort((a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime());
      analyses.push(s);
    }

    // Farka göre sırala (en çok kazandıran üstte)
    return analyses.sort((a, b) => b.difference - a.difference);
  }, [portfolio, interestRate]);

  // Genel toplamlar
  const totals = useMemo(() => {
    const totalInvested = stockAnalyses.reduce((s, a) => s + a.totalInvested, 0);
    const totalCurrentValue = stockAnalyses.reduce((s, a) => s + a.currentValue, 0);
    const totalInterest = stockAnalyses.reduce((s, a) => s + a.interestEarning, 0);
    const portfolioReturn = totalCurrentValue - totalInvested;
    const difference = portfolioReturn - totalInterest;
    return { totalInvested, totalCurrentValue, totalInterest, portfolioReturn, difference };
  }, [stockAnalyses]);

  const renderStockAnalysis = ({ item }: { item: StockAnalysis }) => {
    const isExpanded = expandedSymbol === item.symbol;
    const isWinnerVsInterest = item.difference >= 0;
    const isProfit = item.portfolioReturn >= 0;

    return (
      <View style={styles.stockCard}>
        <TouchableOpacity
          style={styles.stockCardHeader}
          onPress={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
          activeOpacity={0.7}
        >
          <View style={styles.stockCardLeft}>
            <View style={[styles.stockDot, { backgroundColor: isWinnerVsInterest ? COLORS.success : COLORS.danger }]} />
            <View>
              <Text style={styles.stockSymbol}>{item.symbol}</Text>
              <Text style={styles.stockMeta}>
                {item.totalQuantity} adet · {item.avgDaysHeld} gün
              </Text>
            </View>
          </View>
          <View style={styles.stockCardRight}>
            <View style={styles.stockCardValues}>
              <Text style={[styles.stockReturn, { color: isProfit ? COLORS.success : COLORS.danger }]}>
                {isProfit ? '+' : ''}{formatTL(item.portfolioReturn)}
              </Text>
              <Text style={styles.stockInterest}>
                Faiz: +{formatTL(item.interestEarning)}
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.textMuted}
            />
          </View>
        </TouchableOpacity>

        {/* Fark Barı */}
        <View style={[styles.diffBar, { backgroundColor: isWinnerVsInterest ? COLORS.success + '15' : COLORS.danger + '15' }]}>
          <Ionicons
            name={isWinnerVsInterest ? 'trending-up' : 'trending-down'}
            size={14}
            color={isWinnerVsInterest ? COLORS.success : COLORS.danger}
          />
          <Text style={[styles.diffText, { color: isWinnerVsInterest ? COLORS.success : COLORS.danger }]}>
            {isWinnerVsInterest
              ? `Faizden ${formatTL(item.difference)} daha iyi`
              : `Faiz ${formatTL(Math.abs(item.difference))} daha iyi olurdu`}
          </Text>
        </View>

        {/* Detay (Açılır) */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.expandedHeader}>
              <Text style={styles.expandedTitle}>Alım Detayları</Text>
            </View>
            {item.purchases.map((p, idx) => {
              const pDate = new Date(p.buyDate);
              return (
                <View key={idx} style={styles.purchaseRow}>
                  <View style={styles.purchaseLeft}>
                    <Text style={styles.purchaseDate}>
                      {pDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={styles.purchaseInfo}>
                      {p.quantity} ad x {formatTL(p.buyPrice)} = {formatTL(p.invested)}
                    </Text>
                  </View>
                  <View style={styles.purchaseRight}>
                    <Text style={styles.purchaseDays}>{p.daysHeld} gün</Text>
                    <Text style={styles.purchaseInterest}>
                      Faiz: +{formatTL(p.interest)}
                    </Text>
                  </View>
                </View>
              );
            })}
            <View style={styles.expandedSummary}>
              <View style={styles.expandedSummaryRow}>
                <Text style={styles.expandedSummaryLabel}>Toplam Yatırım:</Text>
                <Text style={styles.expandedSummaryValue}>{formatTL(item.totalInvested)}</Text>
              </View>
              <View style={styles.expandedSummaryRow}>
                <Text style={styles.expandedSummaryLabel}>Güncel Değer:</Text>
                <Text style={styles.expandedSummaryValue}>{formatTL(item.currentValue)}</Text>
              </View>
              <View style={styles.expandedSummaryRow}>
                <Text style={styles.expandedSummaryLabel}>Portföy Getirisi:</Text>
                <Text style={[styles.expandedSummaryValue, { color: isProfit ? COLORS.success : COLORS.danger }]}>
                  {isProfit ? '+' : ''}{formatTL(item.portfolioReturn)} ({item.portfolioReturnPct >= 0 ? '+' : ''}{item.portfolioReturnPct.toFixed(1)}%)
                </Text>
              </View>
              <View style={styles.expandedSummaryRow}>
                <Text style={styles.expandedSummaryLabel}>Faizde Kazanırdın:</Text>
                <Text style={[styles.expandedSummaryValue, { color: COLORS.warning }]}>+{formatTL(item.interestEarning)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Faiz Oranı Ayarı */}
      <View style={styles.rateBar}>
        <Text style={styles.rateLabel}>Yıllık Faiz Oranı</Text>
        <View style={styles.rateInputContainer}>
          <TouchableOpacity onPress={() => { const r = Math.max(1, interestRate - 5); setCustomRate(r.toString()); setInterestRate(r); }}>
            <Ionicons name="remove-circle" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.rateInput}
            value={customRate}
            onChangeText={setCustomRate}
            onBlur={handleRateChange}
            keyboardType="decimal-pad"
          />
          <Text style={styles.ratePercent}>%</Text>
          <TouchableOpacity onPress={() => { const r = Math.min(200, interestRate + 5); setCustomRate(r.toString()); setInterestRate(r); }}>
            <Ionicons name="add-circle" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Genel Özet Kartı */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Portföy Getirisi</Text>
            <Text style={[styles.overviewValue, { color: totals.portfolioReturn >= 0 ? COLORS.success : COLORS.danger }]}>
              {totals.portfolioReturn >= 0 ? '+' : ''}{formatTL(totals.portfolioReturn)}
            </Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Faizde Kazanırdın</Text>
            <Text style={[styles.overviewValue, { color: COLORS.warning }]}>
              +{formatTL(totals.totalInterest)}
            </Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Fark</Text>
            <Text style={[styles.overviewValue, { color: totals.difference >= 0 ? COLORS.success : COLORS.danger }]}>
              {totals.difference >= 0 ? '+' : ''}{formatTL(totals.difference)}
            </Text>
          </View>
        </View>

        {/* Sonuç Banner */}
        <View style={[styles.resultBanner, { backgroundColor: totals.difference >= 0 ? COLORS.success + '15' : COLORS.danger + '15' }]}>
          <Ionicons
            name={totals.difference >= 0 ? 'checkmark-circle' : 'information-circle'}
            size={18}
            color={totals.difference >= 0 ? COLORS.success : COLORS.danger}
          />
          <Text style={[styles.resultText, { color: totals.difference >= 0 ? COLORS.success : COLORS.danger }]}>
            {totals.difference >= 0
              ? `Portföyün faizden ${formatTL(totals.difference)} daha iyi performans gösterdi`
              : `Faize yatırsaydın ${formatTL(Math.abs(totals.difference))} daha fazla kazanırdın`}
          </Text>
        </View>

        {/* Realize K/Z */}
        {totalRealizedPnL !== 0 && (
          <View style={styles.realizedRow}>
            <Text style={styles.realizedLabel}>Realize Edilen K/Z:</Text>
            <Text style={[styles.realizedValue, { color: totalRealizedPnL >= 0 ? COLORS.success : COLORS.danger }]}>
              {totalRealizedPnL >= 0 ? '+' : ''}{formatTL(totalRealizedPnL)}
            </Text>
          </View>
        )}
      </View>

      {/* Hisse Bazlı Analiz */}
      <Text style={styles.sectionTitle}>Hisse Bazlı Faiz Karşılaştırması</Text>

      {stockAnalyses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="analytics-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Portföyünüze hisse ekleyin</Text>
          <Text style={styles.emptySubtext}>Her hisse için ayrı ayrı faiz karşılaştırması yapılacak</Text>
        </View>
      ) : (
        stockAnalyses.map((item) => (
          <View key={item.symbol}>
            {renderStockAnalysis({ item })}
          </View>
        ))
      )}

      {/* Portföy Metrikleri */}
      {portfolio.length > 0 && (
        <View style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Portföy Metrikleri</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{[...new Set(portfolio.map(p => p.symbol))].length}</Text>
              <Text style={styles.metricLabel}>Farklı Hisse</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: COLORS.success }]}>
                {stockAnalyses.filter(s => s.difference >= 0).length}
              </Text>
              <Text style={styles.metricLabel}>Faizden İyi</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: COLORS.danger }]}>
                {stockAnalyses.filter(s => s.difference < 0).length}
              </Text>
              <Text style={styles.metricLabel}>Faizden Kötü</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{formatTL(totals.totalInvested, 0)}</Text>
              <Text style={styles.metricLabel}>Toplam Yatırım</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  // Faiz Oranı
  rateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  rateLabel: { color: COLORS.textSecondary, fontSize: 14 },
  rateInputContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  rateInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    color: COLORS.text,
    fontSize: 16,
    width: 50,
    textAlign: 'center',
  },
  ratePercent: { color: COLORS.textSecondary, fontSize: 16 },
  // Genel Özet
  overviewCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  overviewRow: { flexDirection: 'row', alignItems: 'center' },
  overviewItem: { flex: 1, alignItems: 'center' },
  overviewDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  overviewLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 4 },
  overviewValue: { fontSize: 14, fontWeight: '700' },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    borderRadius: 10,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  resultText: { fontSize: 12, fontWeight: '600', flex: 1 },
  realizedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  realizedLabel: { color: COLORS.textSecondary, fontSize: 13 },
  realizedValue: { fontSize: 14, fontWeight: '700' },
  // Section
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: SPACING.sm, marginTop: SPACING.xs },
  // Stock Card
  stockCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  stockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  stockCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockSymbol: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  stockMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  stockCardRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stockCardValues: { alignItems: 'flex-end' },
  stockReturn: { fontSize: 14, fontWeight: '700' },
  stockInterest: { color: COLORS.warning, fontSize: 11, marginTop: 1 },
  diffBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  diffText: { fontSize: 11, fontWeight: '600' },
  // Expanded
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  expandedHeader: { marginBottom: SPACING.sm },
  expandedTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  purchaseLeft: {},
  purchaseDate: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  purchaseInfo: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  purchaseRight: { alignItems: 'flex-end' },
  purchaseDays: { color: COLORS.textSecondary, fontSize: 11 },
  purchaseInterest: { color: COLORS.warning, fontSize: 11, fontWeight: '600' },
  expandedSummary: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 4,
  },
  expandedSummaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  expandedSummaryLabel: { color: COLORS.textMuted, fontSize: 12 },
  expandedSummaryValue: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  // Empty
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600', marginTop: SPACING.sm },
  emptySubtext: { color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.xs, textAlign: 'center' },
  // Metrics
  metricsCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  metricItem: {
    width: '47%',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  metricLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
});
