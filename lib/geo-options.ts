/** ISO-3166 Länder und gängige ISO-4217-Währungen für Formulare */

export type CountryOption = {
  code: string;
  name: string;
  flag: string;
};

export type CurrencyOption = {
  code: string;
  name: string;
  /** Länder-/Währungsregion für Flaggen-Hinweis (ISO-2 oder leer) */
  flagRegion: string;
};

function flagFromCountryCode(code: string): string {
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
  return String.fromCodePoint(...[...cc].map((char) => 127397 + char.charCodeAt(0)));
}

/** Häufig genutzte Länder zuerst, danach alphabetisch (deutscher Name). */
const PRIORITY_COUNTRY_CODES = [
  "DE",
  "AT",
  "CH",
  "LI",
  "LU",
  "NL",
  "BE",
  "FR",
  "IT",
  "ES",
  "PT",
  "IE",
  "GB",
  "US",
  "CA",
  "AU",
  "JP",
  "SG",
  "HK",
  "AE",
] as const;

const COUNTRY_NAME_BY_CODE: Record<string, string> = {
  AD: "Andorra",
  AE: "Vereinigte Arabische Emirate",
  AF: "Afghanistan",
  AG: "Antigua und Barbuda",
  AI: "Anguilla",
  AL: "Albanien",
  AM: "Armenien",
  AO: "Angola",
  AQ: "Antarktis",
  AR: "Argentinien",
  AS: "Amerikanisch-Samoa",
  AT: "Österreich",
  AU: "Australien",
  AW: "Aruba",
  AX: "Åland",
  AZ: "Aserbaidschan",
  BA: "Bosnien und Herzegowina",
  BB: "Barbados",
  BD: "Bangladesch",
  BE: "Belgien",
  BF: "Burkina Faso",
  BG: "Bulgarien",
  BH: "Bahrain",
  BI: "Burundi",
  BJ: "Benin",
  BL: "Saint-Barthélemy",
  BM: "Bermuda",
  BN: "Brunei",
  BO: "Bolivien",
  BQ: "Bonaire, Sint Eustatius und Saba",
  BR: "Brasilien",
  BS: "Bahamas",
  BT: "Bhutan",
  BV: "Bouvetinsel",
  BW: "Botswana",
  BY: "Belarus",
  BZ: "Belize",
  CA: "Kanada",
  CC: "Kokosinseln",
  CD: "Kongo (Dem. Rep.)",
  CF: "Zentralafrikanische Republik",
  CG: "Kongo",
  CH: "Schweiz",
  CI: "Côte d’Ivoire",
  CK: "Cookinseln",
  CL: "Chile",
  CM: "Kamerun",
  CN: "China",
  CO: "Kolumbien",
  CR: "Costa Rica",
  CU: "Kuba",
  CV: "Cabo Verde",
  CW: "Curaçao",
  CX: "Weihnachtsinsel",
  CY: "Zypern",
  CZ: "Tschechien",
  DE: "Deutschland",
  DJ: "Dschibuti",
  DK: "Dänemark",
  DM: "Dominica",
  DO: "Dominikanische Republik",
  DZ: "Algerien",
  EC: "Ecuador",
  EE: "Estland",
  EG: "Ägypten",
  EH: "Westsahara",
  ER: "Eritrea",
  ES: "Spanien",
  ET: "Äthiopien",
  FI: "Finnland",
  FJ: "Fidschi",
  FK: "Falklandinseln",
  FM: "Mikronesien",
  FO: "Färöer",
  FR: "Frankreich",
  GA: "Gabun",
  GB: "Vereinigtes Königreich",
  GD: "Grenada",
  GE: "Georgien",
  GF: "Französisch-Guayana",
  GG: "Guernsey",
  GH: "Ghana",
  GI: "Gibraltar",
  GL: "Grönland",
  GM: "Gambia",
  GN: "Guinea",
  GP: "Guadeloupe",
  GQ: "Äquatorialguinea",
  GR: "Griechenland",
  GS: "Südgeorgien und die Südlichen Sandwichinseln",
  GT: "Guatemala",
  GU: "Guam",
  GW: "Guinea-Bissau",
  GY: "Guyana",
  HK: "Hongkong",
  HM: "Heard und McDonaldinseln",
  HN: "Honduras",
  HR: "Kroatien",
  HT: "Haiti",
  HU: "Ungarn",
  ID: "Indonesien",
  IE: "Irland",
  IL: "Israel",
  IM: "Isle of Man",
  IN: "Indien",
  IO: "Britisches Territorium im Indischen Ozean",
  IQ: "Irak",
  IR: "Iran",
  IS: "Island",
  IT: "Italien",
  JE: "Jersey",
  JM: "Jamaika",
  JO: "Jordanien",
  JP: "Japan",
  KE: "Kenia",
  KG: "Kirgisistan",
  KH: "Kambodscha",
  KI: "Kiribati",
  KM: "Komoren",
  KN: "St. Kitts und Nevis",
  KP: "Nordkorea",
  KR: "Südkorea",
  KW: "Kuwait",
  KY: "Kaimaninseln",
  KZ: "Kasachstan",
  LA: "Laos",
  LB: "Libanon",
  LC: "St. Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Litauen",
  LU: "Luxemburg",
  LV: "Lettland",
  LY: "Libyen",
  MA: "Marokko",
  MC: "Monaco",
  MD: "Moldau",
  ME: "Montenegro",
  MF: "Saint-Martin",
  MG: "Madagaskar",
  MH: "Marshallinseln",
  MK: "Nordmazedonien",
  ML: "Mali",
  MM: "Myanmar",
  MN: "Mongolei",
  MO: "Macau",
  MP: "Nördliche Marianen",
  MQ: "Martinique",
  MR: "Mauretanien",
  MS: "Montserrat",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Malediven",
  MW: "Malawi",
  MX: "Mexiko",
  MY: "Malaysia",
  MZ: "Mosambik",
  NA: "Namibia",
  NC: "Neukaledonien",
  NE: "Niger",
  NF: "Norfolkinsel",
  NG: "Nigeria",
  NI: "Nicaragua",
  NL: "Niederlande",
  NO: "Norwegen",
  NP: "Nepal",
  NR: "Nauru",
  NU: "Niue",
  NZ: "Neuseeland",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PF: "Französisch-Polynesien",
  PG: "Papua-Neuguinea",
  PH: "Philippinen",
  PK: "Pakistan",
  PL: "Polen",
  PM: "Saint-Pierre und Miquelon",
  PN: "Pitcairninseln",
  PR: "Puerto Rico",
  PS: "Palästina",
  PT: "Portugal",
  PW: "Palau",
  PY: "Paraguay",
  QA: "Katar",
  RE: "Réunion",
  RO: "Rumänien",
  RS: "Serbien",
  RU: "Russland",
  RW: "Ruanda",
  SA: "Saudi-Arabien",
  SB: "Salomonen",
  SC: "Seychellen",
  SD: "Sudan",
  SE: "Schweden",
  SG: "Singapur",
  SH: "St. Helena",
  SI: "Slowenien",
  SJ: "Spitzbergen und Jan Mayen",
  SK: "Slowakei",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Suriname",
  SS: "Südsudan",
  ST: "São Tomé und Príncipe",
  SV: "El Salvador",
  SX: "Sint Maarten",
  SY: "Syrien",
  SZ: "Eswatini",
  TC: "Turks- und Caicosinseln",
  TD: "Tschad",
  TF: "Französische Süd- und Antarktisgebiete",
  TG: "Togo",
  TH: "Thailand",
  TJ: "Tadschikistan",
  TK: "Tokelau",
  TL: "Timor-Leste",
  TM: "Turkmenistan",
  TN: "Tunesien",
  TO: "Tonga",
  TR: "Türkei",
  TT: "Trinidad und Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "Tansania",
  UA: "Ukraine",
  UG: "Uganda",
  UM: "United States Minor Outlying Islands",
  US: "Vereinigte Staaten",
  UY: "Uruguay",
  UZ: "Usbekistan",
  VA: "Vatikanstadt",
  VC: "St. Vincent und die Grenadinen",
  VE: "Venezuela",
  VG: "Britische Jungferninseln",
  VI: "Amerikanische Jungferninseln",
  VN: "Vietnam",
  VU: "Vanuatu",
  WF: "Wallis und Futuna",
  WS: "Samoa",
  XK: "Kosovo",
  YE: "Jemen",
  YT: "Mayotte",
  ZA: "Südafrika",
  ZM: "Sambia",
  ZW: "Simbabwe",
};

