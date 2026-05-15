import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { supabase } from '../services/supabase';

export function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { clearPortfolio, resetAll } = usePortfolioStore();
  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'clear' | 'reset' } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // Profil bilgilerini yükle
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    if (data) setFullName(data.full_name || '');
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Ad güncelleme
  const updateName = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        showMessage(error.message, 'error');
      } else {
        showMessage('İsim başarıyla güncellendi', 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  // E-posta güncelleme
  const updateEmail = async () => {
    if (!newEmail) {
      showMessage('Yeni e-posta gerekli', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        showMessage(error.message, 'error');
      } else {
        showMessage('Onay e-postası gönderildi. E-postanızı kontrol edin.', 'success');
        setNewEmail('');
      }
    } finally {
      setLoading(false);
    }
  };

  // Şifre değiştirme
  const updatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      showMessage('Tüm şifre alanlarını doldurun', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('Şifre en az 6 karakter olmalı', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('Şifreler eşleşmiyor', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showMessage(error.message, 'error');
      } else {
        showMessage('Şifre başarıyla değiştirildi', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  // Şifre sıfırlama maili
  const resetPassword = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) {
        showMessage(error.message, 'error');
      } else {
        showMessage('Şifre sıfırlama maili gönderildi', 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  // Tehlikeli işlemler
  const handleDangerousAction = async () => {
    if (!confirmModal) return;
    setLoading(true);
    try {
      if (confirmModal.type === 'clear') {
        await clearPortfolio();
        showMessage('Tüm hisseleriniz silindi', 'success');
      } else {
        await resetAll();
        showMessage('Tüm portföy ve işlemler sıfırlandı', 'success');
      }
      setConfirmModal(null);
      setConfirmText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Mesaj */}
      {message && (
        <View
          style={[
            styles.messageBox,
            { backgroundColor: message.type === 'success' ? COLORS.success + '20' : COLORS.danger + '20' },
          ]}
        >
          <Ionicons
            name={message.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={message.type === 'success' ? COLORS.success : COLORS.danger}
          />
          <Text
            style={[
              styles.messageText,
              { color: message.type === 'success' ? COLORS.success : COLORS.danger },
            ]}
          >
            {message.text}
          </Text>
        </View>
      )}

      {/* Profil Kartı */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.userId}>ID: {user?.id?.substring(0, 8)}...</Text>
          </View>
        </View>
      </View>

      {/* İsim Değiştirme */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>İsim Bilgisi</Text>
        <TextInput
          style={styles.input}
          placeholder="Ad Soyad"
          placeholderTextColor={COLORS.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={updateName}
          disabled={loading}
        >
          <Text style={styles.buttonText}>İsmi Güncelle</Text>
        </TouchableOpacity>
      </View>

      {/* E-posta Değiştirme */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>E-posta Değiştir</Text>
        <Text style={styles.cardSubtitle}>Mevcut: {user?.email}</Text>
        <TextInput
          style={styles.input}
          placeholder="Yeni e-posta"
          placeholderTextColor={COLORS.textMuted}
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={updateEmail}
          disabled={loading}
        >
          <Text style={styles.buttonText}>E-postayı Güncelle</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Yeni e-postanıza onay maili gönderilir
        </Text>
      </View>

      {/* Şifre Değiştirme */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Şifre Değiştir</Text>
        <TextInput
          style={styles.input}
          placeholder="Yeni şifre (en az 6 karakter)"
          placeholderTextColor={COLORS.textMuted}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Yeni şifre (tekrar)"
          placeholderTextColor={COLORS.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={styles.button}
          onPress={updatePassword}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Şifreyi Değiştir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={resetPassword}
          disabled={loading}
        >
          <Text style={styles.linkText}>Şifremi unuttum - sıfırlama maili gönder</Text>
        </TouchableOpacity>
      </View>

      {/* Tehlikeli İşlemler */}
      <View style={[styles.card, styles.dangerCard]}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning" size={20} color={COLORS.danger} />
          <Text style={styles.dangerTitle}>Tehlikeli Bölge</Text>
        </View>
        <Text style={styles.dangerSubtitle}>
          Bu işlemler geri alınamaz
        </Text>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => { setConfirmModal({ type: 'clear' }); setConfirmText(''); }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerButtonTitle}>Portföyü Temizle</Text>
            <Text style={styles.dangerButtonText}>Sahip olduğun tüm hisseleri sil (bakiye dursun)</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: COLORS.danger + '20', borderColor: COLORS.danger }]}
          onPress={() => { setConfirmModal({ type: 'reset' }); setConfirmText(''); }}
        >
          <Ionicons name="refresh-outline" size={18} color={COLORS.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dangerButtonTitle, { color: COLORS.danger }]}>Hesabı Sıfırla</Text>
            <Text style={[styles.dangerButtonText, { color: COLORS.danger }]}>
              Tüm portföy + işlemler + bakiye silinir
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Çıkış */}
      <TouchableOpacity
        style={[styles.button, styles.signOutButton]}
        onPress={signOut}
        disabled={loading}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.buttonText}>Çıkış Yap</Text>
      </TouchableOpacity>

      {/* Onay Modal */}
      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="warning" size={32} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>
              {confirmModal?.type === 'clear' ? 'Portföyü Temizle' : 'Hesabı Sıfırla'}
            </Text>
            <Text style={styles.modalMessage}>
              {confirmModal?.type === 'clear'
                ? 'Sahip olduğun tüm hisseler silinecek. TL bakiyen ve işlem geçmişin korunacak. Bu işlem geri alınamaz.'
                : 'Tüm portföyün, işlem geçmişin ve TL bakiyen sıfırlanacak. Bu işlem geri alınamaz.'}
            </Text>
            <Text style={styles.modalConfirmLabel}>
              Onaylamak için "<Text style={{ fontWeight: '700', color: COLORS.danger }}>SİL</Text>" yazın:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="SİL"
              placeholderTextColor={COLORS.textMuted}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => { setConfirmModal(null); setConfirmText(''); }}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  confirmText !== 'SİL' && { opacity: 0.5 },
                ]}
                onPress={handleDangerousAction}
                disabled={confirmText !== 'SİL' || loading}
              >
                <Text style={styles.modalConfirmText}>Onayla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
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
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  messageText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  userId: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: SPACING.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 4,
    borderRadius: 10,
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: COLORS.danger,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xs,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tehlikeli işlemler
  dangerCard: {
    borderColor: COLORS.danger + '40',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dangerTitle: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  dangerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  dangerButtonTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButtonText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
  },
  modalIconContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  modalConfirmLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: SPACING.md,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
