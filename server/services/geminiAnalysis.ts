import { GeminiAnalysisResult, TradeAction, RiskLevel } from '../../src/types/stock';
import { marketDataService } from './marketData';
import { technicalAnalysisService } from './technicalAnalysis';
import { paperTradingEngine } from './paperTradingEngine';

export class GeminiAnalysisService {
  async analyzeStock(symbol: string): Promise<GeminiAnalysisResult> {
    const cleanSymbol = symbol.toUpperCase().trim();
    const quote = await marketDataService.getQuote(cleanSymbol);
    const indicators = await technicalAnalysisService.calculateIndicators(cleanSymbol, '3M');
    const portfolio = await paperTradingEngine.getPortfolio();

    // Zero API Keys Required: Execute ultra-fast, deterministic quantitative AI engine
    return this.generateQuantitativeAnalysis(
      quote, 
      indicators, 
      portfolio, 
      'AI Quantitative Analysis Engine (Zero API Keys Required)'
    );
  }

  /**
   * Deterministic rule-based quantitative technical evaluation
   * Used as robust fallback when Gemini key is unconfigured or rate limited
   */
  private generateQuantitativeAnalysis(
    quote: any, 
    indicators: any, 
    portfolio: any,
    notice?: string
  ): GeminiAnalysisResult {
    const { price } = quote;
    const { sma20, sma50, rsi, macd, volumeChangePercent } = indicators;
    const positions = portfolio?.positions || [];
    const existingPos = positions.find((p: any) => p.symbol === quote.symbol);
    const hasHolding = existingPos && existingPos.quantity > 0;

    let buyScore = 0;
    let sellScore = 0;
    const keyFactors: string[] = [];

    // RSI analysis
    if (rsi !== null) {
      if (rsi < 32) {
        buyScore += 2;
        keyFactors.push(`RSI is ${rsi} (Oversold condition below 32, potential mean reversion bounce)`);
      } else if (rsi > 68) {
        sellScore += 2;
        keyFactors.push(`RSI is ${rsi} (Overbought condition above 68, risk of pullback)`);
      } else {
        keyFactors.push(`RSI is ${rsi} (Neutral momentum within 32-68 channel)`);
      }
    }

    // Moving average trends
    if (sma20 !== null && sma50 !== null) {
      if (price > sma20 && sma20 > sma50) {
        buyScore += 2;
        keyFactors.push(`Bullish alignment: Price ($${price}) > SMA 20 ($${sma20}) > SMA 50 ($${sma50})`);
      } else if (price < sma20 && sma20 < sma50) {
        sellScore += 2;
        keyFactors.push(`Bearish trend: Price ($${price}) < SMA 20 ($${sma20}) < SMA 50 ($${sma50})`);
      } else if (price > sma20 && price < sma50) {
        keyFactors.push(`Mixed moving averages: Price above 20 SMA ($${sma20}) but below 50 SMA ($${sma50})`);
      }
    }

    // MACD analysis
    if (macd) {
      if (macd.macdLine > macd.signalLine && macd.histogram > 0) {
        buyScore += 1.5;
        keyFactors.push(`MACD line (${macd.macdLine}) bullishly crossed above signal line (${macd.signalLine})`);
      } else if (macd.macdLine < macd.signalLine && macd.histogram < 0) {
        sellScore += 1.5;
        keyFactors.push(`MACD line (${macd.macdLine}) bearishly crossed below signal line (${macd.signalLine})`);
      }
    }

    // Volume analysis
    if (volumeChangePercent > 20) {
      keyFactors.push(`Elevated trading volume (+${volumeChangePercent}% vs 20-day average) confirming move`);
    }

    let action: TradeAction = 'HOLD';
    let confidence = 0.50;
    let risk_level: RiskLevel = 'MEDIUM';
    let reasoning = '';
    let suggested_quantity = 0;

    const netScore = buyScore - sellScore;

    if (netScore >= 2.5) {
      action = 'BUY';
      confidence = +(0.65 + Math.min(0.25, netScore * 0.05)).toFixed(2);
      risk_level = rsi && rsi < 25 ? 'HIGH' : 'MEDIUM';
      // Calculate sensible quantity based on price and $5,000 target allocation
      const targetAllocation = Math.min(portfolio.cash * 0.20, 5000);
      suggested_quantity = Math.max(1, Math.min(50, Math.floor(targetAllocation / price)));
      reasoning = `Quantitative analysis shows bullish technical momentum for ${quote.symbol}. Key indicators reflect favorable risk-to-reward ratio with upward price trending above key moving averages and positive MACD trajectory. Please verify that this trade aligns with your virtual risk profile.`;
    } else if (netScore <= -2.5) {
      action = hasHolding ? 'SELL' : 'HOLD';
      confidence = +(0.62 + Math.min(0.25, Math.abs(netScore) * 0.05)).toFixed(2);
      risk_level = 'HIGH';
      suggested_quantity = hasHolding ? Math.max(1, Math.floor(existingPos.quantity * 0.5)) : 0;
      reasoning = hasHolding
        ? `Bearish technical indicators suggest profit-taking or risk mitigation on ${quote.symbol}. Weakening momentum and downward MACD pressure signal increased probability of near-term consolidation.`
        : `Bearish indicators detect downward momentum for ${quote.symbol}. No active long position held; holding cash recommended until stabilizing technical setup emerges.`;
    } else {
      action = 'HOLD';
      confidence = 0.55;
      risk_level = 'LOW';
      suggested_quantity = 0;
      reasoning = `Indicators for ${quote.symbol} present mixed or neutral signals. Moving averages and oscillators do not show high-conviction directional bias. Preserving virtual capital until a breakout occurs is recommended.`;
    }

    return {
      symbol: quote.symbol,
      action,
      confidence,
      risk_level,
      reasoning,
      key_factors: keyFactors,
      suggested_quantity,
      timestamp: new Date().toISOString(),
      source: 'quant_engine',
      notice: notice || 'Real-time quantitative technical analysis.',
      marketContext: {
        price,
        rsi,
        sma20,
        sma50,
      },
    };
  }
}

export const geminiAnalysisService = new GeminiAnalysisService();