function buildCountryOptions(): CountryOption[] {
  const priority = new Set<string>(PRIORITY_COUNTRY_CODES);
  const all = Object.entries(COUNTRY_NAME_BY_CODE).map(([code, name]) => ({
    code,
    name,
    flag: flagFromCountryCode(code),
  }));

  const preferred = PRIORITY_COUNTRY_CODES.map((code) => ({
    code,
    name: COUNTRY_NAME_BY_CODE[code],
    flag: flagFromCountryCode(code),
  })).filter((entry) => Boolean(entry.name));

  const rest = all
    .filter((entry) => !priority.has(entry.code))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return [...preferred, ...rest];
}

export const COUNTRY_OPTIONS: CountryOption[] = buildCountryOptions();

/** Geläufige Währungen für Depot-/Fondsformulare */
export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "EUR", name: "Euro", flagRegion: "EU" },
  { code: "USD", name: "US-Dollar", flagRegion: "US" },
  { code: "CHF", name: "Schweizer Franken", flagRegion: "CH" },
  { code: "GBP", name: "Britisches Pfund", flagRegion: "GB" },
  { code: "JPY", name: "Japanischer Yen", flagRegion: "JP" },
  { code: "CAD", name: "Kanadischer Dollar", flagRegion: "CA" },
  { code: "AUD", name: "Australischer Dollar", flagRegion: "AU" },
  { code: "NZD", name: "Neuseeland-Dollar", flagRegion: "NZ" },
  { code: "CNY", name: "Chinesischer Yuan", flagRegion: "CN" },
  { code: "HKD", name: "Hongkong-Dollar", flagRegion: "HK" },
  { code: "SGD", name: "Singapur-Dollar", flagRegion: "SG" },
  { code: "SEK", name: "Schwedische Krone", flagRegion: "SE" },
  { code: "NOK", name: "Norwegische Krone", flagRegion: "NO" },
  { code: "DKK", name: "Dänische Krone", flagRegion: "DK" },
  { code: "PLN", name: "Polnischer Złoty", flagRegion: "PL" },
  { code: "CZK", name: "Tschechische Krone", flagRegion: "CZ" },
  { code: "HUF", name: "Ungarischer Forint", flagRegion: "HU" },
  { code: "RON", name: "Rumänischer Leu", flagRegion: "RO" },
  { code: "TRY", name: "Türkische Lira", flagRegion: "TR" },
  { code: "INR", name: "Indische Rupie", flagRegion: "IN" },
  { code: "KRW", name: "Südkoreanischer Won", flagRegion: "KR" },
  { code: "BRL", name: "Brasilianischer Real", flagRegion: "BR" },
  { code: "MXN", name: "Mexikanischer Peso", flagRegion: "MX" },
  { code: "ZAR", name: "Südafrikanischer Rand", flagRegion: "ZA" },
  { code: "AED", name: "VAE-Dirham", flagRegion: "AE" },
  { code: "SAR", name: "Saudi-Riyal", flagRegion: "SA" },
  { code: "ILS", name: "Israelischer Schekel", flagRegion: "IL" },
  { code: "THB", name: "Thailändischer Baht", flagRegion: "TH" },
  { code: "IDR", name: "Indonesische Rupiah", flagRegion: "ID" },
  { code: "MYR", name: "Malaysischer Ringgit", flagRegion: "MY" },
  { code: "PHP", name: "Philippinischer Peso", flagRegion: "PH" },
  { code: "TWD", name: "Neuer Taiwan-Dollar", flagRegion: "TW" },
  { code: "RUB", name: "Russischer Rubel", flagRegion: "RU" },
];

