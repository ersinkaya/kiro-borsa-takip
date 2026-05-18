import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';

interface TradeModalProps {
  visible: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  currentPrice: number;
}

export function TradeModal({ visible, onClose, symbol, name, currentPrice }: TradeModalProps) {
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [tradeDate, setTradeDate] = useState('');
  const [affectBalance, setAffectBalance] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { portfolio, account, addToPortfolio, sellFromPortfolio } =
    usePortfolioStore();

  useEffect(() => {
    if (visible) {
      if (currentPrice > 0) setPrice(currentPrice.toFixed(2));
      else setPrice('');
      setQuantity('');
      setMessage(null);
      setAffectBalance(false);
      // Bugünün tarihi
      const today = new Date().toISOString().split('T')[0];
      setTradeDate(today);
    }
  }, [visible, currentPrice]);

  const portfolioItems = portfolio.filter(
    (p) => p.symbol.toUpperCase() === symbol.toUpperCase()
  );
  const totalOwned = portfolioItems.reduce((sum, p) => sum + p.quantity, 0);

  const qty = parseInt(quantity) || 0;
  const prc = parseFloat(price) || 0;
  const totalAmount = qty * prc;

  const handleTrade = async () => {
    setMessage(null);

    if (qty <= 0) {
      setMessage({ text: 'Geçerli bir adet girin', type: 'error' });
      return;
    }
    if (prc <= 0) {
      setMessage({ text: 'Geçerli bir fiyat girin', type: 'error' });
      return;
    }

    // Tarih doğrulama
    const selectedDate = tradeDate ? new Date(tradeDate).toISOString() : new Date().toISOString();

    if (tradeType === 'BUY') {
      // Bakiye kontrolü (sadece affectBalance açıksa)
      if (affectBalance && totalAmount > account.balance) {
        setMessage({ text: `Yetersiz bakiye. Bakiyeniz: ₺${account.balance.toFixed(2)}`, type: 'error' });
        return;
      }

      addToPortfolio({
        symbol,
        name,
        quantity: qty,
        buyPrice: prc,
        buyDate: selectedDate,
        affectBalance,
      } as any);

      setMessage({ text: `✓ ${qty} adet ${symbol} portföye eklendi${affectBalance ? ' (bakiyeden düşüldü)' : ''}`, type: 'success' });
      setQuantity('');
    } else {
      if (totalOwned < qty) {
        setMessage({ text: `Portföyünüzde ${totalOwned} adet ${symbol} var.`, type: 'error' });
        return;
      }

      // Satış - backend'e gönder (FIFO + realized P&L hesaplanır)
      const result = await sellFromPortfolio({
        symbol,
        name,
        quantity: qty,
        sellPrice: prc,
        sellDate: selectedDate,
        affectBalance,
      });

      if (result.success) {
        const pnlText = result.realizedPnL !== undefined
          ? ` | Kar/Zarar: ${result.realizedPnL >= 0 ? '+' : ''}₺${result.realizedPnL.toFixed(2)}`
          : '';
        setMessage({ text: `✓ ${qty} adet ${symbol} satıldı${affectBalance ? ' (bakiyeye eklendi)' : ''}${pnlText}`, type: 'success' });
      } else {
        setMessage({ text: result.message || 'Satış hatası', type: 'error' });
      }
      setQuantity('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.symbol}>{symbol}</Text>
              <Text style={styles.name}>{name}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Bilgi Satırı */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Güncel Fiyat</Text>
              <Text style={styles.infoValue}>
                {currentPrice > 0 ? `₺${currentPrice.toFixed(2)}` : '—'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Portföyde</Text>
              <Text style={styles.infoValue}>{totalOwned} adet</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Bakiye</Text>
              <Text style={[styles.infoValue, { color: COLORS.primary }]}>
                ₺{account.balance.toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Mesaj */}
          {message && (
            <View style={[styles.messageBox, { backgroundColor: message.type === 'success' ? COLORS.success + '20' : COLORS.danger + '20' }]}>
              <Text style={[styles.messageText, { color: message.type === 'success' ? COLORS.success : COLORS.danger }]}>
                {message.text}
              </Text>
            </View>
          )}

          {/* Alış/Satış Seçimi */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, tradeType === 'BUY' && styles.buyActive]}
              onPress={() => { setTradeType('BUY'); setMessage(null); }}
            >
              <Text style={[styles.typeText, tradeType === 'BUY' && { color: '#fff' }]}>AL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, tradeType === 'SELL' && styles.sellActive]}
              onPress={() => { setTradeType('SELL'); setMessage(null); }}
            >
              <Text style={[styles.typeText, tradeType === 'SELL' && { color: '#fff' }]}>SAT</Text>
            </TouchableOpacity>
          </View>

          {/* Adet */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Adet</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* Fiyat */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Fiyat (₺)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* Tarih */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Tarih</Text>
            <TextInput
              style={styles.input}
              value={tradeDate}
              onChangeText={setTradeDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* Bakiye Etkisi */}
          <View style={styles.balanceToggleRow}>
            <View style={styles.balanceToggleLeft}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.balanceToggleText}>
                {tradeType === 'BUY' ? 'TL bakiyemden düşülsün' : 'TL bakiyeme eklensin'}
              </Text>
            </View>
            <Switch
              value={affectBalance}
              onValueChange={setAffectBalance}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
              thumbColor={affectBalance ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          {/* Toplam */}
          {totalAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Toplam</Text>
              <Text style={styles.totalValue}>₺{totalAmount.toFixed(2)}</Text>
            </View>
          )}

          {/* İşlem Butonu */}
          <TouchableOpacity
            style={[
              styles.tradeButton,
              { backgroundColor: tradeType === 'BUY' ? COLORS.success : COLORS.danger },
            ]}
            onPress={handleTrade}
          >
            <Ionicons
              name={tradeType === 'BUY' ? 'cart' : 'cash'}
              size={20}
              color="#fff"
            />
            <Text style={styles.tradeButtonText}>
              {tradeType === 'BUY' ? 'PORTFÖYE EKLE' : 'SAT'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  overlayTouch: { flex: 1 },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl + 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  symbol: { color: COLORS.primary, fontSize: 22, fontWeight: '700' },
  name: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: 12, marginBottom: SPACING.md,
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, marginBottom: 2 },
  infoValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  messageBox: { padding: SPACING.sm, borderRadius: 8, marginBottom: SPACING.md, alignItems: 'center' },
  messageText: { fontSize: 13, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  typeButton: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.sm + 2, borderRadius: 10,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  buyActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  sellActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  typeText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  inputLabel: { color: COLORS.textSecondary, fontSize: 14, width: 80 },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    color: COLORS.text, fontSize: 16, textAlign: 'right',
  },
  balanceToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.background, padding: SPACING.sm + 2, paddingHorizontal: SPACING.md,
    borderRadius: 10, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  balanceToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  balanceToggleText: { color: COLORS.textSecondary, fontSize: 13 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.sm, marginBottom: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  totalLabel: { color: COLORS.textSecondary, fontSize: 14 },
  totalValue: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  tradeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, borderRadius: 12, gap: SPACING.sm, marginTop: SPACING.sm,
  },
  tradeButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
