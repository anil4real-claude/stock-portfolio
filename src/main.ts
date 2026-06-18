// ========== MAIN APPLICATION ==========
import './style.css';
import {
  loadState, getState, verifyPin, setPin, setApiKey,
  getActivePortfolio, setActivePortfolio, createPortfolio, renamePortfolio, deletePortfolio,
  addHolding, editHolding, removeHolding, updateHoldingPrices,
  getPortfolioTotalValue, getPortfolioTotalCost, getPortfolioTotalGainLoss, getPortfolioDayChange,
  type Portfolio, type Holding
} from './store';
import { fetchQuote, fetchQuotesBatch, fetchCompanyProfile } from './api';
import { parseCSV, parseBatchTickers } from './csv-parser';
import { initChart, loadChartData, destroyChart, CHART_PERIODS, renderDonutChart, getDonutColor, type HoldingInfo } from './charts';
import type { IChartApi } from 'lightweight-charts';
import { renderGame, destroyGame } from './game';

const app = document.getElementById('app')!;
let currentChart: IChartApi | null = null;
let currentChartSymbol: string = '';
let currentChartPeriod: string = '3M';

// ==============================
//  TOAST SYSTEM
// ==============================
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  let container = document.querySelector('.toast-container') as HTMLElement;
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==============================
//  FORMATTING HELPERS
// ==============================
function formatCurrency(val: number): string {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatPct(val: number): string {
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}

function formatChange(val: number): string {
  return (val >= 0 ? '+' : '') + formatCurrency(val);
}

// ==============================
//  PIN SCREEN
// ==============================
function renderPinScreen() {
  app.innerHTML = `
    <div class="pin-screen">
      <div class="pin-logo">📈</div>
      <h1 class="pin-title">Portfolio Tracker</h1>
      <p class="pin-subtitle">Enter your PIN to continue</p>
      <div class="pin-input-group">
        <input id="pin-0" class="pin-digit" type="text" maxlength="1" inputmode="numeric" autocomplete="off" />
        <input id="pin-1" class="pin-digit" type="text" maxlength="1" inputmode="numeric" autocomplete="off" />
        <input id="pin-2" class="pin-digit" type="text" maxlength="1" inputmode="numeric" autocomplete="off" />
        <input id="pin-3" class="pin-digit" type="text" maxlength="1" inputmode="numeric" autocomplete="off" />
      </div>
      <p id="pin-error" class="pin-error">Incorrect PIN. Please try again.</p>
    </div>
  `;

  const digits = [0, 1, 2, 3].map(i => document.getElementById(`pin-${i}`) as HTMLInputElement);
  const errorEl = document.getElementById('pin-error')!;

  digits[0].focus();

  digits.forEach((input, idx) => {
    input.addEventListener('input', () => {
      const val = input.value.replace(/\D/g, '');
      input.value = val;
      if (val && idx < 3) {
        digits[idx + 1].focus();
      }
      // Check full PIN
      const pin = digits.map(d => d.value).join('');
      if (pin.length === 4) {
        if (verifyPin(pin)) {
          void 0; // authenticated
          renderDashboard();
        } else {
          errorEl.classList.add('visible');
          digits.forEach(d => { d.classList.add('error'); d.value = ''; });
          digits[0].focus();
          setTimeout(() => {
            digits.forEach(d => d.classList.remove('error'));
            errorEl.classList.remove('visible');
          }, 2000);
        }
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].focus();
      }
    });

    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
      pasted.split('').forEach((ch, i) => {
        if (digits[i]) digits[i].value = ch;
      });
      if (pasted.length === 4) {
        if (verifyPin(pasted)) {
          void 0; // authenticated
          renderDashboard();
        }
      }
    });
  });
}

// ==============================
//  DASHBOARD
// ==============================
function renderDashboard(skipRefresh = false) {
  const portfolio = getActivePortfolio();

  app.innerHTML = `
    ${renderHeader()}
    <div class="app-container">
      ${renderPortfolioTabs()}
      ${portfolio ? renderPortfolioContent(portfolio) : renderNoPortfolio()}
    </div>
  `;

  bindHeaderEvents();
  bindTabEvents();
  if (portfolio) {
    bindPortfolioEvents(portfolio);
    if (skipRefresh) {
      // Just mount chart/allocation without fetching prices again
      mountChartAndAllocation(portfolio);
    } else {
      refreshPrices(portfolio);
    }
  }
}

