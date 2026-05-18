import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { formatTL } from '../utils/format';

interface ScanResult {
  symbol: string;
  close: number;
  change: number;
  rsi?: number;
  volume?: number;
  [key: string]: any;
}

interface ScanData {
  timestamp: string;
  totalScanned: number;
  results: {
    trendStart: ScanResult[];
    bottomReversal: ScanResult[];
    squeeze: ScanResult[];
    strongTrend: ScanResult[];
    breakout: ScanResult[];
    institutional: ScanResult[];
  };
}

const INDICATORS = [
  {
    key: 'trendStart',
    title: 'Trend Başlangıcı',
    icon: 'arrow-up-circle' as const,
    color: '#10b981',
    description: 'EMA20 → EMA50 yukarı kesiyor, RSI > 50, hacim artıyor',
    signal: 'Yeni yükseliş başlıyor olabilir',
  },
  {
    key: 'bottomReversal',
    title: 'Dipten Dönüş',
    icon: 'refresh-circle' as const,
    color: '#06b6d4',
    description: 'RSI aşırı satımdan çıkıyor, MACD yukarı kesişim, hacim artıyor',
    signal: 'Satış bitiyor olabilir',
  },
  {
    key: 'squeeze',
    title: 'Sıkışma (Bollinger)',
    icon: 'contract' as const,
    color: '#f59e0b',
    description: 'Bollinger bantları daralmış, hacim artıyor, fiyat üst banda yakın',
    signal: 'Sert hareket gelebilir',
  },
  {
    key: 'strongTrend',
    title: 'Güçlü Trend Devamı',
    icon: 'rocket' as const,
    color: '#8b5cf6',
    description: 'EMA20 > EMA50 > EMA200, ADX > 25, RSI 50-70',
    signal: 'Trend güçlü, yükseliş devam ediyor',
  },
  {
    key: 'breakout',
    title: 'Kırılım (Breakout)',
    icon: 'flash' as const,
    color: '#ef4444',
    description: 'Direnç kırılıyor, hacim 2-3x normal, RSI 55-65',
    signal: 'En güçlü hareketler burada gelir',
  },
  {
    key: 'institutional',
    title: 'Kurumsal Giriş',
    icon: 'business' as const,
    color: '#3b82f6',
    description: 'Fiyat yükseliyor, hacim artıyor, haftalık performans pozitif',
    signal: 'Güçlü alım izlenimi',
  },
];

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location?.port === '8081') {
    return 'http://localhost:3001';
  }
  return '';
};

