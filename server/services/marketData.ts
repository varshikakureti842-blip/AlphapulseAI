import { MarketQuote, CandleData, TimePeriod, MarketDataMode } from '../../src/types/stock';

export interface IMarketDataSource {
  getQuote(symbol: string, mode?: MarketDataMode): Promise<MarketQuote>;
  getHistoricalData(symbol: string, period: TimePeriod, mode?: MarketDataMode): Promise<CandleData[]>;
}

interface StockProfile {
  name: string;
  basePrice: number;
  volatility: number;
  exchange: string;
  avgVolume: number;
}

const KNOWN_STOCKS: Record<string, StockProfile> = {
  AAPL: { name: 'Apple Inc.', basePrice: 228.50, volatility: 0.015, exchange: 'NASDAQ', avgVolume: 48500000 },
  NVDA: { name: 'NVIDIA Corporation', basePrice: 132.80, volatility: 0.028, exchange: 'NASDAQ', avgVolume: 62000000 },
  MSFT: { name: 'Microsoft Corporation', basePrice: 442.20, volatility: 0.014, exchange: 'NASDAQ', avgVolume: 21000000 },
  TSLA: { name: 'Tesla, Inc.', basePrice: 248.60, volatility: 0.035, exchange: 'NASDAQ', avgVolume: 74000000 },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 182.40, volatility: 0.016, exchange: 'NASDAQ', avgVolume: 24000000 },
  AMZN: { name: 'Amazon.com, Inc.', basePrice: 194.10, volatility: 0.018, exchange: 'NASDAQ', avgVolume: 35000000 },
  META: { name: 'Meta Platforms, Inc.', basePrice: 512.75, volatility: 0.022, exchange: 'NASDAQ', avgVolume: 16000000 },
  AMD: { name: 'Advanced Micro Devices, Inc.', basePrice: 156.30, volatility: 0.027, exchange: 'NASDAQ', avgVolume: 42000000 },
  SPY: { name: 'SPDR S&P 500 ETF Trust', basePrice: 565.40, volatility: 0.009, exchange: 'NYSE Arca', avgVolume: 55000000 },
  QQQ: { name: 'Invesco QQQ Trust', basePrice: 489.10, volatility: 0.012, exchange: 'NASDAQ', avgVolume: 41000000 },
  PLTR: { name: 'Palantir Technologies Inc.', basePrice: 37.85, volatility: 0.032, exchange: 'NYSE', avgVolume: 51000000 },
  COIN: { name: 'Coinbase Global, Inc.', basePrice: 218.40, volatility: 0.042, exchange: 'NASDAQ', avgVolume: 12000000 },
};

/**
 * Real-Time Market Data Provider using live exchange data
 */
export class YahooFinanceRealTimeProvider {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  private mapPeriodToParams(period: TimePeriod): { interval: string; range: string } {
    switch (period) {
      case '1D':
        return { interval: '5m', range: '5d' };
      case '1W':
        return { interval: '15m', range: '5d' };
      case '1M':
        return { interval: '1d', range: '1mo' };
      case '3M':
        return { interval: '1d', range: '3mo' };
      case '1Y':
      default:
        return { interval: '1d', range: '1y' };
    }
  }