function renderHeader(): string {
  return `
    <div class="app-container" style="padding-bottom:0">
      <header class="app-header" id="app-header">
        <div class="header-left">
          <div class="header-logo">📈</div>
          <div class="header-title"><span>Portfolio</span> Tracker</div>
        </div>
        <div class="header-right">
          <button class="btn btn-sm" id="btn-refresh" title="Refresh prices">🔄 Refresh</button>
          <button class="btn btn-sm" id="btn-game" title="Mr Wagner's Sports Station">🏆 Game</button>
          <button class="btn btn-sm" id="btn-settings" title="Settings">⚙️</button>
          <button class="btn btn-sm btn-danger" id="btn-logout" title="Lock">🔒</button>
        </div>
      </header>
    </div>
  `;
}

function renderPortfolioTabs(): string {
  const state = getState();
  const tabs = state.portfolios.map(p => `
    <button class="portfolio-tab ${p.id === state.activePortfolioId ? 'active' : ''}" data-portfolio-id="${p.id}">
      ${p.name}
      <span class="tab-badge">${p.holdings.length}</span>
    </button>
  `).join('');

  return `
    <div class="portfolio-tabs" id="portfolio-tabs">
      ${tabs}
      <button class="portfolio-tab tab-add" id="btn-add-portfolio">+ New</button>
    </div>
  `;
}

function renderPortfolioContent(portfolio: Portfolio): string {
  const totalValue = getPortfolioTotalValue(portfolio);
  const totalCost = getPortfolioTotalCost(portfolio);
  const totalGainLoss = getPortfolioTotalGainLoss(portfolio);
  const dayChange = getPortfolioDayChange(portfolio);
  const totalGainPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const dayChangePct = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;
  const hasHoldings = portfolio.holdings.length > 0;
  const hasApiKey = !!getState().apiKey;

  return `
    ${!hasApiKey ? renderApiKeyBanner() : ''}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Portfolio Value</div>
        <div class="stat-value">${formatCurrency(totalValue)}</div>
        <div class="stat-change ${dayChange >= 0 ? 'positive' : 'negative'}">
          ${dayChange >= 0 ? '▲' : '▼'} ${formatChange(Math.abs(dayChange))} (${formatPct(dayChangePct)})
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Gain/Loss</div>
        <div class="stat-value ${totalGainLoss >= 0 ? 'positive-text' : 'negative-text'}">${formatChange(totalGainLoss)}</div>
        <div class="stat-change ${totalGainLoss >= 0 ? 'positive' : 'negative'}">
          ${formatPct(totalGainPct)}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Cost</div>
        <div class="stat-value">${formatCurrency(totalCost)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Holdings</div>
        <div class="stat-value">${portfolio.holdings.length}</div>
      </div>
    </div>

    ${hasHoldings ? renderChartSection(portfolio) : ''}
    ${hasHoldings ? renderAllocationSection(portfolio) : ''}
    ${renderHoldingsSection(portfolio)}
  `;
}

function renderApiKeyBanner(): string {
  return `
    <div style="background: var(--accent-amber-bg); border: 1px solid rgba(245,158,11,0.3); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <span style="font-size: 1.2rem;">🔑</span>
      <div style="flex:1; min-width: 200px;">
        <div style="font-weight: 600; font-size: 0.9rem; color: var(--accent-amber);">API Key Required</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Add a free <a href="https://finnhub.io/register" target="_blank" style="color: var(--accent-blue); text-decoration: underline;">Finnhub API key</a> in Settings to see live prices and charts.</div>
      </div>
      <button class="btn btn-sm" id="btn-open-settings-banner" style="border-color: rgba(245,158,11,0.3); color: var(--accent-amber);">⚙️ Settings</button>
    </div>
  `;
}

function renderChartSection(portfolio: Portfolio): string {
  const firstTicker = currentChartSymbol || portfolio.holdings[0]?.ticker || '';
  currentChartSymbol = firstTicker;

  const tickerBtns = portfolio.holdings.map(h => `
    <button class="chart-period-btn ${h.ticker === firstTicker ? 'active' : ''}" data-chart-ticker="${h.ticker}">${h.ticker}</button>
  `).join('');

  const periodBtns = Object.keys(CHART_PERIODS).map(k => `
    <button class="chart-period-btn ${k === currentChartPeriod ? 'active' : ''}" data-chart-period="${k}">${k}</button>
  `).join('');

  return `
    <div class="chart-container" id="chart-container">
      <div class="chart-header">
        <div class="chart-title" id="chart-title">📊 ${firstTicker} Price Chart</div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <div class="chart-controls" id="chart-ticker-controls">${tickerBtns}</div>
          <div class="chart-controls" id="chart-period-controls">${periodBtns}</div>
        </div>
      </div>
      <div class="chart-body" id="chart-body"></div>
    </div>
  `;
}

