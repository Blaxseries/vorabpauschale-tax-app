import type { Client, FundPosition, Portfolio, TaxFile } from "@/lib/types";

export const clients: Client[] = [
  { id: "c-001", name: "Muster Holding GmbH", taxNumber: "143/5567/1022", country: "DE" },
  { id: "c-002", name: "Nordkapital AG", taxNumber: "231/8841/3370", country: "DE" },
  { id: "c-003", name: "Berg & Partner KG", taxNumber: "412/9934/7721", country: "DE" },
  { id: "c-004", name: "Hanse Invest Family Office", taxNumber: "554/1209/6643", country: "DE" },
  { id: "c-005", name: "Rhein Asset Management GmbH", taxNumber: "876/4421/1188", country: "DE" },
];

export const taxFiles: TaxFile[] = [
  { id: "tf-2026-001", clientId: "c-001", year: 2026, status: "in_progress" },
  { id: "tf-2026-002", clientId: "c-002", year: 2026, status: "open" },
  { id: "tf-2026-003", clientId: "c-003", year: 2026, status: "completed" },
  { id: "tf-2026-004", clientId: "c-004", year: 2026, status: "in_progress" },
  { id: "tf-2026-005", clientId: "c-005", year: 2026, status: "open" },
];

export const portfolios: Portfolio[] = [
  { id: "pf-001", taxFileId: "tf-2026-001", bankName: "Deutsche Bank", country: "DE" },
  { id: "pf-002", taxFileId: "tf-2026-002", bankName: "Commerzbank", country: "DE" },
  { id: "pf-003", taxFileId: "tf-2026-003", bankName: "DekaBank", country: "DE" },
  { id: "pf-004", taxFileId: "tf-2026-004", bankName: "UBS", country: "CH" },
  { id: "pf-005", taxFileId: "tf-2026-005", bankName: "Baader Bank", country: "DE" },
];

export const fundPositions: FundPosition[] = [
  {
    id: "fp-001",
    isin: "DE000A0F5UF5",
    fundName: "DWS Deutschland",
    unitsStart: 950.12,
    unitsEnd: 980.55,
    priceStart: 124.33,
    priceEnd: 130.11,
    distributions: 640.22,
  },
  {
    id: "fp-002",
    isin: "LU0360863863",
    fundName: "Allianz Global Equity",
    unitsStart: 401.87,
    unitsEnd: 423.31,
    priceStart: 211.02,
    priceEnd: 219.44,
    distributions: 312.6,
  },
  {
    id: "fp-003",
    isin: "IE00B4L5Y983",
    fundName: "iShares Core MSCI World UCITS ETF",
    unitsStart: 1200,
    unitsEnd: 1238.4,
    priceStart: 78.51,
    priceEnd: 83.9,
    distributions: 728.14,
  },
  {
    id: "fp-004",
    isin: "LU1681045370",
    fundName: "Amundi Prime Euro Gov Bonds",
    unitsStart: 640.5,
    unitsEnd: 640.5,
    priceStart: 102.44,
    priceEnd: 101.73,
    distributions: 144.33,
  },
];
