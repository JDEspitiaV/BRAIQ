
import React from 'react';
import { motion } from 'framer-motion';
import { TickerItem } from '../types';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface Props {
  data: TickerItem[];
}

/**
 * Ticker Component
 * Renders a list of market items with their current price and change percentage.
 * Uses Framer Motion for entrance animations.
 */
const Ticker: React.FC<Props> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <Activity size={14} className="text-gray-500" />
        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase font-sans">LIVE MARKET FEED</span>
      </div>
      
      <div className="space-y-3">
        {(data || []).slice(0, 15).map((item, i) => (
          <motion.div 
            key={`${item.symbol}-${i}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex justify-between items-center p-3 bg-black/20 border border-white/5 sharp-edge group hover:bg-black/40 transition-all"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-white uppercase font-sans tracking-tight truncate">
                {item.symbol}
              </span>
              <span className="text-[11px] font-mono num-font text-gray-500">
                {item.price}
              </span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-black font-mono num-font flex-shrink-0 ${item.isUp ? 'text-broker-green' : 'text-broker-pink'}`}>
              {item.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {item.change}
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="pt-4 border-t border-white/5">
        <div className="flex justify-between items-center text-[8px] font-black text-gray-700 uppercase tracking-widest font-sans">
          <span>LATENCY: 42MS</span>
          <span>SRC: GLOBAL QUANT</span>
        </div>
      </div>
    </div>
  );
};

export default Ticker;
