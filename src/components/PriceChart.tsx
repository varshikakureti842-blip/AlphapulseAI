import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CandleData, TimePeriod } from '../types/stock';
import { CandlestickChart, LineChart, Eye, EyeOff, Layers, Download, Image as ImageIcon, Video, Film } from 'lucide-react';
import { ImageVideoModal } from './ImageVideoModal';

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

  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    type: 'image' | 'video' | null;
    url: string | null;
    title: string;
  }>({
    isOpen: false,
    type: null,
    url: null,
    title: '',
  });

  useEffect(() => {
    const handleImageEvent = () => exportToTradingCard();
    const handleVideoEvent = () => recordChartVideo();

    window.addEventListener('generate-image-card', handleImageEvent);
    window.addEventListener('record-chart-video', handleVideoEvent);

    return () => {
      window.removeEventListener('generate-image-card', handleImageEvent);
      window.removeEventListener('record-chart-video', handleVideoEvent);
    };
  }, [candles, symbol, period, isRecordingVideo]);

  const exportToCsv = () => {
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

  /**
   * Generates a high-res PNG Trading Card Image locally in browser (0 API calls, 100% Free)
   * Enhanced with crisp X-axis timestamps, Y-axis price ticks, volume bars, and period stats.
   */
  const exportToTradingCard = () => {
    if (!candles || candles.length === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark terminal gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // Header Card Title & Ticker
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[0];
    const priceDiff = lastCandle.close - prevCandle.close;
    const pctDiff = ((priceDiff / prevCandle.close) * 100).toFixed(2);
    const isUp = priceDiff >= 0;

    // Brand Logo & Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('AlphaPulse Quant Terminal', 50, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText(`INSTRUMENT: ${symbol || 'STOCK'}  •  TIMEFRAME: ${period}  •  DATE: ${new Date().toLocaleDateString()}`, 50, 78);

    // Large Ticker Price Display & Change
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px monospace';
    ctx.fillText(`$${lastCandle.close.toFixed(2)}`, 50, 135);

    ctx.fillStyle = isUp ? '#10b981' : '#f43f5e';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${isUp ? '+' : ''}${priceDiff.toFixed(2)} (${isUp ? '+' : ''}${pctDiff}%)`, 310, 135);

    // High/Low/Volume Stats Badges on Top Right
    const allLows = candles.map((c) => c.low);
    const allHighs = candles.map((c) => c.high);
    const periodMin = Math.min(...allLows);
    const periodMax = Math.max(...allHighs);
    const totalVol = candles.reduce((acc, c) => acc + c.volume, 0);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(780, 40, 370, 100);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(780, 40, 370, 100);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`HIGH: `, 800, 68);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`$${periodMax.toFixed(2)}`, 850, 68);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`LOW: `, 800, 95);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`$${periodMin.toFixed(2)}`, 850, 95);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`TOT VOL: `, 800, 122);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${(totalVol / 1000000).toFixed(1)}M`, 870, 122);

    // Main Chart Dimensions
    const cBox = { left: 50, top: 170, width: 1040, height: 410 };
    const priceH = 310;
    const volH = 80;

    const rangeP = periodMax - periodMin || 1;
    const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;

    // Y-Axis Price Ticks & Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';

    const priceSteps = 5;
    for (let i = 0; i <= priceSteps; i++) {
      const y = cBox.top + (i / priceSteps) * priceH;
      const val = periodMax - (i / priceSteps) * rangeP;

      ctx.beginPath();
      ctx.moveTo(cBox.left, y);
      ctx.lineTo(cBox.left + cBox.width, y);
      ctx.stroke();

      ctx.fillText(`$${val.toFixed(2)}`, cBox.left + cBox.width + 12, y + 4);
    }

    // X-Axis Timestamps Ticks & Grid Lines
    const timeSteps = Math.min(8, candles.length);
    for (let i = 0; i < timeSteps; i++) {
      const idx = Math.floor((i / (timeSteps - 1)) * (candles.length - 1));
      const c = candles[idx];
      const x = cBox.left + (idx / Math.max(candles.length - 1, 1)) * cBox.width;

      ctx.beginPath();
      ctx.moveTo(x, cBox.top);
      ctx.lineTo(x, cBox.top + cBox.height);
      ctx.stroke();

      // Time / Date label
      ctx.fillText(c.date, x - 20, cBox.top + cBox.height + 22);
    }

    const stepX = cBox.width / Math.max(candles.length - 1, 1);

    // Area Fill
    ctx.beginPath();
    ctx.moveTo(cBox.left, cBox.top + priceH);
    candles.forEach((c, idx) => {
      const x = cBox.left + idx * stepX;
      const y = cBox.top + priceH - ((c.close - periodMin) / rangeP) * priceH;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(cBox.left + (candles.length - 1) * stepX, cBox.top + priceH);
    ctx.closePath();

    const chartGrad = ctx.createLinearGradient(0, cBox.top, 0, cBox.top + priceH);
    chartGrad.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)');
    chartGrad.addColorStop(1, 'rgba(15, 23, 42, 0.01)');
    ctx.fillStyle = chartGrad;
    ctx.fill();

    // Chart Line
    ctx.beginPath();
    candles.forEach((c, idx) => {
      const x = cBox.left + idx * stepX;
      const y = cBox.top + priceH - ((c.close - periodMin) / rangeP) * priceH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isUp ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Volume Sub-Chart
    candles.forEach((c, idx) => {
      const x = cBox.left + idx * stepX - 1.5;
      const vHeight = (c.volume / maxVol) * volH;
      const y = cBox.top + cBox.height - vHeight;
      ctx.fillStyle = c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)';
      ctx.fillRect(x, y, Math.max(2, stepX * 0.6), vHeight);
    });

    // Active Head Crosshair Dot
    const lastX = cBox.left + (candles.length - 1) * stepX;
    const lastY = cBox.top + priceH - ((lastCandle.close - periodMin) / rangeP) * priceH;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#00f2ff';
    ctx.fill();

    // Footer Watermark Card
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 620, 1200, 55);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px monospace';
    ctx.fillText('Generated locally via AlphaPulse Free Client-Side Canvas Engine • 0 API Costs', 50, 652);

    const imgDataUrl = canvas.toDataURL('image/png');

    // Show preview modal
    setModalData({
      isOpen: true,
      type: 'image',
      url: imgDataUrl,
      title: `${symbol || 'STOCK'} High-Res Quant Trading Card`,
    });

    // Auto-trigger download
    const link = document.createElement('a');
    link.download = `${symbol || 'market'}_Trading_Card_${Date.now()}.png`;
    link.href = imgDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Records 6 seconds of animated real-time chart stream into a downloadable WebM Video (100% Free Client-Side API)
   * Rendered in 1280x720 HD with crisp X-axis timestamps, Y-axis price ticks, and progressive frame reveal.
   */
  const recordChartVideo = async () => {
    if (isRecordingVideo) return;
    setIsRecordingVideo(true);
    setRecordingSeconds(6);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsRecordingVideo(false);
      return;
    }

    // Stream at 30 FPS
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);

      // Open preview modal
      setModalData({
        isOpen: true,
        type: 'video',
        url: videoUrl,
        title: `${symbol || 'STOCK'} 6-Sec HD Animated Stream Video with Timestamps`,
      });

      // Auto-trigger download
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `${symbol || 'market'}_Chart_Video_${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsRecordingVideo(false);
    };

    mediaRecorder.start();

    const chartBox = { left: 70, top: 110, width: 1120, height: 480 };
    const priceAreaHeight = 380;
    const volumeAreaHeight = 80;

    const dataCandles = candles && candles.length > 0 ? candles : Array.from({ length: 40 }).map((_, idx) => ({
      date: `10/01 09:${idx < 10 ? '0' + idx : idx}`,
      open: 180 + Math.sin(idx * 0.2) * 5,
      high: 182 + Math.sin(idx * 0.2) * 6,
      low: 178 + Math.sin(idx * 0.2) * 4,
      close: 181 + Math.sin(idx * 0.2 + 0.1) * 5,
      volume: 1500000 + Math.random() * 800000,
    }));

    const minP = Math.min(...dataCandles.map((c) => c.low)) * 0.99;
    const maxP = Math.max(...dataCandles.map((c) => c.high)) * 1.01;
    const rangeP = maxP - minP || 1;

    const maxVol = Math.max(...dataCandles.map((c) => c.volume)) || 1;

    let frame = 0;
    const maxFrames = 30 * 6; // 180 frames

    const timer = setInterval(() => {
      frame++;
      setRecordingSeconds(Math.ceil((maxFrames - frame) / 30));

      // 1. Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1280, 720);

      // 2. Header Title & Ticker Metadata
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(`AlphaPulse Real-Time Quant Stream • ${symbol || 'AAPL'}`, 70, 50);

      const lastC = dataCandles[dataCandles.length - 1];
      const firstC = dataCandles[0];
      const pDiff = lastC.close - firstC.close;
      const isUp = pDiff >= 0;

      ctx.fillStyle = isUp ? '#10b981' : '#f43f5e';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`$${lastC.close.toFixed(2)} (${isUp ? '+' : ''}${pDiff.toFixed(2)})`, 70, 85);

      // Recording Badge
      const recSecs = (frame / 30).toFixed(1);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(1060, 35, 130, 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`● REC 0${Math.floor(frame / 30)}:0${Math.floor((frame % 30) / 3)}s`, 1072, 57);

      // 3. Draw Price Y-Axis Grid Lines & Price Labels
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.font = '11px monospace';
      ctx.fillStyle = '#94a3b8';

      const priceSteps = 5;
      for (let i = 0; i <= priceSteps; i++) {
        const y = chartBox.top + (i / priceSteps) * priceAreaHeight;
        const val = maxP - (i / priceSteps) * rangeP;

        ctx.beginPath();
        ctx.moveTo(chartBox.left, y);
        ctx.lineTo(chartBox.left + chartBox.width, y);
        ctx.stroke();

        ctx.fillText(`$${val.toFixed(2)}`, chartBox.left + chartBox.width + 10, y + 4);
      }

      // 4. Draw X-Axis Timestamps Ticks & Vertical Grid Lines
      const timeSteps = 6;
      for (let i = 0; i < timeSteps; i++) {
        const idx = Math.floor((i / (timeSteps - 1)) * (dataCandles.length - 1));
        const candle = dataCandles[idx];
        const x = chartBox.left + (idx / Math.max(dataCandles.length - 1, 1)) * chartBox.width;

        ctx.beginPath();
        ctx.moveTo(x, chartBox.top);
        ctx.lineTo(x, chartBox.top + chartBox.height);
        ctx.stroke();

        // Time label text on X-axis bottom
        ctx.fillText(candle.date, x - 25, chartBox.top + chartBox.height + 22);
      }

      // 5. Reveal Progressive Candles & Line up to current frame head
      const currentCount = Math.max(2, Math.floor((frame / maxFrames) * dataCandles.length));
      const stepX = chartBox.width / Math.max(dataCandles.length - 1, 1);

      // Area gradient
      ctx.beginPath();
      ctx.moveTo(chartBox.left, chartBox.top + priceAreaHeight);
      for (let i = 0; i < currentCount; i++) {
        const c = dataCandles[i];
        const x = chartBox.left + i * stepX;
        const y = chartBox.top + priceAreaHeight - ((c.close - minP) / rangeP) * priceAreaHeight;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(chartBox.left + (currentCount - 1) * stepX, chartBox.top + priceAreaHeight);
      ctx.closePath();

      const areaGrad = ctx.createLinearGradient(0, chartBox.top, 0, chartBox.top + priceAreaHeight);
      areaGrad.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)');
      areaGrad.addColorStop(1, 'rgba(15, 23, 42, 0.01)');
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Line
      ctx.beginPath();
      for (let i = 0; i < currentCount; i++) {
        const c = dataCandles[i];
        const x = chartBox.left + i * stepX;
        const y = chartBox.top + priceAreaHeight - ((c.close - minP) / rangeP) * priceAreaHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = isUp ? '#10b981' : '#06b6d4';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Volume Bars
      for (let i = 0; i < currentCount; i++) {
        const c = dataCandles[i];
        const x = chartBox.left + i * stepX - 2;
        const volH = (c.volume / maxVol) * volumeAreaHeight;
        const y = chartBox.top + chartBox.height - volH;
        ctx.fillStyle = c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';
        ctx.fillRect(x, y, Math.max(2, stepX * 0.6), volH);
      }

      // 6. Active Frame Cursor & Date/Time Price Crosshair
      const headIdx = currentCount - 1;
      const headCandle = dataCandles[headIdx];
      const headX = chartBox.left + headIdx * stepX;
      const headY = chartBox.top + priceAreaHeight - ((headCandle.close - minP) / rangeP) * priceAreaHeight;

      // Vertical crosshair
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(headX, chartBox.top);
      ctx.lineTo(headX, chartBox.top + chartBox.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Head Pulsing Node
      ctx.beginPath();
      ctx.arc(headX, headY, 6 + Math.sin(frame * 0.2) * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#00f2ff';
      ctx.fill();

      // Tooltip Card at Active Frame Head
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      const ttW = 180;
      const ttH = 45;
      const ttX = Math.min(headX + 10, chartBox.left + chartBox.width - ttW);
      const ttY = Math.max(chartBox.top + 10, headY - 50);

      ctx.fillRect(ttX, ttY, ttW, ttH);
      ctx.strokeRect(ttX, ttY, ttW, ttH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`TIME: ${headCandle.date}`, ttX + 10, ttY + 18);
      ctx.fillStyle = headCandle.close >= headCandle.open ? '#10b981' : '#f43f5e';
      ctx.fillText(`CLOSE: $${headCandle.close.toFixed(2)}`, ttX + 10, ttY + 36);

      // Footer
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.fillText(`AlphaPulse Quant HD Stream Recording • ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 70, 695);

      if (frame >= maxFrames) {
        clearInterval(timer);
        mediaRecorder.stop();
      }
    }, 1000 / 30);
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

          {/* Free Client-Side PNG Image Trading Card Generator */}
          <button
            onClick={exportToTradingCard}
            disabled={!candles || candles.length === 0}
            title="Generate & Download High-Res PNG Trading Card Image (0 API Calls, 100% Free)"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono border bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/80 text-indigo-300 hover:text-white transition-all disabled:opacity-40"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Image Card</span>
          </button>

          {/* Free Client-Side WebM Video Stream Recorder */}
          <button
            onClick={recordChartVideo}
            disabled={!candles || candles.length === 0 || isRecordingVideo}
            title="Record 6-sec animated chart video into WebM file (0 API Calls, 100% Free)"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all disabled:opacity-40 ${
              isRecordingVideo
                ? 'bg-rose-950/90 border-rose-600 text-rose-300 animate-pulse'
                : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-700/80 text-cyan-300 hover:text-white'
            }`}
          >
            <Video className={`w-3.5 h-3.5 ${isRecordingVideo ? 'text-rose-400 animate-spin' : 'text-cyan-400'}`} />
            <span>{isRecordingVideo ? `REC ${recordingSeconds}s` : 'Record Video'}</span>
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

      {/* Image & Video Generated Preview Modal */}
      <ImageVideoModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData((prev) => ({ ...prev, isOpen: false }))}
        type={modalData.type}
        mediaUrl={modalData.url}
        title={modalData.title}
        symbol={symbol || 'STOCK'}
      />
    </div>
  );
};
