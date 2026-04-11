// ========== DATA STORE (localStorage persistence) ==========

export interface Holding {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice?: number;
  previousClose?: number;
  change?: number;
  changePct?: number;
  marketValue?: number;
  gainLoss?: number;
  gainLossPct?: number;
  lastUpdated?: number;
}

export interface Portfolio {
  id: string;
  name: string;
  holdings: Holding[];
  createdAt: number;
}

export interface AppState {
  pin: string;
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  apiKey: string;
}

const STORAGE_KEY = 'stock-portfolio-data';
const DEFAULT_PIN = '1202';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getDefaultState(): AppState {
  const defaultPortfolio: Portfolio = {
    id: generateId(),
    name: 'Main Portfolio',
    holdings: [],
    createdAt: Date.now(),
  };
  return {
    pin: DEFAULT_PIN,
    portfolios: [defaultPortfolio],
    activePortfolioId: defaultPortfolio.id,
    apiKey: '',
  };
}

let state: AppState;

export function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      state = JSON.parse(stored);
      // Migration: add apiKey if missing
      if (state.apiKey === undefined) state.apiKey = '';
      return state;
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
  state = getDefaultState();
  saveState();
  return state;
}

export function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function getState(): AppState {
  return state;
}

export function verifyPin(input: string): boolean {
  return input === state.pin;
}

export function setPin(newPin: string): void {
  state.pin = newPin;
  saveState();
}

export function setApiKey(key: string): void {
  state.apiKey = key;
  saveState();
}

// ===== Portfolio CRUD =====

export function getActivePortfolio(): Portfolio | undefined {
  return state.portfolios.find(p => p.id === state.activePortfolioId);
}

export function setActivePortfolio(id: string): void {
  state.activePortfolioId = id;
  saveState();
}

export function createPortfolio(name: string): Portfolio {
  const portfolio: Portfolio = {
    id: generateId(),
    name,
    holdings: [],
    createdAt: Date.now(),
  };
  state.portfolios.push(portfolio);
  state.activePortfolioId = portfolio.id;
  saveState();
  return portfolio;
}

export function renamePortfolio(id: string, name: string): void {
  const p = state.portfolios.find(p => p.id === id);
  if (p) {
    p.name = name;
    saveState();
  }
}

export function deletePortfolio(id: string): void {
  state.portfolios = state.portfolios.filter(p => p.id !== id);
  if (state.activePortfolioId === id) {
    state.activePortfolioId = state.portfolios[0]?.id || null;
  }
  saveState();
}

// ===== Holdings CRUD =====

export function addHolding(portfolioId: string, holding: Omit<Holding, 'currentPrice' | 'previousClose' | 'change' | 'changePct' | 'marketValue' | 'gainLoss' | 'gainLossPct' | 'lastUpdated'>): void {
  const portfolio = state.portfolios.find(p => p.id === portfolioId);
  if (!portfolio) return;

  const existing = portfolio.holdings.find(h => h.ticker.toUpperCase() === holding.ticker.toUpperCase());
  if (existing) {
    // Merge: weighted average cost
    const totalShares = existing.shares + holding.shares;
    existing.avgCost = ((existing.avgCost * existing.shares) + (holding.avgCost * holding.shares)) / totalShares;
    existing.shares = totalShares;
    existing.name = holding.name || existing.name;
  } else {
    portfolio.holdings.push({
      ...holding,
      ticker: holding.ticker.toUpperCase(),
    });
  }
  saveState();
}

export function removeHolding(portfolioId: string, ticker: string): void {
  const portfolio = state.portfolios.find(p => p.id === portfolioId);
  if (!portfolio) return;
  portfolio.holdings = portfolio.holdings.filter(h => h.ticker !== ticker);
  saveState();
}

export function updateHoldingPrices(portfolioId: string, ticker: string, currentPrice: number, previousClose: number): void {
  const portfolio = state.portfolios.find(p => p.id === portfolioId);
  if (!portfolio) return;
  const holding = portfolio.holdings.find(h => h.ticker === ticker);
  if (!holding) return;

  holding.currentPrice = currentPrice;
  holding.previousClose = previousClose;
  holding.change = currentPrice - previousClose;
  holding.changePct = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
  holding.marketValue = currentPrice * holding.shares;
  holding.gainLoss = (currentPrice - holding.avgCost) * holding.shares;
  holding.gainLossPct = holding.avgCost > 0 ? ((currentPrice - holding.avgCost) / holding.avgCost) * 100 : 0;
  holding.lastUpdated = Date.now();
  saveState();
}

// ===== Computed =====

export function getPortfolioTotalValue(portfolio: Portfolio): number {
  return portfolio.holdings.reduce((sum, h) => sum + (h.marketValue || (h.avgCost * h.shares)), 0);
}

export function getPortfolioTotalCost(portfolio: Portfolio): number {
  return portfolio.holdings.reduce((sum, h) => sum + (h.avgCost * h.shares), 0);
}

export function getPortfolioTotalGainLoss(portfolio: Portfolio): number {
  return portfolio.holdings.reduce((sum, h) => sum + (h.gainLoss || 0), 0);
}

export function getPortfolioDayChange(portfolio: Portfolio): number {
  return portfolio.holdings.reduce((sum, h) => sum + ((h.change || 0) * h.shares), 0);
}

export { generateId };
