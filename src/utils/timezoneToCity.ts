// ─── IANA timezone + device locale → representative city ──────────
// Ported from MOBILE_APP_REACT_NATIVE/src/utils/timezoneToCity.ts
// Resolves the user's real city dynamically from device timezone/locale
// without hardcoding any fixed city name.

const ZONE_TO_CITY: Record<string, string> = {
  // Africa
  'Africa/Abidjan': 'Abidjan',
  'Africa/Accra': 'Accra',
  'Africa/Addis_Ababa': 'Addis Ababa',
  'Africa/Algiers': 'Algiers',
  'Africa/Cairo': 'Cairo',
  'Africa/Casablanca': 'Casablanca',
  'Africa/Dar_es_Salaam': 'Dar es Salaam',
  'Africa/Johannesburg': 'Johannesburg',
  'Africa/Khartoum': 'Khartoum',
  'Africa/Lagos': 'Lagos',
  'Africa/Nairobi': 'Nairobi',
  'Africa/Tunis': 'Tunis',

  // Americas (North)
  'America/Anchorage': 'Anchorage',
  'America/Chicago': 'Chicago',
  'America/Denver': 'Denver',
  'America/Detroit': 'Detroit',
  'America/Halifax': 'Halifax',
  'America/Los_Angeles': 'Los Angeles',
  'America/Mexico_City': 'Mexico City',
  'America/New_York': 'New York',
  'America/Phoenix': 'Phoenix',
  'America/Toronto': 'Toronto',
  'America/Vancouver': 'Vancouver',
  'America/Whitehorse': 'Whitehorse',
  'America/Winnipeg': 'Winnipeg',

  // Americas (Central / South)
  'America/Bogota': 'Bogotá',
  'America/Buenos_Aires': 'Buenos Aires',
  'America/Caracas': 'Caracas',
  'America/Guatemala': 'Guatemala City',
  'America/Havana': 'Havana',
  'America/Lima': 'Lima',
  'America/Montevideo': 'Montevideo',
  'America/Panama': 'Panama City',
  'America/Santiago': 'Santiago',
  'America/Sao_Paulo': 'São Paulo',
  'America/Tegucigalpa': 'Tegucigalpa',

  // Asia
  'Asia/Baghdad': 'Baghdad',
  'Asia/Bangkok': 'Bangkok',
  'Asia/Calcutta': 'Kolkata',
  'Asia/Colombo': 'Colombo',
  'Asia/Dhaka': 'Dhaka',
  'Asia/Dubai': 'Dubai',
  'Asia/Hong_Kong': 'Hong Kong',
  'Asia/Jakarta': 'Jakarta',
  'Asia/Jerusalem': 'Jerusalem',
  'Asia/Karachi': 'Karachi',
  'Asia/Kathmandu': 'Kathmandu',
  'Asia/Kolkata': 'Mumbai',
  'Asia/Kuala_Lumpur': 'Kuala Lumpur',
  'Asia/Manila': 'Manila',
  'Asia/Riyadh': 'Riyadh',
  'Asia/Seoul': 'Seoul',
  'Asia/Shanghai': 'Shanghai',
  'Asia/Singapore': 'Singapore',
  'Asia/Taipei': 'Taipei',
  'Asia/Tehran': 'Tehran',
  'Asia/Tokyo': 'Tokyo',
  'Asia/Vientiane': 'Vientiane',
  'Asia/Yangon': 'Yangon',
  'Asia/Yerevan': 'Yerevan',

  // Europe
  'Europe/Amsterdam': 'Amsterdam',
  'Europe/Athens': 'Athens',
  'Europe/Belgrade': 'Belgrade',
  'Europe/Berlin': 'Berlin',
  'Europe/Brussels': 'Brussels',
  'Europe/Bucharest': 'Bucharest',
  'Europe/Budapest': 'Budapest',
  'Europe/Copenhagen': 'Copenhagen',
  'Europe/Dublin': 'Dublin',
  'Europe/Helsinki': 'Helsinki',
  'Europe/Istanbul': 'Istanbul',
  'Europe/Kiev': 'Kyiv',
  'Europe/Lisbon': 'Lisbon',
  'Europe/London': 'London',
  'Europe/Madrid': 'Madrid',
  'Europe/Moscow': 'Moscow',
  'Europe/Oslo': 'Oslo',
  'Europe/Paris': 'Paris',
  'Europe/Prague': 'Prague',
  'Europe/Rome': 'Rome',
  'Europe/Stockholm': 'Stockholm',
  'Europe/Vienna': 'Vienna',
  'Europe/Warsaw': 'Warsaw',
  'Europe/Zurich': 'Zurich',

  // Oceania
  'Australia/Adelaide': 'Adelaide',
  'Australia/Brisbane': 'Brisbane',
  'Australia/Melbourne': 'Melbourne',
  'Australia/Perth': 'Perth',
  'Australia/Sydney': 'Sydney',
  'Pacific/Auckland': 'Auckland',
  'Pacific/Fiji': 'Suva',
  'Pacific/Honolulu': 'Honolulu',
  'Pacific/Tahiti': 'Papeete',
};

