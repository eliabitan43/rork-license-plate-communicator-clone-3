export interface Region {
  code: string;
  name: string;
  country: string;
  plateFormat?: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: 'US' },
  { code: 'CA', name: 'Canada', flag: 'CA' },
  { code: 'MX', name: 'Mexico', flag: 'MX' },
  { code: 'GB', name: 'United Kingdom', flag: 'GB' },
  { code: 'AU', name: 'Australia', flag: 'AU' },
  { code: 'DE', name: 'Germany', flag: 'DE' },
  { code: 'FR', name: 'France', flag: 'FR' },
  { code: 'IT', name: 'Italy', flag: 'IT' },
  { code: 'ES', name: 'Spain', flag: 'ES' },
  { code: 'JP', name: 'Japan', flag: 'JP' },
  { code: 'BR', name: 'Brazil', flag: 'BR' },
  { code: 'IN', name: 'India', flag: 'IN' },
  { code: 'CN', name: 'China', flag: 'CN' },
  { code: 'KR', name: 'South Korea', flag: 'KR' },
  { code: 'NL', name: 'Netherlands', flag: 'NL' },
  { code: 'SE', name: 'Sweden', flag: 'SE' },
  { code: 'NO', name: 'Norway', flag: 'NO' },
  { code: 'DK', name: 'Denmark', flag: 'DK' },
  { code: 'FI', name: 'Finland', flag: 'FI' },
  { code: 'PL', name: 'Poland', flag: 'PL' },
  { code: 'RU', name: 'Russia', flag: 'RU' },
  { code: 'ZA', name: 'South Africa', flag: 'ZA' },
  { code: 'AE', name: 'United Arab Emirates', flag: 'AE' },
  { code: 'SA', name: 'Saudi Arabia', flag: 'SA' },
  { code: 'IL', name: 'Israel', flag: 'IL' },
  { code: 'SG', name: 'Singapore', flag: 'SG' },
  { code: 'NZ', name: 'New Zealand', flag: 'NZ' },
  { code: 'AR', name: 'Argentina', flag: 'AR' },
  { code: 'CL', name: 'Chile', flag: 'CL' },
  { code: 'CO', name: 'Colombia', flag: 'CO' },
];

export const US_STATES: Region[] = [
  { code: 'AL', name: 'Alabama', country: 'US' },
  { code: 'AK', name: 'Alaska', country: 'US' },
  { code: 'AZ', name: 'Arizona', country: 'US' },
  { code: 'AR', name: 'Arkansas', country: 'US' },
  { code: 'CA', name: 'California', country: 'US' },
  { code: 'CO', name: 'Colorado', country: 'US' },
  { code: 'CT', name: 'Connecticut', country: 'US' },
  { code: 'DE', name: 'Delaware', country: 'US' },
  { code: 'DC', name: 'District of Columbia', country: 'US' },
  { code: 'FL', name: 'Florida', country: 'US' },
  { code: 'GA', name: 'Georgia', country: 'US' },
  { code: 'HI', name: 'Hawaii', country: 'US' },
  { code: 'ID', name: 'Idaho', country: 'US' },
  { code: 'IL', name: 'Illinois', country: 'US' },
  { code: 'IN', name: 'Indiana', country: 'US' },
  { code: 'IA', name: 'Iowa', country: 'US' },
  { code: 'KS', name: 'Kansas', country: 'US' },
  { code: 'KY', name: 'Kentucky', country: 'US' },
  { code: 'LA', name: 'Louisiana', country: 'US' },
  { code: 'ME', name: 'Maine', country: 'US' },
  { code: 'MD', name: 'Maryland', country: 'US' },
  { code: 'MA', name: 'Massachusetts', country: 'US' },
  { code: 'MI', name: 'Michigan', country: 'US' },
  { code: 'MN', name: 'Minnesota', country: 'US' },
  { code: 'MS', name: 'Mississippi', country: 'US' },
  { code: 'MO', name: 'Missouri', country: 'US' },
  { code: 'MT', name: 'Montana', country: 'US' },
  { code: 'NE', name: 'Nebraska', country: 'US' },
  { code: 'NV', name: 'Nevada', country: 'US' },
  { code: 'NH', name: 'New Hampshire', country: 'US' },
  { code: 'NJ', name: 'New Jersey', country: 'US' },
  { code: 'NM', name: 'New Mexico', country: 'US' },
  { code: 'NY', name: 'New York', country: 'US' },
  { code: 'NC', name: 'North Carolina', country: 'US' },
  { code: 'ND', name: 'North Dakota', country: 'US' },
  { code: 'OH', name: 'Ohio', country: 'US' },
  { code: 'OK', name: 'Oklahoma', country: 'US' },
  { code: 'OR', name: 'Oregon', country: 'US' },
  { code: 'PA', name: 'Pennsylvania', country: 'US' },
  { code: 'RI', name: 'Rhode Island', country: 'US' },
  { code: 'SC', name: 'South Carolina', country: 'US' },
  { code: 'SD', name: 'South Dakota', country: 'US' },
  { code: 'TN', name: 'Tennessee', country: 'US' },
  { code: 'TX', name: 'Texas', country: 'US' },
  { code: 'UT', name: 'Utah', country: 'US' },
  { code: 'VT', name: 'Vermont', country: 'US' },
  { code: 'VA', name: 'Virginia', country: 'US' },
  { code: 'WA', name: 'Washington', country: 'US' },
  { code: 'WV', name: 'West Virginia', country: 'US' },
  { code: 'WI', name: 'Wisconsin', country: 'US' },
  { code: 'WY', name: 'Wyoming', country: 'US' },
];

