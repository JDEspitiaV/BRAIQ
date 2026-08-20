import { OHLCVData, AssetClassCategory, MathematicalAnalysisResult } from '../types';
import { computeTechnicalIndicators } from './analysisService';
import { evaluateOraclesAgainstRisk } from './auditService';

/**
 * Base URL of the Cloudflare Worker (worker.ts) that proxies Yahoo Finance
 * requests with CORS headers attached. Set this in your environment:
 *   VITE_CF_WORKER_URL=https://braiq-yahoo-proxy.<your-subdomain>.workers.dev
 * There is no public fallback proxy — if this is missing, traditional-asset
 * requests fail loudly with an explicit Error.
 */
const getWorkerBaseUrl = (): string => {
  const meta = (typeof import.meta !== 'undefined' ? import.meta : {}) as any;
  const url =
    meta.env?.VITE_CF_WORKER_URL ||
    (typeof process !== 'undefined' ? process.env?.VITE_CF_WORKER_URL : '') ||
    '';

  if (!url) {
    throw new Error(
      'VITE_CF_WORKER_URL is not configured. Deploy worker.ts to Cloudflare and set VITE_CF_WORKER_URL in your environment variables.'
    );
  }
  return url.replace(/\/$/, '');
};

export const classifyAssetSymbol = (symbol: string): AssetClassCategory => {
  const s = symbol.toUpperCase();
  if (s.endsWith('USDT') || s.endsWith('BUSD') || s.endsWith('BTC') || s.endsWith('ETH') || s === 'BTC' || s === 'ETH' || s === 'SOL') {
    return 'crypto';
  }
  if (s.includes('=F') || s === 'GOLD' || s === 'OIL' || s === 'SILVER' || s === 'GC=F' || s === 'CL=F') {
    return 'commodities';
  }
  if (s.includes('=X')) {
    return 'forex';
  }
  return 'stocks';
};

/* ── 1. CRYPTO: Binance Public REST API (Direct, no proxy needed) ── */

export const fetchBinance24hrTicker = async (symbol: string) => {
  const formatted = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
  const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${formatted}`);
  if (!res.ok) {
    throw new Error(`Binance 24hr ticker request failed for ${formatted} (HTTP ${res.status})`);
  }

  const data = await res.json();
  const price = parseFloat(data.lastPrice);

  evaluateOraclesAgainstRisk({
    symbol: formatted,
    price,
    source: 'BINANCE',
    timestamp: new Date().toISOString(),
  });

  return {
    symbol: formatted,
    price,
    changePercent: parseFloat(data.priceChangePercent),
    high: parseFloat(data.highPrice),
    low: parseFloat(data.lowPrice),
    volume: parseFloat(data.volume),
  };
};

const BINANCE_INTERVAL_MAP: Record<'1D' | '1W' | '1M', string> = {
  '1D': '1d',
  '1W': '1w',
  '1M': '1M',
};

export const fetchBinanceKlines = async (
  symbol: string,
  timeframe: '1D' | '1W' | '1M' = '1D'
): Promise<OHLCVData[]> => {
  const formatted = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
  const interval = BINANCE_INTERVAL_MAP[timeframe] || '1d';

  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${formatted}&interval=${interval}&limit=250`);
  if (!res.ok) {
    throw new Error(`Binance klines request failed for ${formatted} (HTTP ${res.status})`);
  }

  const raw = await res.json();
  return raw.map((k: any[]) => ({
    timestamp: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
};

/* ── 2. TRADITIONAL ASSETS: Yahoo Finance via Cloudflare Worker CORS Proxy ── */

const YAHOO_RANGE_MAP: Record<string, string> = { '1D': '3mo', '1W': '1y', '1M': '2y', '5d': '5d', '1mo': '1mo', '3mo': '3mo', '1y': '1y', '2y': '2y' };
const YAHOO_INTERVAL_MAP: Record<string, string> = { '1D': '1d', '1W': '1wk', '1M': '1mo', '1d': '1d', '1wk': '1wk', '1mo': '1mo' };

export const fetchYahooChartData = async (
  symbol: string,
  timeframeOrRange: '1D' | '1W' | '1M' | string = '1D',
  optionalInterval?: string
): Promise<OHLCVData[]> => {
  const workerBase = getWorkerBaseUrl();

  let range = '3mo';
  let interval = '1d';

  if (optionalInterval) {
    range = timeframeOrRange;
    interval = optionalInterval;
  } else {
    range = YAHOO_RANGE_MAP[timeframeOrRange] || '3mo';
    interval = YAHOO_INTERVAL_MAP[timeframeOrRange] || '1d';
  }

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const proxiedUrl = `${workerBase}/?url=${encodeURIComponent(yahooUrl)}`;

  const res = await fetch(proxiedUrl);
  if (!res.ok) {
    throw new Error(`Cloudflare Worker / Yahoo Finance request failed for ${symbol} (HTTP ${res.status})`);
  }

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) {
    const yahooError = json.chart?.error?.description || 'No result payload returned by Yahoo Finance';
    throw new Error(`Invalid Yahoo Finance response for ${symbol}: ${yahooError}`);
  }

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};

  return timestamps
    .map((ts, idx) => ({
      timestamp: ts,
      open: quote.open?.[idx] ?? quote.close?.[idx] ?? 0,
      high: quote.high?.[idx] ?? quote.close?.[idx] ?? 0,
      low: quote.low?.[idx] ?? quote.close?.[idx] ?? 0,
      close: quote.close?.[idx] ?? 0,
      volume: quote.volume?.[idx] ?? 0,
    }))
    .filter((candle: OHLCVData) => candle.close > 0);
};

