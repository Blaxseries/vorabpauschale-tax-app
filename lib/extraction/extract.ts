// MOCK-IMPLEMENTIERUNG - wird später durch echten Anthropic-API-Aufruf ersetzt. Siehe TODO(anthropic).

export type ExtractedPositionDraft = {
  isin: string;
  fondsname: string;
  anzahl_anteile: number;
  kurs_jahresanfang: number;
  kurs_jahresende: number;
  ausschuettungen: number;
  waehrung: string;
  kauf_datum: string | null;
  verkauf_datum: string | null;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Liest Fondspositionen aus einem Depotdokument.
 * TODO(anthropic): Mock durch echten Anthropic-API-Aufruf ersetzen.
 */
export async function extractPositionsFromDocument(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<ExtractedPositionDraft[]> {
  void fileBuffer;
  void mimeType;

  await delay(2000 + Math.floor(Math.random() * 1000));

  return [
    {
      isin: "DE0005933931",
      fondsname: "iShares Core DAX UCITS ETF (DE)",
      anzahl_anteile: 142.5,
      kurs_jahresanfang: 158.42,
      kurs_jahresende: 171.88,
      ausschuettungen: 312.45,
      waehrung: "EUR",
      kauf_datum: "2019-03-14",
      verkauf_datum: null,
    },
    {
      isin: "IE00B4L5Y983",
      fondsname: "iShares Core MSCI World UCITS ETF USD (Acc)",
      anzahl_anteile: 88,
      kurs_jahresanfang: 72.15,
      kurs_jahresende: 79.34,
      ausschuettungen: 0,
      waehrung: "USD",
      kauf_datum: "2021-08-02",
      verkauf_datum: null,
    },
    {
      isin: "LU0274208692",
      fondsname: "Xtrackers II EUR Overnight Rate Swap UCITS ETF",
      anzahl_anteile: 25.75,
      kurs_jahresanfang: 142.1,
      kurs_jahresende: 145.62,
      ausschuettungen: 18.9,
      waehrung: "EUR",
      kauf_datum: null,
      verkauf_datum: null,
    },
  ];
}