  async fetchRawChart(symbol: string, period: TimePeriod = '3M'): Promise<{ meta: any; candles: CandleData[] }> {
    const primary = this.mapPeriodToParams(period);

    // List of fallback endpoint & interval combinations to ensure live data success
    const attempts = [
      { host: 'query1.finance.yahoo.com', interval: primary.interval, range: primary.range },
      { host: 'query2.finance.yahoo.com', interval: primary.interval, range: primary.range },
      { host: 'query1.finance.yahoo.com', interval: '5m', range: '5d' },
      { host: 'query1.finance.yahoo.com', interval: '1d', range: '1mo' },
      { host: 'query2.finance.yahoo.com', interval: '1d', range: '1mo' },
    ];

    let lastError: Error | null = null;

    for (const attempt of attempts) {
      try {
        const url = `https://${attempt.host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${attempt.interval}&range=${attempt.range}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Real-time market data service returned HTTP ${res.status} for ${symbol}`);
        }

        const data = await res.json();
        const result = data?.chart?.result?.[0];

        if (!result) continue;

        const meta = result.meta || {};
        const timestamps: number[] = result.timestamp || [];
        const quoteIndicators = result.indicators?.quote?.[0] || {};
        const opens = quoteIndicators.open || [];
        const highs = quoteIndicators.high || [];
        const lows = quoteIndicators.low || [];
        const closes = quoteIndicators.close || [];
        const volumes = quoteIndicators.volume || [];

        const candles: CandleData[] = [];

        for (let i = 0; i < timestamps.length; i++) {
          const o = opens[i];
          const h = highs[i];
          const l = lows[i];
          const c = closes[i];
          const v = volumes[i] ?? 0;

          if (
            o !== null &&
            h !== null &&
            l !== null &&
            c !== null &&
            typeof c === 'number' &&
            !isNaN(c)
          ) {
            candles.push({
              date: new Date(timestamps[i] * 1000).toISOString(),
              open: +o.toFixed(2),
              high: +h.toFixed(2),
              low: +l.toFixed(2),
              close: +c.toFixed(2),
              volume: Math.round(v),
            });
          }
        }

        // Fallback: If no candles were parsed from timestamps but meta has market prices, synthesize candle
        if (candles.length === 0 && meta.regularMarketPrice) {
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || meta.previousClose || price;
          candles.push({
            date: new Date().toISOString(),
            open: +prev.toFixed(2),
            high: +Math.max(price, prev).toFixed(2),
            low: +Math.min(price, prev).toFixed(2),
            close: +price.toFixed(2),
            volume: meta.regularMarketVolume || 1000000,
          });
        }

        if (candles.length > 0) {
          return { meta, candles };
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error(`No valid candle data returned for ${symbol}`);
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const { meta, candles } = await this.fetchRawChart(symbol, '1D');
    const lastCandle = candles[candles.length - 1];

    const currentPrice = meta.regularMarketPrice ?? lastCandle.close;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? candles[0].open;
    const change = +(currentPrice - prevClose).toFixed(2);
    const changePercent = prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0;

    const dayHigh = meta.regularMarketDayHigh ?? Math.max(...candles.map(c => c.high));
    const dayLow = meta.regularMarketDayLow ?? Math.min(...candles.map(c => c.low));
    const dayOpen = candles[0]?.open ?? meta.regularMarketPrice;
    const volume = meta.regularMarketVolume ?? candles.reduce((sum, c) => sum + c.volume, 0);

    return {
      symbol: meta.symbol || symbol.toUpperCase(),
      companyName: meta.longName || meta.shortName || `${symbol.toUpperCase()} Inc.`,
      exchange: meta.fullExchangeName || meta.exchangeName || 'US Exchange',
      currency: meta.currency || 'USD',
      price: +currentPrice.toFixed(2),
      change,
      changePercent,
      open: +dayOpen.toFixed(2),
      high: +dayHigh.toFixed(2),
      low: +dayLow.toFixed(2),
      previousClose: +prevClose.toFixed(2),
      volume,
      avgVolume: meta.regularMarketVolume ? Math.round(meta.regularMarketVolume * 0.9) : 35000000,
      timestamp: new Date().toISOString(),
      isSimulated: false,
      dataSource: 'Live Exchange Feed (Yahoo Finance)',
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? +meta.fiftyTwoWeekHigh.toFixed(2) : undefined,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? +meta.fiftyTwoWeekLow.toFixed(2) : undefined,
    };
  }

  async getHistoricalData(symbol: string, period: TimePeriod): Promise<CandleData[]> {
    const { candles } = await this.fetchRawChart(symbol, period);
    return candles;
  }
}

/**
 * Fallback / Demo Simulation Provider
 */
export class SimulatedMarketDataProvider {
  private getProfile(symbol: string): StockProfile {
    const upper = symbol.toUpperCase().trim();
    if (KNOWN_STOCKS[upper]) {
      return KNOWN_STOCKS[upper];
    }
    let hash = 0;
    for (let i = 0; i < upper.length; i++) {
      hash = (hash << 5) - hash + upper.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);
    const basePrice = 25 + (seed % 450);
    const volatility = 0.012 + ((seed % 25) / 1000);
    const avgVolume = 5000000 + (seed % 40000000);

    return {
      name: `${upper} Corp.`,
      basePrice,
      volatility,
      exchange: upper.length <= 3 ? 'NYSE' : 'NASDAQ',
      avgVolume,
    };
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const upper = symbol.toUpperCase().trim();
    const profile = this.getProfile(upper);
    const dayOffsetPercent = (Math.sin(upper.charCodeAt(0)) * 0.02);
    const prevClose = +(profile.basePrice * (1 - dayOffsetPercent)).toFixed(2);
    const openPrice = +(prevClose * (1 + (Math.random() - 0.48) * profile.volatility * 0.5)).toFixed(2);
    const currentPrice = +(openPrice * (1 + (Math.random() - 0.48) * profile.volatility)).toFixed(2);
    const dayHigh = +(Math.max(openPrice, currentPrice) * (1 + Math.random() * profile.volatility * 0.6)).toFixed(2);
    const dayLow = +(Math.min(openPrice, currentPrice) * (1 - Math.random() * profile.volatility * 0.6)).toFixed(2);
    const volume = Math.floor(profile.avgVolume * (0.6 + Math.random() * 0.8));

    const change = +(currentPrice - prevClose).toFixed(2);
    const changePercent = +((change / prevClose) * 100).toFixed(2);

    return {
      symbol: upper,
      companyName: profile.name,
      exchange: profile.exchange,
      currency: 'USD',
      price: currentPrice,
      change,
      changePercent,
      open: openPrice,
      high: dayHigh,
      low: dayLow,
      previousClose: prevClose,
      volume,
      avgVolume: profile.avgVolume,
      timestamp: new Date().toISOString(),
      isSimulated: true,
      dataSource: 'Simulated Demo Feed',
    };
  }

