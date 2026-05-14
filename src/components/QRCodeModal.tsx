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
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING } from '../constants/theme';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function QRCodeModal({ visible, onClose }: QRCodeModalProps) {
  // Expo Go bağlantı URL'si - tunnel modu ile her yerden erişilebilir
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
            Expo Go uygulamasıyla QR kodu okutun
          </Text>

          <View style={styles.qrContainer}>
            {Platform.OS === 'web' ? (
              <QRCode
                value={expoUrl}
                size={200}
                backgroundColor="white"
                color="black"
              />
            ) : (
              <QRCode
                value={expoUrl}
                size={200}
                backgroundColor="white"
                color="black"
              />
            )}
          </View>

          <Text style={styles.urlText}>{expoUrl}</Text>

          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>Nasıl bağlanılır:</Text>
            <Text style={styles.instructionText}>
              1. Telefonunuza Expo Go uygulamasını indirin
            </Text>
            <Text style={styles.instructionText}>
              2. Aynı WiFi ağına bağlı olduğunuzdan emin olun
            </Text>
            <Text style={styles.instructionText}>
              3. QR kodu Expo Go ile okutun
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
  qrContainer: {
    backgroundColor: 'white',
    padding: SPACING.md,
    borderRadius: 12,
  },
  urlText: {
    color: COLORS.primary,
    fontSize: 13,
    marginTop: SPACING.md,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
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
