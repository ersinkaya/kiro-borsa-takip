import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Transaction } from '../types';
import { showAlert, showConfirm } from '../utils/alert';

export function AccountScreen() {
  const [amount, setAmount] = useState('');
  const { account, transactions, deposit, withdraw } = usePortfolioStore();

  const handleDeposit = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      showAlert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    showConfirm('Para Yatırma', `₺${value.toFixed(2)} yatırılacak. Onaylıyor musunuz?`, () => {
      deposit(value);
      setAmount('');
      showAlert('Başarılı', `₺${value.toFixed(2)} hesabınıza yatırıldı`);
    });
  };

  const handleWithdraw = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      showAlert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    if (value > account.balance) {
      showAlert('Yetersiz Bakiye', 'Çekmek istediğiniz tutar bakiyenizden fazla');
      return;
    }

    showConfirm('Para Çekme', `₺${value.toFixed(2)} çekilecek. Onaylıyor musunuz?`, () => {
      withdraw(value);
      setAmount('');
      showAlert('Başarılı', `₺${value.toFixed(2)} hesabınızdan çekildi`);
    });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor:
                item.type === 'BUY' ? COLORS.success + '20' : COLORS.danger + '20',
            },
          ]}
        >
          <Ionicons
            name={item.type === 'BUY' ? 'arrow-down' : 'arrow-up'}
            size={16}
            color={item.type === 'BUY' ? COLORS.success : COLORS.danger}
          />
        </View>
        <View>
          <Text style={styles.transactionSymbol}>
            {item.type === 'BUY' ? 'Alış' : 'Satış'} - {item.symbol}
          </Text>
          <Text style={styles.transactionDetail}>
            {item.quantity} adet x ₺{item.price.toFixed(2)}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.type === 'BUY' ? COLORS.danger : COLORS.success },
        ]}
      >
        {item.type === 'BUY' ? '-' : '+'}₺{item.totalAmount.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Bakiye Kartı */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Hesap Bakiyesi</Text>
        <Text style={styles.balanceValue}>₺{account.balance.toFixed(2)}</Text>

        <View style={styles.balanceDetails}>
          <View style={styles.balanceDetailItem}>
            <Ionicons name="arrow-down-circle" size={16} color={COLORS.success} />
            <Text style={styles.balanceDetailText}>
              Yatırılan: ₺{account.totalDeposit.toFixed(2)}
            </Text>
          </View>
          <View style={styles.balanceDetailItem}>
            <Ionicons name="arrow-up-circle" size={16} color={COLORS.danger} />
            <Text style={styles.balanceDetailText}>
              Çekilen: ₺{account.totalWithdraw.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Para Yatır/Çek */}
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Para Yatır / Çek</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="Tutar (₺)"
          placeholderTextColor={COLORS.textMuted}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.depositButton} onPress={handleDeposit}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Yatır</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
            <Ionicons name="remove-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Çek</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* İşlem Geçmişi */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>İşlem Geçmişi</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyHistoryText}>Henüz işlem yapılmadı</Text>
          </View>
        ) : (
          transactions.slice(0, 20).map((transaction) => (
            <View key={transaction.id}>
              {renderTransaction({ item: transaction })}
            </View>
          ))
        )}
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
  balanceCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  balanceValue: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  balanceDetails: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.lg,
  },
  balanceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  balanceDetailText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  actionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  amountInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    color: COLORS.text,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  depositButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    gap: SPACING.xs,
  },
  withdrawButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    gap: SPACING.xs,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historySection: {
    marginTop: SPACING.sm,
  },
  historyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyHistoryText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: SPACING.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionSymbol: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDetail: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  transactionDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
