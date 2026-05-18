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
import { useNavigation } from '@react-navigation/native';
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
    description: 'EMA20, EMA50\'yi yukarı kesiyor · RSI 50 üstüne çıkıyor · Hacim son günlerin üstünde',
    signal: 'Yeni bir yükseliş trendi başlıyor olabilir',
  },
  {
    key: 'bottomReversal',
    title: 'Dipten Dönüş',
    icon: 'refresh-circle' as const,
    color: '#06b6d4',
    description: 'RSI aşırı satım bölgesinden (30 altı) çıkıyor · MACD yukarı kesişim veriyor · Hacim artışı var',
    signal: 'Satış baskısı azalıyor, dönüş sinyali olabilir',
  },
  {
    key: 'squeeze',
    title: 'Sıkışma — Sert Hareket Öncesi',
    icon: 'contract' as const,
    color: '#f59e0b',
    description: 'Bollinger bantları daralmış · Hacim yavaş yavaş artıyor · Fiyat üst banda yaklaşıyor',
    signal: 'Sıkışma sonrası sert bir kırılım gelebilir',
  },
  {
    key: 'strongTrend',
    title: 'Güçlü Trend Devamı',
    icon: 'rocket' as const,
    color: '#8b5cf6',
    description: 'EMA20 > EMA50 > EMA200 dizilimi · ADX 25 üstünde (güçlü trend) · RSI 50-70 arası',
    signal: 'Mevcut yükseliş trendi güçlü, devam edebilir',
  },
  {
    key: 'breakout',
    title: 'Kırılım',
    icon: 'flash' as const,
    color: '#ef4444',
    description: 'Fiyat 1 aylık zirveyi test ediyor · Hacim normalin 2 katından fazla · RSI 55-65 arası',
    signal: 'Direnç kırılıyor, en güçlü hareketler burada gelir',
  },
  {
    key: 'institutional',
    title: 'Kurumsal Alım İzlenimi',
    icon: 'business' as const,
    color: '#3b82f6',
    description: 'Fiyat yükselirken hacim de artıyor · Haftalık performans pozitif · RSI güçlü bölgede',
    signal: 'Büyük oyuncuların alım yaptığı izlenimi var',
  },
];

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location?.port === '8081') {
    return 'http://localhost:3001';
  }
  return '';
};

export function IndicatorsScreen() {
  const navigation = useNavigation<any>();
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
      <TouchableOpacity
        style={styles.stockItem}
        activeOpacity={0.7}
        onPress={() => {
          navigation.navigate('StockDetail', {
            stock: {
              symbol: item.symbol,
              name: item.symbol,
              price: item.close,
              change: item.change,
              volume: item.volume || 0,
              lastUpdated: new Date().toISOString(),
            },
          });
        }}
      >
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* İndikatör Seçimi - Büyük Kartlar */}
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
              style={[
                styles.indicatorCard,
                isActive && { backgroundColor: ind.color, borderColor: ind.color },
              ]}
              onPress={() => setSelectedIndicator(ind.key)}
              activeOpacity={0.7}
            >
              <View style={styles.indicatorCardTop}>
                <Ionicons name={ind.icon} size={22} color={isActive ? '#fff' : ind.color} />
                {count > 0 && (
                  <View style={[styles.indicatorBadge, { backgroundColor: isActive ? '#fff' : ind.color }]}>
                    <Text style={[styles.indicatorBadgeText, { color: isActive ? ind.color : '#fff' }]}>{count}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.indicatorCardTitle, isActive && { color: '#fff' }]} numberOfLines={2}>
                {ind.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Seçili İndikatör Bilgisi */}
      <View style={[styles.infoBar, { borderLeftColor: selectedConfig.color }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>{selectedConfig.title}</Text>
          <Text style={styles.infoDescription}>{selectedConfig.description}</Text>
          <Text style={[styles.infoSignal, { color: selectedConfig.color }]}>💡 {selectedConfig.signal}</Text>
        </View>
        <TouchableOpacity onPress={fetchScan} style={styles.refreshBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="refresh" size={22} color={COLORS.primary} />
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
  // İndikatör Kartları
  tabRow: { maxHeight: 110, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabContent: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, alignItems: 'stretch', gap: SPACING.sm },
  indicatorCard: {
    width: 100,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  indicatorBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  indicatorBadgeText: { fontSize: 11, fontWeight: '700' },
  indicatorCardTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  // Info Bar
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderLeftWidth: 4,
    margin: SPACING.sm,
    marginBottom: 0,
    borderRadius: 10,
  },
  infoTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  infoDescription: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 },
  infoSignal: { fontSize: 12, fontWeight: '600', marginTop: 4 },
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
