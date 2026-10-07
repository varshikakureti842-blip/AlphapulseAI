import React from 'react';
import { GeminiAnalysisResult, TradeAction, RiskLevel } from '../types/stock';
import { 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Info,
  TrendingUp,
  TrendingDown,
  MinusCircle
} from 'lucide-react';

interface AiAnalysisPanelProps {
  analysis: GeminiAnalysisResult | null;
  loading: boolean;
  symbol: string;
  onRefreshAnalysis: () => void;
  onOpenTradeConfirm: (analysis: GeminiAnalysisResult) => void;
}

export const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({
  analysis,
  loading,
  symbol,
  onRefreshAnalysis,
  onOpenTradeConfirm,
}) => {
  // Helpers for action styles
  const getActionBadge = (action: TradeAction) => {
    switch (action) {
      case 'BUY':
        return {
          label: 'STRONG BUY',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20',
          icon: <TrendingUp className="w-5 h-5 mr-1 text-emerald-400" />,
          glowClass: 'border-emerald-500/40 shadow-lg shadow-emerald-900/20',
        };
      case 'SELL':
        return {
          label: 'SELL / REDUCE',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/20',
          icon: <TrendingDown className="w-5 h-5 mr-1 text-rose-400" />,
          glowClass: 'border-rose-500/40 shadow-lg shadow-rose-900/20',
        };
      case 'HOLD':
      default:
        return {
          label: 'NEUTRAL HOLD',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20',
          icon: <MinusCircle className="w-5 h-5 mr-1 text-amber-400" />,
          glowClass: 'border-amber-500/40 shadow-lg shadow-amber-900/20',
        };
    }
  };

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'LOW':
        return {
          label: 'LOW RISK',
          cls: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50',
          dot: 'bg-emerald-400',
        };
      case 'HIGH':
        return {
          label: 'HIGH RISK',
          cls: 'bg-rose-950/80 text-rose-300 border-rose-600/50',
          dot: 'bg-rose-400',
        };
      case 'MEDIUM':
      default:
        return {
          label: 'MODERATE RISK',
          cls: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
          dot: 'bg-amber-400',
        };
    }
  };

  const actionStyle = analysis ? getActionBadge(analysis.action) : null;
  const riskStyle = analysis ? getRiskBadge(analysis.risk_level) : null;
  const confidencePercent = analysis ? Math.round(analysis.confidence * 100) : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-tight text-white uppercase flex items-center gap-1.5">
                Technical AI Analysis
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  analysis?.source === 'gemini' 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {analysis?.source === 'gemini' ? 'Gemini AI' : 'Quant Engine'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Multimodal quantitative technical assessment
              </p>
            </div>
          </div>

          <button
            onClick={onRefreshAnalysis}
            disabled={loading}
            title="Re-run Gemini AI Analysis"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin"></div>
              <Sparkles className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold font-mono text-white">
                Gemini Analyzing Market Indicators...
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Evaluating SMA 20/50, RSI(14), MACD signals for {symbol}
              </p>
            </div>
          </div>
        ) : !analysis ? (
          <div className="py-10 text-center space-y-3">
            <Info className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">
              Click &quot;Analyze Stock&quot; to evaluate {symbol} with Gemini.
            </p>
            <button
              onClick={onRefreshAnalysis}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-semibold transition-all"
            >
              Run AI Analysis
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Verdict Row: Action Badge + Risk Level + Confidence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Action Decision Badge */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${actionStyle?.badgeClass}`}
              >
                <div className="flex items-center">
                  {actionStyle?.icon}
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-80 block">
                      AI Decision
                    </span>
                    <span className="text-lg font-black font-mono tracking-tight">
                      {actionStyle?.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Level Badge */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${riskStyle?.cls}`}>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider opacity-80 block">
                    Calculated Risk
                  </span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${riskStyle?.dot}`}></span>
                    <span className="text-base font-extrabold font-mono">
                      {riskStyle?.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {analysis.notice && (
              <div className="px-3 py-2 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-[11px] font-mono text-indigo-300 flex items-center space-x-2">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{analysis.notice}</span>
              </div>
            )}

            {/* AI Confidence Meter */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-400">AI Model Confidence:</span>
                <span className="font-extrabold text-cyan-300">
                  {confidencePercent}% ({analysis.confidence.toFixed(2)} / 1.00)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-700"
                  style={{ width: `${confidencePercent}%` }}
                ></div>
              </div>
            </div>

            {/* AI Reasoning Text */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
                Technical Reasoning & Strategy:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {analysis.reasoning}
              </p>
            </div>

            {/* Key Technical Factors List */}
            {analysis.key_factors && analysis.key_factors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
                  Key Technical Catalysts:
                </span>
                <ul className="space-y-1">
                  {analysis.key_factors.map((factor, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-300 flex items-start space-x-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Sizing & Virtual Allocation */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Suggested Virtual Quantity:</span>
              <span className="font-bold text-sm text-indigo-300">
                {analysis.suggested_quantity > 0
                  ? `${analysis.suggested_quantity} shares`
                  : '0 shares (HOLD)'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory User Confirmation Action CTA */}
      {analysis && !loading && (
        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
          {analysis.action !== 'HOLD' ? (
            <button
              onClick={() => onOpenTradeConfirm(analysis)}
              className={`w-full py-3 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg ${
                analysis.action === 'BUY'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-900/30'
              }`}
            >
              <span>Review & Confirm Simulated {analysis.action}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-center py-2 px-3 bg-slate-800/60 rounded-xl text-xs font-mono text-slate-400 border border-slate-700/60">
              Hold Signal: No immediate trade action recommended by AI.
            </div>
          )}
          <p className="text-[10px] text-center font-mono text-slate-500">
            Trades are NEVER executed automatically. User confirmation is mandatory.
          </p>
        </div>
      )}
    </div>
  );
};
