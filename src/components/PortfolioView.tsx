import React from 'react';
import { Portfolio, Position } from '../types/stock';
import { 
  Briefcase, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface PortfolioViewProps {
  portfolio: Portfolio | null;
  onQuickSell: (symbol: string, quantity: number) => void;
  onSelectSymbol: (symbol: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  portfolio,
  onQuickSell,
  onSelectSymbol,
}) => {
  if (!portfolio) return null;

  const {
    cash,
    portfolioValue,
    totalMarketValue,
    realizedPnL,
    unrealizedPnL,
    totalPnL,
    totalPnLPercent,
    positions,
    dailySimulatedLoss,
    dailyLossLimitPercent,
    maxOrderValueLimit,
    maxPositionPercentLimit,
  } = portfolio;

  const isTotalPos = totalPnL >= 0;
  const isRealizedPos = realizedPnL >= 0;
  const isUnrealizedPos = unrealizedPnL >= 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-5">
      {/* Portfolio Financial Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
            Total Virtual Portfolio
          </span>
          <span className="text-xl font-extrabold font-mono text-white">
            ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-mono font-bold block mt-0.5 ${isTotalPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isTotalPos ? '+' : ''}${totalPnL.toFixed(2)} ({isTotalPos ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
            Virtual Cash Available
          </span>
          <span className="text-xl font-extrabold font-mono text-cyan-300">
            ${cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
            {((cash / Math.max(1, portfolioValue)) * 100).toFixed(1)}% Liquid
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
            Stock Holdings Value
          </span>
          <span className="text-xl font-extrabold font-mono text-slate-200">
            ${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
            {positions.length} Open Position{positions.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
            Unrealized P/L
          </span>
          <span className={`text-xl font-extrabold font-mono ${isUnrealizedPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUnrealizedPos ? '+' : ''}${unrealizedPnL.toFixed(2)}
          </span>
          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
            Open market swings
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
            Realized P/L
          </span>
          <span className={`text-xl font-extrabold font-mono ${isRealizedPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isRealizedPos ? '+' : ''}${realizedPnL.toFixed(2)}
          </span>
          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
            From closed trades
          </span>
        </div>
      </div>

      {/* Open Positions Table */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
          <h3 className="text-sm font-bold font-mono tracking-tight text-white uppercase flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-cyan-400" />
            <span>Open Paper Positions ({positions.length})</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Real-time simulated mark-to-market
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <p className="text-xs font-mono text-slate-400">
              No open paper positions currently held in your virtual account.
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              Analyze a stock and confirm a simulated BUY order to open a position.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <th className="pb-2.5 font-semibold">Asset</th>
                  <th className="pb-2.5 font-semibold text-right">Shares</th>
                  <th className="pb-2.5 font-semibold text-right">Avg Cost</th>
                  <th className="pb-2.5 font-semibold text-right">Current</th>
                  <th className="pb-2.5 font-semibold text-right">Market Value</th>
                  <th className="pb-2.5 font-semibold text-right">Unrealized P/L</th>
                  <th className="pb-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {positions.map((pos: Position) => {
                  const isShort = pos.quantity < 0;
                  const absQty = Math.abs(pos.quantity);
                  const isPos = pos.unrealizedPnL >= 0;

                  return (
                    <tr key={pos.symbol} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <button
                          onClick={() => onSelectSymbol(pos.symbol)}
                          className="text-left group flex items-center space-x-2"
                        >
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                                {pos.symbol}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                                  isShort
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {isShort ? 'SHORT' : 'LONG'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                              {pos.companyName}
                            </span>
                          </div>
                        </button>
                      </td>
                      <td className="py-3 text-right font-bold text-white font-mono">
                        {isShort ? `-${absQty}` : `+${absQty}`}
                      </td>
                      <td className="py-3 text-right text-slate-300 font-mono">
                        ${pos.averageCost.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-bold text-cyan-300 font-mono">
                        ${pos.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-bold text-white font-mono">
                        ${Math.abs(pos.marketValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-bold inline-flex items-center font-mono ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                          {isPos ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({isPos ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {isShort ? (
                          <button
                            onClick={() => onQuickSell(pos.symbol, absQty)}
                            className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 rounded text-[11px] font-mono font-semibold transition-colors"
                          >
                            Cover Short
                          </button>
                        ) : (
                          <button
                            onClick={() => onQuickSell(pos.symbol, pos.quantity)}
                            className="px-2.5 py-1 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded text-[11px] font-mono font-semibold transition-colors"
                          >
                            Sell / Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Independent Risk Management Safeguards Status Banner */}
      <div className="pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-semibold">Active Risk Controls:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
            Max Order Limit: <strong className="text-white">${maxOrderValueLimit.toLocaleString()}</strong>
          </span>
          <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
            Max Position Size: <strong className="text-white">{Math.round(maxPositionPercentLimit * 100)}%</strong>
          </span>
          <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
            Daily Drawdown Breaker: <strong className="text-white">{Math.round(dailyLossLimitPercent * 100)}%</strong>
          </span>
          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>All Circuit Breakers Operational</span>
          </span>
        </div>
      </div>
    </div>
  );
};
