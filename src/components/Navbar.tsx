import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShieldAlert, 
  Search, 
  RotateCcw, 
  Wallet, 
  DollarSign, 
  Sparkles,
  Layers,
  Radio,
  Activity,
  MessageSquare,
  Bot,
  Mic,
  ExternalLink
} from 'lucide-react';
import { Portfolio, MarketDataMode } from '../types/stock';

interface NavbarProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  portfolio: Portfolio | null;
  onOpenResetModal: () => void;
  isAiAnalyzing: boolean;
  onTriggerAiAnalysis: () => void;
  marketDataMode: MarketDataMode;
  onToggleMarketDataMode: (mode: MarketDataMode) => void;
  isRealTime: boolean;
  dataSourceName?: string;
  onOpenChat: () => void;
  onOpenLiveVoice: () => void;
}

const POPULAR_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'SPY', 'BTC-USD', 'ETH-USD', 'GOOGL', 'AMZN'];

export const Navbar: React.FC<NavbarProps> = ({
  currentSymbol,
  onSelectSymbol,
  portfolio,
  onOpenResetModal,
  isAiAnalyzing,
  onTriggerAiAnalysis,
  marketDataMode,
  onToggleMarketDataMode,
  isRealTime,
  dataSourceName,
  onOpenChat,
  onOpenLiveVoice,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (clean) {
      onSelectSymbol(clean);
      setSearchInput('');
    }
  };

  const cash = portfolio ? portfolio.cash : 100000;
  const portfolioVal = portfolio ? portfolio.portfolioValue : 100000;
  const totalPnL = portfolio ? portfolio.totalPnL : 0;
  const totalPnLPercent = portfolio ? portfolio.totalPnLPercent : 0;
  const isPositivePnL = totalPnL >= 0;

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Crucial Paper Trading Notice Banner + Live Data Indicator */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-bold tracking-wider uppercase text-amber-200">
            PAPER TRADING — NO REAL MONEY
          </span>
          <span className="hidden sm:inline text-amber-400/70 text-[11px]">
            • Virtual simulation execution with real-world market intelligence
          </span>
        </div>

        {/* Live Market Data Feed Switcher */}
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Feed:</span>
            <button
              onClick={() => onToggleMarketDataMode(marketDataMode === 'live' ? 'simulated' : 'live')}
              className={`flex items-center space-x-1.5 px-2 py-0.5 rounded font-mono font-bold transition-all border ${
                isRealTime
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
              title="Click to toggle between Real-Time Exchange Data and Simulated Demo Feed"
            >
              <span className={`w-2 h-2 rounded-full ${isRealTime ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{isRealTime ? 'REAL-TIME LIVE DATA' : 'SIMULATED DEMO'}</span>
            </button>
          </div>
          {dataSourceName && (
            <span className="hidden md:inline text-slate-400 text-[10px] border-l border-slate-700/80 pl-2">
              {dataSourceName}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-white font-sans">
                  Alpha<span className="text-cyan-400">Pulse</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  AI QUANT
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Paper Trading Terminal
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                placeholder="Search stock symbol (e.g. AAPL, NVDA, SPY)..."
                className="w-full pl-9 pr-20 py-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
                maxLength={8}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-mono font-medium rounded transition-colors"
              >
                Go
              </button>
            </div>
          </form>

          {/* Right Header Controls: AI Trigger, Chatbot, Voice & Portfolio Summary */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Gemini Copilot Multi-Turn Chatbot Toggle */}
            <button
              onClick={onOpenChat}
              title="Open Gemini Multi-Turn Quant Copilot"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40 transition-all shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Copilot</span>
            </button>

            {/* Gemini Live Voice Audio Conversation */}
            <button
              onClick={onOpenLiveVoice}
              title="Open Live Voice & Mic Session (gemini-3.8-live)"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-slate-700/80 hover:border-emerald-500/40 transition-all shadow-sm"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Start Live</span>
            </button>

            {/* Direct Open in Full Browser Tab for Microphone Permissions if in Iframe */}
            {typeof window !== 'undefined' && window.self !== window.top && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Full Browser Tab (Unlocks Microphone Hardware)"
                className="hidden lg:flex items-center space-x-1 px-2.5 py-2 rounded-lg text-xs font-mono bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-cyan-300 border border-slate-700/80 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Full Tab</span>
              </a>
            )}

            {/* Run AI Analysis Quick Button */}
            <button
              onClick={onTriggerAiAnalysis}
              disabled={isAiAnalyzing}
              className={`hidden md:flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                isAiAnalyzing
                  ? 'bg-indigo-950/60 border-indigo-700/50 text-indigo-300 cursor-wait'
                  : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-cyan-400/30 shadow-md shadow-indigo-600/20'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAiAnalyzing ? 'Analyzing...' : `Analyze ${currentSymbol}`}</span>
            </button>

            {/* Virtual Portfolio Badge */}
            <div className="hidden lg:flex items-center space-x-3 px-3.5 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/60">
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  Virtual Balance
                </span>
                <span className="text-sm font-bold font-mono text-white">
                  ${portfolioVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-7 w-[1px] bg-slate-700"></div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  Simulated P/L
                </span>
                <span className={`text-xs font-bold font-mono ${isPositivePnL ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositivePnL ? '+' : ''}${totalPnL.toFixed(2)} ({isPositivePnL ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Reset Virtual Balance Button */}
            <button
              onClick={onOpenResetModal}
              title="Reset Virtual Portfolio"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Ticker Chips Bar */}
        <div className="flex items-center space-x-2 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/50">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Watchlist:</span>
          </span>
          <div className="flex items-center space-x-1.5">
            {POPULAR_TICKERS.map((ticker) => {
              const active = ticker === currentSymbol;
              return (
                <button
                  key={ticker}
                  onClick={() => onSelectSymbol(ticker)}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium transition-all ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80 border border-slate-700/50'
                  }`}
                >
                  {ticker}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
