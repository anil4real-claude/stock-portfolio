// ========== STOCK API (Finnhub) ==========
// Free tier: 60 calls/minute, real-time US stock quotes

import { getState } from './store';

const BASE_URL = 'https://finnhub.io/api/v1';

function getApiKey(): string {
  return getState().apiKey || '';
}

export interface QuoteData {
  c: number;   // current price
  d: number;   // change
  dp: number;  // percent change
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // previous close
  t: number;   // timestamp  
}

export interface CompanyProfile {
  name: string;
  ticker: string;
  logo: string;
  finnhubIndustry: string;
  marketCapitalization: number;
  exchange: string;
}

export interface CandleData {
  c: number[];  // close
  h: number[];  // high
  l: number[];  // low
  o: number[];  // open
  t: number[];  // timestamps
  v: number[];  // volume
  s: string;    // status
}

export async function fetchQuote(symbol: string): Promise<QuoteData | null> {
  const key = getApiKey();
  if (!key) return null;
  
  try {
    const res = await fetch(`${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.c === 0 && data.pc === 0) return null; // invalid symbol
    return data;
  } catch (e) {
    console.error(`Failed to fetch quote for ${symbol}:`, e);
    return null;
  }
}

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const key = getApiKey();
  if (!key) return null;
  
  try {
    const res = await fetch(`${BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${key}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.name) return null;
    return data;
  } catch (e) {
    console.error(`Failed to fetch profile for ${symbol}:`, e);
    return null;
  }
}

export async function fetchCandles(symbol: string, resolution: string, fromTs: number, toTs: number): Promise<CandleData | null> {
  const key = getApiKey();
  if (!key) return null;
  
  try {
    const res = await fetch(
      `${BASE_URL}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromTs}&to=${toTs}&token=${key}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.s === 'no_data') return null;
    return data;
  } catch (e) {
    console.error(`Failed to fetch candles for ${symbol}:`, e);
    return null;
  }
}

// Batch fetch quotes with rate limiting
export async function fetchQuotesBatch(symbols: string[]): Promise<Map<string, QuoteData>> {
  const results = new Map<string, QuoteData>();
  
  // Finnhub free tier: 60 calls/min — batch in chunks of 10 with small delay
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 10) {
    chunks.push(symbols.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (sym) => {
      const data = await fetchQuote(sym);
      if (data) results.set(sym, data);
    });
    await Promise.all(promises);
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

// Symbol search / lookup
export async function searchSymbol(query: string): Promise<{ description: string; symbol: string; type: string }[]> {
  const key = getApiKey();
  if (!key) return [];
  
  try {
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&token=${key}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.result || []).filter((r: any) => r.type === 'Common Stock').slice(0, 8);
  } catch (e) {
    console.error(`Search failed:`, e);
    return [];
  }
}
