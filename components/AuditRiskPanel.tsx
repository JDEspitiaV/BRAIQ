import React, { useState, useEffect } from 'react';
import { getAuditLedger, getRiskOrders, createRiskOrder } from '../services/auditService';
import { AuditLedgerEntry, RiskManagementOrder } from '../types';
import { ShieldCheck, Plus, FileText, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const AuditRiskPanel: React.FC = () => {
  const [ledger, setLedger] = useState<AuditLedgerEntry[]>([]);
  const [orders, setOrders] = useState<RiskManagementOrder[]>([]);
  
  const [symbol, setSymbol] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const refreshData = () => {
    setLedger(getAuditLedger());
    setOrders(getRiskOrders());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !entryPrice || !stopLoss || !takeProfit) return;

    createRiskOrder(
      symbol,
      parseFloat(entryPrice),
      parseFloat(stopLoss),
      parseFloat(takeProfit)
    );

    setSymbol('');
    setEntryPrice('');
    setStopLoss('');
    setTakeProfit('');
    refreshData();
  };

  return (
    <div className="bg-[#1A1A1C] border border-white/10 sharp-edge p-5 space-y-6 font-sans">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={14} className="text-broker-cyan" />
          ORACLE AUDIT LEDGER & RISK ENGINE
        </h3>
        <span className="text-[8px] font-mono text-gray-500 uppercase">
          100% ORACLE DETERMINISTIC • NO SIMULATION
        </span>
      </div>

      <form onSubmit={handleCreateOrder} className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-black/40 p-3 sharp-edge border border-white/5">
        <input
          type="text"
          placeholder="TICKER (E.G. BTCUSDT)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-white/5 border border-white/10 px-3 py-2 text-[10px] font-mono text-white sharp-edge outline-none focus:border-broker-cyan"
        />
        <input
          type="number"
          step="any"
          placeholder="ENTRY PRICE ($)"
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
          className="bg-white/5 border border-white/10 px-3 py-2 text-[10px] font-mono text-white sharp-edge outline-none focus:border-broker-cyan"
        />
        <input
          type="number"
          step="any"
          placeholder="STOP LOSS ($)"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          className="bg-white/5 border border-white/10 px-3 py-2 text-[10px] font-mono text-white sharp-edge outline-none focus:border-broker-pink"
        />
        <input
          type="number"
          step="any"
          placeholder="TAKE PROFIT ($)"
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          className="bg-white/5 border border-white/10 px-3 py-2 text-[10px] font-mono text-white sharp-edge outline-none focus:border-broker-green"
        />
        <button
          type="submit"
          className="bg-broker-cyan hover:bg-white text-black font-black text-[9px] uppercase tracking-wider sharp-edge py-2 flex items-center justify-center gap-1 transition-all cursor-pointer"
        >
          <Plus size={12} /> SET LIMITS
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-black/20 border border-white/5 p-3 sharp-edge space-y-3">
          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block border-b border-white/5 pb-2">
            ACTIVE ORACLE LIMITS
          </span>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {orders.length === 0 ? (
              <p className="text-[9px] font-mono text-gray-600 text-center py-4">No limit levels recorded.</p>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="bg-white/5 p-2 border border-white/5 sharp-edge flex justify-between items-center text-[9px] font-mono">
                  <div>
                    <span className="font-bold text-white block">{ord.symbol}</span>
                    <span className="text-gray-500 text-[7px]">Entry: ${ord.entryPrice}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-broker-pink block">SL: ${ord.stopLoss}</span>
                    <span className="text-broker-green block">TP: ${ord.takeProfit}</span>
                  </div>
                  <span className={`text-[7px] font-black px-1.5 py-0.5 sharp-edge border ${
                    ord.status === 'ACTIVE' ? 'bg-broker-cyan/10 border-broker-cyan/30 text-broker-cyan' :
                    ord.status === 'STOP_LOSS_TRIGGERED' ? 'bg-broker-pink/20 border-broker-pink/50 text-broker-pink' :
                    'bg-broker-green/20 border-broker-green/50 text-broker-green'
                  }`}>
                    {ord.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-black/20 border border-white/5 p-3 sharp-edge space-y-3">
          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block border-b border-white/5 pb-2">
            AUDIT TRAIL (IMMUTABLE EVENTS)
          </span>
          <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-[8px]">
            {ledger.length === 0 ? (
              <p className="text-[9px] text-gray-600 text-center py-4">No audit records generated yet.</p>
            ) : (
              ledger.map((log) => (
                <div key={log.id} className="bg-black/40 p-2 border border-white/5 sharp-edge space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-broker-purple font-bold">#HASH-{log.checksum}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">{log.eventType}</span>
                    <span className="text-broker-cyan">{log.symbol}</span>
                  </div>
                  <pre className="text-[7px] text-gray-400 bg-black/50 p-1 rounded-none overflow-x-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(log.data)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditRiskPanel;
