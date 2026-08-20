import React, { useState, useEffect } from 'react';
import { WatchlistItem, PortfolioPosition, AssetClassCategory } from '../types';
import {
  getWatchlist,
  toggleWatchlistAsset,
  getPortfolioPositions,
  addPortfolioPosition,
  removePortfolioPosition,
  recalculatePortfolioValuation,
} from '../services/storageService';
import { fetchLiveTickerOverview, classifyAssetSymbol, fetchBinance24hrTicker, fetchYahooChartData } from '../services/marketService';
import { Star, Briefcase, Plus, Trash2, RefreshCw, ArrowUpRight, ArrowDownRight, Layers, DollarSign } from 'lucide-react';

export const WatchlistPortfolio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'portfolio'>('watchlist');

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newWatchlistSymbol, setNewWatchlistSymbol] = useState<string>('');

  // Portfolio state
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [newBuyPrice, setNewBuyPrice] = useState<string>('');

  // Live prices map
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load initial localStorage state & fetch live prices
  const loadDataAndPrices = async () => {
    setRefreshing(true);
    const storedWatchlist = getWatchlist();
    const storedPortfolio = getPortfolioPositions();

    setWatchlist(storedWatchlist);

    // Collect all symbols to fetch live prices for
    const symbolsToFetch = Array.from(new Set([
      ...storedWatchlist.map(item => item.symbol),
      ...storedPortfolio.map(pos => pos.symbol),
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AAPL', 'NVDA', 'SPY', 'GC=F'
    ]));

    const priceMap: Record<string, number> = {};

    await Promise.allSettled(
      symbolsToFetch.map(async (sym) => {
        try {
          const category = classifyAssetSymbol(sym);
          if (category === 'crypto') {
            const ticker = await fetchBinance24hrTicker(sym);
            priceMap[sym.toUpperCase()] = ticker.price;
          } else {
            const candles = await fetchYahooChartData(sym, '5d', '1d');
            if (candles.length > 0) {
              priceMap[sym.toUpperCase()] = candles[candles.length - 1].close;
            }
          }
        } catch (err) {
          console.warn(`Price refresh notice for ${sym}:`, err);
        }
      })
    );

    setLivePrices(priceMap);

    // Recalculate portfolio valuation with latest live prices
    const updatedPortfolio = recalculatePortfolioValuation(priceMap);
    setPortfolio(updatedPortfolio);

    setRefreshing(false);
  };

  useEffect(() => {
    loadDataAndPrices();
  }, []);

  // Handle Watchlist addition
  const handleAddWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistSymbol.trim()) return;

    const sym = newWatchlistSymbol.trim().toUpperCase();
    const category = classifyAssetSymbol(sym);
    toggleWatchlistAsset(sym, sym, category);

    setNewWatchlistSymbol('');
    loadDataAndPrices();
  };

  // Handle Watchlist removal
  const handleRemoveWatchlist = (symbol: string, name: string, category: AssetClassCategory) => {
    toggleWatchlistAsset(symbol, name, category);
    setWatchlist(getWatchlist());
  };

  // Handle Portfolio position submission
  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !newQuantity || !newBuyPrice) return;

    const sym = newSymbol.trim().toUpperCase();
    const qty = parseFloat(newQuantity);
    const buyPrice = parseFloat(newBuyPrice);

    if (isNaN(qty) || isNaN(buyPrice) || qty <= 0 || buyPrice <= 0) return;

    const category = classifyAssetSymbol(sym);
    const currentPrice = livePrices[sym] || buyPrice;

    const updated = addPortfolioPosition(sym, sym, category, qty, buyPrice, currentPrice);
    setPortfolio(updated);

    setNewSymbol('');
    setNewQuantity('');
    setNewBuyPrice('');

    loadDataAndPrices();
  };

  // Handle Portfolio removal
  const handleRemovePosition = (id: string) => {
    const updated = removePortfolioPosition(id);
    setPortfolio(updated);
  };

  // Portfolio Totals
  const totalPortfolioValue = portfolio.reduce((acc, pos) => acc + pos.totalValue, 0);
  const totalProfitLoss = portfolio.reduce((acc, pos) => acc + pos.unrealisedProfitLoss, 0);
  const overallProfitLossPercent = totalPortfolioValue > 0 && (totalPortfolioValue - totalProfitLoss) > 0
    ? (totalProfitLoss / (totalPortfolioValue - totalProfitLoss)) * 100
    : 0;

  return (
    <div className="bg-[#1A1A1C] border border-white/10 sharp-edge p-5 space-y-5 font-sans">
      {/* Header with Refresh */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-4">
        <div className="flex border border-white/10 sharp-edge p-0.5 bg-black/40">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all sharp-edge flex items-center gap-2 font-sans ${
              activeTab === 'watchlist'
                ? 'bg-broker-purple text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Star size={12} /> FAVOURED WATCHLIST ({watchlist.length})
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all sharp-edge flex items-center gap-2 font-sans ${
              activeTab === 'portfolio'
                ? 'bg-broker-green text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Briefcase size={12} /> PORTFOLIO TRACKER ({portfolio.length})
          </button>
        </div>

        <button
          onClick={loadDataAndPrices}
          disabled={refreshing}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[9px] uppercase tracking-wider sharp-edge border border-white/10 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin text-broker-cyan' : ''} />
          {refreshing ? 'REFRESHING PRICES...' : 'REFRESH LIVE VALUATIONS'}
        </button>
      </div>

      {/* WATCHLIST TAB CONTENT */}
      {activeTab === 'watchlist' && (
        <div className="space-y-4">
          {/* Add to Watchlist Form */}
          <form onSubmit={handleAddWatchlist} className="flex gap-2">
            <input
              type="text"
              value={newWatchlistSymbol}
              onChange={(e) => setNewWatchlistSymbol(e.target.value)}
              placeholder="ADD ASSET TO FAVOURED WATCHLIST (E.G. BTCUSDT, AAPL, GC=F)..."
              className="flex-grow bg-white/5 border border-white/10 px-3 py-2 text-[10px] font-mono outline-none focus:border-broker-purple/50 sharp-edge text-white uppercase placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={!newWatchlistSymbol.trim()}
              className="px-5 bg-broker-purple hover:bg-white text-black font-black text-[9px] uppercase tracking-wider sharp-edge transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <Plus size={12} /> FAVOURITE
            </button>
          </form>

          {/* Watchlist Items Grid */}
          {watchlist.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 sharp-edge text-gray-600 text-[10px] uppercase font-sans">
              No favourited assets in browser localStorage. Add your first ticker above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlist.map((item) => {
                const livePrice = livePrices[item.symbol] || livePrices[item.symbol.toUpperCase()];
                return (
                  <div
                    key={item.symbol}
                    className="bg-black/40 border border-white/10 sharp-edge p-3 flex justify-between items-center group hover:border-broker-purple/50 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-white font-sans">
                          {item.symbol}
                        </span>
                        <span className="text-[7px] font-mono uppercase px-1.5 py-0.5 bg-white/5 border border-white/10 text-gray-400 sharp-edge">
                          {item.assetClass}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-500 truncate max-w-[140px]">
                        {item.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-broker-cyan num-font block">
                          {livePrice ? `$${livePrice.toLocaleString()}` : 'FETCHING...'}
                        </span>
                        <span className="text-[7px] text-gray-500 uppercase">LIVE PRICE</span>
                      </div>

                      <button
                        onClick={() => handleRemoveWatchlist(item.symbol, item.name, item.assetClass)}
                        className="text-gray-600 hover:text-broker-pink p-1 transition-colors"
                        title="Remove from Watchlist"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PORTFOLIO TAB CONTENT */}
      {activeTab === 'portfolio' && (
        <div className="space-y-5">
          {/* Portfolio Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 border border-white/10 p-4 sharp-edge font-mono">
            <div>
              <span className="text-[8px] font-black uppercase text-gray-500 font-sans block">
                TOTAL PORTFOLIO VALUATION
              </span>
              <span className="text-xl font-black text-broker-green num-font">
                ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-y sm:border-y-0 sm:border-x border-white/5 py-2 sm:py-0 sm:px-4">
              <span className="text-[8px] font-black uppercase text-gray-500 font-sans block">
                UNREALISED PROFIT / LOSS
              </span>
              <span className={`text-xl font-black num-font flex items-center gap-1 ${
                totalProfitLoss >= 0 ? 'text-broker-green' : 'text-broker-pink'
              }`}>
                {totalProfitLoss >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                ${Math.abs(totalProfitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="sm:pl-2">
              <span className="text-[8px] font-black uppercase text-gray-500 font-sans block">
                OVERALL YIELD RETURN
              </span>
              <span className={`text-xl font-black num-font ${
                overallProfitLossPercent >= 0 ? 'text-broker-green' : 'text-broker-pink'
              }`}>
                {overallProfitLossPercent >= 0 ? '+' : ''}{overallProfitLossPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Add Portfolio Position Form */}
          <form onSubmit={handleAddPortfolio} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white/5 p-3 sharp-edge border border-white/5">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="TICKER (E.G. BTCUSDT, NVDA)..."
              className="bg-black/50 border border-white/10 px-3 py-2 text-[10px] font-mono outline-none focus:border-broker-green/50 sharp-edge text-white uppercase placeholder:text-gray-600"
            />
            <input
              type="number"
              step="any"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="QUANTITY (E.G. 1.5)..."
              className="bg-black/50 border border-white/10 px-3 py-2 text-[10px] font-mono outline-none focus:border-broker-green/50 sharp-edge text-white placeholder:text-gray-600"
            />
            <input
              type="number"
              step="any"
              value={newBuyPrice}
              onChange={(e) => setNewBuyPrice(e.target.value)}
              placeholder="AVERAGE BUY PRICE ($)..."
              className="bg-black/50 border border-white/10 px-3 py-2 text-[10px] font-mono outline-none focus:border-broker-green/50 sharp-edge text-white placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={!newSymbol.trim() || !newQuantity || !newBuyPrice}
              className="bg-broker-green hover:bg-white text-black font-black text-[9px] uppercase tracking-wider sharp-edge transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 py-2"
            >
              <Plus size={12} /> RECORD POSITION
            </button>
          </form>

          {/* Portfolio Position Table */}
          {portfolio.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 sharp-edge text-gray-600 text-[10px] uppercase font-sans">
              No recorded positions in browser localStorage. Add your first position above.
            </div>
          ) : (
            <div className="overflow-x-auto border border-white/10 sharp-edge">
              <table className="w-full text-left border-collapse text-[10px] font-mono">
                <thead>
                  <tr className="bg-black/60 border-b border-white/10 text-[8px] font-black uppercase text-gray-500 font-sans">
                    <th className="p-3">Asset Ticker</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Avg Buy Price</th>
                    <th className="p-3">Live Price</th>
                    <th className="p-3">Total Value</th>
                    <th className="p-3">Unrealised P/L</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {portfolio.map((pos) => {
                    const isProfitable = pos.unrealisedProfitLoss >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-bold text-white uppercase font-sans">
                          {pos.symbol}
                          <span className="text-[7px] text-gray-500 block font-mono font-normal">
                            {pos.assetClass}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300 num-font">{pos.quantity}</td>
                        <td className="p-3 text-gray-400 num-font">${pos.averageBuyPrice.toLocaleString()}</td>
                        <td className="p-3 text-broker-cyan font-bold num-font">${pos.currentPrice.toLocaleString()}</td>
                        <td className="p-3 text-white font-bold num-font">${pos.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className={`p-3 font-bold num-font ${isProfitable ? 'text-broker-green' : 'text-broker-pink'}`}>
                          {isProfitable ? '+' : ''}${pos.unrealisedProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pos.profitLossPercentage.toFixed(2)}%)
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemovePosition(pos.id)}
                            className="text-gray-600 hover:text-broker-pink p-1 transition-colors"
                            title="Delete Position"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WatchlistPortfolio;
