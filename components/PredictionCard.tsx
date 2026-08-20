
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Prediction, Translation } from '../types';
import { ShieldCheck, Scale, PieChart, Star, Wallet, TrendingUp, AlertTriangle, TrendingDown, ArrowUpRight, Activity, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import SmartText from './SmartText';
import TechnicalChart from './TechnicalChart';

interface Props {
  data: Prediction;
  t: Translation;
  index: number;
  loading?: boolean;
}

const MotionDiv = motion.div as any;

const PredictionCard: React.FC<Props> = ({ data, t, index, loading = false }) => {
  const [showChart, setShowChart] = useState(true);
  const isCombo = !!data.holdings && Array.isArray(data.holdings) && data.holdings.length > 0;
  const typeLower = (data.type || '').toLowerCase();
  
  let accentColor = 'text-broker-pink';
  let borderColor = 'border-broker-pink/30';
  let bgColor = 'bg-broker-pink/[0.02]';

  if (isCombo || typeLower.includes('crypto')) {
    accentColor = 'text-broker-purple';
    borderColor = 'border-broker-purple/30';
    bgColor = 'bg-broker-purple/[0.02]';
  } else if (typeLower.includes('stock') || typeLower.includes('etf')) {
    accentColor = 'text-broker-cyan';
    borderColor = 'border-broker-cyan/30';
    bgColor = 'bg-broker-cyan/[0.02]';
  } else if (typeLower.includes('index') || typeLower.includes('forex')) {
    accentColor = 'text-broker-green';
    borderColor = 'border-broker-green/30';
    bgColor = 'bg-broker-green/[0.02]';
  }

  const safeWithdraw = (data.withdraw || 'HOLD').toUpperCase() === 'BUY' ? 'HOLD' : (data.withdraw || 'HOLD').toUpperCase();

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 90,
        damping: 18,
        delay: index * 0.1 
      }}
      className={`relative ${bgColor} border-l-2 ${borderColor} border-y border-r border-white/5 p-4 sm:p-5 sharp-edge shadow-lg group hover:bg-[#242325] transition-all duration-500`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
        <div className="space-y-1.5 flex-grow">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[7px] font-black px-1.5 py-0.5 bg-black border border-white/5 ${accentColor} uppercase tracking-widest font-sans`}>
              {data.type}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] text-gray-500 font-black uppercase font-sans">TRUST</span>
              <div className="w-12 h-[1px] bg-white/5 overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }} 
                   animate={{ width: `${data.confidence || 0}%` }} 
                   transition={{ duration: 1.5, delay: index * 0.1 + 0.5 }}
                    className={`h-full ${isCombo ? 'bg-broker-purple' : 'bg-broker-purple'}`} 
                />
              </div>
              <span className={`text-[7px] font-mono num-font font-black ${accentColor}`}>{data.confidence || 0}%</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-1.5 py-0.5 border border-white/5">
              <span className="text-[7px] text-gray-500 font-black uppercase font-sans">EXIT</span>
              <span className={`text-[7px] font-black uppercase font-sans ${safeWithdraw === 'SELL' ? 'text-broker-pink' : 'text-broker-green'}`}>
                {safeWithdraw}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black italic text-white uppercase tracking-tighter leading-none font-sans text-center">
              {data.name || 'Global Strategy'}
            </h3>
            <p className="text-[7px] text-gray-700 font-black tracking-widest mt-0.5 uppercase font-sans text-center">
              QUANTUM SYSTEM VERIFIED OPPORTUNITY
            </p>
          </div>
        </div>
        
        <div className="p-2 border border-white/10 sharp-edge bg-black/40 hidden md:block">
           {isCombo ? <Star size={18} className="text-broker-purple" /> : <Activity size={18} className="text-broker-purple" />}
        </div>
      </div>

      {isCombo && Array.isArray(data.holdings) && (
        <div className="mb-4 p-4 bg-black/40 border-y border-white/5 sharp-edge">
          <div className="flex items-center gap-2 text-[8px] font-black text-broker-purple uppercase tracking-widest mb-3 pb-1.5 border-b border-broker-purple/10 font-sans justify-center">
            <PieChart size={12} /> GLOBAL DIVERSIFIED ALLOCATION
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.holdings.slice(0, 3).map((h, i) => (
              <div key={i} className="bg-white/5 p-3 border border-white/5 sharp-edge relative group/slot transition-all hover:bg-white/10">
                <div className="absolute top-0 right-0 p-1">
                  <span className="text-[6px] text-gray-700 font-black">SLOT {i+1}</span>
                </div>
                <div className="text-[9px] font-black text-white uppercase truncate mb-1.5 font-sans text-center">{h.name}</div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                     <span className="text-[6px] text-gray-600 uppercase font-sans">PROFILE</span>
                     <span className="text-[8px] font-mono num-font text-broker-purple font-bold">OPTIMAL</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[6px] text-gray-600 uppercase font-sans">WEIGHT</span>
                    <span className="text-lg font-mono num-font font-black text-white">{h.weight}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {[
          { label: t.expectedProfit, val: data.expectedProfit || '---', color: 'text-broker-green', icon: <TrendingUp size={10}/> },
          { label: t.expectedLoss, val: data.expectedLoss || '---', color: 'text-broker-pink', icon: <TrendingDown size={10}/> },
          { label: t.riskRewardRatio, val: data.riskRewardRatio || '---', color: 'text-broker-purple', icon: <Scale size={10}/> },
          { label: t.finImpact, val: data.budgetImpact?.profitUsd || '---', color: 'text-white', icon: <Wallet size={10}/> }
        ].map((stat, i) => (
          <div key={i} className="bg-black/30 p-2.5 border border-white/5 transition-all text-center">
            <div className={`text-[7px] font-black uppercase flex items-center justify-center gap-1.5 mb-0.5 ${stat.color} opacity-60 font-sans`}>
              {stat.icon} {stat.label}
            </div>
            <div className="text-base font-mono num-font font-black text-white">{stat.val}</div>
          </div>
        ))}
      </div>

      {/* Interactive Technical Chart with Lightweight-Charts */}
      <div className="mb-6 border border-white/10 sharp-edge overflow-hidden">
        <button
          onClick={() => setShowChart(!showChart)}
          className="w-full bg-black/40 hover:bg-black/60 px-4 py-2 flex items-center justify-between text-[9px] font-black uppercase text-broker-cyan tracking-widest font-sans transition-colors"
        >
          <span className="flex items-center gap-2">
            <BarChart2 size={12} /> TECHNICAL ANALYSIS & LIGHTWEIGHT CHART
          </span>
          {showChart ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showChart && (
          <div className="p-3 bg-[#1A1A1C]">
            <TechnicalChart
              ticker={data.ticker || data.name || 'BTC'}
              entryTarget={data.entryTarget}
              stopLoss={data.stopLoss}
              takeProfit={data.takeProfit}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <div className="bg-black/20 p-3 border border-white/5 border-l-broker-green">
          <h4 className="text-broker-green text-[8px] font-black mb-2 flex items-center justify-center gap-2 uppercase tracking-widest font-sans">
            <TrendingUp size={12}/> {t.pros}
          </h4>
          <div className="space-y-1.5">
            {(data.pros || []).map((p, i) => (
              <p key={i} className="text-[10px] font-sans text-gray-400 leading-tight pl-3 relative text-justify mx-auto max-w-[60ch]">
                <span className="absolute left-0 top-0 text-broker-green font-mono num-font">»</span>
                <SmartText text={p} />
              </p>
            ))}
          </div>
        </div>
        
        <div className="bg-black/20 p-3 border border-white/5 border-l-broker-pink">
          <h4 className="text-broker-pink text-[8px] font-black mb-2 flex items-center justify-center gap-2 uppercase tracking-widest font-sans">
            <AlertTriangle size={12}/> {t.cons}
          </h4>
          <div className="space-y-1.5">
            {(data.cons || []).map((c, i) => (
              <p key={i} className="text-[10px] font-sans text-gray-400 leading-tight pl-3 relative text-justify mx-auto max-w-[60ch]">
                <span className="absolute left-0 top-0 text-broker-pink font-mono num-font">»</span>
                <SmartText text={c} />
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Verified Grounding Sources from Google Search metadata */}
      {data.groundingSources && data.groundingSources.length > 0 && (
        <div className="mb-6 p-3 bg-black/10 border border-white/5 sharp-edge">
          <div className="text-[7px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2 font-sans border-b border-white/5 pb-1 text-center">Verified Information Sources</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {data.groundingSources.map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[8px] text-broker-purple hover:text-white transition-all flex items-center gap-1.5 bg-white/5 px-2 py-1 sharp-edge border border-white/5 hover:bg-broker-purple/10"
              >
                {source.title.length > 35 ? source.title.substring(0, 35) + '...' : source.title} <ArrowUpRight size={10} />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-broker-purple animate-pulse' : 'bg-broker-green'}`} />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-700 font-sans">COMMAND READY // SCAN VERIFIED</span>
        </div>
        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans flex items-center gap-1.5">
          {t.confShort}: <span className={`num-font ${accentColor}`}>{data.confidence}%</span>
        </div>
      </div>
    </MotionDiv>
  );
};

export default PredictionCard;
