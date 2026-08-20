import { CryptoSentimentData, MathematicalAnalysisResult, OHLCVData } from '../types';

/**
 * ── 1. CRYPTO SENTIMENT ──────────────────────────────────────────────
 * Fear & Greed Index — Alternative.me public API (crypto-only, no key required).
 */
export const fetchCryptoFearAndGreed = async (): Promise<CryptoSentimentData> => {
  const res = await fetch('https://api.alternative.me/fng/?limit=1');
  if (!res.ok) {
    throw new Error(`Alternative.me Fear & Greed request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  const first = data?.data?.[0];
  if (!first) {
    throw new Error('Alternative.me returned an empty payload.');
  }

  return {
    score: parseInt(first.value, 10),
    label: first.value_classification as CryptoSentimentData['label'],
    lastUpdated: new Date(parseInt(first.timestamp, 10) * 1000).toISOString(),
  };
};

/**
 * ── 2. PURE MATHEMATICAL FUNCTIONS (No Mocks / No Hallucinated Data) ──
 */

/**
 * Computes RSI (Wilder's smoothing method).
 */
export const computeRSI = (closes: number[], period = 14): number[] => {
  if (closes.length <= period) return [];

  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss || 1);
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
};
export const calculateRSI = computeRSI;

/**
 * Computes Exponential Moving Average (EMA).
 */
export const computeEMA = (closes: number[], period: number): (number | null)[] => {
  if (closes.length < period) return new Array(closes.length).fill(null);

  const k = 2 / (period + 1);
  const ema: (number | null)[] = new Array(period - 1).fill(null);
  const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(seed);

  for (let i = period; i < closes.length; i++) {
    const prev = ema[i - 1] as number;
    ema.push(closes[i] * k + prev * (1 - k));
  }

  return ema;
};
export const calculateEMA = computeEMA;

/**
 * Computes standard deviation of a series.
 */
export const computeStdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

/**
 * Computes volatility percentage from close prices.
 */
export const computeVolatilityPct = (closes: number[], lookback = 20): number => {
  if (closes.length === 0) return 0;
  const slice = closes.slice(-lookback);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  if (mean === 0) return 0;
  const stdDev = computeStdDev(slice);
  return (stdDev / mean) * 100;
};

export const calculateStandardDeviation = (closes: number[]): { stdDev: number; volatilityPercentage: number } => {
  if (closes.length === 0) return { stdDev: 0, volatilityPercentage: 0 };

  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  const stdDev = computeStdDev(closes);

  return {
    stdDev: parseFloat(stdDev.toFixed(4)),
    volatilityPercentage: parseFloat(((stdDev / mean) * 100).toFixed(2)),
  };
};

/**
 * Combines RSI, EMA cross, and volatility into a unified MathematicalAnalysisResult.
 */
export const computeTechnicalIndicators = (candlesticks: OHLCVData[]): MathematicalAnalysisResult => {
  if (!candlesticks || candlesticks.length < 15) {
    return {
      rsi14: [],
      latestRsi: 50,
      ema50: [],
      ema200: [],
      latestEma50: null,
      latestEma200: null,
      standardDeviation: 0,
      volatilityPercentage: 0,
      momentumScore: 50,
      momentumDirection: 'Neutral / Consolidating',
      momentumDescription: 'Insufficient period candles to evaluate technical mathematical indicators (minimum 15 required).',
    };
  }

  const closes = candlesticks.map(c => c.close);
  const rsi14 = computeRSI(closes, 14);
  const latestRsi = rsi14.length > 0 ? rsi14[rsi14.length - 1] : 50;

  const ema50 = computeEMA(closes, 50);
  const ema200 = computeEMA(closes, 200);
  const latestEma50 = ema50[ema50.length - 1];
  const latestEma200 = ema200[ema200.length - 1];

  const { stdDev, volatilityPercentage } = calculateStandardDeviation(closes);

  let momentumScore = 50;
  if (latestRsi > 70) momentumScore += 25;
  else if (latestRsi > 50) momentumScore += 15;
  else if (latestRsi < 30) momentumScore -= 25;
  else momentumScore -= 10;

  if (latestEma50 !== null && latestEma200 !== null) {
    momentumScore += latestEma50 > latestEma200 ? 20 : -20;
  }
  momentumScore = Math.max(0, Math.min(100, momentumScore));

  let momentumDirection: MathematicalAnalysisResult['momentumDirection'] = 'Neutral / Consolidating';
  if (momentumScore >= 80) momentumDirection = 'Strong Bullish';
  else if (momentumScore >= 60) momentumDirection = 'Bullish';
  else if (momentumScore <= 20) momentumDirection = 'Strong Bearish';
  else if (momentumScore <= 40) momentumDirection = 'Bearish';

  return {
    rsi14,
    latestRsi,
    ema50,
    ema200,
    latestEma50,
    latestEma200,
    standardDeviation: stdDev,
    volatilityPercentage,
    momentumScore,
    momentumDirection,
    momentumDescription: `RSI(14) at ${latestRsi.toFixed(1)}, ${volatilityPercentage.toFixed(2)}% volatility. Pure mathematical calculation outputs ${momentumDirection.toLowerCase()}.`,
  };
};
export const computeMomentumFromOHLCV = computeTechnicalIndicators;
