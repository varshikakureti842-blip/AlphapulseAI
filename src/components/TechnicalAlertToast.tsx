import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  X, 
  Zap, 
  Bot, 
  Volume2, 
  VolumeX, 
  AlertCircle
} from 'lucide-react';
import { MarketQuote, TechnicalIndicators } from '../types/stock';

export interface TechnicalAlert {
  id: string;
  symbol: string;
  price: number;
  type: 'RSI_OVERSOLD' | 'RSI_OVERBOUGHT' | 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'MACD_BULLISH' | 'MACD_BEARISH';
  polarity: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  title: string;
  message: string;
  indicatorValue: string;
  timestamp: Date;
}

interface TechnicalAlertToastProps {
  quote: MarketQuote | null;
  indicators: TechnicalIndicators | null;
  onOpenChatWithPrompt?: (prompt: string) => void;
  onOpenTradeModal?: (side: 'BUY' | 'SELL', quantity: number) => void;
  onAlertTriggered?: (alert: TechnicalAlert) => void;
}

/**
 * Play a subtle, non-intrusive synthesized audio chime (Web Audio API)
 */
function playSubtleChime(polarity: 'bullish' | 'bearish' | 'neutral') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (polarity === 'bullish') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
    } else if (polarity === 'bearish') {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(440.0, now + 0.12); // A4
    } else {
      osc.frequency.setValueAtTime(523.25, now);
    }

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Autoplay restrictions safely swallowed
  }
}