export const CANADIAN_PROVINCES: Region[] = [
  { code: 'AB', name: 'Alberta', country: 'CA' },
  { code: 'BC', name: 'British Columbia', country: 'CA' },
  { code: 'MB', name: 'Manitoba', country: 'CA' },
  { code: 'NB', name: 'New Brunswick', country: 'CA' },
  { code: 'NL', name: 'Newfoundland and Labrador', country: 'CA' },
  { code: 'NT', name: 'Northwest Territories', country: 'CA' },
  { code: 'NS', name: 'Nova Scotia', country: 'CA' },
  { code: 'NU', name: 'Nunavut', country: 'CA' },
  { code: 'ON', name: 'Ontario', country: 'CA' },
  { code: 'PE', name: 'Prince Edward Island', country: 'CA' },
  { code: 'QC', name: 'Quebec', country: 'CA' },
  { code: 'SK', name: 'Saskatchewan', country: 'CA' },
  { code: 'YT', name: 'Yukon', country: 'CA' },
];

export const MEXICAN_STATES: Region[] = [
  { code: 'AGS', name: 'Aguascalientes', country: 'MX' },
  { code: 'BC', name: 'Baja California', country: 'MX' },
  { code: 'BCS', name: 'Baja California Sur', country: 'MX' },
  { code: 'CAM', name: 'Campeche', country: 'MX' },
  { code: 'CHIS', name: 'Chiapas', country: 'MX' },
  { code: 'CHIH', name: 'Chihuahua', country: 'MX' },
  { code: 'COAH', name: 'Coahuila', country: 'MX' },
  { code: 'COL', name: 'Colima', country: 'MX' },
  { code: 'CDMX', name: 'Ciudad de México', country: 'MX' },
  { code: 'DGO', name: 'Durango', country: 'MX' },
  { code: 'GTO', name: 'Guanajuato', country: 'MX' },
  { code: 'GRO', name: 'Guerrero', country: 'MX' },
  { code: 'HGO', name: 'Hidalgo', country: 'MX' },
  { code: 'JAL', name: 'Jalisco', country: 'MX' },
  { code: 'MEX', name: 'México', country: 'MX' },
  { code: 'MICH', name: 'Michoacán', country: 'MX' },
  { code: 'MOR', name: 'Morelos', country: 'MX' },
  { code: 'NAY', name: 'Nayarit', country: 'MX' },
  { code: 'NL', name: 'Nuevo León', country: 'MX' },
  { code: 'OAX', name: 'Oaxaca', country: 'MX' },
  { code: 'PUE', name: 'Puebla', country: 'MX' },
  { code: 'QRO', name: 'Querétaro', country: 'MX' },
  { code: 'QROO', name: 'Quintana Roo', country: 'MX' },
  { code: 'SLP', name: 'San Luis Potosí', country: 'MX' },
  { code: 'SIN', name: 'Sinaloa', country: 'MX' },
  { code: 'SON', name: 'Sonora', country: 'MX' },
  { code: 'TAB', name: 'Tabasco', country: 'MX' },
  { code: 'TAMPS', name: 'Tamaulipas', country: 'MX' },
  { code: 'TLAX', name: 'Tlaxcala', country: 'MX' },
  { code: 'VER', name: 'Veracruz', country: 'MX' },
  { code: 'YUC', name: 'Yucatán', country: 'MX' },
  { code: 'ZAC', name: 'Zacatecas', country: 'MX' },
];

export function getRegionsByCountry(countryCode: string): Region[] {
  switch (countryCode) {
    case 'US':
      return US_STATES;
    case 'CA':
      return CANADIAN_PROVINCES;
    case 'MX':
      return MEXICAN_STATES;
    default:
      return [];
  }
}

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function getRegionByCode(regionCode: string, countryCode: string): Region | undefined {
  const regions = getRegionsByCountry(countryCode);
  return regions.find(r => r.code === regionCode);
}