function renderAllocationSection(_portfolio: Portfolio): string {
  return `
    <div class="allocation-section">
      <div class="allocation-card">
        <div class="allocation-card-title">Portfolio Allocation</div>
        <div id="allocation-donut"></div>
      </div>
      <div class="allocation-card">
        <div class="allocation-card-title">Top Performers</div>
        <div id="performers-list"></div>
      </div>
    </div>
  `;
}

function renderHoldingsSection(portfolio: Portfolio): string {
  const hasHoldings = portfolio.holdings.length > 0;

  return `
    <div class="holdings-section">
      <div class="holdings-header">
        <div class="holdings-title">Holdings</div>
        <div class="holdings-actions">
          <button class="btn btn-sm btn-primary" id="btn-add-ticker">+ Add Ticker</button>
          <button class="btn btn-sm" id="btn-batch-add">📋 Batch Add</button>
          <button class="btn btn-sm" id="btn-import-csv">📄 Import CSV</button>
          ${hasHoldings ? '<button class="btn btn-sm btn-success" id="btn-export-csv">⬇️ Export CSV</button>' : ''}
          <button class="btn btn-sm btn-danger" id="btn-delete-portfolio" title="Delete portfolio">🗑️</button>
        </div>
      </div>
      ${hasHoldings ? renderHoldingsTable(portfolio) : renderEmptyHoldings()}
    </div>
  `;
}