  async getHistoricalData(symbol: string, period: TimePeriod): Promise<CandleData[]> {
    const upper = symbol.toUpperCase().trim();
    const profile = this.getProfile(upper);
    const quote = await this.getQuote(upper);

    let count: number;
    let stepMs: number;

    switch (period) {
      case '1D':
        count = 78;
        stepMs = 5 * 60 * 1000;
        break;
      case '1W':
        count = 35;
        stepMs = 60 * 60 * 1000;
        break;
      case '1M':
        count = 30;
        stepMs = 24 * 60 * 60 * 1000;
        break;
      case '3M':
        count = 75;
        stepMs = 24 * 60 * 60 * 1000;
        break;
      case '1Y':
      default:
        count = 250;
        stepMs = 24 * 60 * 60 * 1000;
        break;
    }

    const reversedPrices: CandleData[] = [];
    const nowTime = Date.now();

    reversedPrices.push({
      date: new Date(nowTime).toISOString(),
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.price,
      volume: quote.volume,
    });

    let currentClose = quote.open;

    for (let i = 1; i < count; i++) {
      const candleTime = new Date(nowTime - (i * stepMs));
      const dailyVolatility = profile.volatility * (period === '1D' ? 0.3 : period === '1W' ? 0.6 : 1.0);
      const returnStep = (Math.random() - 0.495) * dailyVolatility;
      const open = +(currentClose * (1 - returnStep)).toFixed(2);
      const close = currentClose;
      const high = +(Math.max(open, close) * (1 + Math.random() * dailyVolatility * 0.7)).toFixed(2);
      const low = +(Math.min(open, close) * (1 - Math.random() * dailyVolatility * 0.7)).toFixed(2);
      const volume = Math.floor((profile.avgVolume / (period === '1D' ? 78 : period === '1W' ? 35 : 1)) * (0.6 + Math.random() * 0.8));

      reversedPrices.push({
        date: candleTime.toISOString(),
        open,
        high,
        low,
        close,
        volume,
      });

      currentClose = open;
    }

    return reversedPrices.reverse();
  }
}

/**
 * Modular Market Data Service that coordinates Live and Simulated feeds
 */
export class ModularMarketDataService implements IMarketDataSource {
  private liveProvider = new YahooFinanceRealTimeProvider();
  private simProvider = new SimulatedMarketDataProvider();

