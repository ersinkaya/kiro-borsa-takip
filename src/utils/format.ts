/**
 * Para birimini okunabilir formata çevirir
 * Örn: 1234567.89 → "1.234.567,89"
 * Örn: 45000 → "45.000,00"
 */
export function formatMoney(amount: number, decimals: number = 2): string {
  return amount.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Para birimini ₺ işaretiyle formatlar
 * Örn: 1234567.89 → "₺1.234.567,89"
 */
export function formatTL(amount: number, decimals: number = 2): string {
  return `₺${formatMoney(amount, decimals)}`;
}

/**
 * Büyük sayıları kısaltır
 * Örn: 1500000 → "1,5M"
 * Örn: 25000 → "25K"
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1).replace('.', ',')}K`;
  }
  return volume.toString();
}
