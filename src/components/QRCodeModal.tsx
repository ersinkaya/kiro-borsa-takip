import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function QRCodeModal({ visible, onClose }: QRCodeModalProps) {
  const expoUrl = 'exp://wkyulqk-razumuhin-8081.exp.direct';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Mobil Bağlantı</Text>
          <Text style={styles.subtitle}>
            Expo Go uygulamasıyla bağlanın
          </Text>

          <View style={styles.urlBox}>
            <Ionicons name="phone-portrait-outline" size={40} color={COLORS.primary} />
            <Text style={styles.urlText}>{expoUrl}</Text>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>Nasıl bağlanılır:</Text>
            <Text style={styles.instructionText}>
              1. Telefonunuza Expo Go uygulamasını indirin
            </Text>
            <Text style={styles.instructionText}>
              2. Expo Go'yu açın ve URL'yi girin
            </Text>
            <Text style={styles.instructionText}>
              3. Veya terminaldeki QR kodu okutun
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  urlBox: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  urlText: {
    color: COLORS.primary,
    fontSize: 13,
    marginTop: SPACING.sm,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
    textAlign: 'center',
  },
  instructions: {
    marginTop: SPACING.lg,
    alignSelf: 'stretch',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 10,
  },
  instructionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  instructionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
});
