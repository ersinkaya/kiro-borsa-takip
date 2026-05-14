import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { differenceInDays } from 'date-fns';
import { formatTL } from '../utils/format';

export function AnalysisScreen() {
  const { portfolio, transactions, account, interestRate, setInterestRate } =
    usePortfolioStore();
  const [customRate, setCustomRate] = useState(interestRate.toString());

  // Portföy toplam değeri
  const totalPortfolioValue = portfolio.reduce(
    (sum, item) => sum + item.currentPrice * item.quantity,
    0
  );

  // Toplam maliyet
  const totalCost = portfolio.reduce(
    (sum, item) => sum + item.buyPrice * item.quantity,
    0
  );

  // Portföy kar/zarar
  const portfolioReturn = totalPortfolioValue - totalCost;
  const portfolioReturnPercent = totalCost > 0 ? (portfolioReturn / totalCost) * 100 : 0;

  // Faiz hesaplaması
  const interestAnalysis = useMemo(() => {
    if (transactions.length === 0) {
      return { interestEarning: 0, dayCount: 0 };
    }

    // İlk işlem tarihinden itibaren faiz hesapla
    const buyTransactions = transactions.filter((t) => t.type === 'BUY');
    if (buyTransactions.length === 0) {
      return { interestEarning: 0, dayCount: 0 };
    }

    // Her alım için ayrı ayrı faiz hesapla
    let totalInterestEarning = 0;
    const today = new Date();

    buyTransactions.forEach((transaction) => {
      const buyDate = new Date(transaction.date);
      const days = differenceInDays(today, buyDate);
      // Günlük faiz oranı = yıllık oran / 365
      const dailyRate = interestRate / 100 / 365;
      const interest = transaction.totalAmount * dailyRate * days;
      totalInterestEarning += interest;
    });

    const firstBuyDate = buyTransactions.reduce((earliest, t) => {
      const date = new Date(t.date);
      return date < earliest ? date : earliest;
    }, new Date());

    const dayCount = differenceInDays(today, firstBuyDate);

    return { interestEarning: totalInterestEarning, dayCount };
  }, [transactions, interestRate]);

  // Fark
  const difference = portfolioReturn - interestAnalysis.interestEarning;

  const handleRateChange = () => {
    const rate = parseFloat(customRate);
    if (!isNaN(rate) && rate > 0 && rate <= 200) {
      setInterestRate(rate);
    }
  };

  // Performans metrikleri
  const metrics = useMemo(() => {
    const winners = portfolio.filter(
      (item) => item.currentPrice > item.buyPrice
    );
    const losers = portfolio.filter(
      (item) => item.currentPrice < item.buyPrice
    );

    const bestPerformer = portfolio.reduce(
      (best, item) => {
        const returnPct =
          item.buyPrice > 0
            ? ((item.currentPrice - item.buyPrice) / item.buyPrice) * 100
            : 0;
        return returnPct > (best?.returnPct || -Infinity)
          ? { ...item, returnPct }
          : best;
      },
      null as (typeof portfolio[0] & { returnPct: number }) | null
    );

    const worstPerformer = portfolio.reduce(
      (worst, item) => {
        const returnPct =
          item.buyPrice > 0
            ? ((item.currentPrice - item.buyPrice) / item.buyPrice) * 100
            : 0;
        return returnPct < (worst?.returnPct || Infinity)
          ? { ...item, returnPct }
          : worst;
      },
      null as (typeof portfolio[0] & { returnPct: number }) | null
    );

    return { winners: winners.length, losers: losers.length, bestPerformer, worstPerformer };
  }, [portfolio]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Faiz Karşılaştırma Kartı */}
      <View style={styles.comparisonCard}>
        <Text style={styles.cardTitle}>
          <Ionicons name="analytics" size={18} color={COLORS.primary} /> Faiz
          Karşılaştırması
        </Text>

        {/* Faiz Oranı Ayarı */}
        <View style={styles.rateContainer}>
          <Text style={styles.rateLabel}>Yıllık Faiz Oranı:</Text>
          <View style={styles.rateInputContainer}>
            <TextInput
              style={styles.rateInput}
              value={customRate}
              onChangeText={setCustomRate}
              onBlur={handleRateChange}
              keyboardType="decimal-pad"
            />
            <Text style={styles.ratePercent}>%</Text>
          </View>
        </View>

        {/* Karşılaştırma Tablosu */}
        <View style={styles.comparisonTable}>
          {/* Portföy Getirisi */}
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLeft}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.comparisonLabel}>Portföy Getirisi</Text>
            </View>
            <View style={styles.comparisonRight}>
              <Text
                style={[
                  styles.comparisonValue,
                  { color: portfolioReturn >= 0 ? COLORS.success : COLORS.danger },
                ]}
              >
                {portfolioReturn >= 0 ? '+' : ''}{formatTL(portfolioReturn)}
              </Text>
              <Text
                style={[
                  styles.comparisonPercent,
                  { color: portfolioReturn >= 0 ? COLORS.success : COLORS.danger },
                ]}
              >
                ({portfolioReturnPercent >= 0 ? '+' : ''}
                {portfolioReturnPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>

          {/* Faiz Getirisi */}
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLeft}>
              <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.comparisonLabel}>
                Faiz Getirisi ({interestAnalysis.dayCount} gün)
              </Text>
            </View>
            <View style={styles.comparisonRight}>
              <Text style={[styles.comparisonValue, { color: COLORS.warning }]}>
                +{formatTL(interestAnalysis.interestEarning)}
              </Text>
            </View>
          </View>

          {/* Fark */}
          <View style={[styles.comparisonRow, styles.differenceRow]}>
            <View style={styles.comparisonLeft}>
              <Ionicons
                name={difference >= 0 ? 'trending-up' : 'trending-down'}
                size={18}
                color={difference >= 0 ? COLORS.success : COLORS.danger}
              />
              <Text style={styles.comparisonLabel}>Fark</Text>
            </View>
            <View style={styles.comparisonRight}>
              <Text
                style={[
                  styles.differenceValue,
                  { color: difference >= 0 ? COLORS.success : COLORS.danger },
                ]}
              >
                {difference >= 0 ? '+' : ''}{formatTL(difference)}
              </Text>
            </View>
          </View>
        </View>

        {/* Sonuç Mesajı */}
        <View
          style={[
            styles.resultBanner,
            {
              backgroundColor:
                difference >= 0 ? COLORS.success + '15' : COLORS.danger + '15',
            },
          ]}
        >
          <Ionicons
            name={difference >= 0 ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={difference >= 0 ? COLORS.success : COLORS.danger}
          />
          <Text
            style={[
              styles.resultText,
              { color: difference >= 0 ? COLORS.success : COLORS.danger },
            ]}
          >
            {difference >= 0
              ? `Portföyünüz faizden ${formatTL(difference)} daha fazla kazandırdı!`
              : `Faize yatırsaydınız ${formatTL(Math.abs(difference))} daha fazla kazanırdınız.`}
          </Text>
        </View>
      </View>

      {/* Portföy Metrikleri */}
      <View style={styles.metricsCard}>
        <Text style={styles.cardTitle}>
          <Ionicons name="stats-chart" size={18} color={COLORS.secondary} /> Portföy
          Metrikleri
        </Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{portfolio.length}</Text>
            <Text style={styles.metricLabel}>Toplam Hisse</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: COLORS.success }]}>
              {metrics.winners}
            </Text>
            <Text style={styles.metricLabel}>Kârda</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: COLORS.danger }]}>
              {metrics.losers}
            </Text>
            <Text style={styles.metricLabel}>Zararda</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {formatTL(totalPortfolioValue, 0)}
            </Text>
            <Text style={styles.metricLabel}>Portföy Değeri</Text>
          </View>
        </View>

        {/* En İyi / En Kötü Performans */}
        {metrics.bestPerformer && (
          <View style={styles.performerRow}>
            <Ionicons name="trophy" size={16} color={COLORS.success} />
            <Text style={styles.performerText}>
              En İyi: {metrics.bestPerformer.symbol} (
              {metrics.bestPerformer.returnPct >= 0 ? '+' : ''}
              {metrics.bestPerformer.returnPct.toFixed(1)}%)
            </Text>
          </View>
        )}
        {metrics.worstPerformer && (
          <View style={styles.performerRow}>
            <Ionicons name="sad" size={16} color={COLORS.danger} />
            <Text style={styles.performerText}>
              En Kötü: {metrics.worstPerformer.symbol} (
              {metrics.worstPerformer.returnPct >= 0 ? '+' : ''}
              {metrics.worstPerformer.returnPct.toFixed(1)}%)
            </Text>
          </View>
        )}
      </View>

      {/* Genel Özet */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>
          <Ionicons name="pie-chart" size={18} color={COLORS.primary} /> Genel Özet
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Toplam Yatırım:</Text>
          <Text style={styles.summaryValue}>{formatTL(totalCost)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Güncel Değer:</Text>
          <Text style={styles.summaryValue}>{formatTL(totalPortfolioValue)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Nakit Bakiye:</Text>
          <Text style={styles.summaryValue}>{formatTL(account.balance)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.summaryLabel}>Toplam Varlık:</Text>
          <Text style={[styles.summaryValue, { color: COLORS.primary, fontSize: 18 }]}>
            {formatTL(totalPortfolioValue + account.balance)}
          </Text>
        </View>
      </View>
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
  comparisonCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rateLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    color: COLORS.text,
    fontSize: 16,
    width: 60,
    textAlign: 'center',
  },
  ratePercent: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginLeft: 4,
  },
  comparisonTable: {
    gap: SPACING.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  comparisonLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  comparisonRight: {
    alignItems: 'flex-end',
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  comparisonPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  differenceRow: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  differenceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 10,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  metricsCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricItem: {
    width: '47%',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  performerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
  },
});
