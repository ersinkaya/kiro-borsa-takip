import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useStockStore } from '../store/useStockStore';
import { BIST_STOCKS } from '../constants/stocks';
import { showAlert, showConfirm } from '../utils/alert';

export function TradeScreen() {
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { portfolio, account, addToPortfolio, sellFromPortfolio } =
    usePortfolioStore();
  const { stocks } = useStockStore();

  // Hisse önerileri
  const suggestions = symbol.length > 0
    ? BIST_STOCKS.filter(
        (s) =>
          s.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
          s.name.toLowerCase().includes(symbol.toLowerCase())
      ).slice(0, 5)
    : [];

  const selectedStock = BIST_STOCKS.find(
    (s) => s.symbol.toUpperCase() === symbol.toUpperCase()
  );

  // Güncel fiyatı otomatik doldur
  const fillCurrentPrice = () => {
    const stock = stocks.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (stock && stock.price > 0) {
      setPrice(stock.price.toFixed(2));
    }
  };

  const handleTrade = () => {
    if (!selectedStock) {
      showAlert('Hata', 'Geçerli bir hisse senedi seçin');
      return;
    }

    const qty = parseInt(quantity);
    const prc = parseFloat(price);

    if (isNaN(qty) || qty <= 0) {
      showAlert('Hata', 'Geçerli bir adet girin');
      return;
    }

    if (isNaN(prc) || prc <= 0) {
      showAlert('Hata', 'Geçerli bir fiyat girin');
      return;
    }

    const totalAmount = qty * prc;

    if (tradeType === 'BUY') {
      const insufficientBalance = totalAmount > account.balance;
      const confirmMessage = insufficientBalance
        ? `${selectedStock.symbol} - ${selectedStock.name}\n${qty} adet x ₺${prc.toFixed(2)} = ₺${totalAmount.toFixed(2)}\n\n⚠️ Bakiyeniz yetersiz (₺${account.balance.toFixed(2)}). Yine de kaydetmek istiyor musunuz?`
        : `${selectedStock.symbol} - ${selectedStock.name}\n${qty} adet x ₺${prc.toFixed(2)} = ₺${totalAmount.toFixed(2)}`;

      showConfirm('Alış Onayı', confirmMessage, () => {
        addToPortfolio({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          quantity: qty,
          buyPrice: prc,
          buyDate: new Date().toISOString(),
        });

        addTransaction({
          type: 'BUY',
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          quantity: qty,
          price: prc,
          totalAmount,
          date: new Date().toISOString(),
        });

        showAlert('Başarılı', 'Alış işlemi gerçekleştirildi');
        resetForm();
      });
    } else {
      // Satış - portföyde yeterli hisse var mı kontrol et
      const portfolioItems = portfolio.filter(
        (p) => p.symbol.toUpperCase() === symbol.toUpperCase()
      );
      const totalOwned = portfolioItems.reduce((sum, p) => sum + p.quantity, 0);

      if (totalOwned < qty) {
        showAlert(
          'Yetersiz Hisse',
          `Portföyünüzde ${totalOwned} adet ${selectedStock.symbol} bulunmaktadır.`
        );
        return;
      }

      showConfirm(
        'Satış Onayı',
        `${selectedStock.symbol} - ${selectedStock.name}\n${qty} adet x ₺${prc.toFixed(2)} = ₺${totalAmount.toFixed(2)}`,
        async () => {
          const result = await sellFromPortfolio({
            symbol: selectedStock.symbol,
            name: selectedStock.name,
            quantity: qty,
            sellPrice: prc,
            sellDate: new Date().toISOString(),
            affectBalance: false,
          });

          if (result.success) {
            const pnlText = result.realizedPnL !== undefined
              ? `\nKar/Zarar: ${result.realizedPnL >= 0 ? '+' : ''}₺${result.realizedPnL.toFixed(2)}`
              : '';
            showAlert('Başarılı', `Satış işlemi gerçekleştirildi${pnlText}`);
          } else {
            showAlert('Hata', result.message || 'Satış hatası');
          }
          resetForm();
        }
      );
    }
  };

  const resetForm = () => {
    setSymbol('');
    setQuantity('');
    setPrice('');
  };

  const totalAmount = (parseInt(quantity) || 0) * (parseFloat(price) || 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* İşlem Tipi Seçimi */}
        <View style={styles.tradeTypeContainer}>
          <TouchableOpacity
            style={[
              styles.tradeTypeButton,
              tradeType === 'BUY' && styles.buyActive,
            ]}
            onPress={() => setTradeType('BUY')}
          >
            <Ionicons
              name="arrow-down-circle"
              size={20}
              color={tradeType === 'BUY' ? '#fff' : COLORS.success}
            />
            <Text
              style={[
                styles.tradeTypeText,
                tradeType === 'BUY' && styles.tradeTypeTextActive,
              ]}
            >
              ALIŞ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tradeTypeButton,
              tradeType === 'SELL' && styles.sellActive,
            ]}
            onPress={() => setTradeType('SELL')}
          >
            <Ionicons
              name="arrow-up-circle"
              size={20}
              color={tradeType === 'SELL' ? '#fff' : COLORS.danger}
            />
            <Text
              style={[
                styles.tradeTypeText,
                tradeType === 'SELL' && styles.tradeTypeTextActive,
              ]}
            >
              SATIŞ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bakiye Bilgisi */}
        <View style={styles.balanceCard}>
          <Ionicons name="wallet" size={20} color={COLORS.primary} />
          <Text style={styles.balanceText}>
            Kullanılabilir Bakiye: ₺{account.balance.toFixed(2)}
          </Text>
        </View>

        {/* Hisse Seçimi */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Hisse Senedi</Text>
          <View style={styles.symbolInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Hisse kodu (örn: THYAO)"
              placeholderTextColor={COLORS.textMuted}
              value={symbol}
              onChangeText={(text) => {
                setSymbol(text.toUpperCase());
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoCapitalize="characters"
            />
            {selectedStock && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            )}
          </View>

          {/* Öneriler */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s.symbol}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setSymbol(s.symbol);
                    setShowSuggestions(false);
                    fillCurrentPrice();
                  }}
                >
                  <Text style={styles.suggestionSymbol}>{s.symbol}</Text>
                  <Text style={styles.suggestionName}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedStock && (
            <Text style={styles.selectedStockName}>{selectedStock.name}</Text>
          )}
        </View>

        {/* Adet */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Adet</Text>
          <TextInput
            style={styles.input}
            placeholder="Kaç adet?"
            placeholderTextColor={COLORS.textMuted}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        </View>

        {/* Fiyat */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Birim Fiyat (₺)</Text>
          <View style={styles.priceInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Birim fiyat"
              placeholderTextColor={COLORS.textMuted}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.currentPriceButton}
              onPress={fillCurrentPrice}
            >
              <Text style={styles.currentPriceButtonText}>Güncel Fiyat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Toplam Tutar */}
        {totalAmount > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Toplam Tutar</Text>
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
            {tradeType === 'BUY' ? 'SATIN AL' : 'SAT'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  tradeTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tradeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  buyActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  sellActive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  tradeTypeText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  tradeTypeTextActive: {
    color: '#fff',
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  balanceText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    color: COLORS.text,
    fontSize: 16,
  },
  symbolInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionSymbol: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    width: 70,
  },
  suggestionName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  selectedStockName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  currentPriceButton: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  currentPriceButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  totalCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  totalLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  totalValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  tradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md + 4,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  tradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
