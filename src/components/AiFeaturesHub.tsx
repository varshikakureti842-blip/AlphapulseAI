import React from 'react';
import { Sparkles, Bot, Mic, Search, Image as ImageIcon, Video, Zap } from 'lucide-react';

interface AiFeaturesHubProps {
  currentSymbol: string;
  onOpenChat: () => void;
  onOpenLiveVoice: () => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  onScrollToNews: () => void;
  onScrollToChart: () => void;
}

export const AiFeaturesHub: React.FC<AiFeaturesHubProps> = ({
  currentSymbol,
  onOpenChat,
  onOpenLiveVoice,
  onRunAnalysis,
  isAnalyzing,
  onScrollToNews,
  onScrollToChart,
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-y border-indigo-500/30 px-4 py-2.5 my-3 shadow-lg shadow-indigo-950/30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-xs font-bold font-mono tracking-wider text-indigo-200 uppercase">
            AI Studio Suite:
          </span>
          <span className="hidden md:inline text-[11px] text-slate-400 font-mono">
            6 Integrated Google AI Features for {currentSymbol}
          </span>
        </div>

        {/* Action Pills */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono font-medium">
          {/* 1. Quant Copilot */}
          <button
            onClick={onOpenChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Copilot AI Chat</span>
          </button>

          {/* 2. Live Voice Session */}
          <button
            onClick={onOpenLiveVoice}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Live Voice</span>
          </button>

          {/* 3. Search Grounding */}
          <button
            onClick={onScrollToNews}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-purple-400" />
            <span>3. Search Grounding</span>
          </button>

          {/* 4. Technical Analysis */}
          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>4. Technical AI</span>
          </button>

          {/* 5. Chart Card PNG Export */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('generate-image-card'));
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer shadow-sm"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>5. Image Card</span>
          </button>

          {/* 6. Chart Video Stream Recorder */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('record-chart-video'));
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>6. Record Video</span>
          </button>
        </div>
      </div>
    </div>
  );
};
