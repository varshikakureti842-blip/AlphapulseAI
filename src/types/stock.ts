export type TradeAction = 'BUY' | 'SELL' | 'HOLD';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y';
export type MarketDataMode = 'live' | 'simulated';

export interface MarketQuote {
  symbol: string;
  companyName: string;
  exchange: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  avgVolume: number;
  timestamp: string;
  isSimulated: boolean;
  dataSource?: string;
  marketState?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  symbol: string;
  period: string;
  currentPrice: number;
  sma20: number | null;
  sma50: number | null;
  rsi: number | null;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  } | null;
  volumeChangePercent: number;
  candles: CandleData[];
  sma20Series: { date: string; value: number | null }[];
  sma50Series: { date: string; value: number | null }[];
  rsiSeries: { date: string; value: number | null }[];
  macdSeries: {
    date: string;
    macd: number | null;
    signal: number | null;
    hist: number | null;
  }[];
}

export interface GeminiAnalysisResult {
  symbol: string;
  action: TradeAction;
  confidence: number; // 0 to 1
  risk_level: RiskLevel;
  reasoning: string;
  key_factors: string[];
  suggested_quantity: number;
  timestamp: string;
  source?: 'gemini' | 'quant_engine';
  notice?: string;
  marketContext?: {
    price: number;
    rsi: number | null;
    sma20: number | null;
    sma50: number | null;
  };
}

export interface RiskCheckItem {
  name: string;
  passed: boolean;
  message: string;
}

export interface PaperOrderValidation {
  valid: boolean;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  estimatedTotal: number;
  availableCash: number;
  projectedCash: number;
  errors: string[];
  checks: RiskCheckItem[];
  suggestedMaxQuantity: number;
}

export interface PaperTrade {
  id: string;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  executionPrice: number;
  totalValue: number;
  reason: string;
  aiAnalysis?: {
    action: TradeAction;
    confidence: number;
    risk_level: RiskLevel;
    reasoningSnippet: string;
  };
}

export interface Position {
  symbol: string;
  companyName: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface Portfolio {
  initialCash: number;
  cash: number;
  positions: Position[];
  trades: PaperTrade[];
  totalMarketValue: number;
  portfolioValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailySimulatedLoss: number;
  dailyLossLimitPercent: number;
  maxOrderValueLimit: number;
  maxPositionPercentLimit: number;
  lastUpdated: string;
}
