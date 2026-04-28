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

// Map our period configs to Yahoo Finance range/interval params
const YAHOO_RANGE_MAP: Record<string, { range: string; interval: string }> = {
  '15': { range: '5d', interval: '15m' },
  '60': { range: '1mo', interval: '60m' },
  'D': { range: '6mo', interval: '1d' },
  'W': { range: '5y', interval: '1wk' },
};

async function fetchCandlesYahoo(symbol: string, resolution: string): Promise<CandleData | null> {
  try {
    const params = YAHOO_RANGE_MAP[resolution] || { range: '6mo', interval: '1d' };
    
    // Use our own Cloudflare Pages Function proxy (no CORS issues)
    // Falls back to public CORS proxies for local development
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${params.range}&interval=${params.interval}`;
    
    const urls = isLocalhost
      ? [
          `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
          `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
        ]
      : [
          `/api/chart/${encodeURIComponent(symbol)}?range=${params.range}&interval=${params.interval}`,
        ];
    
    let json: any = null;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        json = await res.json();
        if (json?.chart?.result?.[0]) break;
        json = null;
      } catch {
        continue;
      }
    }
    if (!json) throw new Error('All chart data sources failed');
    
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    
    const timestamps = result.timestamp;
    const quote = result.indicators?.quote?.[0];
    if (!timestamps || !quote) return null;
    
    // Filter out null values
    const c: number[] = [];
    const h: number[] = [];
    const l: number[] = [];
    const o: number[] = [];
    const t: number[] = [];
    const v: number[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.close[i] != null && quote.open[i] != null) {
        c.push(quote.close[i]);
        h.push(quote.high[i] ?? quote.close[i]);
        l.push(quote.low[i] ?? quote.close[i]);
        o.push(quote.open[i]);
        t.push(timestamps[i]);
        v.push(quote.volume[i] ?? 0);
      }
    }
    
    if (c.length === 0) return null;
    return { c, h, l, o, t, v, s: 'ok' };
  } catch (e) {
    console.error(`Yahoo Finance candle fetch failed for ${symbol}:`, e);
    return null;
  }
}

export async function fetchCandles(symbol: string, resolution: string, fromTs: number, toTs: number): Promise<CandleData | null> {
  // Try Yahoo Finance first (free, no key needed)
  const yahooData = await fetchCandlesYahoo(symbol, resolution);
  if (yahooData) {
    // Filter by time range
    const filtered: CandleData = { c: [], h: [], l: [], o: [], t: [], v: [], s: 'ok' };
    for (let i = 0; i < yahooData.t.length; i++) {
      if (yahooData.t[i] >= fromTs && yahooData.t[i] <= toTs) {
        filtered.c.push(yahooData.c[i]);
        filtered.h.push(yahooData.h[i]);
        filtered.l.push(yahooData.l[i]);
        filtered.o.push(yahooData.o[i]);
        filtered.t.push(yahooData.t[i]);
        filtered.v.push(yahooData.v[i]);
      }
    }
    if (filtered.c.length > 0) return filtered;
  }

  // Fallback to Finnhub
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
