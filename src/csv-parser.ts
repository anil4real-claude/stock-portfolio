// ========== CSV PARSER ==========
// Uses PapaParse for robust CSV handling

import Papa from 'papaparse';
import type { ParseResult, ParseError } from 'papaparse';

export interface ParsedHolding {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
}

// Common column name mappings
const TICKER_COLS = ['ticker', 'symbol', 'stock', 'stock symbol', 'security'];
const NAME_COLS = ['name', 'company', 'company name', 'description', 'security name', 'stock name'];
const SHARES_COLS = ['shares', 'quantity', 'qty', 'units', 'number of shares', 'shares/units'];
const COST_COLS = ['avg cost', 'average cost', 'cost basis', 'purchase price', 'price', 'cost per share', 'avg price', 'cost/share', 'unit cost'];

function findColumn(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map(h => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  // Partial match fallback
  for (const candidate of candidates) {
    const idx = normalized.findIndex(h => h.includes(candidate));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function parseCSV(file: File): Promise<ParsedHolding[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results: ParseResult) => {
        try {
          const headers = results.meta.fields || [];
          const tickerCol = findColumn(headers, TICKER_COLS);
          const nameCol = findColumn(headers, NAME_COLS);
          const sharesCol = findColumn(headers, SHARES_COLS);
          const costCol = findColumn(headers, COST_COLS);

          if (!tickerCol) {
            reject(new Error('Could not find a ticker/symbol column. Expected columns: ' + TICKER_COLS.join(', ')));
            return;
          }

          const holdings: ParsedHolding[] = [];
          for (const row of results.data as Record<string, string>[]) {
            const ticker = (row[tickerCol] || '').trim().toUpperCase();
            if (!ticker || ticker.length > 10) continue;

            const rawShares = sharesCol ? row[sharesCol] : '1';
            const rawCost = costCol ? row[costCol] : '0';

            const shares = parseFloat(String(rawShares).replace(/[,$]/g, '')) || 1;
            const avgCost = parseFloat(String(rawCost).replace(/[,$]/g, '')) || 0;

            holdings.push({
              ticker,
              name: nameCol ? (row[nameCol] || '').trim() : ticker,
              shares: Math.abs(shares),
              avgCost: Math.abs(avgCost),
            });
          }

          if (holdings.length === 0) {
            reject(new Error('No valid holdings found in CSV.'));
            return;
          }

          resolve(holdings);
        } catch (e) {
          reject(e);
        }
      },
      error: (err: ParseError) => {
        reject(new Error(`CSV parse error: ${err.message}`));
      },
    });
  });
}

// Parse a batch of tickers from text input (comma, space, or newline separated)
export function parseBatchTickers(input: string): string[] {
  return input
    .split(/[,\s\n]+/)
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0 && t.length <= 10 && /^[A-Z.]+$/.test(t));
}
