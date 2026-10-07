import React from 'react';
import { MarketQuote, TechnicalIndicators } from '../types/stock';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  BarChart3, 
  Layers, 
  Clock, 
  Info,
  ShieldAlert,
  Radio,
  Sparkles
} from 'lucide-react';

interface StockHeaderProps {
  quote: MarketQuote | null;
  indicators: TechnicalIndicators | null;
  loading: boolean;
}

export const StockHeader: React.FC<StockHeaderProps> = ({ quote, indicators, loading }) => {
  if (loading && !quote) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 animate-pulse">
        <div className="h-6 w-36 bg-slate-800 rounded mb-2"></div>
        <div className="h-10 w-48 bg-slate-800 rounded mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-800/60 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const isPositive = quote.change >= 0;
  const isReal = quote.isSimulated === false;

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
        {/* Symbol & Company */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {quote.symbol}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {quote.exchange}
            </span>
            
            {/* Live vs Demo Badge */}
            {isReal ? (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1.5 shadow-sm shadow-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>REAL-TIME LIVE FEED</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>DEMO SIMULATION FEED</span>
              </span>
            )}

            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800/80 text-amber-300/90 border border-amber-500/20 flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>PAPER TRADING</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 font-medium flex items-center space-x-2">
            <span>{quote.companyName}</span>
            <span>•</span>
            <span className="font-mono text-xs">{quote.currency}</span>
            {quote.dataSource && (
              <>
                <span>•</span>
                <span className="font-mono text-[11px] text-cyan-400/90">{quote.dataSource}</span>
              </>
            )}
          </p>
        </div>

        {/* Real-time Price & Daily Change */}
        <div className="flex items-baseline space-x-3 text-right">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white flex items-center justify-end space-x-1">
              <span>${quote.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center space-x-1.5 justify-end">
              <span
                className={`inline-flex items-center text-sm sm:text-base font-bold font-mono ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                )}
                {isPositive ? '+' : ''}
                {quote.change.toFixed(2)} ({isPositive ? '+' : ''}
                {quote.changePercent.toFixed(2)}%)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {isReal ? 'Live Exchange' : 'Today'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Data Metrics Strip: Open, High, Low, Prev Close, Volume, 52W High/Low */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
            Day Open
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-slate-200">
            ${quote.open.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
            Day High
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-emerald-400">
            ${quote.high.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
            Day Low
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-rose-400">
            ${quote.low.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
            Prev Close
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-slate-300">
            ${quote.previousClose.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
            Trading Volume
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-cyan-300">
            {quote.volume.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
            {quote.fiftyTwoWeekHigh ? '52-Week Range' : 'Avg Vol (30D)'}
          </span>
          {quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow ? (
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-300 block truncate" title={`Low: $${quote.fiftyTwoWeekLow} - High: $${quote.fiftyTwoWeekHigh}`}>
              ${quote.fiftyTwoWeekLow} - ${quote.fiftyTwoWeekHigh}
            </span>
          ) : (
            <span className="text-sm sm:text-base font-bold font-mono text-slate-300">
              {quote.avgVolume.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Indicators Summary Pill Bar */}
      {indicators && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider flex items-center mr-1">
            <Activity className="w-3 h-3 mr-1 text-cyan-400" />
            Key Signals:
          </span>

          <div className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
            SMA 20: <span className="font-bold">${indicators.sma20 ?? 'N/A'}</span>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300">
            SMA 50: <span className="font-bold">${indicators.sma50 ?? 'N/A'}</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-md border ${
              indicators.rsi && indicators.rsi > 70
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : indicators.rsi && indicators.rsi < 30
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            RSI (14): <span className="font-bold">{indicators.rsi ?? 'N/A'}</span>{' '}
            {indicators.rsi && indicators.rsi > 70 && '(Overbought)'}
            {indicators.rsi && indicators.rsi < 30 && '(Oversold)'}
          </div>

          {indicators.macd && (
            <div className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300">
              MACD: <span className="font-bold">{indicators.macd.macdLine}</span> | Sig:{' '}
              <span className="font-bold">{indicators.macd.signalLine}</span> | Hist:{' '}
              <span
                className={`font-bold ${
                  indicators.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {indicators.macd.histogram >= 0 ? '+' : ''}
                {indicators.macd.histogram}
              </span>
            </div>
          )}

          <div className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
            Vol Change:{' '}
            <span
              className={`font-bold ${
                indicators.volumeChangePercent >= 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {indicators.volumeChangePercent >= 0 ? '+' : ''}
              {indicators.volumeChangePercent}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
