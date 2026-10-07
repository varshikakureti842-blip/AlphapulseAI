import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StockHeader } from './components/StockHeader';
import { PriceChart } from './components/PriceChart';
import { IndicatorsPanel } from './components/IndicatorsPanel';
import { AiAnalysisPanel } from './components/AiAnalysisPanel';
import { OrderTicket } from './components/OrderTicket';
import { PortfolioView } from './components/PortfolioView';
import { TradeHistoryView } from './components/TradeHistoryView';
import { TradeConfirmationModal } from './components/TradeConfirmationModal';
import { ResetPortfolioModal } from './components/ResetPortfolioModal';
import { GroundedNewsPanel } from './components/GroundedNewsPanel';
import { GeminiChatbot } from './components/GeminiChatbot';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { TechnicalAlertToast } from './components/TechnicalAlertToast';
import { AiFeaturesHub } from './components/AiFeaturesHub';
import { useAuth } from './hooks/useAuth';
import { 
  savePortfolioToFirestore, 
  saveTradeToFirestore, 
  loadPortfolioFromFirestore 
} from './services/firestoreSync';
import { 
  MarketQuote, 
  TechnicalIndicators, 
  GeminiAnalysisResult, 
  Portfolio, 
  TimePeriod,
  MarketDataMode 
} from './types/stock';
import { 
  AlertCircle, 
  ShieldAlert, 
  Sparkles, 
  Briefcase, 
  History, 
  ShieldCheck, 
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Radio,
  Bot,
  Mic
} from 'lucide-react';

