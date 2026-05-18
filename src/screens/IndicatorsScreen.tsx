import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

export function IndicatorsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Başlık */}
      <View style={styles.headerCard}>
        <Ionicons name="pulse" size={32} color={COLORS.primary} />
        <Text style={styles.headerTitle}>İndikatörler</Text>
        <Text style={styles.headerSubtitle}>
          Teknik indikatörler tanımlayın, tüm BIST hisselerini tarayarak kriterlere uyan hisseleri bulun
        </Text>
      </View>

      {/* Yakında */}
      <View style={styles.comingSoonCard}>
        <Ionicons name="construct-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.comingSoonTitle}>Yakında</Text>
        <Text style={styles.comingSoonText}>
          Bu bölümde tanımlayacağınız indikatörlerle (RSI, MACD, Bollinger, hacim artışı vb.) tüm BIST hisselerini tarayabileceksiniz.
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.featureText}>RSI aşırı alım/satım taraması</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.featureText}>MACD kesişim sinyalleri</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.featureText}>Hacim patlaması tespiti</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.featureText}>Hareketli ortalama kesişimleri (SMA/EMA)</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.featureText}>Bollinger Band sıkışması</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.featureText}>Özel filtre kombinasyonları</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  headerCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginTop: SPACING.sm },
  headerSubtitle: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: SPACING.xs, lineHeight: 18 },
  comingSoonCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  comingSoonTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: SPACING.md },
  comingSoonText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 18 },
  featureList: { marginTop: SPACING.lg, alignSelf: 'stretch', gap: SPACING.sm },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  featureText: { color: COLORS.textSecondary, fontSize: 13 },
});
