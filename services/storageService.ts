import { WatchlistItem, PortfolioPosition, AssetClassCategory } from '../types';

const WATCHLIST_STORAGE_KEY = 'ai_broker_watchlist';
const PORTFOLIO_STORAGE_KEY = 'ai_broker_portfolio';

export const getWatchlist = (): WatchlistItem[] => {
  try {
    const data = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return data ? JSON.parse(data) : [
      { symbol: 'BTCUSDT', name: 'Bitcoin', assetClass: 'crypto', addedAt: new Date().toISOString() },
      { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'stocks', addedAt: new Date().toISOString() },
      { symbol: 'GC=F', name: 'Gold Futures', assetClass: 'commodities', addedAt: new Date().toISOString() },
    ];
  } catch {
    return [];
  }
};

export const toggleWatchlistAsset = (symbol: string, name: string, assetClass: AssetClassCategory): WatchlistItem[] => {
  const current = getWatchlist();
  const exists = current.some(item => item.symbol === symbol);
  let updated: WatchlistItem[];

  if (exists) {
    updated = current.filter(item => item.symbol !== symbol);
  } else {
    updated = [...current, { symbol, name, assetClass, addedAt: new Date().toISOString() }];
  }

  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const getPortfolioPositions = (): PortfolioPosition[] => {
  try {
    const data = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addPortfolioPosition = (
  symbol: string,
  name: string,
  assetClass: AssetClassCategory,
  quantity: number,
  averageBuyPrice: number,
  currentPrice: number
): PortfolioPosition[] => {
  const current = getPortfolioPositions();
  const id = `${symbol}-${Date.now()}`;
  const totalValue = quantity * currentPrice;
  const unrealisedProfitLoss = (currentPrice - averageBuyPrice) * quantity;
  const profitLossPercentage = averageBuyPrice > 0 ? ((currentPrice - averageBuyPrice) / averageBuyPrice) * 100 : 0;

  const newPosition: PortfolioPosition = {
    id,
    symbol,
    name,
    assetClass,
    quantity,
    averageBuyPrice,
    currentPrice,
    totalValue,
    unrealisedProfitLoss,
    profitLossPercentage,
  };

  const updated = [newPosition, ...current];
  localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const removePortfolioPosition = (id: string): PortfolioPosition[] => {
  const current = getPortfolioPositions();
  const updated = current.filter(pos => pos.id !== id);
  localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const recalculatePortfolioValuation = (pricesMap: Record<string, number>): PortfolioPosition[] => {
  const current = getPortfolioPositions();
  const updated = current.map(pos => {
    const livePrice = pricesMap[pos.symbol.toUpperCase()] || pos.currentPrice;
    const totalValue = pos.quantity * livePrice;
    const unrealisedProfitLoss = (livePrice - pos.averageBuyPrice) * pos.quantity;
    const profitLossPercentage = pos.averageBuyPrice > 0 ? ((livePrice - pos.averageBuyPrice) / pos.averageBuyPrice) * 100 : 0;

    return {
      ...pos,
      currentPrice: livePrice,
      totalValue,
      unrealisedProfitLoss,
      profitLossPercentage,
    };
  });

  localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};
