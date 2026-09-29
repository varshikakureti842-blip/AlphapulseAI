import { PaperOrderValidation, Portfolio, RiskCheckItem } from '../../src/types/stock';

export interface ValidateOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  currentPrice: number;
  portfolio: Portfolio;
}

export class RiskManagerService {
  /**
   * Independently validates any proposed paper order before execution.
   * Neither Gemini nor the UI can bypass this layer.
   */
  validatePaperOrder(params: ValidateOrderParams): PaperOrderValidation {
    const { symbol, side, quantity, currentPrice, portfolio } = params;
    const errors: string[] = [];
    const checks: RiskCheckItem[] = [];

    // 1. Symbol & Basic params Check
    const cleanSymbol = symbol ? symbol.toUpperCase().trim() : '';
    if (!cleanSymbol || !/^[A-Z0-9.-]{1,8}$/.test(cleanSymbol)) {
      errors.push(`Invalid symbol format: "${symbol}". Must be 1-8 alphanumeric characters.`);
    }

    if (side !== 'BUY' && side !== 'SELL') {
      errors.push(`Invalid action: "${side}". Must be BUY or SELL.`);
    }

    if (!quantity || typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      errors.push(`Quantity must be a positive whole integer (got ${quantity}).`);
    }

    if (!currentPrice || currentPrice <= 0 || isNaN(currentPrice)) {
      errors.push(`Invalid market price: $${currentPrice}. Cannot execute trade with invalid pricing.`);
    }

    const validQty = Math.max(1, Math.floor(quantity || 0));
    const estimatedTotal = +(validQty * (currentPrice || 0)).toFixed(2);
    const existingPosition = portfolio.positions.find(p => p.symbol === cleanSymbol);
    const existingHoldingQty = existingPosition ? existingPosition.quantity : 0;
    const totalPortfolioValue = Math.max(portfolio.portfolioValue, 1);

    // Dynamic Risk Parameters
    const MAX_ORDER_VALUE = portfolio.maxOrderValueLimit || 25000; // $25,000 default max single order
    const MAX_POSITION_PERCENT = portfolio.maxPositionPercentLimit || 0.40; // Max 40% in one stock
    const DAILY_LOSS_LIMIT_PERCENT = portfolio.dailyLossLimitPercent || 0.10; // 10% daily drawdown limit

    // Check 1: Cash Availability (for BUY)
    let cashCheckPassed = true;
    let cashCheckMsg = 'Cash balance adequate.';
    if (side === 'BUY') {
      if (portfolio.cash < estimatedTotal) {
        cashCheckPassed = false;
        cashCheckMsg = `Insufficient virtual cash. Need $${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}, but only have $${portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })} available.`;
        errors.push(cashCheckMsg);
      } else {
        cashCheckMsg = `Virtual cash sufficient ($${portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })} available, order requires $${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}).`;
      }
    }
    checks.push({ name: 'Available Cash Check', passed: cashCheckPassed, message: cashCheckMsg });

    // Check 2: Holdings Check (for SELL)
    let holdingsCheckPassed = true;
    let holdingsCheckMsg = 'Holdings validated.';
    if (side === 'SELL') {
      if (existingHoldingQty <= 0) {
        holdingsCheckPassed = false;
        holdingsCheckMsg = `You do not own any shares of ${cleanSymbol} to sell.`;
        errors.push(holdingsCheckMsg);
      } else if (validQty > existingHoldingQty) {
        holdingsCheckPassed = false;
        holdingsCheckMsg = `Cannot sell ${validQty} shares: you only hold ${existingHoldingQty} shares of ${cleanSymbol}.`;
        errors.push(holdingsCheckMsg);
      } else {
        holdingsCheckMsg = `Sufficient shares available (${validQty} of ${existingHoldingQty} shares).`;
      }
    }
    checks.push({ name: 'Holdings Check', passed: holdingsCheckPassed, message: holdingsCheckMsg });

    // Check 3: Max Single Order Value Limit
    let orderValuePassed = true;
    let orderValueMsg = `Order value ($${estimatedTotal.toLocaleString()}) within safe limit ($${MAX_ORDER_VALUE.toLocaleString()}).`;
    if (estimatedTotal > MAX_ORDER_VALUE) {
      orderValuePassed = false;
      orderValueMsg = `Order exceeds maximum single trade limit of $${MAX_ORDER_VALUE.toLocaleString()} (attempted: $${estimatedTotal.toLocaleString()}).`;
      errors.push(orderValueMsg);
    }
    checks.push({ name: 'Max Order Value Limit', passed: orderValuePassed, message: orderValueMsg });

    // Check 4: Position Concentration Limit (Max 40% of portfolio)
    let positionSizePassed = true;
    let positionSizeMsg = `Position concentration within ${Math.round(MAX_POSITION_PERCENT * 100)}% portfolio risk limit.`;
    if (side === 'BUY') {
      const currentSymbolValue = existingPosition ? existingPosition.marketValue : 0;
      const projectedSymbolValue = currentSymbolValue + estimatedTotal;
      const projectedRatio = projectedSymbolValue / totalPortfolioValue;

      if (projectedRatio > MAX_POSITION_PERCENT) {
        positionSizePassed = false;
        positionSizeMsg = `Concentration risk: buying would put ${(projectedRatio * 100).toFixed(1)}% of total portfolio in ${cleanSymbol} (limit is ${(MAX_POSITION_PERCENT * 100).toFixed(0)}%).`;
        errors.push(positionSizeMsg);
      }
    }
    checks.push({ name: 'Position Size & Concentration', passed: positionSizePassed, message: positionSizeMsg });

    // Check 5: Daily Simulated Loss Circuit Breaker
    let dailyLossPassed = true;
    let dailyLossMsg = 'Daily simulated drawdown within acceptable safety threshold.';
    const dailyLossRatio = portfolio.dailySimulatedLoss / Math.max(portfolio.initialCash, 1);
    if (dailyLossRatio >= DAILY_LOSS_LIMIT_PERCENT) {
      dailyLossPassed = false;
      dailyLossMsg = `Circuit Breaker Active: Daily simulated loss is ${(dailyLossRatio * 100).toFixed(1)}%, exceeding ${(DAILY_LOSS_LIMIT_PERCENT * 100).toFixed(0)}% safety limit. Trading is restricted.`;
      errors.push(dailyLossMsg);
    }
    checks.push({ name: 'Daily Drawdown Circuit Breaker', passed: dailyLossPassed, message: dailyLossMsg });

    // Calculate maximum allowed quantity for helper suggestion
    let suggestedMaxQuantity = 0;
    if (side === 'BUY') {
      const maxByCash = Math.floor(portfolio.cash / currentPrice);
      const maxByOrderValue = Math.floor(MAX_ORDER_VALUE / currentPrice);
      const currentSymbolVal = existingPosition ? existingPosition.marketValue : 0;
      const maxByConcentration = Math.max(0, Math.floor(((MAX_POSITION_PERCENT * totalPortfolioValue) - currentSymbolVal) / currentPrice));
      suggestedMaxQuantity = Math.max(0, Math.min(maxByCash, maxByOrderValue, maxByConcentration));
    } else {
      suggestedMaxQuantity = existingHoldingQty;
    }

    const projectedCash = side === 'BUY'
      ? +(portfolio.cash - estimatedTotal).toFixed(2)
      : +(portfolio.cash + estimatedTotal).toFixed(2);

    const valid = errors.length === 0;

    return {
      valid,
      symbol: cleanSymbol,
      side,
      quantity: validQty,
      price: currentPrice,
      estimatedTotal,
      availableCash: portfolio.cash,
      projectedCash,
      errors,
      checks,
      suggestedMaxQuantity,
    };
  }
}

export const riskManagerService = new RiskManagerService();