function renderHoldingsTable(portfolio: Portfolio): string {
  const totalValue = getPortfolioTotalValue(portfolio);

  const rows = portfolio.holdings.map(h => {
    const price = h.currentPrice || h.avgCost;
    const mktVal = h.marketValue || (h.avgCost * h.shares);
    const weight = totalValue > 0 ? (mktVal / totalValue) * 100 : 0;
    const gainLoss = h.gainLoss || 0;
    const gainLossPct = h.gainLossPct || 0;
    const dayChange = h.change || 0;
    const dayChangePct = h.changePct || 0;

    const randomBg = `hsl(${hashString(h.ticker) % 360}, 60%, 25%)`;

    return `
      <tr class="holding-row" data-edit-ticker="${h.ticker}" style="cursor:pointer;">
        <td>
          <div class="ticker-cell">
            <div class="ticker-icon" style="background:${randomBg}">${h.ticker.slice(0, 2)}</div>
            <div>
              <div class="ticker-symbol">${h.ticker}</div>
              <div class="ticker-name">${h.name || h.ticker}</div>
            </div>
          </div>
        </td>
        <td>${formatCurrency(price)}</td>
        <td class="${dayChange >= 0 ? 'positive-text' : 'negative-text'}">${formatChange(dayChange)} (${formatPct(dayChangePct)})</td>
        <td>${h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
        <td>${formatCurrency(h.avgCost)}</td>
        <td>${formatCurrency(mktVal)}</td>
        <td class="${gainLoss >= 0 ? 'positive-text' : 'negative-text'}">${formatChange(gainLoss)} (${formatPct(gainLossPct)})</td>
        <td>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <div class="weight-bar"><div class="weight-bar-fill" style="width:${Math.min(weight, 100)}%"></div></div>
            <span style="font-size:0.75rem;color:var(--text-muted)">${weight.toFixed(1)}%</span>
          </div>
        </td>
        <td><button class="delete-row-btn" data-delete-ticker="${h.ticker}" title="Remove">✕</button></td>
      </tr>
    `;
  }).join('');

  const totalCost = getPortfolioTotalCost(portfolio);
  const totalGainLoss = getPortfolioTotalGainLoss(portfolio);
  const totalGainLossPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const totalDayChange = getPortfolioDayChange(portfolio);

  return `
    <table class="holdings-table">
      <thead>
        <tr>
          <th>Stock</th>
          <th>Price</th>
          <th>Day Change</th>
          <th>Shares</th>
          <th>Avg Cost</th>
          <th>Market Value</th>
          <th>Gain/Loss</th>
          <th>Weight</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="totals-row">
          <td><strong>📊 Totals (${portfolio.holdings.length} holdings)</strong></td>
          <td></td>
          <td class="${totalDayChange >= 0 ? 'positive-text' : 'negative-text'}"><strong>${formatChange(totalDayChange)}</strong></td>
          <td></td>
          <td><strong>${formatCurrency(totalCost)}</strong></td>
          <td><strong>${formatCurrency(totalValue)}</strong></td>
          <td class="${totalGainLoss >= 0 ? 'positive-text' : 'negative-text'}"><strong>${formatChange(totalGainLoss)} (${formatPct(totalGainLossPct)})</strong></td>
          <td><strong>100%</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;
}

function renderEmptyHoldings(): string {
  return `
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">No holdings yet</div>
      <div class="empty-text">Add individual tickers, batch add multiple symbols, or import a CSV from your brokerage to get started.</div>
    </div>
  `;
}

function renderNoPortfolio(): string {
  return `
    <div class="empty-state" style="padding-top: 6rem">
      <div class="empty-icon">📂</div>
      <div class="empty-title">No Portfolios</div>
      <div class="empty-text">Create your first portfolio to start tracking stocks.</div>
      <button class="btn btn-primary" id="btn-create-first-portfolio">+ Create Portfolio</button>
    </div>
  `;
}

// ==============================
//  MODALS
// ==============================
function showModal(title: string, body: string, footer: string, onMount?: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-close-btn')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  if (onMount) setTimeout(onMount, 50);
}

function closeModal(): void {
  document.getElementById('modal-overlay')?.remove();
}

// ===== Add Single Ticker Modal =====
function showAddTickerModal() {
  const portfolioId = getState().activePortfolioId;
  if (!portfolioId) return;

  showModal('Add Stock', `
    <div class="form-group">
      <label class="form-label">Ticker Symbol</label>
      <input id="input-ticker" class="form-input" placeholder="e.g. AAPL" type="text" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label">Company Name (optional)</label>
      <input id="input-name" class="form-input" placeholder="e.g. Apple Inc." type="text" />
    </div>
    <div class="form-group">
      <label class="form-label">Number of Shares</label>
      <input id="input-shares" class="form-input" placeholder="e.g. 10" type="number" step="any" min="0" value="1" />
    </div>
    <div class="form-group">
      <label class="form-label">Average Cost per Share ($)</label>
      <input id="input-cost" class="form-input" placeholder="e.g. 150.00" type="number" step="any" min="0" value="0" />
      <div class="form-hint">Enter 0 to auto-fill with current market price</div>
    </div>
  `, `
    <button class="btn" onclick="document.getElementById('modal-overlay')?.remove()">Cancel</button>
    <button class="btn btn-primary" id="btn-confirm-add-ticker">Add Stock</button>
  `, () => {
    const tickerInput = document.getElementById('input-ticker') as HTMLInputElement;
    tickerInput.focus();

    document.getElementById('btn-confirm-add-ticker')?.addEventListener('click', async () => {
      const ticker = tickerInput.value.trim().toUpperCase();
      const name = (document.getElementById('input-name') as HTMLInputElement).value.trim();
      const shares = parseFloat((document.getElementById('input-shares') as HTMLInputElement).value) || 1;
      let avgCost = parseFloat((document.getElementById('input-cost') as HTMLInputElement).value) || 0;

      if (!ticker) {
        showToast('Please enter a ticker symbol', 'error');
        return;
      }

      // If cost is 0, try to fetch current price
      if (avgCost === 0) {
        const quote = await fetchQuote(ticker);
        if (quote && quote.c > 0) {
          avgCost = quote.c;
        }
      }

      // Try to get company name if not provided
      let companyName = name;
      if (!companyName) {
        const profile = await fetchCompanyProfile(ticker);
        if (profile) companyName = profile.name;
      }

      addHolding(portfolioId, { ticker, name: companyName || ticker, shares, avgCost });
      closeModal();
      showToast(`Added ${ticker} to portfolio`, 'success');
      renderDashboard();
    });

    // Enter key support
    tickerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-confirm-add-ticker')?.click();
    });
  });
}

// ===== Edit Holding Modal =====
function showEditHoldingModal(holding: Holding) {
  const portfolioId = getState().activePortfolioId;
  if (!portfolioId) return;

  showModal(`Edit ${holding.ticker}`, `
    <div class="form-group">
      <label class="form-label">Ticker Symbol</label>
      <input class="form-input" type="text" value="${holding.ticker}" disabled style="opacity:0.5;cursor:not-allowed;" />
      <div class="form-hint">Ticker cannot be changed. Remove and re-add if needed.</div>
    </div>
    <div class="form-group">
      <label class="form-label">Company Name</label>
      <input id="edit-name" class="form-input" placeholder="Company name" type="text" value="${holding.name || ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Number of Shares</label>
      <input id="edit-shares" class="form-input" placeholder="e.g. 10" type="number" step="any" min="0" value="${holding.shares}" />
    </div>
    <div class="form-group">
      <label class="form-label">Average Cost per Share ($)</label>
      <input id="edit-cost" class="form-input" placeholder="e.g. 150.00" type="number" step="any" min="0" value="${holding.avgCost}" />
    </div>
    ${holding.currentPrice ? `
    <div style="background:var(--bg-glass);border-radius:var(--radius-sm);padding:0.75rem;margin-top:0.5rem;">
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted);">
        <span>Current Price</span>
        <span style="color:var(--text-primary);font-weight:600;">${formatCurrency(holding.currentPrice)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted);margin-top:0.25rem;">
        <span>Market Value</span>
        <span style="color:var(--text-primary);font-weight:600;">${formatCurrency(holding.marketValue || 0)}</span>
      </div>
    </div>
    ` : ''}
  `, `
    <button class="btn" onclick="document.getElementById('modal-overlay')?.remove()">Cancel</button>
    <button class="btn btn-primary" id="btn-confirm-edit-holding">Save Changes</button>
  `, () => {
    document.getElementById('edit-name')?.focus();

    document.getElementById('btn-confirm-edit-holding')?.addEventListener('click', () => {
      const name = (document.getElementById('edit-name') as HTMLInputElement).value.trim();
      const shares = parseFloat((document.getElementById('edit-shares') as HTMLInputElement).value);
      const avgCost = parseFloat((document.getElementById('edit-cost') as HTMLInputElement).value);

      if (isNaN(shares) || shares <= 0) {
        showToast('Shares must be greater than 0', 'error');
        return;
      }
      if (isNaN(avgCost) || avgCost < 0) {
        showToast('Average cost must be 0 or greater', 'error');
        return;
      }

      editHolding(portfolioId, holding.ticker, { name: name || holding.ticker, shares, avgCost });
      closeModal();
      showToast(`Updated ${holding.ticker}`, 'success');
      renderDashboard();
    });
  });
}

// ===== Batch Add Modal =====
function showBatchAddModal() {
  const portfolioId = getState().activePortfolioId;
  if (!portfolioId) return;

  showModal('Batch Add Tickers', `
    <div class="form-group">
      <label class="form-label">Enter Tickers</label>
      <textarea id="input-batch" class="form-input" placeholder="AAPL, MSFT, GOOGL, TSLA, AMZN&#10;&#10;Enter comma, space, or newline separated tickers" rows="5"></textarea>
      <div class="form-hint">Each ticker will be added with 1 share at current market price</div>
    </div>
  `, `
    <button class="btn" onclick="document.getElementById('modal-overlay')?.remove()">Cancel</button>
    <button class="btn btn-primary" id="btn-confirm-batch">Add All</button>
  `, () => {
    (document.getElementById('input-batch') as HTMLTextAreaElement).focus();

    document.getElementById('btn-confirm-batch')?.addEventListener('click', async () => {
      const input = (document.getElementById('input-batch') as HTMLTextAreaElement).value;
      const tickers = parseBatchTickers(input);

      if (tickers.length === 0) {
        showToast('No valid tickers found', 'error');
        return;
      }

      closeModal();
      showToast(`Adding ${tickers.length} tickers...`, 'info');

      for (const ticker of tickers) {
        let name = ticker;
        let avgCost = 0;

        const quote = await fetchQuote(ticker);
        if (quote && quote.c > 0) {
          avgCost = quote.c;
        }

        const profile = await fetchCompanyProfile(ticker);
        if (profile) name = profile.name;

        addHolding(portfolioId, { ticker, name, shares: 1, avgCost });
      }

      showToast(`Added ${tickers.length} stocks`, 'success');
      renderDashboard();
    });
  });
}

// ===== CSV Import Modal =====
function showImportCSVModal() {
  const portfolioId = getState().activePortfolioId;
  if (!portfolioId) return;

  showModal('Import CSV / Statement', `
    <div class="drop-zone" id="csv-drop-zone">
      <div class="drop-zone-icon">📁</div>
      <div class="drop-zone-text">Drop your CSV file here or click to browse</div>
      <div class="drop-zone-hint">Supports most brokerage export formats (Schwab, Fidelity, Robinhood, etc.)</div>
      <input type="file" id="csv-file-input" accept=".csv,.txt" />
    </div>
    <div id="csv-preview" style="margin-top:1rem;display:none;">
      <div style="font-weight:600;font-size:0.85rem;margin-bottom:0.5rem;">Preview:</div>
      <div id="csv-preview-content" style="max-height:200px;overflow-y:auto;font-size:0.8rem;background:var(--bg-glass);border-radius:var(--radius-sm);padding:0.75rem;"></div>
    </div>
  `, `
    <button class="btn" onclick="document.getElementById('modal-overlay')?.remove()">Cancel</button>
    <button class="btn btn-primary" id="btn-confirm-import" style="display:none">Import All</button>
  `, () => {
    const dropZone = document.getElementById('csv-drop-zone')!;
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
    const preview = document.getElementById('csv-preview')!;
    const previewContent = document.getElementById('csv-preview-content')!;
    const importBtn = document.getElementById('btn-confirm-import')!;
    let pendingHoldings: any[] = [];

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer?.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
    });

    async function handleFile(file: File) {
      try {
        const holdings = await parseCSV(file);
        pendingHoldings = holdings;
        previewContent.innerHTML = holdings.map(h =>
          `<div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border-glass)">
            <span style="font-weight:600">${h.ticker}</span>
            <span style="color:var(--text-muted)">${h.shares} shares @ ${formatCurrency(h.avgCost)}</span>
          </div>`
        ).join('');
        preview.style.display = 'block';
        importBtn.style.display = 'inline-flex';
        dropZone.innerHTML = `<div class="drop-zone-icon">✅</div><div class="drop-zone-text">${file.name}</div><div class="drop-zone-hint">${holdings.length} holdings found</div>`;
      } catch (e: any) {
        showToast(e.message || 'Failed to parse CSV', 'error');
      }
    }

    importBtn.addEventListener('click', () => {
      for (const h of pendingHoldings) {
        addHolding(portfolioId, h);
      }
      closeModal();
      showToast(`Imported ${pendingHoldings.length} holdings`, 'success');
      renderDashboard();
    });
  });
}

// ===== New Portfolio Modal =====
function showNewPortfolioModal() {
  showModal('Create Portfolio', `
    <div class="form-group">
      <label class="form-label">Portfolio Name</label>
      <input id="input-portfolio-name" class="form-input" placeholder="e.g. Retirement, Growth, Dividend..." type="text" />
    </div>
  `, `
    <button class="btn" onclick="document.getElementById('modal-overlay')?.remove()">Cancel</button>
    <button class="btn btn-primary" id="btn-confirm-create-portfolio">Create</button>
  `, () => {
    const input = document.getElementById('input-portfolio-name') as HTMLInputElement;
    input.focus();

    const confirm = () => {
      const name = input.value.trim();
      if (!name) { showToast('Please enter a name', 'error'); return; }
      createPortfolio(name);
      closeModal();
      showToast(`Created "${name}" portfolio`, 'success');
      renderDashboard();
    };

    document.getElementById('btn-confirm-create-portfolio')?.addEventListener('click', confirm);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); });
  });
}

// ===== Settings Modal =====
function showSettingsModal() {
  const state = getState();
  showModal('Settings', `
    <div class="form-group">
      <label class="form-label">Finnhub API Key</label>
      <input id="input-api-key" class="form-input" placeholder="Your Finnhub API key" type="text" value="${state.apiKey}" />
      <div class="form-hint">Get a free key at <a href="https://finnhub.io/register" target="_blank" style="color:var(--accent-blue);text-decoration:underline;">finnhub.io</a> (60 calls/min)</div>
    </div>
    <div class="form-group">
      <label class="form-label">Change PIN</label>
      <input id="input-new-pin" class="form-input" placeholder="New 4-digit PIN" type="text" maxlength="4" inputmode="numeric" />
      <div class="form-hint">Current PIN: ${state.pin.replace(/./g, '•')}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Rename Active Portfolio</label>
      <input id="input-rename-portfolio" class="form-input" placeholder="Portfolio name" type="text" value="${getActivePortfolio()?.name || ''}" />
    </div>
  `, `
    <button class="btn" onclick="document.getElementById('modal-overlay')?.remove()">Cancel</button>
    <button class="btn btn-primary" id="btn-save-settings">Save Changes</button>
  `, () => {
    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      const apiKey = (document.getElementById('input-api-key') as HTMLInputElement).value.trim();
      const newPin = (document.getElementById('input-new-pin') as HTMLInputElement).value.trim();
      const newName = (document.getElementById('input-rename-portfolio') as HTMLInputElement).value.trim();

      if (apiKey !== state.apiKey) setApiKey(apiKey);

      if (newPin) {
        if (/^\d{4}$/.test(newPin)) {
          setPin(newPin);
          showToast('PIN updated', 'success');
        } else {
          showToast('PIN must be 4 digits', 'error');
          return;
        }
      }

      if (newName && getActivePortfolio()) {
        renamePortfolio(getActivePortfolio()!.id, newName);
      }

      closeModal();
      showToast('Settings saved', 'success');
      renderDashboard();
    });
  });
}

// ==============================
//  EVENT BINDING
// ==============================
function bindHeaderEvents() {
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    const portfolio = getActivePortfolio();
    if (portfolio) {
      showToast('Refreshing prices...', 'info');
      refreshPrices(portfolio);
    }
  });

  document.getElementById('btn-game')?.addEventListener('click', launchGame);
  document.getElementById('btn-settings')?.addEventListener('click', showSettingsModal);
  document.getElementById('btn-open-settings-banner')?.addEventListener('click', showSettingsModal);

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    void 0; // logged out
    destroyChart();
    currentChart = null;
    renderPinScreen();
  });
}

function bindTabEvents() {
  document.querySelectorAll('.portfolio-tab[data-portfolio-id]').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = (tab as HTMLElement).dataset.portfolioId!;
      setActivePortfolio(id);
      currentChartSymbol = '';
      destroyChart();
      currentChart = null;
      renderDashboard();
    });
  });

  document.getElementById('btn-add-portfolio')?.addEventListener('click', showNewPortfolioModal);
  document.getElementById('btn-create-first-portfolio')?.addEventListener('click', showNewPortfolioModal);
}

function bindPortfolioEvents(portfolio: Portfolio) {
  document.getElementById('btn-add-ticker')?.addEventListener('click', showAddTickerModal);
  document.getElementById('btn-batch-add')?.addEventListener('click', showBatchAddModal);
  document.getElementById('btn-import-csv')?.addEventListener('click', showImportCSVModal);
  document.getElementById('btn-export-csv')?.addEventListener('click', () => exportPortfolioCSV(portfolio));

  document.getElementById('btn-delete-portfolio')?.addEventListener('click', () => {
    if (getState().portfolios.length <= 1) {
      showToast('Cannot delete the last portfolio', 'error');
      return;
    }
    if (confirm(`Delete "${portfolio.name}" and all its holdings?`)) {
      deletePortfolio(portfolio.id);
      destroyChart();
      currentChart = null;
      showToast('Portfolio deleted', 'success');
      renderDashboard();
    }
  });

  // Delete holding buttons (stop propagation to prevent edit modal opening)
  document.querySelectorAll('.delete-row-btn[data-delete-ticker]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ticker = (btn as HTMLElement).dataset.deleteTicker!;
      removeHolding(portfolio.id, ticker);
      showToast(`Removed ${ticker}`, 'success');
      renderDashboard();
    });
  });

  // Edit holding rows (click anywhere on the row)
  document.querySelectorAll('.holding-row[data-edit-ticker]').forEach(row => {
    row.addEventListener('click', () => {
      const ticker = (row as HTMLElement).dataset.editTicker!;
      const holding = portfolio.holdings.find(h => h.ticker === ticker);
      if (holding) showEditHoldingModal(holding);
    });
  });

  // Chart ticker buttons
  document.querySelectorAll('[data-chart-ticker]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentChartSymbol = (btn as HTMLElement).dataset.chartTicker!;
      document.querySelectorAll('[data-chart-ticker]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const title = document.getElementById('chart-title');
      if (title) title.textContent = `📊 ${currentChartSymbol} Price Chart`;
      if (currentChart && getState().apiKey) {
        loadChartData(currentChart, currentChartSymbol, currentChartPeriod, getHoldingInfo(portfolio, currentChartSymbol));
      }
    });
  });

  // Chart period buttons
  document.querySelectorAll('[data-chart-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentChartPeriod = (btn as HTMLElement).dataset.chartPeriod!;
      document.querySelectorAll('[data-chart-period]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (currentChart && currentChartSymbol && getState().apiKey) {
        loadChartData(currentChart, currentChartSymbol, currentChartPeriod, getHoldingInfo(portfolio, currentChartSymbol));
      }
    });
  });
}

// ==============================
//  DATA REFRESH
// ==============================
async function refreshPrices(portfolio: Portfolio) {
  const state = getState();
  if (!state.apiKey || portfolio.holdings.length === 0) {
    // Still mount chart and allocation even without API
    mountChartAndAllocation(portfolio);
    return;
  }

  const symbols = portfolio.holdings.map(h => h.ticker);
  const quotes = await fetchQuotesBatch(symbols);

  for (const [ticker, quote] of quotes) {
    updateHoldingPrices(portfolio.id, ticker, quote.c, quote.pc);
  }

  // Re-render stats and holdings (but don't re-fetch prices)
  renderDashboard(true);
}

function getHoldingInfo(portfolio: Portfolio, symbol: string): HoldingInfo | undefined {
  const h = portfolio.holdings.find(h => h.ticker === symbol);
  if (!h) return undefined;
  return { shares: h.shares, avgCost: h.avgCost };
}

function mountChartAndAllocation(portfolio: Portfolio) {
  // Mount TradingView chart
  const chartBody = document.getElementById('chart-body');
  if (chartBody && currentChartSymbol && getState().apiKey) {
    currentChart = initChart(chartBody);
    loadChartData(currentChart, currentChartSymbol, currentChartPeriod, getHoldingInfo(portfolio, currentChartSymbol));
  }

  // Mount allocation donut
  const donutEl = document.getElementById('allocation-donut');
  if (donutEl && portfolio.holdings.length > 0) {
    const totalValue = getPortfolioTotalValue(portfolio);
    const data = portfolio.holdings.map((h, i) => ({
      label: h.ticker,
      value: h.marketValue || (h.avgCost * h.shares),
      color: getDonutColor(i),
    }));
    renderDonutChart(donutEl, data, formatCurrency(totalValue), 'Total Value');
  }

  // Mount performers list
  const perfEl = document.getElementById('performers-list');
  if (perfEl && portfolio.holdings.length > 0) {
    const sorted = [...portfolio.holdings].sort((a, b) => (b.gainLossPct || 0) - (a.gainLossPct || 0));
    perfEl.innerHTML = sorted.map(h => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border-glass);">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-weight:700;font-size:0.85rem;">${h.ticker}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${h.name || ''}</span>
        </div>
        <span class="${(h.gainLossPct || 0) >= 0 ? 'positive-text' : 'negative-text'}" style="font-weight:700;font-size:0.85rem;">
          ${formatPct(h.gainLossPct || 0)}
        </span>
      </div>
    `).join('');
  }
}

