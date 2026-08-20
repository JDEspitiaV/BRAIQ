
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_GLOSSARY_TERMS } from '../constants';
import { Info } from 'lucide-react';

interface SmartTextProps {
  text: string;
}

const Term: React.FC<{ word: string; definition: string }> = ({ word, definition }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="underline decoration-dashed decoration-broker-purple/50 hover:decoration-broker-purple hover:text-white cursor-help underline-offset-4 transition-all">
        {word}
      </span>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-[60]"
          >
            <div className="bg-[#1a1a1b]/95 backdrop-blur-xl border border-broker-purple/30 sharp-edge p-3 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
               {/* Arrow */}
               <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-broker-purple/30" />
               <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-[7px] border-transparent border-t-[#1a1a1b]" />

               <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1">
                 <Info size={12} className="text-broker-purple" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-broker-purple">
                   {word.toUpperCase()}
                 </span>
               </div>
               <p className="text-[11px] font-mono text-gray-300 leading-relaxed text-justify mx-auto max-w-[60ch]">
                 {definition}
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

const SmartText: React.FC<SmartTextProps> = ({ text }) => {
  if (!text) return null;

  // Sort terms by length descending to match composite/longer terms before short substrings (e.g., "EMA 50" before "EMA")
  const sortedTerms = [...ALL_GLOSSARY_TERMS].sort((a, b) => b.term.length - a.term.length);
  const escapedTerms = sortedTerms.map(t => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        // Find if this part matches a term (case-insensitive)
        const match = sortedTerms.find(t => t.term.toLowerCase() === part.toLowerCase());
        
        if (match) {
          return <Term key={i} word={part} definition={match.def} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

export default SmartText;
