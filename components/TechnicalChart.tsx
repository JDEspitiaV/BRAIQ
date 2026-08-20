import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, ColorType, LineStyle, UTCTimestamp, CandlestickData, LineData } from 'lightweight-charts';
import { OHLCVData, MathematicalAnalysisResult } from '../types';
import { fetchCompleteAssetChartPayload } from '../services/marketService';
import { Activity, Target, BarChart2 } from 'lucide-react';

interface Props {
  ticker: string;
  timeframe?: '1D' | '1W' | '1M';
  onTimeframeChange?: (tf: '1D' | '1W' | '1M') => void;
  entryTarget?: number;
  stopLoss?: number;
  takeProfit?: number;
  candlesticks?: OHLCVData[];
  indicators?: MathematicalAnalysisResult;
}

const toUtcTimestamp = (ts: number): UTCTimestamp => {
  const seconds = ts > 1e11 ? Math.floor(ts / 1000) : Math.floor(ts);
  return seconds as UTCTimestamp;
};

export const TechnicalChart: React.FC<Props> = ({
  ticker,
  timeframe = '1D',
  entryTarget,
  stopLoss,
  takeProfit,
  candlesticks: initialCandlesticks,
  indicators: initialIndicators,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<{
    candlesticks: OHLCVData[];
    indicators?: MathematicalAnalysisResult;
    targets?: { entryPrice: number; stopLoss: number; takeProfit: number };
  }>({
    candlesticks: initialCandlesticks || [],
    indicators: initialIndicators,
    targets:
      entryTarget && stopLoss && takeProfit
        ? { entryPrice: entryTarget, stopLoss, takeProfit }
        : undefined,
  });

  const [activeTab, setActiveTab] = useState<'1D' | '1W' | '1M'>(timeframe);

  // Fetch real market data (Binance or Yahoo CORS proxy) & compute technical indicators
  useEffect(() => {
    let isMounted = true;

    const loadRealChartData = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const payload = await fetchCompleteAssetChartPayload(ticker, activeTab);
        if (isMounted) {
          setData({
            candlesticks: payload.candlesticks || [],
            indicators: payload.indicators,
            targets: payload.targets || (entryTarget && stopLoss && takeProfit ? { entryPrice: entryTarget, stopLoss, takeProfit } : undefined),
          });
        }
      } catch (err: any) {
        console.warn(`Chart payload fetch notice for ${ticker}:`, err);
        if (isMounted) {
          setErrorMessage(err?.message || 'Failed to fetch live chart data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRealChartData();
    return () => { isMounted = false; };
  }, [ticker, activeTab, entryTarget, stopLoss, takeProfit]);

  // Main Candlestick Chart rendering
  useEffect(() => {
    if (!chartContainerRef.current || !data.candlesticks.length) return;

    const container = chartContainerRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#1A1A1C' },
        textColor: '#9CA3AF',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      width: container.clientWidth,
      height: 250,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#1DF096',
      downColor: '#FF0055',
      borderVisible: false,
      wickUpColor: '#1DF096',
      wickDownColor: '#FF0055',
    });

    // Format candle items timestamp for lightweight-charts strictly as UTCTimestamp seconds
    const formattedCandles: CandlestickData<UTCTimestamp>[] = data.candlesticks.map(c => ({
      time: toUtcTimestamp(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(formattedCandles);

    // Target Price Lines
    if (data.targets?.entryPrice) {
      candleSeries.createPriceLine({
        price: data.targets.entryPrice,
        color: '#00F0FF',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'ENTRY TARGET',
      });
    }

    if (data.targets?.stopLoss) {
      candleSeries.createPriceLine({
        price: data.targets.stopLoss,
        color: '#FF0055',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'STOP LOSS',
      });
    }

    if (data.targets?.takeProfit) {
      candleSeries.createPriceLine({
        price: data.targets.takeProfit,
        color: '#1DF096',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'TAKE PROFIT',
      });
    }

    // EMA 50 Overlay
    if (data.indicators?.ema50) {
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#7711AA',
        lineWidth: 1,
        title: 'EMA 50',
      });
      const ema50Data: LineData<UTCTimestamp>[] = data.candlesticks
        .map((c, i) => ({ time: toUtcTimestamp(c.timestamp), value: data.indicators?.ema50[i] }))
        .filter((d): d is LineData<UTCTimestamp> => d.value !== null && d.value !== undefined);
      if (ema50Data.length) ema50Series.setData(ema50Data);
    }

    // EMA 200 Overlay
    if (data.indicators?.ema200) {
      const ema200Series = chart.addSeries(LineSeries, {
        color: '#00F0FF',
        lineWidth: 1,
        title: 'EMA 200',
      });
      const ema200Data: LineData<UTCTimestamp>[] = data.candlesticks
        .map((c, i) => ({ time: toUtcTimestamp(c.timestamp), value: data.indicators?.ema200[i] }))
        .filter((d): d is LineData<UTCTimestamp> => d.value !== null && d.value !== undefined);
      if (ema200Data.length) ema200Series.setData(ema200Data);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (container) {
        chart.applyOptions({ width: container.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data]);

  // RSI Sub-Chart rendering
  useEffect(() => {
    if (!rsiContainerRef.current || !data.indicators?.rsi14 || !data.candlesticks.length) return;

    const container = rsiContainerRef.current;
    container.innerHTML = '';

    const rsiChart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#141415' },
        textColor: '#6B7280',
        fontSize: 9,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      width: container.clientWidth,
      height: 80,
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
      },
      timeScale: {
        visible: false,
      },
    });

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#00F0FF',
      lineWidth: 1,
      title: 'RSI (14)',
    });

    const rsiData: LineData<UTCTimestamp>[] = data.candlesticks.map((c, i) => ({
      time: toUtcTimestamp(c.timestamp),
      value: data.indicators?.rsi14[i] ?? 50,
    }));

    rsiSeries.setData(rsiData);

    // Threshold lines
    rsiSeries.createPriceLine({
      price: 70,
      color: '#FF0055',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: 'OB (70)',
    });

    rsiSeries.createPriceLine({
      price: 30,
      color: '#1DF096',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: 'OS (30)',
    });

    rsiChart.timeScale().fitContent();

    const handleResize = () => {
      if (container) {
        rsiChart.applyOptions({ width: container.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      rsiChart.remove();
    };
  }, [data]);

  const latestRsi = data.indicators?.latestRsi ?? 50;
  const latestEma50 = data.indicators?.latestEma50;
  const latestEma200 = data.indicators?.latestEma200;
  const volatilityPct = data.indicators?.volatilityPercentage ?? 0;
  const momentumDirection = data.indicators?.momentumDirection ?? 'Neutral / Consolidating';

  return (
    <div className="bg-[#1A1A1C] border border-white/10 sharp-edge p-4 space-y-4 font-sans relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-broker-purple/10 border border-broker-purple/30 sharp-edge text-broker-purple">
            <BarChart2 size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wider uppercase text-white font-sans flex items-center gap-2">
              {ticker.toUpperCase()} TECHNICAL VISUALISATION
            </h4>
            <p className="text-[9px] font-mono text-gray-500 uppercase">
              Binance & Yahoo CORS Proxy Stream • Real OHLCV
            </p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex bg-black/40 border border-white/10 sharp-edge p-0.5">
          {(['1D', '1W', '1M'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setActiveTab(tf)}
              className={`px-3 py-1 text-[9px] font-black tracking-widest transition-all sharp-edge font-sans ${
                activeTab === tf
                  ? 'bg-broker-purple text-black font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Target Price Indicators Header */}
      {data.targets && (
        <div className="grid grid-cols-3 gap-2 text-center bg-black/30 p-2 border border-white/5 sharp-edge font-mono text-[9px]">
          <div className="flex flex-col items-center">
            <span className="text-gray-500 uppercase flex items-center gap-1 font-sans text-[8px]">
              <Target size={10} className="text-broker-cyan" /> Entry Target
            </span>
            <span className="text-broker-cyan font-bold num-font">${data.targets.entryPrice.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center border-x border-white/5">
            <span className="text-gray-500 uppercase flex items-center gap-1 font-sans text-[8px]">
              Stop Loss
            </span>
            <span className="text-broker-pink font-bold num-font">${data.targets.stopLoss.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-500 uppercase flex items-center gap-1 font-sans text-[8px]">
              Take Profit
            </span>
            <span className="text-broker-green font-bold num-font">${data.targets.takeProfit.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Main Candlestick Chart Box */}
      <div className="relative min-h-[250px]">
        {loading && (
          <div className="absolute inset-0 bg-[#1A1A1C]/80 z-20 flex flex-col items-center justify-center gap-2">
            <Activity size={24} className="animate-spin text-broker-purple" />
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 font-sans">
              Fetching Real Candle Stream for {ticker}...
            </span>
          </div>
        )}

        {errorMessage && !loading && data.candlesticks.length === 0 && (
          <div className="min-h-[250px] flex flex-col items-center justify-center p-6 text-center text-gray-500 text-[10px] uppercase font-mono">
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full" />
      </div>

      {/* Sub-Chart RSI */}
      <div className="border-t border-white/5 pt-2">
        <div className="flex justify-between items-center text-[8px] font-black uppercase text-gray-400 font-sans px-1 mb-1">
          <span>RSI (14) OSCILLATOR</span>
          <span className={latestRsi >= 70 ? 'text-broker-pink' : latestRsi <= 30 ? 'text-broker-green' : 'text-broker-cyan'}>
            VALUE: {latestRsi.toFixed(1)}
          </span>
        </div>
        <div ref={rsiContainerRef} className="w-full" />
      </div>

      {/* Mathematical Indicator Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[9px] font-mono">
        <div className="bg-black/30 p-2 sharp-edge border border-white/5 flex flex-col">
          <span className="text-[7px] text-gray-500 uppercase font-sans font-bold">RSI (14) Status</span>
          <span className="text-white font-bold">{latestRsi >= 70 ? 'Overbought (70+)' : latestRsi <= 30 ? 'Oversold (30-)' : 'Neutral (30-70)'}</span>
        </div>
        <div className="bg-black/30 p-2 sharp-edge border border-white/5 flex flex-col">
          <span className="text-[7px] text-gray-500 uppercase font-sans font-bold">EMA 50 vs EMA 200</span>
          <span className="text-white font-bold">
            {latestEma50 && latestEma200 ? (latestEma50 >= latestEma200 ? 'Golden Alignment' : 'Bearish Alignment') : 'Calculating...'}
          </span>
        </div>
        <div className="bg-black/30 p-2 sharp-edge border border-white/5 flex flex-col">
          <span className="text-[7px] text-gray-500 uppercase font-sans font-bold">Real Volatility</span>
          <span className="text-broker-cyan font-bold">{volatilityPct.toFixed(2)}%</span>
        </div>
        <div className="bg-black/30 p-2 sharp-edge border border-white/5 flex flex-col">
          <span className="text-[7px] text-gray-500 uppercase font-sans font-bold">Momentum Rating</span>
          <span className="text-broker-purple font-bold">{momentumDirection}</span>
        </div>
      </div>
    </div>
  );
};

export default TechnicalChart;
