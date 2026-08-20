
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Command } from 'lucide-react';
import { TRADING_GLOSSARY, TECHNICAL_GLOSSARY } from '../constants';

const MotionDiv = motion.div as any;

const Dictionary: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trading' | 'technical'>('trading');

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 10 }}
            className="absolute bottom-16 right-0 w-[320px] max-h-[480px] overflow-hidden bg-[#242325] border border-white/10 sharp-edge shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h3 className="font-black italic text-broker-purple tracking-widest text-[9px] flex items-center gap-2 uppercase">
                <Command size={12} /> TERMINOLOGY //
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex border-b border-white/5 bg-black/10">
              <button 
                onClick={() => setActiveTab('trading')}
                className={`flex-1 py-3 text-[9px] font-black tracking-widest uppercase transition-all ${activeTab === 'trading' ? 'text-white border-b-2 border-broker-pink' : 'text-gray-500 hover:text-gray-400'}`}
              >
                TRADING
              </button>
              <button 
                onClick={() => setActiveTab('technical')}
                className={`flex-1 py-3 text-[9px] font-black tracking-widest uppercase transition-all ${activeTab === 'technical' ? 'text-white border-b-2 border-broker-purple' : 'text-gray-500 hover:text-gray-400'}`}
              >
                TECHNICAL
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {(activeTab === 'trading' ? TRADING_GLOSSARY : TECHNICAL_GLOSSARY).map((item, idx) => (
                <div key={idx} className="group border-l border-white/5 pl-3">
                  <h4 className="font-mono font-black text-[11px] text-white mb-1 uppercase tracking-tight">
                    {item.term}
                  </h4>
                  <p className="text-[11px] text-gray-500 font-sans leading-snug">
                    {item.def}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white text-black text-[8px] font-black tracking-widest text-center uppercase">
              V4.0 CORE SYSTEM
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 flex items-center justify-center sharp-edge transition-all duration-300 border shadow-lg ${
          isOpen 
          ? 'bg-broker-pink border-broker-pink text-white rotate-90' 
          : 'bg-[#242325] border-white/20 text-broker-purple hover:bg-white hover:text-black'
        }`}
      >
        <BookOpen size={20} />
      </button>
    </div>
  );
};

export default Dictionary;