export const fetchYahooQuoteSnapshot = async (symbol: string) => {
  const candles = await fetchYahooChartData(symbol, '1D');
  if (candles.length === 0) {
    throw new Error(`No Yahoo Finance quote data returned for ${symbol}`);
  }

  const last = candles[candles.length - 1];
  const prev = candles.length > 1 ? candles[candles.length - 2] : last;
  const changePercent = prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    price: last.close,
    changePercent: parseFloat(changePercent.toFixed(2)),
    high: last.high,
    low: last.low,
    volume: last.volume,
  };
};

/* ── 3. COMBINED COMPLETE PAYLOAD (OHLCV + Mathematical Indicators) ── */

export const fetchCompleteAssetChartPayload = async (
  symbol: string,
  timeframe: '1D' | '1W' | '1M' = '1D'
) => {
  const category = classifyAssetSymbol(symbol);
  const candlesticks =
    category === 'crypto'
      ? await fetchBinanceKlines(symbol, timeframe)
      : await fetchYahooChartData(symbol, timeframe);

  const indicators = computeTechnicalIndicators(candlesticks);
  const lastClose = candlesticks.length > 0 ? candlesticks[candlesticks.length - 1].close : 0;

  return {
    symbol,
    assetClass: category,
    candlesticks,
    indicators,
    targets: {
      entryPrice: parseFloat(lastClose.toFixed(2)),
      stopLoss: parseFloat((lastClose * 0.95).toFixed(2)),
      takeProfit: parseFloat((lastClose * 1.12).toFixed(2)),
    },
  };
};

export const fetchLiveTickerOverview = async () => {
  const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
  const results = await Promise.allSettled(cryptoSymbols.map(s => fetchBinance24hrTicker(s)));

  const successes = results.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchBinance24hrTicker>>> => r.status === 'fulfilled'
  );

  if (successes.length === 0) {
    throw new Error('All Binance ticker requests failed — check network access or Binance API rate limits.');
  }

  return successes.map(r => ({
    symbol: r.value.symbol,
    price: `$${r.value.price.toLocaleString()}`,
    change: `${r.value.changePercent >= 0 ? '+' : ''}${r.value.changePercent.toFixed(2)}%`,
    isUp: r.value.changePercent >= 0,
  }));
};

export { computeTechnicalIndicators };