export const TechnicalAlertToast: React.FC<TechnicalAlertToastProps> = ({
  quote,
  indicators,
  onOpenChatWithPrompt,
  onOpenTradeModal,
  onAlertTriggered,
}) => {
  const [activeToast, setActiveToast] = useState<TechnicalAlert | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Store last trigger signature to avoid repeating the exact same alert within a 5-minute window
  const triggeredKeysRef = useRef<Set<string>>(new Set());
  const dismissTimerRef = useRef<any>(null);

  const dispatchAlert = useCallback((alert: TechnicalAlert) => {
    setActiveToast(alert);
    if (onAlertTriggered) onAlertTriggered(alert);

    if (soundEnabled) {
      playSubtleChime(alert.polarity.toLowerCase() as any);
    }

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setActiveToast((curr) => (curr?.id === alert.id ? null : curr));
    }, 9000);
  }, [soundEnabled, onAlertTriggered]);

  // Monitor quote & indicators for technical indicator crossing events
  useEffect(() => {
    if (!quote || !indicators) return;

    const { symbol, price } = quote;
    const { rsi, sma20, sma50, macd } = indicators;

    if (rsi === null && sma20 === null && !macd) return;

    const currentBucketKey = Math.floor(Date.now() / (1000 * 60 * 5)); // 5-minute bucket

    // 1. RSI Oversold Crossing (<= 32)
    if (rsi !== null && rsi <= 32) {
      const key = `${symbol}_RSI_OVERSOLD_${currentBucketKey}`;
      if (!triggeredKeysRef.current.has(key)) {
        triggeredKeysRef.current.add(key);
        dispatchAlert({
          id: 'alert-' + Date.now(),
          symbol,
          price,
          type: 'RSI_OVERSOLD',
          polarity: 'BULLISH',
          title: `RSI Oversold Alert (${symbol})`,
          message: `14-period RSI dipped to ${rsi.toFixed(1)} (below 30 oversold boundary). High-probability mean-reversion bounce setup.`,
          indicatorValue: `RSI: ${rsi.toFixed(1)}`,
          timestamp: new Date(),
        });
        return;
      }
    }

    // 2. RSI Overbought Crossing (>= 68)
    if (rsi !== null && rsi >= 68) {
      const key = `${symbol}_RSI_OVERBOUGHT_${currentBucketKey}`;
      if (!triggeredKeysRef.current.has(key)) {
        triggeredKeysRef.current.add(key);
        dispatchAlert({
          id: 'alert-' + Date.now(),
          symbol,
          price,
          type: 'RSI_OVERBOUGHT',
          polarity: 'BEARISH',
          title: `RSI Overbought Alert (${symbol})`,
          message: `14-period RSI surged to ${rsi.toFixed(1)} (above 70 overbought threshold). Momentum is extended; watch for consolidation.`,
          indicatorValue: `RSI: ${rsi.toFixed(1)}`,
          timestamp: new Date(),
        });
        return;
      }
    }

    // 3. Golden Cross / Bullish Moving Average Setup (SMA 20 > SMA 50 and Price > SMA 20)
    if (sma20 !== null && sma50 !== null && sma20 > sma50 && price > sma20) {
      const key = `${symbol}_GOLDEN_ALIGNMENT_${currentBucketKey}`;
      if (!triggeredKeysRef.current.has(key)) {
        triggeredKeysRef.current.add(key);
        dispatchAlert({
          id: 'alert-' + Date.now(),
          symbol,
          price,
          type: 'GOLDEN_CROSS',
          polarity: 'BULLISH',
          title: `Golden Cross Alignment (${symbol})`,
          message: `Price ($${price.toFixed(2)}) is trading above 20-day SMA ($${sma20.toFixed(2)}) and 50-day SMA ($${sma50.toFixed(2)}), confirming institutional uptrend.`,
          indicatorValue: `SMA 20 > 50`,
          timestamp: new Date(),
        });
        return;
      }
    }

    // 4. Bearish Breakdown Setup (SMA 20 < SMA 50 and Price < SMA 20)
    if (sma20 !== null && sma50 !== null && sma20 < sma50 && price < sma20) {
      const key = `${symbol}_BEARISH_ALIGNMENT_${currentBucketKey}`;
      if (!triggeredKeysRef.current.has(key)) {
        triggeredKeysRef.current.add(key);
        dispatchAlert({
          id: 'alert-' + Date.now(),
          symbol,
          price,
          type: 'DEATH_CROSS',
          polarity: 'BEARISH',
          title: `Bearish Breakdown Setup (${symbol})`,
          message: `Price ($${price.toFixed(2)}) is trading below 20-day SMA ($${sma20.toFixed(2)}) and 50-day SMA ($${sma50.toFixed(2)}). Downside momentum active.`,
          indicatorValue: `SMA 20 < 50`,
          timestamp: new Date(),
        });
        return;
      }
    }

    // 5. MACD Bullish Crossover
    if (macd && macd.macdLine > macd.signalLine && macd.histogram > 0.05) {
      const key = `${symbol}_MACD_BULL_${currentBucketKey}`;
      if (!triggeredKeysRef.current.has(key)) {
        triggeredKeysRef.current.add(key);
        dispatchAlert({
          id: 'alert-' + Date.now(),
          symbol,
          price,
          type: 'MACD_BULLISH',
          polarity: 'BULLISH',
          title: `MACD Bullish Crossover (${symbol})`,
          message: `MACD Line (${macd.macdLine.toFixed(2)}) crossed above Signal Line (${macd.signalLine.toFixed(2)}). Expanding histogram favors continuation.`,
          indicatorValue: `MACD: +${macd.histogram.toFixed(2)}`,
          timestamp: new Date(),
        });
      }
    }
  }, [quote, indicators, dispatchAlert]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (!activeToast) return null;

  const isBullish = activeToast.polarity === 'BULLISH';
  const isBearish = activeToast.polarity === 'BEARISH';

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all ${
        isBullish
          ? 'bg-slate-950/95 border-emerald-500/40 shadow-emerald-950/30'
          : isBearish
          ? 'bg-slate-950/95 border-rose-500/40 shadow-rose-950/30'
          : 'bg-slate-950/95 border-cyan-500/40 shadow-cyan-950/30'
      }`}>
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              isBullish ? 'bg-emerald-500/20 text-emerald-400' : isBearish ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/20 text-cyan-400'
            }`}>
              {isBullish ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : isBearish ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold font-mono text-xs text-white">
                  {activeToast.symbol}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ${activeToast.price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? 'Mute alert sound' : 'Unmute alert sound'}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
            </button>
            <button
              onClick={() => setActiveToast(null)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alert Body */}
        <div className="space-y-1.5 mb-3">
          <h4 className={`text-xs font-bold font-sans ${
            isBullish ? 'text-emerald-300' : isBearish ? 'text-rose-300' : 'text-cyan-300'
          }`}>
            {activeToast.title}
          </h4>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {activeToast.message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-1">
          {onOpenChatWithPrompt && (
            <button
              onClick={() => {
                onOpenChatWithPrompt(`Analyze ${activeToast.symbol}'s recent ${activeToast.type} trigger at $${activeToast.price.toFixed(2)}. What are the key entry, stop-loss, and target levels?`);
                setActiveToast(null);
              }}
              className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-cyan-300 text-[11px] font-mono transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ask Copilot</span>
            </button>
          )}

          {onOpenTradeModal && (
            <button
              onClick={() => {
                onOpenTradeModal(isBullish ? 'BUY' : 'SELL', 10);
                setActiveToast(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-mono font-bold transition-all shadow-sm cursor-pointer ${
                isBullish
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Simulate {isBullish ? 'BUY' : 'SELL'}</span>
            </button>
          )}

          <button
            onClick={() => setActiveToast(null)}
            className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
