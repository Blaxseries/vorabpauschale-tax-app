export interface Firm {
  id: string;
  name: string;
  tax_advisor_name: string;
  country_code: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  firm_id: string;
  name: string;
  client_number: string;
  tax_number: string;
  country: string;
  address?: string | null;
  is_company?: boolean | null;
  salutation?: "Herr" | "Frau" | "Divers" | null;
  email?: string | null;
  phone?: string | null;
  status: "active" | "needs_review" | "archived";
  created_at: string;
  updated_at: string;
}

export interface TaxYear {
  id: string;
  client_id: string;
  year: number;
  status: "open" | "in_progress" | "completed";
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  tax_year_id: string;
  bank_name: string;
  country: string;
  account_number: string;
  currency: string;
  status?: "open" | "in_review" | "approved";
  created_at: string;
  updated_at: string;
}

export interface StatementUpload {
  id: string;
  portfolio_id: string;
  file_name: string;
  document_type: string;
  uploaded_at: string;
  status: "uploaded" | "processing" | "needs_review" | "approved" | "error";
  created_at: string;
  updated_at: string;
}

export interface FundPosition {
  id: string;
  portfolio_id: string;
  statement_upload_id: string | null;
  isin: string;
  fund_name: string;
  /** Freitext/Legacy; nicht für Teilfreistellung verwenden. */
  fund_type?: string | null;
  product_type?: string | null;
  /** Steuerliche Kategorie: aktien | misch | immobilien | immobilien_ausland | sonstige */
  tax_fund_type?: string | null;
  partial_exemption_rate?: number | null;
  currency?: string | null;
  purchase_date?: string | null;
  units_start: number;
  units_end: number;
  price_start: number;
  price_end: number;
  nav_start_local?: number | null;
  nav_end_local?: number | null;
  distributions: number;
  ezb_rate?: number | null;
  ezb_kurs?: number | null;
  ezb_kurs_jahresanfang?: number | null;
  ezb_kurs_jahresende?: number | null;
  data_source?: string | null;
  nav_data_source?: string | null;
  ezb_data_source?: string | null;
  advisor_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  calculation_ready?: boolean | null;
  validation_errors?: unknown;
  review_status: string;
  created_at: string;
  updated_at: string;
}

export interface Calculation {
  id: string;
  tax_year_id: string;
  portfolio_id: string | null;
  fund_position_id: string | null;
  base_return: number;
  preliminary_tax: number;
  final_tax: number;
  status: "draft" | "final";
  calculated_at: string;
  created_at: string;
  updated_at: string;
}
