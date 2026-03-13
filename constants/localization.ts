// Country → currency, units, and preferred parts suppliers

export interface CountryConfig {
  currency: string;
  currencySymbol: string;
  units: 'km' | 'miles';
  // Ordered by preference: local first, regional fallback, international last
  suppliers: { name: string; searchUrl: string }[];
}

const SUPPLIER_TEMPLATES = {
  // Amazon regional
  amazonUS: { name: 'Amazon (US)', searchUrl: 'https://www.amazon.com/s?k=SEARCH_TERMS' },
  amazonUK: { name: 'Amazon (UK)', searchUrl: 'https://www.amazon.co.uk/s?k=SEARCH_TERMS' },
  amazonDE: { name: 'Amazon (DE)', searchUrl: 'https://www.amazon.de/s?k=SEARCH_TERMS' },
  amazonFR: { name: 'Amazon (FR)', searchUrl: 'https://www.amazon.fr/s?k=SEARCH_TERMS' },
  amazonIT: { name: 'Amazon (IT)', searchUrl: 'https://www.amazon.it/s?k=SEARCH_TERMS' },
  amazonES: { name: 'Amazon (ES)', searchUrl: 'https://www.amazon.es/s?k=SEARCH_TERMS' },
  amazonAU: { name: 'Amazon (AU)', searchUrl: 'https://www.amazon.com.au/s?k=SEARCH_TERMS' },
  amazonCA: { name: 'Amazon (CA)', searchUrl: 'https://www.amazon.ca/s?k=SEARCH_TERMS' },
  amazonIN: { name: 'Amazon (IN)', searchUrl: 'https://www.amazon.in/s?k=SEARCH_TERMS' },
  amazonJP: { name: 'Amazon (JP)', searchUrl: 'https://www.amazon.co.jp/s?k=SEARCH_TERMS' },
  amazonNL: { name: 'Amazon (NL)', searchUrl: 'https://www.amazon.nl/s?k=SEARCH_TERMS' },
  amazonBR: { name: 'Amazon (BR)', searchUrl: 'https://www.amazon.com.br/s?k=SEARCH_TERMS' },
  amazonMX: { name: 'Amazon (MX)', searchUrl: 'https://www.amazon.com.mx/s?k=SEARCH_TERMS' },
  amazonSG: { name: 'Amazon (SG)', searchUrl: 'https://www.amazon.sg/s?k=SEARCH_TERMS' },
  amazonAE: { name: 'Amazon (AE)', searchUrl: 'https://www.amazon.ae/s?k=SEARCH_TERMS' },
  amazonSA: { name: 'Amazon (SA)', searchUrl: 'https://www.amazon.sa/s?k=SEARCH_TERMS' },
  amazonPL: { name: 'Amazon (PL)', searchUrl: 'https://www.amazon.pl/s?k=SEARCH_TERMS' },
  amazonSE: { name: 'Amazon (SE)', searchUrl: 'https://www.amazon.se/s?k=SEARCH_TERMS' },

  // Europe motorcycle specialists
  autodoc: { name: 'Autodoc', searchUrl: 'https://www.autodoc.co.uk/search?keyword=SEARCH_TERMS' },
  autodocDE: { name: 'Autodoc (DE)', searchUrl: 'https://www.autodoc.de/search?keyword=SEARCH_TERMS' },
  louis: { name: 'Louis (EU)', searchUrl: 'https://www.louis.eu/search?q=SEARCH_TERMS' },
  fcMoto: { name: 'FC-Moto', searchUrl: 'https://www.fc-moto.de/en/search?q=SEARCH_TERMS' },
  xlmoto: { name: 'XLmoto', searchUrl: 'https://www.xlmoto.eu/search?q=SEARCH_TERMS' },
  motardinn: { name: 'Motardinn', searchUrl: 'https://www.tradeinn.com/motardinn/en/search?q=SEARCH_TERMS' },

  // UK / Ireland
  sportsbikeshop: { name: 'SportsBikeShop', searchUrl: 'https://www.sportsbikeshop.co.uk/search/?q=SEARCH_TERMS' },
  wemoto: { name: 'Wemoto', searchUrl: 'https://www.wemoto.com/search/?q=SEARCH_TERMS' },

  // USA
  revzilla: { name: 'RevZilla', searchUrl: 'https://www.revzilla.com/search?query=SEARCH_TERMS' },
  jpcycles: { name: 'J&P Cycles', searchUrl: 'https://www.jpcycles.com/search?q=SEARCH_TERMS' },

  // Australia / NZ
  bikebiz: { name: 'Bikebiz', searchUrl: 'https://www.bikebiz.com.au/search?q=SEARCH_TERMS' },
  motoNational: { name: 'Moto National', searchUrl: 'https://www.motonational.com.au/search?q=SEARCH_TERMS' },

  // Southeast Asia
  lazada: { name: 'Lazada', searchUrl: 'https://www.lazada.com/catalog/?q=SEARCH_TERMS' },
  shopee: { name: 'Shopee', searchUrl: 'https://shopee.com/search?keyword=SEARCH_TERMS' },

  // Japan
  webikeJP: { name: 'Webike (JP)', searchUrl: 'https://www.webike.net/sm/SEARCH_TERMS/' },

  // India
  grandPitStop: { name: 'Grand Pitstop', searchUrl: 'https://www.grandpitstop.com/search?q=SEARCH_TERMS' },

  // Latin America
  mercadolibreMX: { name: 'MercadoLibre (MX)', searchUrl: 'https://listado.mercadolibre.com.mx/SEARCH_TERMS' },
  mercadolibreBR: { name: 'MercadoLibre (BR)', searchUrl: 'https://lista.mercadolivre.com.br/SEARCH_TERMS' },
  mercadolibreAR: { name: 'MercadoLibre (AR)', searchUrl: 'https://listado.mercadolibre.com.ar/SEARCH_TERMS' },
  mercadolibreCO: { name: 'MercadoLibre (CO)', searchUrl: 'https://listado.mercadolibre.com.co/SEARCH_TERMS' },
  mercadolibreCL: { name: 'MercadoLibre (CL)', searchUrl: 'https://listado.mercadolibre.cl/SEARCH_TERMS' },

  // Middle East
  dubizzle: { name: 'Dubizzle', searchUrl: 'https://www.dubizzle.com/search/?keyword=SEARCH_TERMS' },

  // eBay regional
  ebayUS: { name: 'eBay (US)', searchUrl: 'https://www.ebay.com/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayUK: { name: 'eBay (UK)', searchUrl: 'https://www.ebay.co.uk/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayDE: { name: 'eBay (DE)', searchUrl: 'https://www.ebay.de/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayAU: { name: 'eBay (AU)', searchUrl: 'https://www.ebay.com.au/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayIE: { name: 'eBay (IE)', searchUrl: 'https://www.ebay.ie/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayIT: { name: 'eBay (IT)', searchUrl: 'https://www.ebay.it/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayFR: { name: 'eBay (FR)', searchUrl: 'https://www.ebay.fr/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayES: { name: 'eBay (ES)', searchUrl: 'https://www.ebay.es/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayCA: { name: 'eBay (CA)', searchUrl: 'https://www.ebay.ca/sch/i.html?_nkw=SEARCH_TERMS' },
};

const S = SUPPLIER_TEMPLATES;

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  // ─── North America ────────────────────────────────────────
  'United States':  { currency: 'USD', currencySymbol: '$', units: 'miles', suppliers: [S.revzilla, S.jpcycles, S.amazonUS, S.ebayUS] },
  'Canada':         { currency: 'CAD', currencySymbol: '$', units: 'km', suppliers: [S.revzilla, S.amazonCA, S.jpcycles, S.ebayCA] },
  'Mexico':         { currency: 'MXN', currencySymbol: '$', units: 'km', suppliers: [S.mercadolibreMX, S.amazonMX, S.revzilla, S.ebayUS] },

  // ─── UK & Ireland ─────────────────────────────────────────
  'United Kingdom': { currency: 'GBP', currencySymbol: '£', units: 'miles', suppliers: [S.sportsbikeshop, S.wemoto, S.amazonUK, S.autodoc, S.ebayUK] },
  'Ireland':        { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.sportsbikeshop, S.wemoto, S.autodoc, S.amazonUK, S.ebayIE, S.louis] },

  // ─── Western Europe ───────────────────────────────────────
  'Germany':        { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.fcMoto, S.amazonDE, S.ebayDE] },
  'France':         { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.fcMoto, S.amazonFR, S.ebayFR, S.autodocDE] },
  'Italy':          { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.fcMoto, S.amazonIT, S.ebayIT, S.autodocDE] },
  'Spain':          { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.fcMoto, S.amazonES, S.ebayES, S.motardinn] },
  'Portugal':       { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.fcMoto, S.amazonES, S.ebayES, S.motardinn] },
  'Netherlands':    { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonNL, S.fcMoto, S.ebayDE] },
  'Belgium':        { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonNL, S.amazonFR, S.fcMoto] },
  'Austria':        { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto, S.ebayDE] },
  'Switzerland':    { currency: 'CHF', currencySymbol: 'CHF', units: 'km', suppliers: [S.louis, S.fcMoto, S.autodocDE, S.amazonDE, S.ebayDE] },
  'Luxembourg':     { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.amazonFR, S.fcMoto] },

  // ─── Northern Europe ──────────────────────────────────────
  'Sweden':         { currency: 'SEK', currencySymbol: 'kr', units: 'km', suppliers: [S.xlmoto, S.louis, S.amazonSE, S.fcMoto, S.autodocDE] },
  'Norway':         { currency: 'NOK', currencySymbol: 'kr', units: 'km', suppliers: [S.xlmoto, S.louis, S.fcMoto, S.amazonDE, S.autodocDE] },
  'Denmark':        { currency: 'DKK', currencySymbol: 'kr', units: 'km', suppliers: [S.xlmoto, S.louis, S.fcMoto, S.amazonDE, S.autodocDE] },
  'Finland':        { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.xlmoto, S.louis, S.fcMoto, S.amazonDE, S.autodocDE] },
  'Iceland':        { currency: 'ISK', currencySymbol: 'kr', units: 'km', suppliers: [S.louis, S.amazonUK, S.fcMoto, S.ebayUK] },

  // ─── Eastern Europe ───────────────────────────────────────
  'Poland':         { currency: 'PLN', currencySymbol: 'zł', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonPL, S.fcMoto, S.ebayDE] },
  'Czech Republic': { currency: 'CZK', currencySymbol: 'Kč', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto, S.ebayDE] },
  'Romania':        { currency: 'RON', currencySymbol: 'lei', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto, S.ebayDE] },
  'Hungary':        { currency: 'HUF', currencySymbol: 'Ft', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto, S.ebayDE] },
  'Croatia':        { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto] },
  'Slovakia':       { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto] },
  'Slovenia':       { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto] },
  'Bulgaria':       { currency: 'BGN', currencySymbol: 'лв', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.ebayDE] },
  'Greece':         { currency: 'EUR', currencySymbol: '€', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto, S.motardinn] },
  'Serbia':         { currency: 'RSD', currencySymbol: 'din', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.ebayDE] },
  'Ukraine':        { currency: 'UAH', currencySymbol: '₴', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.ebayDE] },
  'Russia':         { currency: 'RUB', currencySymbol: '₽', units: 'km', suppliers: [S.autodocDE, S.ebayDE, S.amazonDE] },
  'Turkey':         { currency: 'TRY', currencySymbol: '₺', units: 'km', suppliers: [S.louis, S.autodocDE, S.amazonDE, S.fcMoto, S.ebayDE] },

  // ─── South Asia ───────────────────────────────────────────
  'India':          { currency: 'INR', currencySymbol: '₹', units: 'km', suppliers: [S.amazonIN, S.grandPitStop, S.ebayUS] },
  'Pakistan':       { currency: 'PKR', currencySymbol: '₨', units: 'km', suppliers: [S.amazonAE, S.ebayUS, S.amazonUK] },
  'Bangladesh':     { currency: 'BDT', currencySymbol: '৳', units: 'km', suppliers: [S.amazonIN, S.ebayUS, S.lazada] },
  'Sri Lanka':      { currency: 'LKR', currencySymbol: '₨', units: 'km', suppliers: [S.amazonIN, S.ebayUS, S.lazada] },
  'Nepal':          { currency: 'NPR', currencySymbol: '₨', units: 'km', suppliers: [S.amazonIN, S.ebayUS] },

  // ─── East Asia ────────────────────────────────────────────
  'Japan':          { currency: 'JPY', currencySymbol: '¥', units: 'km', suppliers: [S.webikeJP, S.amazonJP, S.ebayUS] },
  'South Korea':    { currency: 'KRW', currencySymbol: '₩', units: 'km', suppliers: [S.amazonJP, S.ebayUS, S.revzilla] },
  'Taiwan':         { currency: 'TWD', currencySymbol: 'NT$', units: 'km', suppliers: [S.shopee, S.amazonJP, S.ebayUS] },
  'China':          { currency: 'CNY', currencySymbol: '¥', units: 'km', suppliers: [S.amazonJP, S.ebayUS] },

  // ─── Southeast Asia ───────────────────────────────────────
  'Thailand':       { currency: 'THB', currencySymbol: '฿', units: 'km', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Indonesia':      { currency: 'IDR', currencySymbol: 'Rp', units: 'km', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Malaysia':       { currency: 'MYR', currencySymbol: 'RM', units: 'km', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Philippines':    { currency: 'PHP', currencySymbol: '₱', units: 'km', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Vietnam':        { currency: 'VND', currencySymbol: '₫', units: 'km', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Singapore':      { currency: 'SGD', currencySymbol: '$', units: 'km', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Cambodia':       { currency: 'USD', currencySymbol: '$', units: 'km', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },

  // ─── Oceania ──────────────────────────────────────────────
  'Australia':      { currency: 'AUD', currencySymbol: '$', units: 'km', suppliers: [S.bikebiz, S.motoNational, S.amazonAU, S.ebayAU] },
  'New Zealand':    { currency: 'NZD', currencySymbol: '$', units: 'km', suppliers: [S.bikebiz, S.motoNational, S.amazonAU, S.ebayAU] },

  // ─── Middle East ──────────────────────────────────────────
  'United Arab Emirates': { currency: 'AED', currencySymbol: 'د.إ', units: 'km', suppliers: [S.amazonAE, S.dubizzle, S.ebayUS] },
  'Saudi Arabia':   { currency: 'SAR', currencySymbol: '﷼', units: 'km', suppliers: [S.amazonSA, S.amazonAE, S.ebayUS] },
  'Israel':         { currency: 'ILS', currencySymbol: '₪', units: 'km', suppliers: [S.amazonDE, S.ebayUS, S.autodocDE] },
  'Qatar':          { currency: 'QAR', currencySymbol: 'ر.ق', units: 'km', suppliers: [S.amazonAE, S.ebayUS, S.dubizzle] },
  'Kuwait':         { currency: 'KWD', currencySymbol: 'د.ك', units: 'km', suppliers: [S.amazonAE, S.ebayUS] },
  'Oman':           { currency: 'OMR', currencySymbol: 'ر.ع', units: 'km', suppliers: [S.amazonAE, S.ebayUS] },
  'Bahrain':        { currency: 'BHD', currencySymbol: 'BD', units: 'km', suppliers: [S.amazonAE, S.ebayUS] },
  'Jordan':         { currency: 'JOD', currencySymbol: 'JD', units: 'km', suppliers: [S.amazonAE, S.ebayUS] },
  'Lebanon':        { currency: 'USD', currencySymbol: '$', units: 'km', suppliers: [S.amazonAE, S.ebayUS] },

  // ─── Africa ───────────────────────────────────────────────
  'South Africa':   { currency: 'ZAR', currencySymbol: 'R', units: 'km', suppliers: [S.amazonUK, S.ebayUK, S.autodoc] },
  'Nigeria':        { currency: 'NGN', currencySymbol: '₦', units: 'km', suppliers: [S.amazonUK, S.ebayUK, S.ebayUS] },
  'Kenya':          { currency: 'KES', currencySymbol: 'KSh', units: 'km', suppliers: [S.amazonUK, S.ebayUK, S.ebayUS] },
  'Egypt':          { currency: 'EGP', currencySymbol: 'E£', units: 'km', suppliers: [S.amazonAE, S.ebayUS, S.amazonUK] },
  'Morocco':        { currency: 'MAD', currencySymbol: 'د.م', units: 'km', suppliers: [S.amazonFR, S.autodocDE, S.louis, S.ebayFR] },
  'Tunisia':        { currency: 'TND', currencySymbol: 'د.ت', units: 'km', suppliers: [S.amazonFR, S.autodocDE, S.ebayFR] },
  'Tanzania':       { currency: 'TZS', currencySymbol: 'TSh', units: 'km', suppliers: [S.amazonUK, S.ebayUK] },
  'Ghana':          { currency: 'GHS', currencySymbol: 'GH₵', units: 'km', suppliers: [S.amazonUK, S.ebayUK] },
  'Ethiopia':       { currency: 'ETB', currencySymbol: 'Br', units: 'km', suppliers: [S.amazonUK, S.ebayUK] },

  // ─── South America ────────────────────────────────────────
  'Brazil':         { currency: 'BRL', currencySymbol: 'R$', units: 'km', suppliers: [S.mercadolibreBR, S.amazonBR, S.ebayUS] },
  'Argentina':      { currency: 'ARS', currencySymbol: '$', units: 'km', suppliers: [S.mercadolibreAR, S.ebayUS, S.amazonUS] },
  'Colombia':       { currency: 'COP', currencySymbol: '$', units: 'km', suppliers: [S.mercadolibreCO, S.amazonUS, S.ebayUS] },
  'Chile':          { currency: 'CLP', currencySymbol: '$', units: 'km', suppliers: [S.mercadolibreCL, S.amazonUS, S.ebayUS] },
  'Peru':           { currency: 'PEN', currencySymbol: 'S/', units: 'km', suppliers: [S.mercadolibreMX, S.amazonUS, S.ebayUS] },
  'Ecuador':        { currency: 'USD', currencySymbol: '$', units: 'km', suppliers: [S.mercadolibreMX, S.amazonUS, S.ebayUS] },
  'Uruguay':        { currency: 'UYU', currencySymbol: '$', units: 'km', suppliers: [S.mercadolibreAR, S.amazonUS, S.ebayUS] },
  'Venezuela':      { currency: 'USD', currencySymbol: '$', units: 'km', suppliers: [S.mercadolibreMX, S.amazonUS, S.ebayUS] },
  'Costa Rica':     { currency: 'CRC', currencySymbol: '₡', units: 'km', suppliers: [S.amazonUS, S.mercadolibreMX, S.ebayUS] },
  'Panama':         { currency: 'USD', currencySymbol: '$', units: 'km', suppliers: [S.amazonUS, S.mercadolibreMX, S.ebayUS] },
  'Dominican Republic': { currency: 'DOP', currencySymbol: '$', units: 'km', suppliers: [S.amazonUS, S.mercadolibreMX, S.ebayUS] },
};

// Default config for unknown countries
const DEFAULT_CONFIG: CountryConfig = {
  currency: 'USD',
  currencySymbol: '$',
  units: 'km',
  suppliers: [S.amazonUS, S.revzilla, S.ebayUS],
};

export function getCountryConfig(country: string | undefined): CountryConfig {
  if (!country) return DEFAULT_CONFIG;
  return COUNTRY_CONFIGS[country] || DEFAULT_CONFIG;
}

// Map device region code to country name
export const REGION_TO_COUNTRY: Record<string, string> = {
  // North America
  US: 'United States', CA: 'Canada', MX: 'Mexico',
  // UK & Ireland
  GB: 'United Kingdom', IE: 'Ireland',
  // Western Europe
  DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', PT: 'Portugal',
  NL: 'Netherlands', BE: 'Belgium', AT: 'Austria', CH: 'Switzerland', LU: 'Luxembourg',
  // Northern Europe
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', IS: 'Iceland',
  // Eastern Europe
  PL: 'Poland', CZ: 'Czech Republic', RO: 'Romania', HU: 'Hungary',
  HR: 'Croatia', SK: 'Slovakia', SI: 'Slovenia', BG: 'Bulgaria',
  GR: 'Greece', RS: 'Serbia', UA: 'Ukraine', RU: 'Russia', TR: 'Turkey',
  // South Asia
  IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal',
  // East Asia
  JP: 'Japan', KR: 'South Korea', TW: 'Taiwan', CN: 'China',
  // Southeast Asia
  TH: 'Thailand', ID: 'Indonesia', MY: 'Malaysia', PH: 'Philippines',
  VN: 'Vietnam', SG: 'Singapore', KH: 'Cambodia',
  // Oceania
  AU: 'Australia', NZ: 'New Zealand',
  // Middle East
  AE: 'United Arab Emirates', SA: 'Saudi Arabia', IL: 'Israel',
  QA: 'Qatar', KW: 'Kuwait', OM: 'Oman', BH: 'Bahrain', JO: 'Jordan', LB: 'Lebanon',
  // Africa
  ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', EG: 'Egypt',
  MA: 'Morocco', TN: 'Tunisia', TZ: 'Tanzania', GH: 'Ghana', ET: 'Ethiopia',
  // South America
  BR: 'Brazil', AR: 'Argentina', CO: 'Colombia', CL: 'Chile',
  PE: 'Peru', EC: 'Ecuador', UY: 'Uruguay', VE: 'Venezuela',
  CR: 'Costa Rica', PA: 'Panama', DO: 'Dominican Republic',
};

// Format suppliers into a prompt-friendly string for AI
export function formatSuppliersForPrompt(country: string | undefined): string {
  const config = getCountryConfig(country);
  const lines = config.suppliers.map((s, i) => {
    const priority = i === 0 ? ' (PREFERRED — use this first)' : '';
    return `   - ${s.name}${priority}: ${s.searchUrl}`;
  });
  return `APPROVED SUPPLIERS for ${country || 'this user'} (in order of preference — prioritize local/regional stores):
${lines.join('\n')}
   - Only use these suppliers. No other stores. No direct product URLs.
   - First supplier in the list ships fastest/cheapest to the user — prefer it when possible.
   - Prices should be in ${config.currency} (${config.currencySymbol}).`;
}