export function IndicatorsScreen() {
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string>('trendStart');
  const [refreshing, setRefreshing] = useState(false);

  const fetchScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/indicators/scan`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScanData(data);
    } catch (e: any) {
      setError(e.message || 'Tarama hatası');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchScan();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchScan();
  };

  const selectedConfig = INDICATORS.find(i => i.key === selectedIndicator)!;
  const selectedResults: ScanResult[] = scanData?.results?.[selectedIndicator as keyof typeof scanData.results] || [];

  const renderStockItem = ({ item }: { item: ScanResult }) => {
    const isPositive = item.change >= 0;
    return (
      <View style={styles.stockItem}>
        <View style={styles.stockItemLeft}>
          <Text style={styles.stockItemSymbol}>{item.symbol}</Text>
          <Text style={styles.stockItemPrice}>{formatTL(item.close)}</Text>
        </View>
        <View style={styles.stockItemCenter}>
          {item.rsi && <Text style={styles.stockItemMeta}>RSI: {item.rsi?.toFixed(0)}</Text>}
          {item.adx && <Text style={styles.stockItemMeta}>ADX: {item.adx?.toFixed(0)}</Text>}
          {item.bandWidth && <Text style={styles.stockItemMeta}>Band: %{item.bandWidth}</Text>}
          {item.perfWeek && <Text style={styles.stockItemMeta}>Hafta: %{item.perfWeek?.toFixed(1)}</Text>}
        </View>
        <View style={styles.stockItemRight}>
          <Text style={[styles.stockItemChange, { color: isPositive ? COLORS.success : COLORS.danger }]}>
            {isPositive ? '+' : ''}{item.change?.toFixed(2)}%
          </Text>
          {item.volume && (
            <Text style={styles.stockItemVolume}>
              {item.volume > 1000000 ? `${(item.volume / 1000000).toFixed(1)}M` : `${(item.volume / 1000).toFixed(0)}K`}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* İndikatör Seçimi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={styles.tabContent}
      >
        {INDICATORS.map(ind => {
          const isActive = selectedIndicator === ind.key;
          const count = scanData?.results?.[ind.key as keyof typeof scanData.results]?.length || 0;
          return (
            <TouchableOpacity
              key={ind.key}
              style={[styles.tabChip, isActive && { backgroundColor: ind.color, borderColor: ind.color }]}
              onPress={() => setSelectedIndicator(ind.key)}
            >
              <Ionicons name={ind.icon} size={14} color={isActive ? '#fff' : ind.color} />
              <Text style={[styles.tabChipText, isActive && { color: '#fff' }]}>{ind.title}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? '#fff' : ind.color }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? ind.color : '#fff' }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Seçili İndikatör Bilgisi */}
      <View style={[styles.infoBar, { borderLeftColor: selectedConfig.color }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoDescription}>{selectedConfig.description}</Text>
          <Text style={[styles.infoSignal, { color: selectedConfig.color }]}>💡 {selectedConfig.signal}</Text>
        </View>
        <TouchableOpacity onPress={fetchScan} style={styles.refreshBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Tarama Bilgisi */}
      {scanData && (
        <View style={styles.scanInfo}>
          <Text style={styles.scanInfoText}>
            {scanData.totalScanned} hisse tarandı · {selectedResults.length} sonuç
          </Text>
          <Text style={styles.scanInfoTime}>
            {new Date(scanData.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}

      {/* Sonuçlar */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchScan}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !scanData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Hisseler taranıyor...</Text>
        </View>
      ) : selectedResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Bu kriterlere uyan hisse bulunamadı</Text>
          <Text style={styles.emptySubtext}>Piyasa koşulları değiştiğinde tekrar tarayın</Text>
        </View>
      ) : (
        <FlatList
          data={selectedResults}
          keyExtractor={(item) => item.symbol}
          renderItem={renderStockItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Tab Row
  tabRow: { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  tabContent: { paddingHorizontal: SPACING.sm, alignItems: 'center', gap: SPACING.xs },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  tabChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  tabBadge: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeText: { fontSize: 9, fontWeight: '700' },
  // Info Bar
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderLeftWidth: 3,
    margin: SPACING.sm,
    marginBottom: 0,
    borderRadius: 8,
  },
  infoDescription: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16 },
  infoSignal: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  refreshBtn: { padding: SPACING.sm },
  // Scan Info
  scanInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  scanInfoText: { color: COLORS.textMuted, fontSize: 10 },
  scanInfoTime: { color: COLORS.textMuted, fontSize: 10 },
  // Stock List
  listContent: { paddingBottom: SPACING.xl },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  stockItemLeft: { width: 90 },
  stockItemSymbol: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  stockItemPrice: { color: COLORS.textSecondary, fontSize: 12, marginTop: 1 },
  stockItemCenter: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  stockItemMeta: { color: COLORS.textMuted, fontSize: 10, backgroundColor: COLORS.background, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  stockItemRight: { alignItems: 'flex-end', width: 60 },
  stockItemChange: { fontSize: 13, fontWeight: '700' },
  stockItemVolume: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  // States
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 8, marginTop: SPACING.sm },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600', marginTop: SPACING.sm },
  emptySubtext: { color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.xs, textAlign: 'center' },
});