// ==============================
//  EXPORT CSV
// ==============================
function exportPortfolioCSV(portfolio: Portfolio) {
  const totalValue = getPortfolioTotalValue(portfolio);
  const totalCost = getPortfolioTotalCost(portfolio);
  const totalGainLoss = getPortfolioTotalGainLoss(portfolio);
  const totalDayChange = getPortfolioDayChange(portfolio);

  // CSV header
  const headers = ['Ticker', 'Name', 'Shares', 'Avg Cost', 'Current Price', 'Day Change', 'Day Change %', 'Market Value', 'Cost Basis', 'Gain/Loss', 'Gain/Loss %', 'Weight %'];

  // CSV rows for each holding
  const rows = portfolio.holdings.map(h => {
    const price = h.currentPrice || h.avgCost;
    const mktVal = h.marketValue || (h.avgCost * h.shares);
    const costBasis = h.avgCost * h.shares;
    const weight = totalValue > 0 ? (mktVal / totalValue) * 100 : 0;
    return [
      h.ticker,
      `"${(h.name || h.ticker).replace(/"/g, '""')}"`,
      h.shares,
      h.avgCost.toFixed(2),
      price.toFixed(2),
      (h.change || 0).toFixed(2),
      (h.changePct || 0).toFixed(2),
      mktVal.toFixed(2),
      costBasis.toFixed(2),
      (h.gainLoss || 0).toFixed(2),
      (h.gainLossPct || 0).toFixed(2),
      weight.toFixed(1),
    ];
  });

  // Totals row
  const totalsRow = [
    'TOTAL',
    `"${portfolio.name}"`,
    '',
    '',
    '',
    totalDayChange.toFixed(2),
    '',
    totalValue.toFixed(2),
    totalCost.toFixed(2),
    totalGainLoss.toFixed(2),
    totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(2) : '0.00',
    '100.0',
  ];

  // Build CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '', // Empty separator line
    totalsRow.join(','),
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  link.download = `${portfolio.name.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Exported ${portfolio.holdings.length} holdings to CSV`, 'success');
}

// ==============================
//  UTILITY
// ==============================
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ==============================
//  GAME LAUNCHER
// ==============================
function launchGame(): void {
  const overlay = document.createElement('div');
  overlay.id = 'game-overlay';
  document.body.appendChild(overlay);
  renderGame(overlay, () => {
    destroyGame();
    overlay.remove();
  });
}

// ==============================
//  INIT
// ==============================
loadState();
renderPinScreen();
