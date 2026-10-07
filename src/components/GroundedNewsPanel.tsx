import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sparkles, 
  CheckCircle2, 
  ShieldAlert,
  Compass
} from 'lucide-react';
import { GroundedNewsResult } from '../../server/services/geminiService';

interface GroundedNewsPanelProps {
  symbol: string;
  companyName?: string;
}

export const GroundedNewsPanel: React.FC<GroundedNewsPanelProps> = ({ symbol, companyName }) => {
  const [data, setData] = useState<GroundedNewsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroundedNews = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gemini/grounded-news/${encodeURIComponent(sym)}${companyName ? `?companyName=${encodeURIComponent(companyName)}` : ''}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to retrieve grounded news');
      }
    } catch (err: any) {
      setError(err.message || 'Search Grounding currently unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchGroundedNews(symbol);
    }
  }, [symbol]);

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>BULLISH SENTIMENT</span>
          </span>
        );
      case 'BEARISH':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <TrendingDown className="w-3 h-3 text-rose-400" />
            <span>BEARISH SENTIMENT</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Minus className="w-3 h-3 text-slate-400" />
            <span>NEUTRAL SENTIMENT</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white font-sans">
                Live Google Search Grounding
              </h2>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Zero API Keys Required
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Live web fact synthesis & breaking news for {symbol}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {data && getSentimentBadge(data.sentiment)}
          <button
            onClick={() => fetchGroundedNews(symbol)}
            disabled={loading}
            title="Refresh grounded search"
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-3 py-2 animate-pulse">
          <div className="h-4 bg-slate-800/80 rounded w-3/4"></div>
          <div className="h-4 bg-slate-800/60 rounded w-full"></div>
          <div className="h-4 bg-slate-800/60 rounded w-5/6"></div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="h-8 bg-slate-800/50 rounded"></div>
            <div className="h-8 bg-slate-800/50 rounded"></div>
          </div>
        </div>
      )}

      {/* Notice / Fallback Message */}
      {data?.notice && (
        <div className="px-3 py-2 bg-blue-950/40 border border-blue-800/50 rounded-lg text-xs text-blue-300 font-mono flex items-center space-x-2">
          <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{data.notice}</span>
        </div>
      )}

      {/* Content */}
      {data && (
        <div className="space-y-4">
          {/* Executive Summary */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1.5 flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Grounded Market Analysis</span>
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {data.summary}
            </p>
          </div>

          {/* Key Facts / Catalysts */}
          {data.keyPoints && data.keyPoints.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">
                Key Grounded Market Catalysts
              </span>
              <div className="grid grid-cols-1 gap-2">
                {data.keyPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Queries Used */}
          {data.searchQueries && data.searchQueries.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block flex items-center space-x-1">
                <Search className="w-3 h-3 text-slate-500" />
                <span>Google Search Queries Executed</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {data.searchQueries.map((q, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
                  >
                    "{q}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grounded Web Sources */}
          {data.sources && data.sources.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">
                Verified Grounding Sources
              </span>
              <div className="flex flex-wrap gap-2">
                {data.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 text-cyan-300 hover:text-cyan-200 text-xs font-mono transition-colors group"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-cyan-400" />
                    <span className="truncate max-w-[200px]">{src.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
