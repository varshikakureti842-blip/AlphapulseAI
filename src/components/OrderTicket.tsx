import React, { useState } from 'react';
import { MarketQuote, Portfolio, GeminiAnalysisResult } from '../types/stock';
import { TrendingUp, TrendingDown, ArrowRight, ShieldCheck } from 'lucide-react';

interface OrderTicketProps {
  quote: MarketQuote | null;
  portfolio: Portfolio | null;
  onOpenTradeModal: (side: 'BUY' | 'SELL', quantity: number) => void;
  analysis: GeminiAnalysisResult | null;
}

export const OrderTicket: React.FC<OrderTicketProps> = ({
  quote,
  portfolio,
  onOpenTradeModal,
  analysis,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(10);

  if (!quote || !portfolio) return null;

  const currentPrice = quote.price;
  const estimatedTotal = +(quantity * currentPrice).toFixed(2);
  const existingPosition = portfolio.positions.find((p) => p.symbol === quote.symbol);
  const holdingQty = existingPosition ? existingPosition.quantity : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0) {
      onOpenTradeModal(side, quantity);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <h3 className="text-sm font-bold font-mono tracking-tight text-white uppercase flex items-center space-x-2">
          <span>Paper Order Ticket</span>
        </h3>
        <span className="text-[11px] font-mono text-cyan-400 font-bold">
          ${currentPrice.toFixed(2)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* BUY / SELL Switch */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 px-3 rounded-lg font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Simulate BUY</span>
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 px-3 rounded-lg font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/20'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Simulate SELL</span>
          </button>
        </div>

        {/* Quantity Field */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>Shares to Trade:</span>
            {side === 'SELL' && holdingQty <= 0 && (
              <span className="text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                Short Sale (Sell without holding)
              </span>
            )}
            {side === 'SELL' && holdingQty > 0 && (
              <span className="text-slate-300">
                Holding: <strong className="text-white">{holdingQty} shares</strong>
              </span>
            )}
            {side === 'BUY' && holdingQty < 0 && (
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Buy to Cover ({Math.abs(holdingQty)} short)
              </span>
            )}
          </div>
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Quick Quantity Presets */}
        <div className="flex items-center space-x-1.5">
          {[5, 10, 25, 50].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setQuantity(amt)}
              className="flex-1 py-1 text-[11px] font-mono bg-slate-950/60 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 transition-colors"
            >
              {amt}
            </button>
          ))}
          {side === 'SELL' && holdingQty > 0 && (
            <button
              type="button"
              onClick={() => setQuantity(holdingQty)}
              className="flex-1 py-1 text-[11px] font-mono bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/40 rounded text-rose-300 transition-colors"
            >
              All ({holdingQty})
            </button>
          )}
        </div>

        {/* Summary Details */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Order Estimated Value:</span>
            <span className="font-bold text-white">
              ${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Virtual Cash Balance:</span>
            <span className="text-slate-200">
              ${portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Review & Launch Modal CTA */}
        <button
          type="submit"
          className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md ${
            side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
          }`}
        >
          <span>Review & Confirm {side}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <p className="text-[10px] text-center font-mono text-slate-500">
          Independent risk manager enforces margin and position limits.
        </p>
      </form>
    </div>
  );
};
