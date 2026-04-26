/**
 * Stammdaten eines Mandanten (Steuerpflichtiger/Kunde der Kanzlei).
 */
export interface Client {
  id: string;
  name: string;
  taxNumber: string;
  country: string;
}

/**
 * Steuerakte eines Mandanten fuer ein konkretes Steuerjahr.
 */
export interface TaxFile {
  id: string;
  clientId: string;
  year: number;
  status: "open" | "in_progress" | "completed";
}

/**
 * Depot/Portfolio innerhalb einer Steuerakte.
 */
export interface Portfolio {
  id: string;
  taxFileId: string;
  bankName: string;
  country: string;
}

/**
 * Hochgeladener Kontoauszug mit Verarbeitungsstatus.
 */
export interface StatementUpload {
  id: string;
  portfolioId: string;
  fileName: string;
  uploadedAt: Date;
  status: "uploaded" | "parsed" | "error";
}

/**
 * Fondsposition im Depot fuer den Vorabpauschale-Kontext.
 */
export interface FundPosition {
  id: string;
  isin: string;
  fundName: string;
  unitsStart: number;
  unitsEnd: number;
  priceStart: number;
  priceEnd: number;
  distributions: number;
}

/**
 * Ergebnis einer Vorabpauschale-Berechnung fuer eine Fondsposition.
 */
export interface VorabpauschaleCalculation {
  id: string;
  fundPositionId: string;
  baseReturn: number;
  preliminaryTax: number;
  finalTax: number;
  calculatedAt: Date;
}