/** EU-Flagge als Fallback für EUR */
export function flagEmojiForRegion(region: string): string {
  if (region === "EU") {
    // Europäische Flagge ist kein ISO-2-Regionalindikator; Sternchen-Ersatz
    return "🇪🇺";
  }
  return flagFromCountryCode(region);
}

export function findCountryOption(code: string): CountryOption | undefined {
  return COUNTRY_OPTIONS.find((entry) => entry.code === code.toUpperCase());
}

export function findCurrencyOption(code: string): CurrencyOption | undefined {
  return CURRENCY_OPTIONS.find((entry) => entry.code === code.toUpperCase());
}

export type FederalStateOption = {
  code: string;
  name: string;
  /** Kirchensteuersatz als Dezimalzahl (0.08 | 0.09) */
  churchTaxRate: 0.08 | 0.09;
};

/** 16 deutsche Bundesländer mit Kirchensteuersatz (BY/BW 8 %, übrige 9 %). */
export const FEDERAL_STATE_OPTIONS: FederalStateOption[] = [
  { code: "BW", name: "Baden-Württemberg", churchTaxRate: 0.08 },
  { code: "BY", name: "Bayern", churchTaxRate: 0.08 },
  { code: "BE", name: "Berlin", churchTaxRate: 0.09 },
  { code: "BB", name: "Brandenburg", churchTaxRate: 0.09 },
  { code: "HB", name: "Bremen", churchTaxRate: 0.09 },
  { code: "HH", name: "Hamburg", churchTaxRate: 0.09 },
  { code: "HE", name: "Hessen", churchTaxRate: 0.09 },
  { code: "MV", name: "Mecklenburg-Vorpommern", churchTaxRate: 0.09 },
  { code: "NI", name: "Niedersachsen", churchTaxRate: 0.09 },
  { code: "NW", name: "Nordrhein-Westfalen", churchTaxRate: 0.09 },
  { code: "RP", name: "Rheinland-Pfalz", churchTaxRate: 0.09 },
  { code: "SL", name: "Saarland", churchTaxRate: 0.09 },
  { code: "SN", name: "Sachsen", churchTaxRate: 0.09 },
  { code: "ST", name: "Sachsen-Anhalt", churchTaxRate: 0.09 },
  { code: "SH", name: "Schleswig-Holstein", churchTaxRate: 0.09 },
  { code: "TH", name: "Thüringen", churchTaxRate: 0.09 },
];

export function findFederalStateOption(code: string): FederalStateOption | undefined {
  return FEDERAL_STATE_OPTIONS.find((entry) => entry.code === code.toUpperCase());
}

/** Kirchensteuersatz aus Bundesland; ohne Treffer null. */
export function churchTaxRateForFederalState(code: string | null | undefined): 0.08 | 0.09 | null {
  if (!code) return null;
  return findFederalStateOption(code)?.churchTaxRate ?? null;
}
