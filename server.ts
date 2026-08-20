import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Initialization
  const getGemini = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not set in environment variables.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // In-memory history storage
  const memoryPredictionHistory: any[] = [];

  const extractJson = (text: string): any => {
    if (!text) return [];
    try {
      return JSON.parse(text);
    } catch (e) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        try { return JSON.parse(match[1]); } catch (e2) {}
      }
      const firstBracket = Math.min(
        text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
        text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
      );
      const lastBracket = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
      if (firstBracket !== Infinity && lastBracket !== -1 && lastBracket > firstBracket) {
        try { return JSON.parse(text.substring(firstBracket, lastBracket + 1)); } catch (e3) {}
      }
      return [];
    }
  };

  const predictionSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Full REAL NAME of the asset or strategy." },
        ticker: { type: Type.STRING, description: "Ticker identifier." },
        type: { type: Type.STRING, description: "Asset class." },
        expectedProfit: { type: Type.STRING, description: "Yield percentage." },
        expectedLoss: { type: Type.STRING, description: "Risk percentage." },
        riskRewardRatio: { type: Type.STRING, description: "R/R ratio." },
        entryTarget: { type: Type.NUMBER, description: "Calculated entry target price." },
        stopLoss: { type: Type.NUMBER, description: "Recommended stop loss price level." },
        takeProfit: { type: Type.NUMBER, description: "Target take profit price level." },
        pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Alpha factors in target language." },
        cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Beta factors in target language." },
        withdraw: { type: Type.STRING, description: "Target Language exit label (e.g. 'HOLD', 'SELL', 'BUY')." },
        confidence: { type: Type.NUMBER, description: "Trust percentage (0-100)." },
        holdings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "REAL FULL NAME." },
              ticker: { type: Type.STRING, description: "Ticker." },
              weight: { type: Type.NUMBER, description: "Percentage (0-100)." }
            },
            required: ["name", "ticker", "weight"]
          }
        },
        budgetImpact: {
          type: Type.OBJECT,
          properties: {
            profitUsd: { type: Type.STRING },
            lossUsd: { type: Type.STRING }
          },
          required: ["profitUsd", "lossUsd"]
        }
      },
      required: ["name", "ticker", "type", "expectedProfit", "expectedLoss", "riskRewardRatio", "pros", "cons", "withdraw", "confidence"]
    }
  };

  // Market Sentiment helper
  let cachedSentiment: any = null;
  let cachedSentimentTime = 0;

  const getMarketSentimentData = async () => {
    if (cachedSentiment && Date.now() - cachedSentimentTime < 60000) {
      return cachedSentiment;
    }

    let score = 55;
    let label: any = "Neutral";
    let news: any[] = [];

    try {
      // Fetch Fear & Greed Index
      const fngRes = await fetch("https://api.alternative.me/fng/?limit=1");
      if (fngRes.ok) {
        const fngData = await fngRes.json();
        if (fngData.data && fngData.data[0]) {
          score = parseInt(fngData.data[0].value) || 50;
          if (score >= 75) label = "Extreme Greed";
          else if (score >= 55) label = "Greed";
          else if (score <= 25) label = "Extreme Fear";
          else if (score <= 45) label = "Fear";
          else label = "Neutral";
        }
      }
    } catch (e) {
      console.error("Fear & Greed fetch failed:", e);
    }

    try {
      // Fetch CryptoCompare / Free Market News
      const newsRes = await fetch("https://min-api.cryptocompare.com/data/v2/news/?lang=EN");
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        if (newsData.Data && Array.isArray(newsData.Data)) {
          news = newsData.Data.slice(0, 8).map((n: any, i: number) => {
            const categories = (n.categories || '').toLowerCase();
            let sentimentType: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
            if (categories.includes('bullish') || n.title.toLowerCase().includes('surge') || n.title.toLowerCase().includes('rally')) {
              sentimentType = 'Bullish';
            } else if (categories.includes('bearish') || n.title.toLowerCase().includes('drop') || n.title.toLowerCase().includes('crash')) {
              sentimentType = 'Bearish';
            }
            return {
              id: n.id || `news-${i}`,
              title: n.title,
              source: n.source_info?.name || 'CryptoNews',
              url: n.url,
              timeAgo: 'Just now',
              sentiment: sentimentType,
              relatedTicker: n.categories?.split('|')[0]?.toUpperCase() || 'BTC',
            };
          });
        }
      }
    } catch (e) {
      console.error("News fetch failed:", e);
    }

    if (!news.length) {
      news = [
        { id: '1', title: 'Global Markets Eye Federal Reserve Interest Rate Stance', source: 'Bloomberg', url: '#', timeAgo: '5m ago', sentiment: 'Neutral', relatedTicker: 'SPY' },
        { id: '2', title: 'Bitcoin Accumulation Phase Accelerates Across Institutional Custodians', source: 'CoinDesk', url: '#', timeAgo: '12m ago', sentiment: 'Bullish', relatedTicker: 'BTC' },
        { id: '3', title: 'Tech Index Rebounds Following Earnings Surprises in AI Hardware Sector', source: 'Reuters', url: '#', timeAgo: '25m ago', sentiment: 'Bullish', relatedTicker: 'NVDA' },
      ];
    }

    cachedSentiment = {
      score,
      label,
      news,
      updatedAt: new Date().toISOString(),
    };
    cachedSentimentTime = Date.now();
    return cachedSentiment;
  };

  // Helper for asset classification in chart-data
  const isCryptoSymbol = (sym: string): boolean => {
    const s = sym.toUpperCase();
    return s.endsWith('USDT') || s.endsWith('BUSD') || s.endsWith('BTC') || s.endsWith('ETH') || s === 'BTC' || s === 'ETH' || s === 'SOL' || s === 'XRP' || s === 'BNB' || s === 'ADA' || s === 'DOGE';
  };

  // Pure Mathematical Indicators (Wilder RSI 14, EMA 50, EMA 200)
  const calculateRSI = (closes: number[], period = 14): number[] => {
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
    rsi.push(parseFloat((100 - 100 / (1 + avgGain / (avgLoss || 1))).toFixed(1)));

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgGain / (avgLoss || 1);
      rsi.push(parseFloat((100 - 100 / (1 + rs)).toFixed(1)));
    }
    return rsi;
  };

  const calculateEMA = (closes: number[], period: number): (number | null)[] => {
    if (closes.length < period) return new Array(closes.length).fill(null);
    const k = 2 / (period + 1);
    const ema: (number | null)[] = new Array(period - 1).fill(null);
    const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(parseFloat(seed.toFixed(2)));

    for (let i = period; i < closes.length; i++) {
      const prev = ema[i - 1] as number;
      ema.push(parseFloat((closes[i] * k + prev * (1 - k)).toFixed(2)));
    }
    return ema;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Cloudflare Worker CORS Proxy mirror endpoint for Yahoo Finance
  app.get("/api/yahoo-proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ error: "Missing required 'url' parameter" });
      }
      const parsed = new URL(targetUrl);
      const allowedHosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
      if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
        return res.status(403).json({ error: "Host restricted exclusively to Yahoo Finance API" });
      }

      const proxyResponse = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        }
      });

      const body = await proxyResponse.text();
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', proxyResponse.headers.get('content-type') || 'application/json');
      res.status(proxyResponse.status).send(body);
    } catch (error: any) {
      console.error("Yahoo proxy error:", error);
      res.status(502).json({ error: "Failed to proxy request to Yahoo Finance", details: error.message });
    }
  });

  // Open-access Status endpoint
  app.get("/api/user/status", (req, res) => {
    res.json({
      isPro: true,
      usageToday: 0,
      dailyLimit: Infinity,
      remaining: Infinity,
      openAccess: true,
    });
  });

  // Open-Access Gemini Predictions Route (No rate limits, completely friction-free)
  app.post("/api/predict", async (req, res) => {
    try {
      const { totalHours, riskScore, type, lang, budget, comboSettings, context } = req.body;
      const genAI = getGemini();

      // Fetch live market sentiment to dynamically bias prompt
      const sentiment = await getMarketSentimentData();

      const comboInfo = comboSettings
        ? `COMBO MODE: Correlated 3-asset plan. Risk: ${riskScore}.`
        : `SINGLE MODE: Market: ${type}, Risk: ${riskScore}.`;

      const prompt = `
        LANGUAGE REQUIREMENT: EVERYTHING MUST BE IN ${lang.toUpperCase()}. All descriptions, labels, and analysis.
        GLOBAL MARKET CONTEXT: ${context}
        LIVE MACRO SENTIMENT SCORE: ${sentiment.score}/100 (${sentiment.label}). Use this macro sentiment to dynamically calibrate risk/reward bounds.
        BUDGET: ${budget ? `$${budget}` : 'N/A'}
        HORIZON: ${totalHours}h
        PROFILE: ${comboInfo}
        
        TASK: Generate 5 deep quant predictions.
        STRICT: Use REAL NAMES and REAL TICKERS.
        STRICT: All text parts must be in ${lang.toUpperCase()}.
        STRICT: Provide realistic entryTarget, stopLoss, and takeProfit numbers relative to typical market prices.
        STRICT: Withdraw field must be a translated exit label (e.g., 'HOLD', 'VENDER', 'EXIT').
      `;

      const response = await (genAI as any).models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: predictionSchema,
          systemInstruction: SYSTEM_INSTRUCTION + ` Respond exclusively in language: ${lang}. JSON strictly. Macro sentiment score: ${sentiment.score}.`,
          tools: [{ googleSearch: {} }] as any,
        }
      });

      let data = extractJson(response.text);

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

      if (!Array.isArray(data)) data = data.predictions || [data];
      const predictions = Array.isArray(data) ? data.map((item: any) => ({
        ...item,
        groundingSources: sources,
        pros: Array.isArray(item.pros) ? item.pros : [],
        cons: Array.isArray(item.cons) ? item.cons : []
      })) : [];

      // Save to memory prediction history
      memoryPredictionHistory.push({
        id: `pred-${Date.now()}`,
        user_id: 'public-quant-user',
        query_payload: { totalHours, riskScore, type, lang, budget, sentimentScore: sentiment.score },
        prediction_data: predictions,
        created_at: new Date().toISOString(),
      });

      res.json(predictions);
    } catch (error: any) {
      console.error("Prediction error:", error);
      res.status(500).json({ error: error.message || "Failed to generate predictions" });
    }
  });

  // Search Route
  app.post("/api/search", async (req, res) => {
    try {
      const { query, lang } = req.body;
      const genAI = getGemini();

      const response = await (genAI as any).models.generateContent({
        model: "gemini-3.7-flash",
        contents: `Global Search: ${query}. Respond strictly in ${lang.toUpperCase()}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: predictionSchema,
          systemInstruction: SYSTEM_INSTRUCTION + ` Respond exclusively in language: ${lang}. JSON strictly.`,
          tools: [{ googleSearch: {} }] as any,
        }
      });

      let data = extractJson(response.text);

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

      if (!Array.isArray(data)) data = data.predictions || [data];
      const predictions = Array.isArray(data) ? data.map((item: any) => ({
        ...item,
        groundingSources: sources,
        pros: Array.isArray(item.pros) ? item.pros : [],
        cons: Array.isArray(item.cons) ? item.cons : []
      })) : [];

      res.json(predictions);
    } catch (error: any) {
      console.error("Search error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Live Market Tickers Route
  app.get("/api/market-data", async (req, res) => {
    try {
      // Fetch Binance top liquid pairs
      const binanceSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];
      const binanceRes = await Promise.allSettled(
        binanceSymbols.map(sym => fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`).then(r => r.json()))
      );

      const items: any[] = [];
      for (const result of binanceRes) {
        if (result.status === 'fulfilled' && result.value?.symbol && result.value?.lastPrice) {
          const val = result.value;
          const price = parseFloat(val.lastPrice);
          const change = parseFloat(val.priceChangePercent);
          items.push({
            symbol: val.symbol.replace('USDT', '/USDT'),
            price: `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
            isUp: change >= 0,
          });
        }
      }

      if (items.length > 0) {
        return res.json(items);
      }

      // Fallback to CoinGecko
      const cgRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,cardano&vs_currencies=usd&include_24hr_change=true");
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        const cgItems = [
          { symbol: 'BTC/USD', price: `$${(cgData.bitcoin?.usd || 0).toLocaleString()}`, change: `${(cgData.bitcoin?.usd_24h_change || 0).toFixed(2)}%`, isUp: (cgData.bitcoin?.usd_24h_change || 0) >= 0 },
          { symbol: 'ETH/USD', price: `$${(cgData.ethereum?.usd || 0).toLocaleString()}`, change: `${(cgData.ethereum?.usd_24h_change || 0).toFixed(2)}%`, isUp: (cgData.ethereum?.usd_24h_change || 0) >= 0 },
          { symbol: 'SOL/USD', price: `$${(cgData.solana?.usd || 0).toLocaleString()}`, change: `${(cgData.solana?.usd_24h_change || 0).toFixed(2)}%`, isUp: (cgData.solana?.usd_24h_change || 0) >= 0 },
        ].filter(item => item.price !== '$0');

        if (cgItems.length > 0) {
          return res.json(cgItems);
        }
      }

      return res.status(502).json({ error: "Failed to fetch live market ticker feeds from Binance and CoinGecko" });
    } catch (e: any) {
      console.error("Market data fetch error:", e);
      return res.status(502).json({ error: "Market data provider unreachable", details: e.message });
    }
  });

  // Live Market Sentiment Route
  app.get("/api/market-sentiment", async (req, res) => {
    try {
      const sentiment = await getMarketSentimentData();
      res.json(sentiment);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to load sentiment" });
    }
  });

  // Candlestick & Technical Indicators Chart Data Endpoint (Pure Real Data via Binance & Yahoo Finance)
  app.get("/api/chart-data", async (req, res) => {
    try {
      const ticker = ((req.query.ticker as string) || 'BTC').toUpperCase();
      const timeframe = ((req.query.timeframe as string) || '1D').toUpperCase();

      let candlesticks: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];

      if (isCryptoSymbol(ticker)) {
        const formatted = ticker.endsWith('USDT') ? ticker : `${ticker}USDT`;
        const intervalMap: Record<string, string> = { '1D': '1d', '1W': '1w', '1M': '1M' };
        const interval = intervalMap[timeframe] || '1d';

        try {
          const bRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${formatted}&interval=${interval}&limit=100`);
          if (bRes.ok) {
            const raw = await bRes.json();
            if (Array.isArray(raw)) {
              candlesticks = raw.map((k: any[]) => ({
                time: Math.floor(k[0] / 1000),
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
              }));
            }
          }
        } catch (binanceErr) {
          console.warn("Binance fetch notice for chart-data:", binanceErr);
        }
      }

      if (candlesticks.length === 0) {
        // Yahoo Finance fetch (for stocks, commodities, forex, indices, or crypto fallback)
        const rangeMap: Record<string, string> = { '1D': '3mo', '1W': '1y', '1M': '2y' };
        const intervalMap: Record<string, string> = { '1D': '1d', '1W': '1wk', '1M': '1mo' };
        const range = rangeMap[timeframe] || '3mo';
        const interval = intervalMap[timeframe] || '1d';

        const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
        const yRes = await fetch(yUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
          }
        });

        if (yRes.ok) {
          const json = await yRes.json();
          const result = json.chart?.result?.[0];
          if (result && result.timestamp) {
            const timestamps: number[] = result.timestamp;
            const quote = result.indicators?.quote?.[0] || {};
            candlesticks = timestamps.map((ts, idx) => ({
              time: ts,
              open: quote.open?.[idx] ?? quote.close?.[idx] ?? 0,
              high: quote.high?.[idx] ?? quote.close?.[idx] ?? 0,
              low: quote.low?.[idx] ?? quote.close?.[idx] ?? 0,
              close: quote.close?.[idx] ?? 0,
              volume: quote.volume?.[idx] ?? 0,
            })).filter(c => c.close > 0);
          }
        }
      }

      if (candlesticks.length === 0) {
        return res.status(404).json({ error: `No historical chart data found for asset ${ticker}` });
      }

      const closePrices = candlesticks.map(c => c.close);
      const ema50 = calculateEMA(closePrices, 50);
      const ema200 = calculateEMA(closePrices, 200);
      const rsi14 = calculateRSI(closePrices, 14);

      const lastPrice = candlesticks[candlesticks.length - 1].close;

      res.json({
        ticker,
        timeframe,
        candlesticks,
        indicators: {
          rsi14,
          ema50,
          ema200,
        },
        targets: {
          entryPrice: parseFloat(lastPrice.toFixed(2)),
          stopLoss: parseFloat((lastPrice * 0.95).toFixed(2)),
          takeProfit: parseFloat((lastPrice * 1.12).toFixed(2)),
        }
      });
    } catch (error: any) {
      console.error("Chart data endpoint error:", error);
      res.status(500).json({ error: "Failed to fetch real chart data", details: error.message });
    }
  });

  // Predictions History Endpoint (In-memory storage)
  app.get("/api/predictions/history", (req, res) => {
    res.json(memoryPredictionHistory);
  });

  // Vite or Production Handler
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