export default function App() {
  const { user } = useAuth();
  const [currentSymbol, setCurrentSymbol] = useState<string>('AAPL');
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('3M');
  const [marketDataMode, setMarketDataMode] = useState<MarketDataMode>('live');
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [loadingIndicators, setLoadingIndicators] = useState<boolean>(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals state
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);
  const [tradeModalSide, setTradeModalSide] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeModalQuantity, setTradeModalQuantity] = useState<number>(10);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);

  // Bottom section active tab
  const [bottomTab, setBottomTab] = useState<'portfolio' | 'history'>('portfolio');

  // Fetch Market Quote
  const fetchQuote = useCallback(async (sym: string, mode: MarketDataMode = marketDataMode, silent = false) => {
    if (!silent) setLoadingQuote(true);
    try {
      const res = await fetch(`/api/market-data/${encodeURIComponent(sym)}?mode=${mode}`);
      const data = await res.json();
      if (data.success) {
        setQuote(data.data);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch market quote');
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Market data unavailable');
      }
    } finally {
      if (!silent) setLoadingQuote(false);
    }
  }, [marketDataMode]);

  // Fetch Technical Indicators and historical candles
  const fetchIndicators = useCallback(async (sym: string, p: TimePeriod, mode: MarketDataMode = marketDataMode) => {
    setLoadingIndicators(true);
    try {
      const res = await fetch(`/api/indicators/${encodeURIComponent(sym)}?period=${p}&mode=${mode}`);
      const data = await res.json();
      if (data.success) {
        setIndicators(data.data);
      } else {
        throw new Error(data.error || 'Failed to calculate indicators');
      }
    } catch (err: any) {
      console.error('Error loading indicators:', err);
    } finally {
      setLoadingIndicators(false);
    }
  }, [marketDataMode]);

  // Fetch Virtual Portfolio
  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio');
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.data);
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    }
  }, []);

  // Load authenticated user's portfolio from Firestore
  useEffect(() => {
    if (user?.uid) {
      loadPortfolioFromFirestore(user.uid).then((saved) => {
        if (saved && saved.cash !== undefined) {
          setPortfolio((prev) => (prev ? { ...prev, ...saved } as any : (saved as any)));
        }
      });
    }
  }, [user?.uid]);

  // Trigger Gemini AI Analysis
  const runAiAnalysis = useCallback(async () => {
    if (isAiAnalyzing) return;
    setIsAiAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: currentSymbol }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data);
      } else {
        throw new Error(data.error || 'AI analysis request failed');
      }
    } catch (err: any) {
      setError(`AI Analysis Error: ${err.message}`);
    } finally {
      setIsAiAnalyzing(false);
    }
  }, [currentSymbol, isAiAnalyzing]);

  // Initial load, symbol change or market data mode change effect
  useEffect(() => {
    fetchQuote(currentSymbol, marketDataMode);
    fetchIndicators(currentSymbol, period, marketDataMode);
    setAnalysis(null); // Clear previous AI analysis when symbol switches
  }, [currentSymbol, fetchQuote, fetchIndicators, period, marketDataMode]);

  // Periodic subtle tick poll for live market feel
  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(() => {
      fetchQuote(currentSymbol, marketDataMode, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSymbol, fetchQuote, fetchPortfolio, marketDataMode]);

  // Toggle live vs simulated market data mode
  const handleToggleMarketDataMode = (newMode: MarketDataMode) => {
    setMarketDataMode(newMode);
    setSuccessToast(
      newMode === 'live'
        ? 'Switched to Real-Time Live Exchange Feed'
        : 'Switched to Simulated Demo Feed'
    );
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Handle symbol change from search or ticker chips
  const handleSelectSymbol = (sym: string) => {
    const upper = sym.toUpperCase().trim();
    if (upper && upper !== currentSymbol) {
      setCurrentSymbol(upper);
    }
  };

  // Open Trade Modal from AI recommendation
  const handleOpenAiTradeConfirm = (aiResult: GeminiAnalysisResult) => {
    setTradeModalSide(aiResult.action === 'SELL' ? 'SELL' : 'BUY');
    setTradeModalQuantity(aiResult.suggested_quantity > 0 ? aiResult.suggested_quantity : 10);
    setIsTradeModalOpen(true);
  };

  // Open Trade Modal from manual order ticket
  const handleOpenManualTradeModal = (side: 'BUY' | 'SELL', qty: number) => {
    setTradeModalSide(side);
    setTradeModalQuantity(qty);
    setIsTradeModalOpen(true);
  };

  // Quick sell action from positions list
  const handleQuickSell = (sym: string, qty: number) => {
    handleSelectSymbol(sym);
    setTradeModalSide('SELL');
    setTradeModalQuantity(qty);
    setIsTradeModalOpen(true);
  };

  // Execute Paper Trade
  const handleConfirmTrade = async (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    reason: string;
    aiAnalysis?: any;
  }) => {
    const res = await fetch('/api/orders/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Trade execution failed.');
    }
    // Update local portfolio state
    setPortfolio(data.data.portfolio);

    // Sync to Firestore if user is authenticated
    if (user?.uid) {
      savePortfolioToFirestore(user.uid, data.data.portfolio);
      if (data.data.trade) {
        saveTradeToFirestore(user.uid, data.data.trade);
      }
    }

    // Trigger toast
    setSuccessToast(
      `Simulated ${params.side} executed: ${params.quantity} shares of ${params.symbol} @ $${data.data.trade.executionPrice.toFixed(2)}`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Reset Virtual Portfolio
  const handleResetPortfolio = async (initialCash: number) => {
    const res = await fetch('/api/portfolio/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialCash }),
    });
    const data = await res.json();
    if (data.success) {
      setPortfolio(data.data);

      if (user?.uid) {
        savePortfolioToFirestore(user.uid, data.data);
      }

      setSuccessToast(`Virtual portfolio reset to $${initialCash.toLocaleString()}`);
      setTimeout(() => setSuccessToast(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top App Navbar */}
      <Navbar
        currentSymbol={currentSymbol}
        onSelectSymbol={handleSelectSymbol}
        portfolio={portfolio}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        isAiAnalyzing={isAiAnalyzing}
        onTriggerAiAnalysis={runAiAnalysis}
        marketDataMode={marketDataMode}
        onToggleMarketDataMode={handleToggleMarketDataMode}
        isRealTime={quote?.isSimulated === false}
        dataSourceName={quote?.dataSource}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
      />

      {/* Quick Launch Hub for Google AI Features */}
      <AiFeaturesHub
        currentSymbol={currentSymbol}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onRunAnalysis={runAiAnalysis}
        isAnalyzing={isAiAnalyzing}
        onScrollToNews={() => {
          const el = document.getElementById('grounded-news-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onScrollToChart={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs font-mono backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Main Content Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert Message */}
        {error && (
          <div className="p-4 bg-rose-950/70 border border-rose-600/70 rounded-2xl flex items-start justify-between gap-3 text-rose-200 text-xs font-mono">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Market Notice:</span>
                <span>{error}</span>
              </div>
            </div>
            <button
              onClick={() => fetchQuote(currentSymbol, marketDataMode)}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 rounded border border-rose-700 text-rose-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Top Stock Header (Real-time Price & Market Metrics) */}
        <StockHeader
          quote={quote}
          indicators={indicators}
          loading={loadingQuote}
        />

        {/* 2. Main Grid: Left (Chart + Oscillators) & Right (AI Analysis + Order Ticket) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Price Chart and Technical Oscillators (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Price Chart with Candlesticks, Area, SMA 20, SMA 50 overlays */}
            <PriceChart
              candles={indicators?.candles || []}
              sma20Series={indicators?.sma20Series || []}
              sma50Series={indicators?.sma50Series || []}
              period={period}
              onPeriodChange={(p) => setPeriod(p)}
              loading={loadingIndicators}
              dataSource={quote?.dataSource}
              isSimulated={quote?.isSimulated}
              symbol={currentSymbol}
            />

            {/* Technical Indicators: RSI(14) and MACD(12, 26, 9) Oscillators */}
            <IndicatorsPanel
              indicators={indicators}
              loading={loadingIndicators}
            />
          </div>

          {/* Right Column: AI Analysis & Order Ticket (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Gemini AI Analysis Panel */}
            <AiAnalysisPanel
              analysis={analysis}
              loading={isAiAnalyzing}
              symbol={currentSymbol}
              onRefreshAnalysis={runAiAnalysis}
              onOpenTradeConfirm={handleOpenAiTradeConfirm}
            />

            {/* Quick Order Ticket */}
            <OrderTicket
              quote={quote}
              portfolio={portfolio}
              onOpenTradeModal={handleOpenManualTradeModal}
              analysis={analysis}
            />

            {/* Feature 1: Google Search Grounding with gemini-3.5-flash */}
            <div id="grounded-news-section">
              <GroundedNewsPanel
                symbol={currentSymbol}
                companyName={quote?.companyName}
              />
            </div>
          </div>
        </div>

        {/* 3. Bottom Tabs: Virtual Portfolio & Positions vs Paper Trade History */}
        <div className="space-y-4 pt-2">
          {/* Section Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setBottomTab('portfolio')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  bottomTab === 'portfolio'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Virtual Portfolio & Positions</span>
                {portfolio && portfolio.positions.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded text-[10px]">
                    {portfolio.positions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setBottomTab('history')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  bottomTab === 'history'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Trade Execution Ledger</span>
                {portfolio && portfolio.trades.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px]">
                    {portfolio.trades.length}
                  </span>
                )}
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 hidden sm:flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Independent Risk Management Active</span>
            </div>
          </div>

          {/* Active Tab View */}
          {bottomTab === 'portfolio' ? (
            <PortfolioView
              portfolio={portfolio}
              onQuickSell={handleQuickSell}
              onSelectSymbol={handleSelectSymbol}
            />
          ) : (
            <TradeHistoryView
              trades={portfolio?.trades || []}
              onSelectSymbol={handleSelectSymbol}
            />
          )}
        </div>
      </main>

      {/* Crucial Paper Trading Mandatory User Confirmation Modal */}
      <TradeConfirmationModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        analysis={analysis}
        quote={quote}
        portfolio={portfolio}
        onConfirmTrade={handleConfirmTrade}
        defaultSide={tradeModalSide}
        defaultQuantity={tradeModalQuantity}
      />

      {/* Reset Portfolio Virtual Cash Modal */}
      <ResetPortfolioModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onReset={handleResetPortfolio}
        currentCash={portfolio?.cash || 100000}
      />

      {/* Feature 2: Gemini Multi-Turn Chatbot Drawer */}
      <GeminiChatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        quote={quote}
        indicators={indicators}
        portfolio={portfolio}
        onOpenTradeModal={handleOpenManualTradeModal}
      />

      {/* Feature 3: Real-Time Live Voice Conversation (gemini-3.8-live) */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        quote={quote}
      />

      {/* Subtle Technical Indicator Alerts Toast */}
      <TechnicalAlertToast
        quote={quote}
        indicators={indicators}
        onOpenChatWithPrompt={(prompt) => {
          setIsChatOpen(true);
        }}
        onOpenTradeModal={handleOpenManualTradeModal}
      />

      {/* Floating Quick Action Launcher (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center space-x-3">
        {/* Live Voice Trigger */}
        <button
          onClick={() => setIsLiveVoiceOpen(true)}
          title="Start Live Voice Conversation (gemini-3.8-live)"
          className="flex items-center space-x-2 px-3.5 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 shadow-xl shadow-emerald-950/40 backdrop-blur-md transition-all hover:scale-105"
        >
          <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold hidden sm:inline">Voice Live</span>
        </button>

        {/* Gemini Copilot Chat Trigger */}
        <button
          onClick={() => setIsChatOpen(true)}
          title="Open Gemini Copilot Chatbot"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-xl shadow-cyan-950/50 transition-all hover:scale-105 border border-cyan-400/40"
        >
          <Bot className="w-4 h-4" />
          <span className="text-xs font-mono font-bold">Copilot</span>
        </button>
      </div>

      {/* Footer with Persistent Paper Trading Disclaimer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-slate-500 font-mono text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-amber-400/90 font-bold uppercase">
              PAPER TRADING — NO REAL MONEY
            </span>
          </div>
          <p className="text-center sm:text-right text-[11px] text-slate-500">
            For technical analysis education & simulation only. No real financial transactions are executed.
          </p>
        </div>
      </footer>
    </div>
  );
}