  private defaultMode: MarketDataMode = 'live';

  // Fast in-memory caches to prevent rate limiting
  private priceCache = new Map<string, { price: number; lastTick: number; quote: MarketQuote; isSimulated: boolean }>();
  private candleCache = new Map<string, { period: string; candles: CandleData[]; timestamp: number; isSimulated: boolean }>();

  setDefaultMode(mode: MarketDataMode) {
    this.defaultMode = mode;
  }

  getDefaultMode(): MarketDataMode {
    return this.defaultMode;
  }

  async getQuote(symbol: string, mode?: MarketDataMode): Promise<MarketQuote> {
    const upper = symbol.toUpperCase().trim();
    if (!upper || upper.length > 10 || !/^[A-Z0-9.-]+$/.test(upper)) {
      throw new Error(`Invalid stock symbol format: "${symbol}". Symbol must be 1-10 alphanumeric characters.`);
    }

    const effectiveMode = mode || this.defaultMode;
    const now = Date.now();
    const cacheKey = `${upper}_${effectiveMode}`;
    const cached = this.priceCache.get(cacheKey);

    // Return cached quote if fresher than 3.5 seconds
    if (cached && now - cached.lastTick < 3500) {
      return cached.quote;
    }

    if (effectiveMode === 'live') {
      try {
        const liveQuote = await this.liveProvider.getQuote(upper);
        this.priceCache.set(cacheKey, {
          price: liveQuote.price,
          lastTick: now,
          quote: liveQuote,
          isSimulated: false,
        });
        return liveQuote;
      } catch (err: any) {
        console.warn(`[MarketData] Real-time live quote failed for ${upper}: ${err.message}. Falling back to demo feed.`);
        // Fallback smoothly to simulated demo feed
        const simQuote = await this.simProvider.getQuote(upper);
        simQuote.dataSource = 'Simulated Demo Feed (Offline Fallback)';
        this.priceCache.set(cacheKey, {
          price: simQuote.price,
          lastTick: now,
          quote: simQuote,
          isSimulated: true,
        });
        return simQuote;
      }
    } else {
      // Explicit simulated mode
      const simQuote = await this.simProvider.getQuote(upper);
      this.priceCache.set(cacheKey, {
        price: simQuote.price,
        lastTick: now,
        quote: simQuote,
        isSimulated: true,
      });
      return simQuote;
    }
  }

  async getHistoricalData(symbol: string, period: TimePeriod = '3M', mode?: MarketDataMode): Promise<CandleData[]> {
    const upper = symbol.toUpperCase().trim();
    const effectiveMode = mode || this.defaultMode;
    const cacheKey = `${upper}_${period}_${effectiveMode}`;
    const now = Date.now();
    const cached = this.candleCache.get(cacheKey);

    // Cache historical series for 20 seconds
    if (cached && now - cached.timestamp < 20000) {
      return cached.candles;
    }

    if (effectiveMode === 'live') {
      try {
        const liveCandles = await this.liveProvider.getHistoricalData(upper, period);
        this.candleCache.set(cacheKey, {
          period,
          candles: liveCandles,
          timestamp: now,
          isSimulated: false,
        });
        return liveCandles;
      } catch (err: any) {
        console.warn(`[MarketData] Real-time candles failed for ${upper} (${period}): ${err.message}. Falling back to demo feed.`);
        const simCandles = await this.simProvider.getHistoricalData(upper, period);
        this.candleCache.set(cacheKey, {
          period,
          candles: simCandles,
          timestamp: now,
          isSimulated: true,
        });
        return simCandles;
      }
    } else {
      const simCandles = await this.simProvider.getHistoricalData(upper, period);
      this.candleCache.set(cacheKey, {
        period,
        candles: simCandles,
        timestamp: now,
        isSimulated: true,
      });
      return simCandles;
    }
  }
}

export const marketDataService = new ModularMarketDataService();