const COUNTRY_TO_CITY: Record<string, string> = {
  AE: 'Dubai',
  AR: 'Buenos Aires',
  AT: 'Vienna',
  AU: 'Sydney',
  BD: 'Dhaka',
  BE: 'Brussels',
  BG: 'Sofia',
  BR: 'São Paulo',
  CA: 'Toronto',
  CH: 'Zurich',
  CL: 'Santiago',
  CN: 'Shanghai',
  CO: 'Bogotá',
  CZ: 'Prague',
  DE: 'Berlin',
  DK: 'Copenhagen',
  EG: 'Cairo',
  ES: 'Madrid',
  FI: 'Helsinki',
  FR: 'Paris',
  GB: 'London',
  GR: 'Athens',
  HK: 'Hong Kong',
  HU: 'Budapest',
  ID: 'Jakarta',
  IE: 'Dublin',
  IL: 'Jerusalem',
  IN: 'Mumbai',
  IR: 'Tehran',
  IS: 'Reykjavik',
  IT: 'Rome',
  JP: 'Tokyo',
  KE: 'Nairobi',
  KR: 'Seoul',
  LK: 'Colombo',
  MX: 'Mexico City',
  MY: 'Kuala Lumpur',
  NG: 'Lagos',
  NL: 'Amsterdam',
  NO: 'Oslo',
  NP: 'Kathmandu',
  NZ: 'Auckland',
  PE: 'Lima',
  PH: 'Manila',
  PK: 'Karachi',
  PL: 'Warsaw',
  PT: 'Lisbon',
  RO: 'Bucharest',
  RU: 'Moscow',
  SA: 'Riyadh',
  SE: 'Stockholm',
  SG: 'Singapore',
  TH: 'Bangkok',
  TR: 'Istanbul',
  TW: 'Taipei',
  UA: 'Kyiv',
  US: 'New York',
  VE: 'Caracas',
  VN: 'Hanoi',
  ZA: 'Johannesburg',
};

export function cityFromTimezone(timezone: string | null | undefined): string | null {
  if (!timezone) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(ZONE_TO_CITY, timezone)) {
    return ZONE_TO_CITY[timezone] || null;
  }
  const parts = timezone.split('/');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].replace(/_/g, ' ').trim();
    if (last.length > 0 && last.toLowerCase() !== 'utc') {
      return last;
    }
  }
  return null;
}

export function cityFromLocale(locale: string | null | undefined): string | null {
  if (!locale) {
    return null;
  }
  const parts = locale.replace(/_/g, '-').split('-');
  for (let i = parts.length - 1; i >= 1; i--) {
    const seg = parts[i].toUpperCase();
    if (seg.length === 2 && COUNTRY_TO_CITY[seg]) {
      return COUNTRY_TO_CITY[seg];
    }
  }
  return null;
}

/**
 * Resolves the user's real city dynamically from the device's IANA timezone
 * first, falling back to the device's BCP-47 locale country.
 * Returns `null` if neither can be determined (so UI hides weather gracefully
 * rather than showing a hardcoded city).
 */
export function resolveDeviceWeatherCity(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromTz = cityFromTimezone(tz);
    if (fromTz) {
      return fromTz;
    }
  } catch {
    // ignore Intl timezone errors
  }
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const fromLocale = cityFromLocale(locale);
    if (fromLocale) {
      return fromLocale;
    }
  } catch {
    // ignore Intl locale errors
  }
  return null;
}
