import { Portfolio, Position, PaperTrade, TradeAction, RiskLevel } from '../../src/types/stock';
import { marketDataService } from './marketData';
import { riskManagerService } from './riskManager';

export class PaperTradingEngine {
  private portfolio: Portfolio;

  constructor(initialCash: number = 100000) {
    this.portfolio = {
      initialCash,
      cash: initialCash,
      positions: [],
      trades: [],
      totalMarketValue: 0,
      portfolioValue: initialCash,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      dailySimulatedLoss: 0,
      dailyLossLimitPercent: 0.10, // 10%
      maxOrderValueLimit: 25000,   // $25,000
      maxPositionPercentLimit: 0.40, // 40%
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Re-evaluates open positions against current market prices and calculates portfolio stats
   */
  async updatePortfolioValuation(): Promise<Portfolio> {
    let totalMarketValue = 0;
    let totalUnrealizedPnL = 0;

    const updatedPositions: Position[] = [];

    for (const pos of this.portfolio.positions) {
      if (pos.quantity <= 0) continue;
      try {
        const quote = await marketDataService.getQuote(pos.symbol);
        const marketValue = +(pos.quantity * quote.price).toFixed(2);
        const unrealizedPnL = +(marketValue - (pos.quantity * pos.averageCost)).toFixed(2);
        const costBasis = pos.quantity * pos.averageCost;
        const unrealizedPnLPercent = costBasis > 0 ? +((unrealizedPnL / costBasis) * 100).toFixed(2) : 0;

        totalMarketValue += marketValue;
        totalUnrealizedPnL += unrealizedPnL;

        updatedPositions.push({
          ...pos,
          companyName: quote.companyName,
          currentPrice: quote.price,
          marketValue,
          unrealizedPnL,
          unrealizedPnLPercent,
        });
      } catch {
        // Fallback to existing price if quote fails
        const marketValue = +(pos.quantity * pos.currentPrice).toFixed(2);
        const unrealizedPnL = +(marketValue - (pos.quantity * pos.averageCost)).toFixed(2);
        totalMarketValue += marketValue;
        totalUnrealizedPnL += unrealizedPnL;
        updatedPositions.push(pos);
      }
    }

    this.portfolio.positions = updatedPositions;
    this.portfolio.totalMarketValue = +totalMarketValue.toFixed(2);
    this.portfolio.unrealizedPnL = +totalUnrealizedPnL.toFixed(2);
    this.portfolio.portfolioValue = +(this.portfolio.cash + totalMarketValue).toFixed(2);
    this.portfolio.totalPnL = +(this.portfolio.realizedPnL + totalUnrealizedPnL).toFixed(2);
    this.portfolio.totalPnLPercent = this.portfolio.initialCash > 0
      ? +((this.portfolio.totalPnL / this.portfolio.initialCash) * 100).toFixed(2)
      : 0;

    // Track simulated daily loss (drawdown from initial cash if negative)
    this.portfolio.dailySimulatedLoss = this.portfolio.totalPnL < 0 ? Math.abs(this.portfolio.totalPnL) : 0;
    this.portfolio.lastUpdated = new Date().toISOString();

    return this.portfolio;
  }

  async getPortfolio(): Promise<Portfolio> {
    return this.updatePortfolioValuation();
  }

  async validatePaperOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number) {
    await this.updatePortfolioValuation();
    const quote = await marketDataService.getQuote(symbol);
    return riskManagerService.validatePaperOrder({
      symbol,
      side,
      quantity,
      currentPrice: quote.price,
      portfolio: this.portfolio,
    });
  }

  async placePaperOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    reason: string = 'User confirmed paper trade',
    aiAnalysis?: {
      action: TradeAction;
      confidence: number;
      risk_level: RiskLevel;
      reasoningSnippet: string;
    }
  ): Promise<{ success: boolean; trade: PaperTrade; portfolio: Portfolio }> {
    await this.updatePortfolioValuation();
    const quote = await marketDataService.getQuote(symbol);

    // Strict validation through the risk manager
    const validation = riskManagerService.validatePaperOrder({
      symbol,
      side,
      quantity,
      currentPrice: quote.price,
      portfolio: this.portfolio,
    });

    if (!validation.valid) {
      throw new Error(`Order rejected by Risk Management: ${validation.errors.join('; ')}`);
    }

    const cleanSymbol = symbol.toUpperCase().trim();
    const execPrice = quote.price;
    const totalValue = +(quantity * execPrice).toFixed(2);
    const timestamp = new Date().toISOString();

    const trade: PaperTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      symbol: cleanSymbol,
      action: side,
      quantity,
      executionPrice: execPrice,
      totalValue,
      reason,
      aiAnalysis,
    };

