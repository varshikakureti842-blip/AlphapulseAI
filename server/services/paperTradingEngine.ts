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
   * Re-evaluates open positions (LONG and SHORT) against current market prices and calculates portfolio stats
   */
  async updatePortfolioValuation(): Promise<Portfolio> {
    let totalMarketValue = 0;
    let totalUnrealizedPnL = 0;

    const updatedPositions: Position[] = [];

    for (const pos of this.portfolio.positions) {
      if (pos.quantity === 0) continue;
      const isLong = pos.quantity > 0;
      const absQty = Math.abs(pos.quantity);

      try {
        const quote = await marketDataService.getQuote(pos.symbol);
        const currentPrice = quote.price;

        if (isLong) {
          const marketValue = +(pos.quantity * currentPrice).toFixed(2);
          const unrealizedPnL = +(marketValue - (pos.quantity * pos.averageCost)).toFixed(2);
          const costBasis = pos.quantity * pos.averageCost;
          const unrealizedPnLPercent = costBasis > 0 ? +((unrealizedPnL / costBasis) * 100).toFixed(2) : 0;

          totalMarketValue += marketValue;
          totalUnrealizedPnL += unrealizedPnL;

          updatedPositions.push({
            ...pos,
            companyName: quote.companyName,
            currentPrice,
            marketValue,
            unrealizedPnL,
            unrealizedPnLPercent,
            positionType: 'LONG',
          });
        } else {
          // SHORT position: profit when currentPrice < averageCost
          const marketValue = +(-(absQty * currentPrice)).toFixed(2);
          const unrealizedPnL = +(absQty * (pos.averageCost - currentPrice)).toFixed(2);
          const costBasis = absQty * pos.averageCost;
          const unrealizedPnLPercent = costBasis > 0 ? +((unrealizedPnL / costBasis) * 100).toFixed(2) : 0;

          totalMarketValue += marketValue;
          totalUnrealizedPnL += unrealizedPnL;

          updatedPositions.push({
            ...pos,
            companyName: quote.companyName,
            currentPrice,
            marketValue,
            unrealizedPnL,
            unrealizedPnLPercent,
            positionType: 'SHORT',
          });
        }
      } catch {
        // Fallback to existing price if quote fails
        const currentPrice = pos.currentPrice;
        if (isLong) {
          const marketValue = +(pos.quantity * currentPrice).toFixed(2);
          const unrealizedPnL = +(marketValue - (pos.quantity * pos.averageCost)).toFixed(2);
          totalMarketValue += marketValue;
          totalUnrealizedPnL += unrealizedPnL;
          updatedPositions.push({ ...pos, marketValue, unrealizedPnL, positionType: 'LONG' });
        } else {
          const marketValue = +(-(absQty * currentPrice)).toFixed(2);
          const unrealizedPnL = +(absQty * (pos.averageCost - currentPrice)).toFixed(2);
          totalMarketValue += marketValue;
          totalUnrealizedPnL += unrealizedPnL;
          updatedPositions.push({ ...pos, marketValue, unrealizedPnL, positionType: 'SHORT' });
        }
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
      const existingPosIndex = this.portfolio.positions.findIndex(p => p.symbol === cleanSymbol);

      if (existingPosIndex >= 0) {
        const existing = this.portfolio.positions[existingPosIndex];

        if (existing.quantity < 0) {
          // BUY TO COVER SHORT POSITION
          const shortAbs = Math.abs(existing.quantity);
          const coverQty = Math.min(quantity, shortAbs);
          const remainingBuyQty = quantity - coverQty;

          // Deduct cost of cover from cash
          const coverCost = +(coverQty * execPrice).toFixed(2);
          this.portfolio.cash = +(this.portfolio.cash - coverCost).toFixed(2);

          // Realize P&L for covered short: (averageCost - execPrice) * coverQty
          const realizedGain = +((existing.averageCost - execPrice) * coverQty).toFixed(2);
          this.portfolio.realizedPnL = +(this.portfolio.realizedPnL + realizedGain).toFixed(2);

          const remainingShortQty = shortAbs - coverQty;
          if (remainingShortQty > 0) {
            this.portfolio.positions[existingPosIndex] = {
              ...existing,
              quantity: -remainingShortQty,
              currentPrice: execPrice,
              marketValue: +(-(remainingShortQty * execPrice)).toFixed(2),
              unrealizedPnL: +(remainingShortQty * (existing.averageCost - execPrice)).toFixed(2),
              unrealizedPnLPercent: +(((existing.averageCost - execPrice) / existing.averageCost) * 100).toFixed(2),
              positionType: 'SHORT',
            };
          } else {
            // Short fully covered
            this.portfolio.positions.splice(existingPosIndex, 1);
          }

          // If buy quantity was greater than short quantity, create a new LONG position for remainder
          if (remainingBuyQty > 0) {
            const extraCost = +(remainingBuyQty * execPrice).toFixed(2);
            this.portfolio.cash = +(this.portfolio.cash - extraCost).toFixed(2);
            this.portfolio.positions.push({
              symbol: cleanSymbol,
              companyName: quote.companyName,
              quantity: remainingBuyQty,
              averageCost: execPrice,
              currentPrice: execPrice,
              marketValue: extraCost,
              unrealizedPnL: 0,
              unrealizedPnLPercent: 0,
              positionType: 'LONG',
            });
          }
        } else {
          // Normal BUY adding to existing LONG position
          this.portfolio.cash = +(this.portfolio.cash - totalValue).toFixed(2);
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
            positionType: 'LONG',
          };
        }
      } else {
        // New LONG position
        this.portfolio.cash = +(this.portfolio.cash - totalValue).toFixed(2);
        this.portfolio.positions.push({
          symbol: cleanSymbol,
          companyName: quote.companyName,
          quantity,
          averageCost: execPrice,
          currentPrice: execPrice,
          marketValue: totalValue,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          positionType: 'LONG',
        });
      }
    } else if (side === 'SELL') {
      // Add proceeds to cash
      this.portfolio.cash = +(this.portfolio.cash + totalValue).toFixed(2);

      const existingPosIndex = this.portfolio.positions.findIndex(p => p.symbol === cleanSymbol);

      if (existingPosIndex >= 0) {
        const existing = this.portfolio.positions[existingPosIndex];

        if (existing.quantity > 0) {
          // Selling down a LONG position
          const sellLongQty = Math.min(quantity, existing.quantity);
          const remainingSellQty = quantity - sellLongQty;

          // Realize gain on long shares sold
          const realizedGain = +((execPrice - existing.averageCost) * sellLongQty).toFixed(2);
          this.portfolio.realizedPnL = +(this.portfolio.realizedPnL + realizedGain).toFixed(2);

          const remainingLongQty = existing.quantity - sellLongQty;
          if (remainingLongQty > 0) {
            this.portfolio.positions[existingPosIndex] = {
              ...existing,
              quantity: remainingLongQty,
              currentPrice: execPrice,
              marketValue: +(remainingLongQty * execPrice).toFixed(2),
              unrealizedPnL: +(remainingLongQty * (execPrice - existing.averageCost)).toFixed(2),
              unrealizedPnLPercent: +(((execPrice - existing.averageCost) / existing.averageCost) * 100).toFixed(2),
              positionType: 'LONG',
            };
          } else {
            this.portfolio.positions.splice(existingPosIndex, 1);
          }

          // If sell quantity exceeded long quantity, open a SHORT position for remainder
          if (remainingSellQty > 0) {
            this.portfolio.positions.push({
              symbol: cleanSymbol,
              companyName: quote.companyName,
              quantity: -remainingSellQty,
              averageCost: execPrice,
              currentPrice: execPrice,
              marketValue: +(-(remainingSellQty * execPrice)).toFixed(2),
              unrealizedPnL: 0,
              unrealizedPnLPercent: 0,
              positionType: 'SHORT',
            });
          }
        } else {
          // Already holding a SHORT position -> Expand short position
          const currentShortAbs = Math.abs(existing.quantity);
          const newShortQty = currentShortAbs + quantity;
          const oldShortValue = currentShortAbs * existing.averageCost;
          const newShortValue = totalValue;
          const newAvgCost = +((oldShortValue + newShortValue) / newShortQty).toFixed(2);

          this.portfolio.positions[existingPosIndex] = {
            ...existing,
            quantity: -newShortQty,
            averageCost: newAvgCost,
            currentPrice: execPrice,
            marketValue: +(-(newShortQty * execPrice)).toFixed(2),
            unrealizedPnL: +(newShortQty * (newAvgCost - execPrice)).toFixed(2),
            unrealizedPnLPercent: +(((newAvgCost - execPrice) / newAvgCost) * 100).toFixed(2),
            positionType: 'SHORT',
          };
        }
      } else {
        // New SHORT position (User owns 0 shares and sells short!)
        this.portfolio.positions.push({
          symbol: cleanSymbol,
          companyName: quote.companyName,
          quantity: -quantity,
          averageCost: execPrice,
          currentPrice: execPrice,
          marketValue: +(-totalValue).toFixed(2),
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          positionType: 'SHORT',
        });
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
