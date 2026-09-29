import React, { useState, useEffect } from 'react';
import { 
  GeminiAnalysisResult, 
  MarketQuote, 
  Portfolio, 
  PaperOrderValidation,
  RiskCheckItem 
} from '../types/stock';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  DollarSign, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface TradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: GeminiAnalysisResult | null;
  quote: MarketQuote | null;
  portfolio: Portfolio | null;
  onConfirmTrade: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    reason: string;
    aiAnalysis?: any;
  }) => Promise<void>;
  defaultSide?: 'BUY' | 'SELL';
  defaultQuantity?: number;
}

export const TradeConfirmationModal: React.FC<TradeConfirmationModalProps> = ({
  isOpen,
  onClose,
  analysis,
  quote,
  portfolio,
  onConfirmTrade,
  defaultSide,
  defaultQuantity,
}) => {
  const initialSide = defaultSide || (analysis && analysis.action === 'SELL' ? 'SELL' : 'BUY');
  const initialQty = defaultQuantity || (analysis && analysis.suggested_quantity > 0 ? analysis.suggested_quantity : 10);

  const [side, setSide] = useState<'BUY' | 'SELL'>(initialSide);
  const [quantity, setQuantity] = useState<number>(initialQty);
  const [validation, setValidation] = useState<PaperOrderValidation | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [execError, setExecError] = useState<string | null>(null);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setSide(defaultSide || (analysis && analysis.action === 'SELL' ? 'SELL' : 'BUY'));
      setQuantity(defaultQuantity || (analysis && analysis.suggested_quantity > 0 ? analysis.suggested_quantity : 10));
      setExecError(null);
    }
  }, [isOpen, analysis, defaultSide, defaultQuantity]);

  // Run backend validation on order details change
  useEffect(() => {
    if (!isOpen || !quote || !portfolio || quantity <= 0) return;

    let isMounted = true;
    const validate = async () => {
      setIsValidating(true);
      try {
        const res = await fetch('/api/orders/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: quote.symbol,
            side,
            quantity: Math.floor(quantity),
          }),
        });
        const data = await res.json();
        if (isMounted && data.success) {
          setValidation(data.data);
        }
      } catch (err: any) {
        if (isMounted) console.error('Validation error:', err);
      } finally {
        if (isMounted) setIsValidating(false);
      }
    };

    const timer = setTimeout(validate, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, quote, portfolio, side, quantity]);

  if (!isOpen || !quote) return null;

  const price = quote.price;
  const totalValue = +(quantity * price).toFixed(2);
  const canConfirm = validation?.valid && !isSubmitting && !isValidating;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    setExecError(null);
    try {
      await onConfirmTrade({
        symbol: quote.symbol,
        side,
        quantity: Math.floor(quantity),
        reason: analysis
          ? `AI recommendation (${analysis.action}) with ${(analysis.confidence * 100).toFixed(0)}% confidence`
          : 'User manual paper order',
        aiAnalysis: analysis
          ? {
              action: analysis.action,
              confidence: analysis.confidence,
              risk_level: analysis.risk_level,
              reasoningSnippet: analysis.reasoning.substring(0, 140) + '...',
            }
          : undefined,
      });
      onClose();
    } catch (err: any) {
      setExecError(err.message || 'Trade execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* Top Paper Trading Banner in Modal */}
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2 text-xs font-mono text-amber-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-extrabold uppercase tracking-wide">
              SIMULATED PAPER TRADE — NO REAL MONEY
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Modal Title */}
          <div>
            <h2 className="text-xl font-black font-mono text-white tracking-tight flex items-center space-x-2">
              <span>Confirm Paper Trade</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                {quote.symbol}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Review AI analysis metrics and risk management compliance before placing this simulated order.
            </p>
          </div>

          {/* AI Decision Summary (if triggered from Gemini) */}
          {analysis && (
            <div className="bg-slate-950/70 border border-indigo-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-xs font-mono text-indigo-300 flex items-center space-x-1.5 font-bold uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Gemini AI Assessment</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Confidence: <strong className="text-white">{Math.round(analysis.confidence * 100)}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">AI Decision</span>
                  <span
                    className={`font-black ${
                      analysis.action === 'BUY'
                        ? 'text-emerald-400'
                        : analysis.action === 'SELL'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {analysis.action}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Risk Level</span>
                  <span
                    className={`font-bold ${
                      analysis.risk_level === 'LOW'
                        ? 'text-emerald-400'
                        : analysis.risk_level === 'HIGH'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {analysis.risk_level}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Suggested Qty</span>
                  <span className="font-bold text-white">
                    {analysis.suggested_quantity} shares
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50 font-sans">
                <strong className="text-slate-400 font-mono text-[11px] block mb-1">Reasoning:</strong>
                {analysis.reasoning}
              </div>
            </div>
          )}

          {/* Trade Configuration Ticket */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              Simulated Order Parameters:
            </span>

            {/* Action Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
                  side === 'BUY'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>BUY {quote.symbol}</span>
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
                  side === 'SELL'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>SELL {quote.symbol}</span>
              </button>
            </div>

            {/* Quantity Input */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Quantity (Shares):
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex-1">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Simulated Price:
                </label>
                <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-sm font-bold">
                  ${price.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Quick Sizing Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              {[5, 10, 25, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setQuantity(amt)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 transition-colors"
                >
                  +{amt}
                </button>
              ))}
              {validation?.suggestedMaxQuantity ? (
                <button
                  type="button"
                  onClick={() => setQuantity(validation.suggestedMaxQuantity)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 rounded text-cyan-300 ml-auto transition-colors"
                >
                  Max Safe ({validation.suggestedMaxQuantity})
                </button>
              ) : null}
            </div>

            {/* Price & Cash Flow Calculation */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Estimated Total Value:</span>
                <span className="font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Virtual Cash:</span>
                <span>${portfolio?.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Projected Virtual Cash:</span>
                <span className={`font-bold ${validation && validation.projectedCash < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${validation?.projectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '...'}
                </span>
              </div>
            </div>
          </div>

          {/* Independent Risk Management Verification Checks */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-semibold flex items-center justify-between">
              <span>Risk Management Pre-Flight Checks:</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${validation?.valid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {validation?.valid ? 'CHECKS PASSED' : 'VIOLATION DETECTED'}
              </span>
            </span>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {validation?.checks.map((chk: RiskCheckItem, idx: number) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-start space-x-2 ${
                    chk.passed
                      ? 'bg-slate-950/40 border-slate-800 text-slate-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
                >
                  {chk.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold block">{chk.name}</span>
                    <span className="text-[11px] text-slate-400">{chk.message}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Error banner if rejected */}
            {validation && !validation.valid && (
              <div className="p-3 bg-rose-950/60 border border-rose-700/80 rounded-xl text-rose-200 text-xs font-mono space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Order Rejected by Risk Engine:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {execError && (
              <div className="p-3 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-200 text-xs font-mono">
                {execError}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-mono font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`px-6 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-lg flex items-center space-x-2 ${
                canConfirm
                  ? side === 'BUY'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <span>{isSubmitting ? 'Placing Order...' : 'Confirm Paper Trade'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
