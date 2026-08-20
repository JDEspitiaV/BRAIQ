import { NewsFeedItem } from '../types';

interface FeedSource {
  name: NewsFeedItem['source'];
  rssUrl: string;
}

const FEED_SOURCES: FeedSource[] = [
  { name: 'CoinDesk', rssUrl: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'Reuters', rssUrl: 'https://feeds.reuters.com/reuters/businessNews' },
  { name: 'Bloomberg', rssUrl: 'https://feeds.bloomberg.com/markets/news.rss' },
];

const classifySentiment = (title: string): NewsFeedItem['sentiment'] => {
  const t = title.toLowerCase();
  if (/surge|rally|record high|gain|bull|soar|rebound|jump|high/.test(t)) return 'Bullish';
  if (/drop|fall|crash|bear|slump|plunge|sinks|low|ban/.test(t)) return 'Bearish';
  return 'Neutral';
};

const KNOWN_TICKERS = ['BTC', 'ETH', 'SOL', 'AAPL', 'NVDA', 'TSLA', 'SPY', 'QQQ', 'GOLD', 'OIL'];

const detectTicker = (title: string, categories?: string[]): string | undefined => {
  const t = title.toUpperCase();
  
  // Check in title
  for (const ticker of KNOWN_TICKERS) {
    const regex = new RegExp(`\\b${ticker}\\b`, 'i');
    if (regex.test(t)) return ticker === 'GOLD' ? 'GC=F' : ticker === 'OIL' ? 'CL=F' : ticker;
  }

  const tLower = title.toLowerCase();
  if (tLower.includes('bitcoin')) return 'BTC';
  if (tLower.includes('ethereum')) return 'ETH';
  if (tLower.includes('solana')) return 'SOL';
  if (tLower.includes('gold')) return 'GC=F';
  if (tLower.includes('crude') || tLower.includes('oil')) return 'CL=F';

  // Check in categories if available
  if (categories && Array.isArray(categories)) {
    for (const cat of categories) {
      const catUpper = cat.toUpperCase();
      for (const ticker of KNOWN_TICKERS) {
        if (catUpper.includes(ticker)) return ticker === 'GOLD' ? 'GC=F' : ticker === 'OIL' ? 'CL=F' : ticker;
      }
    }
  }

  return undefined;
};

const timeAgo = (pubDate: string): string => {
  const diffMs = Date.now() - new Date(pubDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const fetchOneFeed = async (source: FeedSource): Promise<NewsFeedItem[]> => {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.rssUrl)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`rss2json request failed for ${source.name} (HTTP ${res.status})`);

  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) {
    throw new Error(`rss2json returned an error for ${source.name}: ${data.message || 'unknown error'}`);
  }

  return data.items.slice(0, 8).map((item: any, index: number) => ({
    id: `${source.name.toLowerCase()}-${index}-${item.guid || item.link}`,
    title: item.title,
    link: item.link,
    url: item.link,
    pubDate: item.pubDate || new Date().toISOString(),
    source: source.name,
    category: item.categories?.[0] || 'Market News',
    timeAgo: timeAgo(item.pubDate || new Date().toISOString()),
    sentiment: classifySentiment(item.title),
    relatedTicker: detectTicker(item.title, item.categories),
  }));
};

/**
 * Fetches and normalises live RSS feeds from CoinDesk, Reuters and Bloomberg via rss2json in parallel.
 * Feeds that fail are dropped. Throws explicitly if every source fails.
 */
export const fetchLiveNewsFeed = async (): Promise<NewsFeedItem[]> => {
  const results = await Promise.allSettled(FEED_SOURCES.map(fetchOneFeed));

  const items = results
    .filter((r): r is PromiseFulfilledResult<NewsFeedItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`News feed notice — ${FEED_SOURCES[i].name} unavailable:`, r.reason);
    }
  });

  if (items.length === 0) {
    throw new Error('All live financial news feeds (CoinDesk, Reuters, Bloomberg) failed to load.');
  }

  return items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
};
