import React, { useEffect, useState } from 'react';
import { NewsFeedItem, CryptoSentimentData } from '../types';
import { fetchLiveNewsFeed } from '../services/newsService';
import { fetchCryptoFearAndGreed } from '../services/analysisService';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap, Newspaper, ExternalLink } from 'lucide-react';

export const SentimentFeed: React.FC = () => {
  const [fngData, setFngData] = useState<CryptoSentimentData>({
    score: 50,
    label: 'Neutral',
    lastUpdated: new Date().toISOString(),
  });
  const [news, setNews] = useState<NewsFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveFeedData = async () => {
    setLoading(true);
    try {
      const [fng, newsItems] = await Promise.all([
        fetchCryptoFearAndGreed(),
        fetchLiveNewsFeed(),
      ]);
      setFngData(fng);
      setNews(newsItems);
    } catch (e) {
      console.error('Failed to fetch live sentiment or news feeds:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveFeedData();
    const interval = setInterval(fetchLiveFeedData, 120000); // refresh every 2 mins
    return () => clearInterval(interval);
  }, []);

  const score = fngData.score;
  const label = fngData.label;

  // Gauge color based on sentiment score
  let gaugeColor = 'text-broker-cyan';
  let gaugeBorder = 'border-broker-cyan';
  if (score >= 65) {
    gaugeColor = 'text-broker-green';
    gaugeBorder = 'border-broker-green';
  } else if (score <= 35) {
    gaugeColor = 'text-broker-pink';
    gaugeBorder = 'border-broker-pink';
  }

  return (
    <div className="bg-[#1A1A1C] border border-white/10 sharp-edge p-4 space-y-4 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-broker-purple animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest font-sans">
            LIVE FINANCIAL HEADLINES & CRYPTO FEAR & GREED INDEX
          </h3>
        </div>
        <button
          onClick={fetchLiveFeedData}
          disabled={loading}
          className="text-[8px] font-mono text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 sharp-edge border border-white/10 uppercase transition-colors"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin text-broker-cyan' : ''} /> REFRESH FEEDS
        </button>
      </div>

      {/* Main Grid: Sentiment Score Meter + News List */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Fear & Greed Meter Gauge (Alternative.me API) */}
        <div className="md:col-span-4 bg-black/40 border border-white/5 sharp-edge p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="text-[8px] font-black uppercase text-gray-500 tracking-[0.2em] mb-2 font-sans">
            CRYPTO FEAR & GREED INDEX
          </div>

          {/* Needle / Gauge visual */}
          <div className="relative w-28 h-28 rounded-full border-4 border-white/5 flex items-center justify-center mb-3">
            <div
              className={`absolute inset-0 rounded-full border-4 ${gaugeBorder} opacity-30`}
              style={{
                clipPath: `polygon(0 100%, 100% 100%, 100% ${100 - score}%, 0 ${100 - score}%)`,
              }}
            />
            <div className="flex flex-col items-center font-mono">
              <span className={`text-3xl num-font font-black ${gaugeColor}`}>
                {score}
              </span>
              <span className="text-[7px] text-gray-400 font-bold">/ 100</span>
            </div>
          </div>

          <div className={`text-xs font-black uppercase tracking-wider ${gaugeColor} mb-1 font-sans`}>
            {label}
          </div>

          <div className="text-[8px] text-gray-500 font-sans leading-tight mt-1 px-2 border-t border-white/5 pt-2">
            Direct real-time stream from Alternative.me REST API.
          </div>
        </div>

        {/* Live News Ticker List (CoinDesk, Reuters, Bloomberg via rss2json) */}
        <div className="md:col-span-8 bg-black/20 border border-white/5 sharp-edge p-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/5 text-[9px] font-black uppercase text-gray-400 tracking-wider font-sans">
            <Newspaper size={12} className="text-broker-cyan" /> COINDESK, REUTERS & BLOOMBERG RSS FEEDS
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {news.map((item) => {
              let badgeColor = 'bg-gray-800 text-gray-300 border-gray-700';
              let Icon = Minus;

              if (item.sentiment === 'Bullish') {
                badgeColor = 'bg-broker-green/10 text-broker-green border-broker-green/30';
                Icon = TrendingUp;
              } else if (item.sentiment === 'Bearish') {
                badgeColor = 'bg-broker-pink/10 text-broker-pink border-broker-pink/30';
                Icon = TrendingDown;
              }

              return (
                <div
                  key={item.id}
                  className="bg-white/5 p-2 sharp-edge border border-white/5 hover:border-white/10 transition-all flex items-start justify-between gap-2"
                >
                  <div className="space-y-1 min-w-0">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-sans font-bold text-gray-200 hover:text-broker-cyan transition-colors line-clamp-1 flex items-center gap-1"
                    >
                      {item.title}
                      <ExternalLink size={9} className="opacity-50 shrink-0" />
                    </a>
                    <div className="flex items-center gap-2 text-[7px] font-mono text-gray-500">
                      <span className="text-broker-cyan font-bold">{item.source}</span>
                      <span>•</span>
                      <span>{item.timeAgo}</span>
                      {item.relatedTicker && (
                        <>
                          <span>•</span>
                          <span className="text-broker-purple font-bold">${item.relatedTicker}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[7px] font-black uppercase px-2 py-0.5 border sharp-edge flex items-center gap-1 shrink-0 ${badgeColor}`}
                  >
                    <Icon size={8} /> {item.sentiment}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[7px] font-mono uppercase text-gray-600">
            <span>RSS2JSON RSS PROXY FEED ACTIVE</span>
            <span>UPDATED: {new Date(fngData.lastUpdated).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentFeed;
