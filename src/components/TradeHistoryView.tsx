import React from 'react';
import { PaperTrade } from '../types/stock';
import { History, Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface TradeHistoryViewProps {
  trades: PaperTrade[];
  onSelectSymbol: (symbol: string) => void;
}

export const TradeHistoryView: React.FC<TradeHistoryViewProps> = ({ trades, onSelectSymbol }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
        <h3 className="text-sm font-bold font-mono tracking-tight text-white uppercase flex items-center space-x-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span>Paper Trade Execution History ({trades.length})</span>
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Simulated ledger & audit trail
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
          <Clock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-mono text-slate-400">
            No paper trades have been executed yet.
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            Confirmed simulated trades will be permanently recorded here with execution prices and AI context.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                <th className="pb-2.5 font-semibold">Timestamp</th>
                <th className="pb-2.5 font-semibold">Symbol</th>
                <th className="pb-2.5 font-semibold">Action</th>
                <th className="pb-2.5 font-semibold text-right">Shares</th>
                <th className="pb-2.5 font-semibold text-right">Exec Price</th>
                <th className="pb-2.5 font-semibold text-right">Total Value</th>
                <th className="pb-2.5 font-semibold">Reason & AI Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {trades.map((trade: PaperTrade) => {
                const isBuy = trade.action === 'BUY';
                return (
                  <tr key={trade.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 text-slate-400 text-[11px]">
                      {new Date(trade.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => onSelectSymbol(trade.symbol)}
                        className="font-bold text-white hover:text-cyan-400 transition-colors"
                      >
                        {trade.symbol}
                      </button>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isBuy
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="w-3 h-3 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-0.5" />
                        )}
                        {trade.action}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-white">
                      {trade.quantity}
                    </td>
                    <td className="py-3 text-right text-slate-300">
                      ${trade.executionPrice.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-bold text-cyan-300">
                      ${trade.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 max-w-xs">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-300 block truncate" title={trade.reason}>
                          {trade.reason}
                        </span>
                        {trade.aiAnalysis && (
                          <div className="flex items-center space-x-1.5 text-[10px] text-indigo-300">
                            <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span>
                              AI Rec: {trade.aiAnalysis.action} ({Math.round(trade.aiAnalysis.confidence * 100)}% conf • {trade.aiAnalysis.risk_level} risk)
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
