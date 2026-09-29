import React, { useState } from 'react';
import { TechnicalIndicators } from '../types/stock';
import { Activity, Gauge, TrendingUp, BarChart2, Info } from 'lucide-react';

interface IndicatorsPanelProps {
  indicators: TechnicalIndicators | null;
  loading: boolean;
}

export const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({ indicators, loading }) => {
  const [activeTab, setActiveTab] = useState<'rsi' | 'macd'>('rsi');

  if (loading && !indicators) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="h-6 w-40 bg-slate-800 rounded mb-4"></div>
        <div className="h-32 bg-slate-800/60 rounded"></div>
      </div>
    );
  }

  if (!indicators) return null;

  const { rsi, macd, rsiSeries, macdSeries, candles, volumeChangePercent } = indicators;
  const candleCount = candles.length;
  const svgWidth = 1000;
  const height = 150;
  const padding = { top: 15, right: 60, bottom: 25, left: 10 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const stepX = innerWidth / Math.max(candleCount, 1);

  // --- 1. RSI Calculations & Path ---
  const getRsiY = (val: number) => {
    // RSI bounds: 0 to 100
    const innerH = height - padding.top - padding.bottom;
    return padding.top + innerH - (val / 100) * innerH;
  };

  let rsiPath = '';
  let rsiStarted = false;
  rsiSeries.forEach((pt, i) => {
    if (pt.value !== null) {
      const x = padding.left + i * stepX + stepX * 0.5;
      const y = getRsiY(pt.value);
      if (!rsiStarted) {
        rsiPath += `M ${x},${y}`;
        rsiStarted = true;
      } else {
        rsiPath += ` L ${x},${y}`;
      }
    }
  });

  // --- 2. MACD Calculations & Path ---
  let minMacd = -2;
  let maxMacd = 2;
  macdSeries.forEach((m) => {
    if (m.macd !== null) {
      if (m.macd < minMacd) minMacd = m.macd;
      if (m.macd > maxMacd) maxMacd = m.macd;
    }
    if (m.signal !== null) {
      if (m.signal < minMacd) minMacd = m.signal;
      if (m.signal > maxMacd) maxMacd = m.signal;
    }
    if (m.hist !== null) {
      if (m.hist < minMacd) minMacd = m.hist;
      if (m.hist > maxMacd) maxMacd = m.hist;
    }
  });
  // Symmetrical range around zero for clean visual
  const macdRange = Math.max(Math.abs(minMacd), Math.abs(maxMacd)) * 1.15 || 2;
  const getMacdY = (val: number) => {
    const innerH = height - padding.top - padding.bottom;
    return padding.top + innerH * 0.5 - (val / macdRange) * (innerH * 0.5);
  };

  let macdLinePath = '';
  let signalLinePath = '';
  let macdStarted = false;
  let signalStarted = false;

  macdSeries.forEach((m, i) => {
    const x = padding.left + i * stepX + stepX * 0.5;
    if (m.macd !== null) {
      const y = getMacdY(m.macd);
      if (!macdStarted) {
        macdLinePath += `M ${x},${y}`;
        macdStarted = true;
      } else {
        macdLinePath += ` L ${x},${y}`;
      }
    }
    if (m.signal !== null) {
      const y = getMacdY(m.signal);
      if (!signalStarted) {
        signalLinePath += `M ${x},${y}`;
        signalStarted = true;
      } else {
        signalLinePath += ` L ${x},${y}`;
      }
    }
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      {/* Header with Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold font-mono tracking-tight text-white uppercase">
            Technical Oscillators
          </h2>
        </div>

        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('rsi')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
              activeTab === 'rsi'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            RSI (14) {rsi !== null ? `• ${rsi}` : ''}
          </button>
          <button
            onClick={() => setActiveTab('macd')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
              activeTab === 'macd'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MACD (12, 26, 9)
          </button>
        </div>
      </div>

      {/* RSI Tab Panel */}
      {activeTab === 'rsi' && (
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="text-slate-200 font-bold">Relative Strength Index:</span>
              <span
                className={`font-extrabold text-sm ${
                  rsi && rsi >= 70
                    ? 'text-rose-400'
                    : rsi && rsi <= 30
                    ? 'text-emerald-400'
                    : 'text-purple-300'
                }`}
              >
                {rsi ?? 'Calculating...'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {rsi && rsi >= 70
                  ? 'Overbought (>70)'
                  : rsi && rsi <= 30
                  ? 'Oversold (<30)'
                  : 'Neutral Zone (30-70)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 hidden sm:block">
              Thresholds: 70 (Resistance) / 30 (Support)
            </div>
          </div>

          <div className="relative w-full overflow-hidden bg-slate-950/50 rounded-xl border border-slate-800/60 p-2">
            <svg viewBox={`0 0 ${svgWidth} ${height}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="rsiZone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* 30-70 Neutral Zone background */}
              <rect
                x={padding.left}
                y={getRsiY(70)}
                width={innerWidth}
                height={getRsiY(30) - getRsiY(70)}
                fill="url(#rsiZone)"
              />

              {/* 70 Overbought Line */}
              <line
                x1={padding.left}
                y1={getRsiY(70)}
                x2={svgWidth - padding.right}
                y2={getRsiY(70)}
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.8"
              />
              <text
                x={svgWidth - padding.right + 6}
                y={getRsiY(70) + 4}
                fill="#f43f5e"
                fontSize="10"
                fontFamily="monospace"
              >
                70 (OB)
              </text>

              {/* 50 Centerline */}
              <line
                x1={padding.left}
                y1={getRsiY(50)}
                x2={svgWidth - padding.right}
                y2={getRsiY(50)}
                stroke="#475569"
                strokeWidth="0.8"
                strokeDasharray="2,2"
                opacity="0.6"
              />
              <text
                x={svgWidth - padding.right + 6}
                y={getRsiY(50) + 4}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                50
              </text>

              {/* 30 Oversold Line */}
              <line
                x1={padding.left}
                y1={getRsiY(30)}
                x2={svgWidth - padding.right}
                y2={getRsiY(30)}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.8"
              />
              <text
                x={svgWidth - padding.right + 6}
                y={getRsiY(30) + 4}
                fill="#10b981"
                fontSize="10"
                fontFamily="monospace"
              >
                30 (OS)
              </text>

              {/* RSI Curve */}
              {rsiPath && (
                <path
                  d={rsiPath}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </div>
        </div>
      )}

      {/* MACD Tab Panel */}
      {activeTab === 'macd' && (
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-400">
            <div className="flex items-center space-x-3">
              <span className="text-slate-200 font-bold">MACD (12, 26, 9):</span>
              {macd ? (
                <>
                  <span className="text-cyan-300">
                    MACD: <span className="font-bold">{macd.macdLine}</span>
                  </span>
                  <span className="text-amber-300">
                    Signal: <span className="font-bold">{macd.signalLine}</span>
                  </span>
                  <span
                    className={`font-bold ${
                      macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Hist: {macd.histogram >= 0 ? '+' : ''}
                    {macd.histogram}
                  </span>
                </>
              ) : (
                <span>Calculating momentum...</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 hidden sm:block">
              Zero line divergence
            </div>
          </div>

          <div className="relative w-full overflow-hidden bg-slate-950/50 rounded-xl border border-slate-800/60 p-2">
            <svg viewBox={`0 0 ${svgWidth} ${height}`} className="w-full h-auto overflow-visible">
              {/* Zero line */}
              <line
                x1={padding.left}
                y1={getMacdY(0)}
                x2={svgWidth - padding.right}
                y2={getMacdY(0)}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={svgWidth - padding.right + 6}
                y={getMacdY(0) + 3}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                0.00
              </text>

              {/* MACD Histogram Bars */}
              {macdSeries.map((m, i) => {
                if (m.hist === null) return null;
                const x = padding.left + i * stepX + stepX * 0.2;
                const barWidth = Math.max(1.5, stepX * 0.6);
                const zeroY = getMacdY(0);
                const valY = getMacdY(m.hist);
                const barTop = Math.min(zeroY, valY);
                const barH = Math.max(1, Math.abs(zeroY - valY));
                const isPos = m.hist >= 0;

                return (
                  <rect
                    key={`hist-${i}`}
                    x={x}
                    y={barTop}
                    width={barWidth}
                    height={barH}
                    fill={isPos ? '#10b981' : '#f43f5e'}
                    opacity="0.65"
                    rx="0.5"
                  />
                );
              })}

              {/* MACD Line */}
              {macdLinePath && (
                <path
                  d={macdLinePath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}

              {/* Signal Line */}
              {signalLinePath && (
                <path
                  d={signalLinePath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
