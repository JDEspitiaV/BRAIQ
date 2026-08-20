export type Language = 'es' | 'en' | 'fr';

export enum MarketType {
  GENERAL = 'general',
  CRYPTO = 'crypto',
  STOCKS = 'stocks',
  COMMODITIES = 'commodities',
  FOREX = 'forex',
  ETFS = 'etfs',
  INDEXES = 'indexes',
  BONDS = 'bonds',
  MUTUAL_FUNDS = 'mutual_funds',
  COMBO = 'combo'
}

export type AssetClassCategory = 'crypto' | 'equities' | 'stocks' | 'commodities' | 'indices' | 'bonds' | 'forex';

export type HorizonMode = 'precise' | 'calendar';

export interface TimeInput {
  h: number;
  d: number;
  w: number;
  m: number;
  y: number;
}

export interface ComboAssetConfig {
  type: MarketType;
  risk: number;
  isAuto: boolean;
}

export interface Holding {
  name: string;
  ticker: string;
  weight: number;
}

export interface Prediction {
  name: string;
  ticker: string;
  type: string;
  expectedProfit: string;
  expectedLoss: string;
  riskRewardRatio: string;
  pros: string[];
  cons: string[];
  withdraw: string;
  confidence: number;
  entryTarget?: number;
  stopLoss?: number;
  takeProfit?: number;
  currentPrice?: number;
  holdings?: Holding[];
  budgetImpact?: {
    profitUsd: string;
    lossUsd: string;
  };
  groundingSources?: { title: string; uri: string }[];
}

export interface OHLCVData {
  timestamp: number; // Unix time in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MathematicalAnalysisResult {
  rsi14: number[];
  latestRsi: number;
  ema50: (number | null)[];
  latestEma50: number | null;
  ema200: (number | null)[];
  latestEma200: number | null;
  standardDeviation: number;
  volatilityPercentage: number;
  momentumScore: number; // 0 to 100
  momentumDirection: 'Strong Bullish' | 'Bullish' | 'Neutral / Consolidating' | 'Bearish' | 'Strong Bearish';
  momentumDescription: string;
}

export interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  assetClass: AssetClassCategory;
  lastUpdated: string;
}

export interface AssetChartPayload {
  ticker: string;
  assetName: string;
  assetClass: AssetClassCategory;
  candlesticks: OHLCVData[];
  indicators: MathematicalAnalysisResult;
  targets: {
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
  };
}

export interface NewsFeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: 'CoinDesk' | 'Reuters' | 'Bloomberg' | 'MarketWatch';
  category: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  timeAgo: string;
  relatedTicker?: string;
}

export interface CryptoSentimentData {
  score: number; // 0 to 100
  label: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  lastUpdated: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  assetClass: AssetClassCategory;
  addedAt: string;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClassCategory;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  unrealisedProfitLoss: number;
  profitLossPercentage: number;
}

export interface TickerItem {
  symbol: string;
  price: string;
  change: string;
  isUp: boolean;
}

export interface OracleTick {
  symbol: string;
  price: number;
  source: 'BINANCE' | 'YAHOO_FINANCE' | 'ALTERNATIVE_ME';
  timestamp: string;
}

export interface RiskManagementOrder {
  id: string;
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  status: 'ACTIVE' | 'STOP_LOSS_TRIGGERED' | 'TAKE_PROFIT_TRIGGERED' | 'CANCELLED';
  createdAt: string;
  triggeredAt?: string;
  triggeredPrice?: number;
}

export interface AuditLedgerEntry {
  id: string;
  timestamp: string;
  eventType: 'ORACLE_PRICE_UPDATE' | 'RISK_ORDER_CREATED' | 'STOP_LOSS_EXECUTED' | 'TAKE_PROFIT_EXECUTED';
  symbol: string;
  data: Record<string, any>;
  checksum: string;
}

export interface Translation {
  title: string;
  loading: string;
  predict: string;
  priority: string;
  stability: string;
  fast: string;
  general: string;
  crypto: string;
  stocks: string;
  commodities: string;
  forex: string;
  etfs: string;
  indexes: string;
  bonds: string;
  mutual_funds: string;
  combo: string;
  pros: string;
  cons: string;
  withdraw: string;
  hours: string;
  days: string;
  weeks: string;
  months: string;
  years: string;
  confidence: string;
  strategy: string;
  expectedProfit: string;
  expectedLoss: string;
  riskRewardRatio: string;
  riskIndex: string;
  highlyStable: string;
  moderatelyStable: string;
  moderatelyRisky: string;
  highlyRisky: string;
  horizon: string;
  lowRiskHint: string;
  highRiskHint: string;
  scanPrompt: string;
  confShort: string;
  clear: string;
  confirmClear: string;
  autoRisk: string;
  precise: string;
  calendar: string;
  startDate: string;
  endDate: string;
  portfolioAllocation: string;
  tabPredictor: string;
  tabSearch: string;
  searchPlaceholder: string;
  searchButton: string;
  budgetLabel: string;
  budgetPlaceholder: string;
  assetSlot: string;
  finImpact: string;
  idleOracleTitle: string;
  idleOracleDesc: string;
  idleScannerTitle: string;
  idleScannerDesc: string;
}
