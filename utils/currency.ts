const COUNTRY_CURRENCY: Record<string, { symbol: string; code: string; lucideIcon: string | null }> = {
  'United States': { symbol: '$', code: 'USD', lucideIcon: 'DollarSign' },
  'United Kingdom': { symbol: '£', code: 'GBP', lucideIcon: 'PoundSterling' },
  'Ireland': { symbol: '€', code: 'EUR', lucideIcon: 'Euro' },
  'Canada': { symbol: 'C$', code: 'CAD', lucideIcon: 'DollarSign' },
  'Australia': { symbol: 'A$', code: 'AUD', lucideIcon: 'DollarSign' },
  'New Zealand': { symbol: 'NZ$', code: 'NZD', lucideIcon: 'DollarSign' },
  'Germany': { symbol: '€', code: 'EUR', lucideIcon: 'Euro' },
  'France': { symbol: '€', code: 'EUR', lucideIcon: 'Euro' },
  'Italy': { symbol: '€', code: 'EUR', lucideIcon: 'Euro' },
  'Spain': { symbol: '€', code: 'EUR', lucideIcon: 'Euro' },
  'Netherlands': { symbol: '€', code: 'EUR', lucideIcon: 'Euro' },
  'Japan': { symbol: '¥', code: 'JPY', lucideIcon: 'JapaneseYen' },
  'India': { symbol: '₹', code: 'INR', lucideIcon: 'IndianRupee' },
  'Brazil': { symbol: 'R$', code: 'BRL', lucideIcon: null },
  'South Africa': { symbol: 'R', code: 'ZAR', lucideIcon: null },
};

export function getCurrencySymbol(country?: string | null): string {
  if (!country) return '$';
  return COUNTRY_CURRENCY[country]?.symbol ?? '$';
}

export function getCurrencyIconName(country?: string | null): string | null {
  if (!country) return 'DollarSign';
  return COUNTRY_CURRENCY[country]?.lucideIcon ?? null;
}
