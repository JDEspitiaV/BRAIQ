import React, { useState, useEffect } from 'react';
import { MathematicalAnalysisResult } from '../types';
import { fetchCompleteAssetChartPayload, classifyAssetSymbol } from '../services/marketService';
import { Activity, Gauge, TrendingUp, TrendingDown, Layers, ShieldCheck } from 'lucide-react';

const FEATURED_NON_CRYPTO_ASSETS = [
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'Equities' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', category: 'Equities' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'Equities' },
  { symbol: 'SPY', name: 'S&P 500 ETF Trust', category: 'Indices' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'Indices' },
  { symbol: 'GC=F', name: 'Gold Futures', category: 'Commodities' },
  { symbol: 'CL=F', name: 'Crude Oil Futures', category: 'Commodities' },
  { symbol: '^TNX', name: '10-Yr Treasury Yield', category: 'Bonds' },
];

export const MomentumPanel: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('GC=F');
  const [customSymbol, setCustomSymbol] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MathematicalAnalysisResult | null>(null);
  const [assetPrice, setAssetPrice] = useState<number | null>(null);

  const loadMomentumAnalysis = async (symbolToFetch: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const payload = await fetchCompleteAssetChartPayload(symbolToFetch, '1D');
      setAnalysisResult(payload.indicators);
      if (payload.candlesticks.length > 0) {
        setAssetPrice(payload.candlesticks[payload.candlesticks.length - 1].close);
      }
    } catch (err: any) {
      console.error(`Momentum analysis fetch notice for ${symbolToFetch}:`, err);
      setErrorMessage(err.message || 'Failed to compute mathematical momentum');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMomentumAnalysis(selectedSymbol);
  }, [selectedSymbol]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSymbol.trim()) {
      const symbolUpper = customSymbol.trim().toUpperCase();
      setSelectedSymbol(symbolUpper);
      setCustomSymbol('');
    }
  };

  const assetCategory = classifyAssetSymbol(selectedSymbol);

  return (
    <div className="bg-[#1A1A1C] border border-white/10 sharp-edge p-5 space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-broker-cyan/10 border border-broker-cyan/30 sharp-edge text-broker-cyan">
            <Gauge size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-wider uppercase text-white font-sans flex items-center gap-2">
              NON-CRYPTO MATHEMATICAL MOMENTUM ENGINE
            </h3>
            <p className="text-[9px] font-mono text-gray-500 uppercase">
              Calculated via RSI (14), Standard Deviation, Volatility & EMAs
            </p>
          </div>
        </div>

        <div className="text-[8px] font-black uppercase px-2.5 py-1.5 sharp-edge bg-white/5 text-gray-400 border border-white/10 flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-broker-green" />
          100% PURE MATHEMATICAL FORMULAE • NO SIMULATED DATA
        </div>
      </div>

      {/* Asset Selector Pills */}
      <div className="space-y-2">
        <span className="text-[9px] font-black tracking-widest text-gray-400 uppercase font-sans">
          Select Asset for Technical Evaluation:
        </span>
        <div className="flex flex-wrap gap-2">
          {FEATURED_NON_CRYPTO_ASSETS.map(asset => (
            <button
              key={asset.symbol}
              onClick={() => setSelectedSymbol(asset.symbol)}
              disabled={loading}
              className={`px-3 py-1.5 text-[9px] font-black uppercase sharp-edge transition-all font-sans ${
                selectedSymbol === asset.symbol
                  ? 'bg-broker-cyan text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {asset.name} ({asset.symbol})
            </button>
          ))}
        </div>

        {/* Custom ticker search */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2 pt-2">
          <input
            type="text"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value)}
            placeholder="ENTER TICKER (E.G. MSFT, GOLD, TSLA, ^GSPC)..."
            className="flex-grow bg-white/5 border border-white/10 px-3 py-2 text-[10px] font-mono outline-none focus:border-broker-cyan/50 sharp-edge text-white uppercase placeholder:text-gray-600"
          />
          <button
            type="submit"
            disabled={loading || !customSymbol.trim()}
            className="px-5 bg-white/10 hover:bg-broker-cyan hover:text-black font-black text-[9px] uppercase tracking-wider sharp-edge border border-white/10 text-white transition-all disabled:opacity-40"
          >
            ANALYSE TICKER
          </button>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center border border-dashed border-white/10 sharp-edge bg-black/20 flex flex-col items-center justify-center gap-3">
          <Activity size={24} className="animate-spin text-broker-cyan" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-sans">
            Fetching Real OHLCV Candles & Computing Technical Functions for {selectedSymbol}...
          </span>
        </div>
      )}

      {/* Error state */}
      {errorMessage && !loading && (
        <div className="p-4 border border-broker-pink/40 bg-broker-pink/10 sharp-edge text-center text-broker-pink text-[10px] font-mono uppercase">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Analysis Output */}
      {!loading && analysisResult && (
        <div className="space-y-4">
          {/* Main Momentum Score Box */}
          <div className="bg-black/40 border border-white/10 sharp-edge p-4 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-gray-500 font-sans">
                  Target Asset:
                </span>
                <span className="text-xs font-black uppercase text-white font-sans">
                  {selectedSymbol} ({assetCategory.toUpperCase()})
                </span>
                {assetPrice && (
                  <span className="text-xs font-mono text-broker-cyan font-bold ml-2">
                    ${assetPrice.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black uppercase tracking-wider text-white font-sans">
                  {analysisResult.momentumDirection}
                </span>
                {analysisResult.momentumScore >= 55 ? (
                  <TrendingUp size={20} className="text-broker-green" />
                ) : (
                  <TrendingDown size={20} className="text-broker-pink" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-sans max-w-xl">
                {analysisResult.momentumDescription}
              </p>
            </div>

            {/* Score Metric Gauge */}
            <div className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 sharp-edge min-w-[140px]">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 font-sans">
                Calculated Score
              </span>
              <span className="text-3xl font-black font-mono num-font text-broker-cyan my-0.5">
                {analysisResult.momentumScore}
              </span>
              <span className="text-[8px] font-mono text-gray-500 uppercase">
                SCALE: 0 (BEARISH) - 100 (BULLISH)
              </span>
            </div>
          </div>

          {/* Mathematical Indicator Breakdown Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono">
            {/* RSI (14) */}
            <div className="bg-black/30 border border-white/5 p-3 sharp-edge flex flex-col justify-between space-y-2">
              <span className="text-[8px] font-black text-gray-500 uppercase font-sans">
                Relative Strength Index (RSI 14)
              </span>
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold text-white font-mono num-font">
                  {analysisResult.latestRsi.toFixed(1)}
                </span>
                <span className={`text-[8px] font-sans font-black uppercase px-1.5 py-0.5 sharp-edge ${
                  analysisResult.latestRsi >= 70 ? 'bg-broker-pink/20 text-broker-pink' :
                  analysisResult.latestRsi <= 30 ? 'bg-broker-green/20 text-broker-green' : 'bg-white/10 text-gray-300'
                }`}>
                  {analysisResult.latestRsi >= 70 ? 'Overbought' : analysisResult.latestRsi <= 30 ? 'Oversold' : 'Neutral'}
                </span>
              </div>
              <span className="text-[7px] text-gray-600 uppercase">14-Period Trailing Momentum</span>
            </div>

            {/* Standard Deviation / Volatility */}
            <div className="bg-black/30 border border-white/5 p-3 sharp-edge flex flex-col justify-between space-y-2">
              <span className="text-[8px] font-black text-gray-500 uppercase font-sans">
                Real Volatility (% Std Dev)
              </span>
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold text-broker-cyan font-mono num-font">
                  {analysisResult.volatilityPercentage.toFixed(2)}%
                </span>
                <span className="text-[8px] font-mono text-gray-400">
                  σ = {analysisResult.standardDeviation}
                </span>
              </div>
              <span className="text-[7px] text-gray-600 uppercase">20-Day Trailing Dispersion</span>
            </div>

            {/* Exponential Moving Average 50 */}
            <div className="bg-black/30 border border-white/5 p-3 sharp-edge flex flex-col justify-between space-y-2">
              <span className="text-[8px] font-black text-gray-500 uppercase font-sans">
                EMA 50 (Short Trend)
              </span>
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold text-broker-purple font-mono num-font">
                  {analysisResult.latestEma50 ? `$${analysisResult.latestEma50.toLocaleString()}` : 'N/A'}
                </span>
              </div>
              <span className="text-[7px] text-gray-600 uppercase">50-Period Exponential Baseline</span>
            </div>

            {/* Exponential Moving Average 200 */}
            <div className="bg-black/30 border border-white/5 p-3 sharp-edge flex flex-col justify-between space-y-2">
              <span className="text-[8px] font-black text-gray-500 uppercase font-sans">
                EMA 200 (Long Trend)
              </span>
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold text-white font-mono num-font">
                  {analysisResult.latestEma200 ? `$${analysisResult.latestEma200.toLocaleString()}` : 'N/A'}
                </span>
              </div>
              <span className="text-[7px] text-gray-600 uppercase">200-Period Macro Baseline</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MomentumPanel;
