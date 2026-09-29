import React, { useState, useRef, useMemo } from 'react';
import { CandleData, TimePeriod } from '../types/stock';
import { CandlestickChart, LineChart, Eye, EyeOff, Layers, Download } from 'lucide-react';

interface PriceChartProps {
  candles: CandleData[];
  sma20Series: { date: string; value: number | null }[];
  sma50Series: { date: string; value: number | null }[];
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  loading: boolean;
  dataSource?: string;
  isSimulated?: boolean;
  symbol?: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  candles,
  sma20Series,
  sma50Series,
  period,
  onPeriodChange,
  loading,
  dataSource,
  isSimulated,
  symbol,
}) => {
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const exportToCsv = () => {
    if (!candles || candles.length === 0) return;
    const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'];
    const rows = candles.map((c) => [
      `"${c.date}"`,
      c.open,
      c.high,
      c.low,
      c.close,
      c.volume,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${symbol || 'market'}_${period}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periods: TimePeriod[] = ['1D', '1W', '1M', '3M', '1Y'];

  // Dimensions
  const height = 380;
  const padding = { top: 20, right: 65, bottom: 45, left: 10 };
  const volumeHeight = 60;
  const priceChartHeight = height - padding.top - padding.bottom - volumeHeight;

  // Calculate Price and Volume Extents
  const { minPrice, maxPrice, maxVolume, priceRange } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 0, maxPrice: 100, maxVolume: 100, priceRange: 100 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    if (showSma20) {
      sma20Series.forEach((s) => {
        if (s.value !== null) {
          if (s.value < min) min = s.value;
          if (s.value > max) max = s.value;
        }
      });
    }

    if (showSma50) {
      sma50Series.forEach((s) => {
        if (s.value !== null) {
          if (s.value < min) min = s.value;
          if (s.value > max) max = s.value;
        }
      });
    }

    // Add a 3% buffer
    const buffer = (max - min) * 0.05 || 1;
    min = Math.max(0.01, min - buffer);
    max = max + buffer;

    return {
      minPrice: min,
      maxPrice: max,
      maxVolume: maxVol || 1,
      priceRange: max - min || 1,
    };
  }, [candles, sma20Series, sma50Series, showSma20, showSma50]);

  // Scaler helper
  const getY = (price: number) => {
    return padding.top + priceChartHeight - ((price - minPrice) / priceRange) * priceChartHeight;
  };

  const getVolY = (vol: number) => {
    const volTop = height - padding.bottom - volumeHeight;
    return height - padding.bottom - (vol / maxVolume) * volumeHeight;
  };

  const candleCount = candles.length;
  // SVG coordinates: viewbox width normalized to 1000
  const svgWidth = 1000;
  const chartInnerWidth = svgWidth - padding.left - padding.right;
  const candleSpacing = chartInnerWidth / Math.max(candleCount, 1);
  const candleWidth = Math.max(2, Math.min(14, candleSpacing * 0.72));

  // Build Area Path for Line Chart Mode
  const areaPath = useMemo(() => {
    if (candles.length === 0) return '';
    let d = `M ${padding.left + candleSpacing * 0.5},${getY(candles[0].close)}`;
    for (let i = 1; i < candles.length; i++) {
      const x = padding.left + i * candleSpacing + candleSpacing * 0.5;
      const y = getY(candles[i].close);
      d += ` L ${x},${y}`;
    }
    const lastX = padding.left + (candles.length - 1) * candleSpacing + candleSpacing * 0.5;
    const bottomY = padding.top + priceChartHeight;
    d += ` L ${lastX},${bottomY} L ${padding.left + candleSpacing * 0.5},${bottomY} Z`;
    return d;
  }, [candles, minPrice, priceRange, candleSpacing]);

  // Build Line Path for Area Chart Top
  const linePath = useMemo(() => {
    if (candles.length === 0) return '';
    let d = `M ${padding.left + candleSpacing * 0.5},${getY(candles[0].close)}`;
    for (let i = 1; i < candles.length; i++) {
      const x = padding.left + i * candleSpacing + candleSpacing * 0.5;
      const y = getY(candles[i].close);
      d += ` L ${x},${y}`;
    }
    return d;
  }, [candles, minPrice, priceRange, candleSpacing]);

  // Build SMA 20 Path
  const sma20Path = useMemo(() => {
    if (!showSma20 || sma20Series.length === 0) return '';
    let started = false;
    let d = '';
    sma20Series.forEach((point, i) => {
      if (point.value !== null) {
        const x = padding.left + i * candleSpacing + candleSpacing * 0.5;
        const y = getY(point.value);
        if (!started) {
          d += `M ${x},${y}`;
          started = true;
        } else {
          d += ` L ${x},${y}`;
        }
      }
    });
    return d;
  }, [sma20Series, showSma20, minPrice, priceRange, candleSpacing]);

  // Build SMA 50 Path
  const sma50Path = useMemo(() => {
    if (!showSma50 || sma50Series.length === 0) return '';
    let started = false;
    let d = '';
    sma50Series.forEach((point, i) => {
      if (point.value !== null) {
        const x = padding.left + i * candleSpacing + candleSpacing * 0.5;
        const y = getY(point.value);
        if (!started) {
          d += `M ${x},${y}`;
          started = true;
        } else {
          d += ` L ${x},${y}`;
        }
      }
    });
    return d;
  }, [sma50Series, showSma50, minPrice, priceRange, candleSpacing]);

  // Hover tracker
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    const svgX = ratio * svgWidth;
    const innerX = svgX - padding.left;
    const idx = Math.floor(innerX / candleSpacing);
    if (idx >= 0 && idx < candles.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1];
  const activeSma20 = hoverIndex !== null && sma20Series[hoverIndex] ? sma20Series[hoverIndex].value : sma20Series[sma20Series.length - 1]?.value;
  const activeSma50 = hoverIndex !== null && sma50Series[hoverIndex] ? sma50Series[hoverIndex].value : sma50Series[sma50Series.length - 1]?.value;

  // Price grid line steps
  const priceGridSteps = [0.1, 0.35, 0.65, 0.9];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm" ref={containerRef}>
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        {/* Timeframe Buttons */}
        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              disabled={loading}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                period === p
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chart Style & Overlays Controls */}
        <div className="flex items-center space-x-2">
          {/* Chart Style Toggle */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setChartType('candle')}
              title="Candlestick Chart"
              className={`p-1.5 rounded text-xs transition-colors ${
                chartType === 'candle'
                  ? 'bg-slate-800 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CandlestickChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('area')}
              title="Area Line Chart"
              className={`p-1.5 rounded text-xs transition-colors ${
                chartType === 'area'
                  ? 'bg-slate-800 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-4 h-4" />
            </button>
          </div>

          {/* SMA 20 Toggle */}
          <button
            onClick={() => setShowSma20(!showSma20)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
              showSma20
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-amber-400 rounded-full"></span>
            <span>SMA 20</span>
          </button>

          {/* SMA 50 Toggle */}
          <button
            onClick={() => setShowSma50(!showSma50)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
              showSma50
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-blue-400 rounded-full"></span>
            <span>SMA 50</span>
          </button>

          {/* Export to CSV Button */}
          <button
            onClick={exportToCsv}
            disabled={!candles || candles.length === 0}
            title="Export live candles to CSV / Excel"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono border bg-slate-950/80 hover:bg-slate-800 border-slate-700/80 text-cyan-300 hover:text-white transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Active Candle Hover Data Bar */}
      {activeCandle && (
        <div className="flex flex-wrap items-center justify-between text-xs font-mono px-3 py-1.5 mb-2 bg-slate-950/60 rounded-lg border border-slate-800/60 text-slate-300">
          <div className="flex items-center space-x-3">
            <span className="text-slate-400">
              {new Date(activeCandle.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: period === '1Y' ? 'numeric' : undefined,
                hour: period === '1D' || period === '1W' ? '2-digit' : undefined,
                minute: period === '1D' || period === '1W' ? '2-digit' : undefined,
              })}
            </span>
            <span>
              O: <span className="font-bold text-white">${activeCandle.open.toFixed(2)}</span>
            </span>
            <span>
              H: <span className="font-bold text-emerald-400">${activeCandle.high.toFixed(2)}</span>
            </span>
            <span>
              L: <span className="font-bold text-rose-400">${activeCandle.low.toFixed(2)}</span>
            </span>
            <span>
              C: <span className="font-bold text-cyan-300">${activeCandle.close.toFixed(2)}</span>
            </span>
            <span>
              Vol: <span className="font-bold text-slate-300">{activeCandle.volume.toLocaleString()}</span>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            {showSma20 && activeSma20 !== null && (
              <span className="text-amber-300 font-semibold">
                SMA20: ${activeSma20.toFixed(2)}
              </span>
            )}
            {showSma50 && activeSma50 !== null && (
              <span className="text-blue-300 font-semibold">
                SMA50: ${activeSma50.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main SVG Interactive Chart */}
      <div className="relative w-full overflow-hidden select-none">
        {loading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-20">
            <div className="flex items-center space-x-2 text-cyan-400 font-mono text-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Loading Market Candles...</span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="volGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="volRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Grid lines & Price Labels */}
          {priceGridSteps.map((step, idx) => {
            const y = padding.top + step * priceChartHeight;
            const priceVal = maxPrice - step * priceRange;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                <text
                  x={svgWidth - padding.right + 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ${priceVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Volume separator line */}
          <line
            x1={padding.left}
            y1={height - padding.bottom - volumeHeight}
            x2={svgWidth - padding.right}
            y2={height - padding.bottom - volumeHeight}
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* Volume Bars */}
          {candles.map((c, i) => {
            const x = padding.left + i * candleSpacing + (candleSpacing - candleWidth) * 0.5;
            const barTop = getVolY(c.volume);
            const barHeight = height - padding.bottom - barTop;
            const isGreen = c.close >= c.open;

            return (
              <rect
                key={`vol-${i}`}
                x={x}
                y={barTop}
                width={candleWidth}
                height={Math.max(1, barHeight)}
                fill={isGreen ? 'url(#volGreen)' : 'url(#volRed)'}
                rx="1"
              />
            );
          })}

          {/* Candlesticks Mode */}
          {chartType === 'candle' &&
            candles.map((c, i) => {
              const x = padding.left + i * candleSpacing + candleSpacing * 0.5;
              const isGreen = c.close >= c.open;
              const openY = getY(c.open);
              const closeY = getY(c.close);
              const highY = getY(c.high);
              const lowY = getY(c.low);

              const bodyY = Math.min(openY, closeY);
              const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));
              const color = isGreen ? '#10b981' : '#f43f5e';

              return (
                <g key={`candle-${i}`}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={color}
                    strokeWidth="1.2"
                  />
                  {/* Body */}
                  <rect
                    x={x - candleWidth * 0.5}
                    y={bodyY}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                  />
                </g>
              );
            })}

          {/* Area Chart Mode */}
          {chartType === 'area' && (
            <>
              <path d={areaPath} fill="url(#areaGradient)" />
              <path
                d={linePath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* SMA 20 Overlay Line */}
          {showSma20 && sma20Path && (
            <path
              d={sma20Path}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}

          {/* SMA 50 Overlay Line */}
          {showSma50 && sma50Path && (
            <path
              d={sma50Path}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}

          {/* Crosshair on Hover */}
          {hoverIndex !== null && candles[hoverIndex] && (
            <g>
              {/* Vertical crosshair */}
              <line
                x1={padding.left + hoverIndex * candleSpacing + candleSpacing * 0.5}
                y1={padding.top}
                x2={padding.left + hoverIndex * candleSpacing + candleSpacing * 0.5}
                y2={height - padding.bottom}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Horizontal crosshair at candle close */}
              <line
                x1={padding.left}
                y1={getY(candles[hoverIndex].close)}
                x2={svgWidth - padding.right}
                y2={getY(candles[hoverIndex].close)}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Active Dot */}
              <circle
                cx={padding.left + hoverIndex * candleSpacing + candleSpacing * 0.5}
                cy={getY(candles[hoverIndex].close)}
                r="4"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Legend footer */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/50">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
            <span>Up Candle</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
            <span>Down Candle</span>
          </span>
          {showSma20 && (
            <span className="flex items-center space-x-1.5 text-amber-300">
              <span className="w-3 h-0.5 bg-amber-400"></span>
              <span>SMA 20</span>
            </span>
          )}
          {showSma50 && (
            <span className="flex items-center space-x-1.5 text-blue-300">
              <span className="w-3 h-0.5 bg-blue-400"></span>
              <span>SMA 50</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${isSimulated === false ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          <span>Feed: {dataSource || (isSimulated === false ? 'Real-Time Market Exchange' : 'Simulated Paper Market Candles')}</span>
        </div>
      </div>
    </div>
  );
};
