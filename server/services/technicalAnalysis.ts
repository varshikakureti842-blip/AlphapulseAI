import { CandleData, TechnicalIndicators, TimePeriod, MarketDataMode } from '../../src/types/stock';
import { marketDataService } from './marketData';

export class TechnicalAnalysisService {
  /**
   * Calculate 20-day and 50-day SMA, 14-day RSI, MACD (12, 26, 9), and volume change
   */
  async calculateIndicators(symbol: string, period: TimePeriod = '3M', mode?: MarketDataMode): Promise<TechnicalIndicators> {
    const quote = await marketDataService.getQuote(symbol, mode);
    // Fetch historical candles matching the requested timeframe
    const candles = await marketDataService.getHistoricalData(symbol, period, mode);

    if (!candles || candles.length === 0) {
      throw new Error(`Insufficient historical data available for symbol ${symbol}`);
    }

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);

    // 1. SMA 20 & SMA 50 series
    const sma20Series: { date: string; value: number | null }[] = [];
    const sma50Series: { date: string; value: number | null }[] = [];

    for (let i = 0; i < candles.length; i++) {
      const date = candles[i].date;
      if (i >= 19) {
        const slice = closes.slice(i - 19, i + 1);
        const sum = slice.reduce((a, b) => a + b, 0);
        sma20Series.push({ date, value: +(sum / 20).toFixed(2) });
      } else {
        sma20Series.push({ date, value: null });
      }

      if (i >= 49) {
        const slice = closes.slice(i - 49, i + 1);
        const sum = slice.reduce((a, b) => a + b, 0);
        sma50Series.push({ date, value: +(sum / 50).toFixed(2) });
      } else {
        sma50Series.push({ date, value: null });
      }
    }

    const latestSma20 = sma20Series[sma20Series.length - 1]?.value ?? null;
    const latestSma50 = sma50Series[sma50Series.length - 1]?.value ?? null;

    // 2. 14-period RSI
    const rsiSeries: { date: string; value: number | null }[] = [];
    const rsiPeriod = 14;

    if (closes.length > rsiPeriod) {
      let gains = 0;
      let losses = 0;

      for (let i = 1; i <= rsiPeriod; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }

      let avgGain = gains / rsiPeriod;
      let avgLoss = losses / rsiPeriod;

      for (let i = 0; i < candles.length; i++) {
        if (i < rsiPeriod) {
          rsiSeries.push({ date: candles[i].date, value: null });
        } else if (i === rsiPeriod) {
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          const rsi = avgLoss === 0 ? 100 : +(100 - (100 / (1 + rs))).toFixed(2);
          rsiSeries.push({ date: candles[i].date, value: rsi });
        } else {
          const diff = closes[i] - closes[i - 1];
          const gain = diff > 0 ? diff : 0;
          const loss = diff < 0 ? Math.abs(diff) : 0;

          // Smoothed Wilder's Moving Average
          avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
          avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;

          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          const rsi = avgLoss === 0 ? 100 : +(100 - (100 / (1 + rs))).toFixed(2);
          rsiSeries.push({ date: candles[i].date, value: rsi });
        }
      }
    } else {
      candles.forEach(c => rsiSeries.push({ date: c.date, value: null }));
    }

    const latestRsi = rsiSeries[rsiSeries.length - 1]?.value ?? null;

    // 3. MACD (12, 26, 9)
    // Calculate 12 EMA and 26 EMA
    const calcEMA = (data: number[], span: number): (number | null)[] => {
      const k = 2 / (span + 1);
      const emaArray: (number | null)[] = [];
      let prevEma: number | null = null;

      for (let i = 0; i < data.length; i++) {
        if (i < span - 1) {
          emaArray.push(null);
        } else if (i === span - 1) {
          const initialSum = data.slice(0, span).reduce((a, b) => a + b, 0);
          prevEma = initialSum / span;
          emaArray.push(prevEma);
        } else if (prevEma !== null) {
          prevEma = data[i] * k + prevEma * (1 - k);
          emaArray.push(prevEma);
        }
      }
      return emaArray;
    };

    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);

    const macdLineSeries: (number | null)[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (ema12[i] !== null && ema26[i] !== null) {
        macdLineSeries.push(+(ema12[i]! - ema26[i]!).toFixed(2));
      } else {
        macdLineSeries.push(null);
      }
    }

    // Signal line is 9-day EMA of valid macdLine values
    const validMacdStartIndex = macdLineSeries.findIndex(v => v !== null);
    const macdSeries: { date: string; macd: number | null; signal: number | null; hist: number | null }[] = [];

    if (validMacdStartIndex !== -1) {
      const validMacds = macdLineSeries.slice(validMacdStartIndex) as number[];
      const signalEMA = calcEMA(validMacds, 9);

      for (let i = 0; i < candles.length; i++) {
        if (i < validMacdStartIndex) {
          macdSeries.push({ date: candles[i].date, macd: null, signal: null, hist: null });
        } else {
          const subIdx = i - validMacdStartIndex;
          const macd = macdLineSeries[i];
          const signal = signalEMA[subIdx] !== null ? +signalEMA[subIdx]!.toFixed(2) : null;
          const hist = (macd !== null && signal !== null) ? +(macd - signal).toFixed(2) : null;
          macdSeries.push({ date: candles[i].date, macd, signal, hist });
        }
      }
    } else {
      candles.forEach(c => macdSeries.push({ date: c.date, macd: null, signal: null, hist: null }));
    }

    const latestMacdObj = macdSeries[macdSeries.length - 1];
    const latestMacd = (latestMacdObj && latestMacdObj.macd !== null && latestMacdObj.signal !== null) ? {
      macdLine: latestMacdObj.macd,
      signalLine: latestMacdObj.signal,
      histogram: latestMacdObj.hist ?? 0,
    } : null;

    // 4. Volume change vs 20-day average volume
    let volumeChangePercent = 0;
    if (volumes.length >= 20) {
      const last20Volumes = volumes.slice(-20);
      const avgVol20 = last20Volumes.reduce((a, b) => a + b, 0) / 20;
      const currentVol = quote.volume;
      volumeChangePercent = avgVol20 > 0 ? +(((currentVol - avgVol20) / avgVol20) * 100).toFixed(2) : 0;
    }

    return {
      symbol: quote.symbol,
      period,
      currentPrice: quote.price,
      sma20: latestSma20,
      sma50: latestSma50,
      rsi: latestRsi,
      macd: latestMacd,
      volumeChangePercent,
      candles,
      sma20Series,
      sma50Series,
      rsiSeries,
      macdSeries,
    };
  }
}

export const technicalAnalysisService = new TechnicalAnalysisService();
