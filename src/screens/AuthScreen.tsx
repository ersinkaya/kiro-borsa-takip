import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle, loading } = useAuthStore();

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError('E-posta ve şifre gerekli');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Şifre en az 6 karakter olmalı');
        return;
      }
      const result = await signUp(email, password, fullName);
      if (result.error) {
        setError(result.error);
      } else {
        setInfo('Kayıt başarılı! E-postanızı kontrol edip onaylayın, sonra giriş yapın.');
        setMode('signin');
      }
    } else {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Ionicons name="trending-up" size={64} color={COLORS.primary} />
          <Text style={styles.title}>Borsa Takip</Text>
          <Text style={styles.subtitle}>BIST portföy yönetimi</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Tab Switch */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => { setMode('signin'); setError(null); setInfo(null); }}
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => { setMode('signup'); setError(null); setInfo(null); }}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                Kayıt Ol
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mesajlar */}
          {error && (
            <View style={[styles.messageBox, { backgroundColor: COLORS.danger + '20' }]}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={[styles.messageText, { color: COLORS.danger }]}>{error}</Text>
            </View>
          )}
          {info && (
            <View style={[styles.messageBox, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={[styles.messageText, { color: COLORS.success }]}>{info}</Text>
            </View>
          )}

          {/* Form */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Ad Soyad (opsiyonel)"
                placeholderTextColor={COLORS.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  {mode === 'signin' ? 'GİRİŞ YAP' : 'KAYIT OL'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>VEYA</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogle}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={COLORS.text} />
            <Text style={styles.googleButtonText}>Google ile Devam Et</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Verileriniz güvenli bir şekilde saklanır
        </Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
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
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: SPACING.sm + 2,
    marginLeft: SPACING.sm,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginHorizontal: SPACING.sm,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
