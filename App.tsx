import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRANSLATIONS, BRAIQ_FULL_NAME } from './constants';
import { Language, MarketType, Prediction, TimeInput, HorizonMode } from './types';
import { fetchPredictions, searchAssets, fetchLiveMarketData } from './services/geminiService';
import PredictionCard from './components/PredictionCard';
import SentimentFeed from './components/SentimentFeed';
import MomentumPanel from './components/MomentumPanel';
import WatchlistPortfolio from './components/WatchlistPortfolio';
import AuditRiskPanel from './components/AuditRiskPanel';
import Dictionary from './components/Dictionary';
import { Activity, Globe, Wallet, Clock, Filter, Search, Command, ArrowRight, LayoutDashboard, Zap, ShieldCheck, Gauge, Briefcase } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('es');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [predictorResults, setPredictorResults] = useState<Prediction[]>([]);
  const [searchResults, setSearchResults] = useState<Prediction[]>([]);
  const [viewMode, setViewMode] = useState<'predict' | 'search' | 'momentum' | 'watchlist' | 'sentiment' | 'audit'>('predict');
  const [searchQuery, setSearchQuery] = useState('');

  const [budget, setBudget] = useState<number | null>(null);

  // Unified risk state
  const [riskScore, setRiskScore] = useState(50);
  const [isAutoRisk, setIsAutoRisk] = useState(true);

  const [horizonMode, setHorizonMode] = useState<HorizonMode>('precise');
  const [time, setTime] = useState<TimeInput>({ h: 0, d: 24, w: 0, m: 0, y: 0 });
  const [dates, setDates] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
  });
  
  const [type, setType] = useState<MarketType>(MarketType.GENERAL);

  const t = TRANSLATIONS[lang];
  const isComboMode = type === MarketType.COMBO;

  const sortedMarketTypes = useMemo(() => {
    return Object.values(MarketType).sort((a, b) => {
      const labelA = (t[a as keyof typeof t] || a).toUpperCase();
      const labelB = (t[b as keyof typeof t] || b).toUpperCase();
      return labelA.localeCompare(labelB, lang);
    });
  }, [t, lang]);

  const totalHours = useMemo(() => {
    if (horizonMode === 'precise') {
      return (time.h * 1) + (time.d * 24) + (time.w * 168) + (time.m * 720) + (time.y * 8760);
    } else {
      const s = new Date(dates.start);
      const e = new Date(dates.end);
      const diff = e.getTime() - s.getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    }
  }, [time, dates, horizonMode]);

  const autoRiskCalculated = useMemo(() => {
    if (totalHours <= 24) return 85; 
    if (totalHours <= 168) return 65; 
    if (totalHours <= 720) return 50; 
    if (totalHours <= 4320) return 30; 
    return 15; 
  }, [totalHours]);

  React.useEffect(() => {
    if (isAutoRisk) {
      setRiskScore(autoRiskCalculated);
    }
  }, [autoRiskCalculated, isAutoRisk]);

  const handleExecute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tickerData = await fetchLiveMarketData();
      const context = Array.isArray(tickerData) ? tickerData.map(i => `${i.symbol}: ${i.price}`).join(', ') : '';
      
      const comboSettings = isComboMode ? [
        { risk: riskScore, isAuto: isAutoRisk, type: MarketType.GENERAL },
        { risk: riskScore, isAuto: isAutoRisk, type: MarketType.GENERAL },
        { risk: riskScore, isAuto: isAutoRisk, type: MarketType.GENERAL }
      ] : null;

      const results = await fetchPredictions(
        totalHours || 24, 
        isAutoRisk ? 'AUTO' : riskScore, 
        type, 
        lang, 
        budget, 
        comboSettings, 
        context
      );

      setPredictorResults(Array.isArray(results) ? results : []);
    } catch (err: any) {
      setError(err?.message || 'Execution failed');
    } finally { 
      setLoading(false); 
    }
  }, [totalHours, riskScore, isAutoRisk, type, lang, budget, isComboMode]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchAssets(searchQuery, lang);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err: any) {
      setError('Search Error');
    } finally { 
      setLoading(false); 
    }
  };

  const currentResults = viewMode === 'predict' ? predictorResults : searchResults;
  const filteredResults = currentResults.filter(p => (p.confidence || 0) >= 75);
  const isIdle = filteredResults.length === 0 && !loading && (viewMode === 'predict' || viewMode === 'search');

  return (
    <div className="min-h-screen relative font-sans text-broker-light bg-[#242325] selection:bg-broker-pink selection:text-white flex flex-col">
      <div className="relative z-10 flex flex-col flex-grow">
        {/* Header */}
        <header className="px-6 py-3 flex flex-wrap justify-between items-center max-w-full mx-auto w-full border-b border-white/5 bg-[#242325]/90 backdrop-blur-md sticky top-0 z-50 gap-3">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
            <div className="braiq-logo text-3xl font-black text-white tracking-tighter leading-none select-none">
              BRAIQ
            </div>
            <div className="hidden md:flex flex-col border-l border-white/10 pl-4">
              <span className="text-[7px] font-black uppercase tracking-[0.3em] text-broker-cyan font-sans">
                SERVERLESS QUANT TERMINAL V6.0
              </span>
              <span className="text-[6px] font-bold uppercase text-gray-500 tracking-[0.1em] font-sans">
                {BRAIQ_FULL_NAME}
              </span>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Open Access Badge */}
            <div className="text-[8px] font-black uppercase px-3 py-1.5 sharp-edge flex items-center gap-1.5 bg-broker-green/10 text-broker-green border border-broker-green/40 shadow-[0_0_10px_rgba(29,240,150,0.15)] font-sans">
              <ShieldCheck size={12} />
              100% OPEN ACCESS • UNLIMITED QUANT SUITE
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2 bg-white/5 px-2 py-1 sharp-edge border border-white/5 group hover:border-broker-purple transition-colors">
              <Globe size={12} className="text-broker-purple" />
              <select 
                disabled={loading}
                value={lang} 
                onChange={(e) => setLang(e.target.value as Language)} 
                className="bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer font-sans disabled:opacity-50 text-white"
              >
                <option value="es" className="bg-[#242325]">ES</option>
                <option value="en" className="bg-[#242325]">EN</option>
                <option value="fr" className="bg-[#242325]">FR</option>
              </select>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-broker-pink/20 border-b border-broker-pink/50 p-3 text-center text-xs font-mono font-bold text-broker-pink flex items-center justify-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <main className="flex-grow p-4 lg:px-8 flex flex-col md:flex-row gap-6 max-w-[1440px] mx-auto w-full">
          
          <AnimatePresence mode="wait">
            {viewMode === 'predict' && (
              <motion.aside 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className={`md:w-[320px] flex-shrink-0 space-y-6 transition-opacity duration-300 ${loading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className={`bg-[#242325] border border-white/10 sharp-edge p-5 shadow-xl relative overflow-hidden transition-all duration-700 ${isComboMode ? 'border-broker-purple/40' : ''}`}>
                  <div className={`absolute top-0 left-0 w-1 h-full bg-broker-purple`} />
                  
                  <div className="space-y-8 relative z-10">
                    {/* Horizon */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black tracking-widest text-broker-purple uppercase flex items-center gap-2 font-sans">
                          <Clock size={12} /> {t.horizon}
                        </span>
                        <button 
                          onClick={() => setHorizonMode(horizonMode === 'precise' ? 'calendar' : 'precise')} 
                          className="text-[8px] font-black px-2 py-1 text-gray-500 hover:text-white border border-white/10 sharp-edge transition-all font-sans"
                        >
                          {horizonMode === 'precise' ? t.calendar : t.precise}
                        </button>
                      </div>
                      {horizonMode === 'precise' ? (
                        <div className="grid grid-cols-5 gap-1.5">
                          {['h', 'd', 'w', 'm', 'y'].map((k) => (
                            <div key={k} className="flex flex-col gap-1.5">
                              <span className="text-[8px] text-center font-black text-gray-700 uppercase font-sans">{(t as any)[k === 'h' ? 'hours' : k === 'd' ? 'days' : k === 'w' ? 'weeks' : k === 'm' ? 'months' : 'years']}</span>
                              <input 
                                type="number" 
                                value={(time as any)[k] || ''} 
                                onChange={(e) => setTime({...time, [k]: parseInt(e.target.value) || 0})} 
                                className="bg-white/5 border border-white/5 p-2 text-center text-[10px] font-mono num-font outline-none focus:border-broker-pink/50 sharp-edge text-white transition-all shimmer-focus" 
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-gray-700 uppercase font-sans">{t.startDate}</span>
                            <input type="date" value={dates.start} onChange={(e) => setDates({...dates, start: e.target.value})} className="bg-white/5 border border-white/5 p-2 text-[10px] font-mono num-font outline-none focus:border-broker-pink/50 sharp-edge text-white transition-all" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-gray-700 uppercase font-sans">{t.endDate}</span>
                            <input type="date" value={dates.end} onChange={(e) => setDates({...dates, end: e.target.value})} className="bg-white/5 border border-white/5 p-2 text-[10px] font-mono num-font outline-none focus:border-broker-pink/50 sharp-edge text-white transition-all" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Capital */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black tracking-widest text-broker-cyan uppercase flex items-center gap-2 font-sans">
                        <Wallet size={12} /> {t.budgetLabel}
                      </span>
                      <div className="flex items-center gap-2 bg-white/5 px-4 py-3 sharp-edge border border-white/5 focus-within:border-broker-cyan/50 transition-all">
                        <span className="text-[12px] font-mono text-broker-cyan">$</span>
                        <input 
                          type="number" 
                          value={budget || ''}
                          onChange={(e) => setBudget(parseFloat(e.target.value) || null)}
                          placeholder={t.budgetPlaceholder}
                          className="bg-transparent text-[12px] font-mono num-font outline-none w-full text-white placeholder:text-gray-700"
                        />
                      </div>
                    </div>

                    {/* Strategy */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-black tracking-widest text-broker-purple uppercase flex items-center gap-2 font-sans">
                        <Filter size={12}/> {t.strategy}
                      </span>
                      <div className="space-y-6">
                        <div className="flex flex-col gap-2 relative">
                           <span className="text-[8px] font-black text-gray-700 uppercase font-sans">{t.priority}</span>
                           
                           <div className="relative">
                             {isComboMode && (
                               <motion.div 
                                 animate={{ boxShadow: ["0 0 0px rgba(119,17,170,0)", "0 0 15px rgba(119,17,170,0.3)", "0 0 0px rgba(119,17,170,0)"] }}
                                 transition={{ repeat: Infinity, duration: 2.5 }}
                                 className="absolute inset-0 pointer-events-none sharp-edge border border-broker-purple/50"
                               />
                             )}
                             
                             <select 
                                value={type} 
                                onChange={(e) => setType(e.target.value as MarketType)} 
                                className={`w-full bg-black/40 border p-3 text-[10px] font-sans uppercase outline-none cursor-pointer sharp-edge transition-all relative z-10 ${isComboMode ? 'border-broker-purple text-white shadow-[0_0_10px_rgba(119,17,170,0.1)]' : 'border-white/10 text-gray-400'}`}
                              >
                               {sortedMarketTypes.map(m => (
                                 <option key={m} value={m} className="bg-[#242325]">
                                   {(t as any)[m] || m.toUpperCase()}
                                 </option>
                               ))}
                             </select>
                           </div>
                        </div>

                        {/* Standardized Risk Slider */}
                        <div className="space-y-3 pt-4 border-t border-white/5">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase font-sans">
                             <span className="text-broker-pink tracking-tighter">
                                {t.riskIndex}: <span className="num-font font-mono text-white">{isAutoRisk ? t.autoRisk : riskScore + '%'}</span>
                             </span>
                             <button 
                                onClick={() => setIsAutoRisk(!isAutoRisk)} 
                                className={`px-3 py-1.5 font-sans font-black text-[9px] transition-all sharp-edge ${isAutoRisk ? 'bg-broker-green text-black shadow-[0_0_15px_rgba(29,240,150,0.3)]' : 'bg-white/5 text-gray-500 border border-white/10'}`}
                              >
                                {t.autoRisk}
                             </button>
                           </div>
                           <div className="px-1 py-4">
                             <input 
                               type="range" 
                               disabled={isAutoRisk} 
                               min="0" max="100" 
                               value={riskScore} 
                               onChange={(e) => setRiskScore(parseInt(e.target.value))} 
                               className={`w-full h-1 appearance-none transition-all ${isAutoRisk ? 'bg-broker-green/30 cursor-default opacity-50' : 'bg-white/10 accent-broker-pink cursor-pointer'}`} 
                             />
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Execute Button */}
                    <div className="pt-4 border-t border-white/5">
                      <motion.button 
                        onClick={handleExecute} 
                        disabled={loading} 
                        animate={!loading ? { scale: [1, 1.02, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="w-full py-4 bg-broker-green text-black font-black text-sm tracking-[0.2em] sharp-edge hover:bg-white transition-all disabled:opacity-50 flex justify-center items-center gap-3 group font-sans uppercase"
                      >
                        {loading ? <Activity size={18} className="animate-spin" /> : <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />}
                        {loading ? t.loading : t.predict}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <section className="flex-grow flex flex-col gap-5 min-w-0">
            {/* View Mode Navigation Tabs */}
            <div className="bg-[#242325] border border-white/10 shadow-xl overflow-hidden sharp-edge flex-shrink-0">
              <div className="flex border-b border-white/5 overflow-x-auto">
                {[
                  { id: 'predict', icon: <Command size={12}/>, label: t.tabPredictor },
                  { id: 'search', icon: <Search size={12}/>, label: t.tabSearch },
                  { id: 'momentum', icon: <Gauge size={12}/>, label: 'TECHNICAL MOMENTUM' },
                  { id: 'watchlist', icon: <Briefcase size={12}/>, label: 'WATCHLIST & PORTFOLIO' },
                  { id: 'sentiment', icon: <Zap size={12}/>, label: 'HEADLINES & MACRO' },
                  { id: 'audit', icon: <ShieldCheck size={12}/>, label: 'RISK & AUDIT LEDGER' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    disabled={loading}
                    onClick={() => setViewMode(tab.id as any)}
                    className={`flex-1 py-3 px-3 text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-all font-sans whitespace-nowrap disabled:opacity-50 ${viewMode === tab.id ? 'bg-[#1A1A1C] text-white border-b-2 border-broker-purple font-bold' : 'bg-transparent text-gray-500 hover:text-white'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* View Sub-Headers / Controls */}
              <div className="p-4">
                {viewMode === 'predict' ? (
                  <div className="text-center py-2 border border-dashed border-white/5 sharp-edge">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 font-sans">
                      Serverless Quant Engine Active • Open Access Mode
                    </p>
                  </div>
                ) : viewMode === 'search' ? (
                  <div className="flex gap-3">
                    <input 
                      disabled={loading}
                      type="text" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                      placeholder={t.searchPlaceholder} 
                      className="flex-grow bg-white/5 border border-white/10 p-4 text-[12px] font-sans outline-none focus:border-broker-purple/50 sharp-edge text-white transition-all disabled:opacity-50" 
                    />
                    <button 
                      onClick={handleSearch} 
                      disabled={loading} 
                      className="px-8 bg-broker-purple text-black font-black tracking-widest text-[10px] uppercase sharp-edge hover:bg-white transition-all disabled:opacity-50 font-sans"
                    >
                      {t.searchButton}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Render Selected View Component */}
            {viewMode === 'momentum' && <MomentumPanel />}
            {viewMode === 'watchlist' && <WatchlistPortfolio />}
            {viewMode === 'sentiment' && <SentimentFeed />}
            {viewMode === 'audit' && <AuditRiskPanel />}

            {/* Predict & Search Output Cards */}
            {(viewMode === 'predict' || viewMode === 'search') && (
              <div className={`flex-grow flex flex-col ${isIdle ? 'justify-center items-center' : 'space-y-4'}`}>
                <AnimatePresence mode="popLayout">
                  {filteredResults.map((pred, idx) => (
                    <PredictionCard key={idx} data={pred} t={t} index={idx} loading={loading} />
                  ))}
                </AnimatePresence>
                
                {isIdle && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="w-full max-w-lg p-12 text-center border border-white/5 bg-white/[0.01] sharp-edge shadow-2xl"
                  >
                    <LayoutDashboard size={64} className="mx-auto mb-6 text-gray-800" />
                    <p className="text-[12px] font-black uppercase tracking-[0.5em] text-gray-600 font-sans mb-2">
                      {viewMode === 'predict' ? t.idleOracleTitle : t.idleScannerTitle}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-800 font-sans">
                      {viewMode === 'predict' ? t.idleOracleDesc : t.idleScannerDesc}
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed top-0 left-0 w-full h-[2px] z-[60] bg-broker-purple/10">
            <motion.div 
              initial={{ width: '0%' }} 
              animate={{ width: '100%' }} 
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="h-full bg-broker-purple shadow-[0_0_15px_rgba(119,17,170,0.8)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Dictionary />
    </div>
  );
}