    if (side === 'BUY') {
      // Deduct cash
      this.portfolio.cash = +(this.portfolio.cash - totalValue).toFixed(2);

      // Add or average into position
      const existingPosIndex = this.portfolio.positions.findIndex(p => p.symbol === cleanSymbol);
      if (existingPosIndex >= 0) {
        const existing = this.portfolio.positions[existingPosIndex];
        const newQty = existing.quantity + quantity;
        const newTotalCost = (existing.quantity * existing.averageCost) + totalValue;
        const newAvgCost = +(newTotalCost / newQty).toFixed(2);

        this.portfolio.positions[existingPosIndex] = {
          ...existing,
          quantity: newQty,
          averageCost: newAvgCost,
          currentPrice: execPrice,
          marketValue: +(newQty * execPrice).toFixed(2),
          unrealizedPnL: +(newQty * (execPrice - newAvgCost)).toFixed(2),
          unrealizedPnLPercent: +(((execPrice - newAvgCost) / newAvgCost) * 100).toFixed(2),
        };
      } else {
        this.portfolio.positions.push({
          symbol: cleanSymbol,
          companyName: quote.companyName,
          quantity,
          averageCost: execPrice,
          currentPrice: execPrice,
          marketValue: totalValue,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
        });
      }
    } else if (side === 'SELL') {
      // Realize P&L and add cash
      this.portfolio.cash = +(this.portfolio.cash + totalValue).toFixed(2);

      const existingPosIndex = this.portfolio.positions.findIndex(p => p.symbol === cleanSymbol);
      if (existingPosIndex >= 0) {
        const existing = this.portfolio.positions[existingPosIndex];
        const realizedGain = +((execPrice - existing.averageCost) * quantity).toFixed(2);
        this.portfolio.realizedPnL = +(this.portfolio.realizedPnL + realizedGain).toFixed(2);

        const remainingQty = existing.quantity - quantity;
        if (remainingQty <= 0) {
          this.portfolio.positions.splice(existingPosIndex, 1);
        } else {
          this.portfolio.positions[existingPosIndex] = {
            ...existing,
            quantity: remainingQty,
            currentPrice: execPrice,
            marketValue: +(remainingQty * execPrice).toFixed(2),
            unrealizedPnL: +(remainingQty * (execPrice - existing.averageCost)).toFixed(2),
            unrealizedPnLPercent: +(((execPrice - existing.averageCost) / existing.averageCost) * 100).toFixed(2),
          };
        }
      }
    }

    // Append to trade history
    this.portfolio.trades.unshift(trade);

    // Recalculate portfolio
    await this.updatePortfolioValuation();

    return {
      success: true,
      trade,
      portfolio: this.portfolio,
    };
  }

  getTradeHistory(): PaperTrade[] {
    return this.portfolio.trades;
  }

  resetPortfolio(initialCash: number = 100000): Portfolio {
    this.portfolio = {
      initialCash,
      cash: initialCash,
      positions: [],
      trades: [],
      totalMarketValue: 0,
      portfolioValue: initialCash,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      dailySimulatedLoss: 0,
      dailyLossLimitPercent: 0.10,
      maxOrderValueLimit: 25000,
      maxPositionPercentLimit: 0.40,
      lastUpdated: new Date().toISOString(),
    };
    return this.portfolio;
  }
}

export const paperTradingEngine = new PaperTradingEngine(100000);
