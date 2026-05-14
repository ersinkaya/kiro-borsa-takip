import { Alert, Platform } from 'react-native';

/**
 * Platform uyumlu alert fonksiyonu
 * Web'de window.confirm/alert kullanır, mobilde Alert.alert kullanır
 */
export function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) {
  if (Platform.OS === 'web') {
    const result = window.confirm(`${title}\n\n${message}`);
    if (result) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'İptal', style: 'cancel', onPress: onCancel },
      { text: 'Onayla', onPress: onConfirm },
    ]);
  }
}
