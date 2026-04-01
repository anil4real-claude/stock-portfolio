// ========== CHART MODULE ==========
// Uses TradingView Lightweight Charts for professional financial visualization

import { createChart, ColorType, LineSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import { fetchCandles } from './api';

let chartInstance: IChartApi | null = null;

const CHART_COLORS = {
  background: 'transparent',
  textColor: '#94a3b8',
  lineColor: '#3b82f6',
  areaTopColor: 'rgba(59, 130, 246, 0.3)',
  areaBottomColor: 'rgba(59, 130, 246, 0.01)',
  gridColor: 'rgba(255, 255, 255, 0.03)',
  crosshairColor: 'rgba(255, 255, 255, 0.15)',
  volumeUpColor: 'rgba(34, 197, 94, 0.3)',
  volumeDownColor: 'rgba(239, 68, 68, 0.3)',
};

export function initChart(container: HTMLElement): IChartApi {
  if (chartInstance) {
    chartInstance.remove();
  }

  const chart = createChart(container, {
    layout: {
      background: { type: ColorType.Solid, color: CHART_COLORS.background },
      textColor: CHART_COLORS.textColor,
      fontFamily: "'Inter', sans-serif",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: CHART_COLORS.gridColor },
      horzLines: { color: CHART_COLORS.gridColor },
    },
    crosshair: {
      vertLine: { color: CHART_COLORS.crosshairColor, width: 1, style: 3 },
      horzLine: { color: CHART_COLORS.crosshairColor, width: 1, style: 3 },
    },
    rightPriceScale: {
      borderColor: CHART_COLORS.gridColor,
    },
    timeScale: {
      borderColor: CHART_COLORS.gridColor,
      timeVisible: false,
    },
    handleScroll: { vertTouchDrag: false },
    autoSize: true,
  });

  chartInstance = chart;
  return chart;
}

export function destroyChart(): void {
  if (chartInstance) {
    chartInstance.remove();
    chartInstance = null;
  }
}

interface PeriodConfig {
  resolution: string;
  daysBack: number;
  label: string;
}

export const CHART_PERIODS: Record<string, PeriodConfig> = {
  '1W': { resolution: '15', daysBack: 7, label: '1 Week' },
  '1M': { resolution: '60', daysBack: 30, label: '1 Month' },
  '3M': { resolution: 'D', daysBack: 90, label: '3 Months' },
  '6M': { resolution: 'D', daysBack: 180, label: '6 Months' },
  '1Y': { resolution: 'D', daysBack: 365, label: '1 Year' },
  'ALL': { resolution: 'W', daysBack: 365 * 5, label: 'All Time' },
};

export async function loadChartData(chart: IChartApi, symbol: string, periodKey: string): Promise<void> {
  const period = CHART_PERIODS[periodKey];
  if (!period) return;

  // Remove old series
  const seriesList = chart.series();
  for (const s of seriesList) {
    chart.removeSeries(s);
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - period.daysBack * 86400;

  const candles = await fetchCandles(symbol, period.resolution, from, now);
  if (!candles || !candles.c || candles.c.length === 0) {
    return;
  }

  // Area series for price
  const areaSeries = chart.addSeries(AreaSeries, {
    lineColor: CHART_COLORS.lineColor,
    topColor: CHART_COLORS.areaTopColor,
    bottomColor: CHART_COLORS.areaBottomColor,
    lineWidth: 2,
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
  });

  const priceData = candles.t.map((t, i) => ({
    time: t as any,
    value: candles.c[i],
  }));

  areaSeries.setData(priceData);

  // Volume histogram
  const volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  });

  chart.priceScale('volume').applyOptions({
    scaleMargins: { top: 0.8, bottom: 0 },
  });

  const volumeData = candles.t.map((t, i) => ({
    time: t as any,
    value: candles.v[i],
    color: candles.c[i] >= candles.o[i] ? CHART_COLORS.volumeUpColor : CHART_COLORS.volumeDownColor,
  }));

  volumeSeries.setData(volumeData);

  chart.timeScale().fitContent();
}

// ===== DONUT CHART (SVG) =====

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

const DONUT_COLORS = [
  '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#06b6d4',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
];

export function renderDonutChart(container: HTMLElement, data: DonutSegment[], centerText?: string, centerLabel?: string): void {
  if (data.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:2rem"><div class="empty-icon">📊</div><div class="empty-text">No data</div></div>';
    return;
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;
  const innerRadius = 55;

  let currentAngle = -Math.PI / 2;
  let paths = '';

  data.forEach((seg, i) => {
    const pct = seg.value / total;
    const angle = pct * Math.PI * 2;
    const gap = data.length > 1 ? 0.02 : 0;

    const startAngle = currentAngle + gap;
    const endAngle = currentAngle + angle - gap;

    const x1Outer = cx + radius * Math.cos(startAngle);
    const y1Outer = cy + radius * Math.sin(startAngle);
    const x2Outer = cx + radius * Math.cos(endAngle);
    const y2Outer = cy + radius * Math.sin(endAngle);

    const x1Inner = cx + innerRadius * Math.cos(endAngle);
    const y1Inner = cy + innerRadius * Math.sin(endAngle);
    const x2Inner = cx + innerRadius * Math.cos(startAngle);
    const y2Inner = cy + innerRadius * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    paths += `<path d="M ${x1Outer} ${y1Outer} A ${radius} ${radius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner} Z" fill="${seg.color}" opacity="0.85" style="transition: opacity 0.2s" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
      <title>${seg.label}: $${seg.value.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${(pct * 100).toFixed(1)}%)</title>
    </path>`;

    currentAngle += angle;
  });

  container.innerHTML = `
    <div class="donut-container">
      <svg class="donut-chart" viewBox="0 0 ${size} ${size}">
        ${paths}
      </svg>
      ${centerText ? `<div class="donut-center">
        <div class="donut-center-value">${centerText}</div>
        ${centerLabel ? `<div class="donut-center-label">${centerLabel}</div>` : ''}
      </div>` : ''}
    </div>
    <div class="allocation-legend">
      ${data.map((seg, i) => `
        <div class="legend-item">
          <div class="legend-dot" style="background:${seg.color}"></div>
          <span class="legend-label">${seg.label}</span>
          <span class="legend-value">${(seg.value / total * 100).toFixed(1)}%</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function getDonutColor(index: number): string {
  return DONUT_COLORS[index % DONUT_COLORS.length];
}
