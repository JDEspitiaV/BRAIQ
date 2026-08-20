import { Prediction, MarketType, TimeInput, TickerItem, ComboAssetConfig } from '../types';
import { fetchLiveTickerOverview } from './marketService';

/**
 * Direct client-side Gemini call if client has VITE_GEMINI_API_KEY.
 * There are NO hardcoded fake predictions: if Gemini is unreachable,
 * it throws an explicit Error.
 */
export const generatePredictionsWithGemini = async (
  time: TimeInput,
  priority: string | number,
  marketType: MarketType
): Promise<Prediction[]> => {
  const meta = (typeof import.meta !== 'undefined' ? import.meta : {}) as any;
  const apiKey = meta.env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY : '') || '';

  if (!apiKey) {
    throw new Error('Predictions service unavailable: neither server endpoint nor VITE_GEMINI_API_KEY is reachable.');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Act as a senior quantitative financial broker. Return ONLY a valid JSON array of 3 investment prediction objects matching:
                { "name": string, "ticker": string, "type": string, "confidence": number, "expectedProfit": string, "expectedLoss": string, "riskRewardRatio": string, "withdraw": string, "pros": string[], "cons": string[], "entryTarget": number, "stopLoss": number, "takeProfit": number, "budgetImpact": { "profitUsd": string, "lossUsd": string } }
                Market: ${marketType}, Priority: ${priority}, Time horizon hours: ${time.h + time.d * 24 + time.w * 168 + time.m * 720 + time.y * 8760}`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('Gemini API returned an empty response.');
  }

  const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
};

const TICKER_CACHE_KEY = 'ai_broker_ticker_v4';
const TICKER_CACHE_TTL = 30 * 1000;

/**
 * Live market overview for the ticker feed. Backed by /api/market-data or direct Binance API.
 * No hardcoded fake data fallbacks.
 */
export const fetchLiveMarketData = async (): Promise<TickerItem[]> => {
  const cachedRaw = localStorage.getItem(TICKER_CACHE_KEY);
  if (cachedRaw) {
    try {
      const { timestamp, data } = JSON.parse(cachedRaw);
      if (Date.now() - timestamp < TICKER_CACHE_TTL && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      localStorage.removeItem(TICKER_CACHE_KEY);
    }
  }

  // Try server endpoint first
  try {
    const response = await fetch('/api/market-data');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(TICKER_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
        return data;
      }
    }
  } catch {
    // If backend is unavailable, fall back to direct Binance API
  }

  const data = await fetchLiveTickerOverview();
  localStorage.setItem(TICKER_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
};

export const fetchPredictions = async (
  totalHours: number,
  riskScore: number | string,
  type: MarketType,
  lang: string,
  budget: number | null,
  comboSettings: ComboAssetConfig[] | null,
  context?: string
): Promise<Prediction[]> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers,
      body: JSON.stringify({ totalHours, riskScore, type, lang, budget, comboSettings, context }),
    });

    if (response.ok) {
      return await response.json();
    }

    const errData = await response.json().catch(() => ({}));
    if (errData.error) {
      throw new Error(errData.error);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // Server endpoint unreachable — attempt direct client call if key configured
  return await generatePredictionsWithGemini({ h: totalHours, d: 0, w: 0, m: 0, y: 0 }, riskScore, type);
};

export const searchAssets = async (query: string, lang: string): Promise<Prediction[]> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const response = await fetch('/api/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, lang }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Search API request failed (HTTP ${response.status})`);
  }

  return await response.json();
};
