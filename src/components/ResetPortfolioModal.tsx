import React, { useState } from 'react';
import { RotateCcw, X, ShieldAlert, DollarSign } from 'lucide-react';

interface ResetPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: (initialCash: number) => Promise<void>;
  currentCash: number;
}

export const ResetPortfolioModal: React.FC<ResetPortfolioModalProps> = ({
  isOpen,
  onClose,
  onReset,
  currentCash,
}) => {
  const [cashAmount, setCashAmount] = useState<number>(100000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const presets = [25000, 50000, 100000, 250000, 500000];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cashAmount <= 0) return;
    setIsSubmitting(true);
    try {
      await onReset(cashAmount);
      onClose();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2 text-xs font-mono text-amber-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="font-extrabold uppercase tracking-wide">
              RESET SIMULATED BALANCE
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold font-mono text-white">
              Reset Virtual Portfolio
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
              This will clear all active paper positions and simulated trade history, restarting your account with a fresh virtual cash balance.
            </p>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">
              Starting Virtual Cash Balance:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                $
              </span>
              <input
                type="number"
                min={1000}
                max={10000000}
                step={1000}
                value={cashAmount}
                onChange={(e) => setCashAmount(Math.max(1000, parseInt(e.target.value, 10) || 1000))}
                className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {presets.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCashAmount(amt)}
                className={`px-2.5 py-1 text-xs font-mono rounded border transition-all ${
                  cashAmount === amt
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ${(amt / 1000).toFixed(0)}k
              </button>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Resetting...' : 'Reset Virtual Balance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
