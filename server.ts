import express, { Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { marketDataService } from './server/services/marketData';
import { technicalAnalysisService } from './server/services/technicalAnalysis';
import { riskManagerService } from './server/services/riskManager';
import { paperTradingEngine } from './server/services/paperTradingEngine';
import { geminiAnalysisService } from './server/services/geminiAnalysis';
import { geminiService } from './server/services/geminiService';
import { TimePeriod, MarketDataMode } from './src/types/stock';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const httpServer = http.createServer(app);

  app.use(express.json());

  // Attach Gemini Live API WebSocket Server on path /live
  geminiService.setupLiveWebSocket(httpServer);

  // --- API ROUTES ---

  // Market Data Mode Status & Toggle
  app.get('/api/market-data-mode', (_req: Request, res: Response) => {
    res.json({
      success: true,
      mode: marketDataService.getDefaultMode(),
      availableModes: ['live', 'simulated'],
      provider: 'Yahoo Finance Live Feed (fallback to Simulated)',
    });
  });

  app.post('/api/market-data-mode', (req: Request, res: Response) => {
    const { mode } = req.body;
    if (mode === 'live' || mode === 'simulated') {
      marketDataService.setDefaultMode(mode);
      res.json({ success: true, mode });
    } else {
      res.status(400).json({ success: false, error: 'Invalid mode. Must be "live" or "simulated".' });
    }
  });

  // 1. get_market_data(symbol)
  app.get('/api/market-data/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const mode = (req.query.mode as MarketDataMode) || undefined;
      const quote = await marketDataService.getQuote(symbol, mode);
      res.json({ success: true, data: quote });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to fetch market data' });
    }
  });

  // 2. get_historical_data(symbol, period)
  app.get('/api/historical-data/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const period = (req.query.period as TimePeriod) || '3M';
      const mode = (req.query.mode as MarketDataMode) || undefined;
      const candles = await marketDataService.getHistoricalData(symbol, period, mode);
      res.json({ success: true, data: candles, period, symbol: symbol.toUpperCase() });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to fetch historical data' });
    }
  });

  // 3. calculate_indicators(symbol)
  app.get('/api/indicators/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const period = (req.query.period as TimePeriod) || '3M';
      const mode = (req.query.mode as MarketDataMode) || undefined;
      const indicators = await technicalAnalysisService.calculateIndicators(symbol, period, mode);
      res.json({ success: true, data: indicators });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to calculate technical indicators' });
    }
  });

  // 4. get_portfolio()
  app.get('/api/portfolio', async (_req: Request, res: Response) => {
    try {
      const portfolio = await paperTradingEngine.getPortfolio();
      res.json({ success: true, data: portfolio });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to get portfolio' });
    }
  });

  // 5. validate_paper_order(symbol, side, quantity)
  app.post('/api/orders/validate', async (req: Request, res: Response) => {
    try {
      const { symbol, side, quantity } = req.body;
      if (!symbol || !side || typeof quantity !== 'number') {
        return res.status(400).json({ success: false, error: 'Missing required parameters: symbol, side, quantity' });
      }
      const validation = await paperTradingEngine.validatePaperOrder(symbol, side, quantity);
      res.json({ success: true, data: validation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to validate paper order' });
    }
  });

  // 6. place_paper_order(symbol, side, quantity)
  app.post('/api/orders/place', async (req: Request, res: Response) => {
    try {
      const { symbol, side, quantity, reason, aiAnalysis } = req.body;
      if (!symbol || !side || typeof quantity !== 'number') {
        return res.status(400).json({ success: false, error: 'Missing required parameters: symbol, side, quantity' });
      }
      const result = await paperTradingEngine.placePaperOrder(symbol, side, quantity, reason, aiAnalysis);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to place paper order' });
    }
  });

  // 7. get_trade_history()
  app.get('/api/trades', (_req: Request, res: Response) => {
    try {
      const trades = paperTradingEngine.getTradeHistory();
      res.json({ success: true, data: trades });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to get trade history' });
    }
  });

  // 8. Gemini AI Analysis: analyze stock data and produce structured JSON
  app.post('/api/gemini/analyze', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.body;
      if (!symbol) {
        return res.status(400).json({ success: false, error: 'Stock symbol is required' });
      }
      const analysis = await geminiAnalysisService.analyzeStock(symbol);
      res.json({ success: true, data: analysis });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'AI analysis failed' });
    }
  });

  // 9. Reset Portfolio
  app.post('/api/portfolio/reset', (req: Request, res: Response) => {
    try {
      const initialCash = req.body.initialCash ? parseFloat(req.body.initialCash) : 100000;
      const portfolio = paperTradingEngine.resetPortfolio(initialCash);
      res.json({ success: true, data: portfolio });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to reset portfolio' });
    }
  });

  // Popular tickers list
  app.get('/api/popular-tickers', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'NVDA', name: 'NVIDIA Corp.' },
        { symbol: 'MSFT', name: 'Microsoft Corp.' },
        { symbol: 'TSLA', name: 'Tesla, Inc.' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
        { symbol: 'AMZN', name: 'Amazon.com' },
        { symbol: 'META', name: 'Meta Platforms' },
        { symbol: 'SPY', name: 'S&P 500 ETF' },
      ],
    });
  });

  // 10. Feature 1: Google Search Grounded News (gemini-3.5-flash with googleSearch tool)
  app.get('/api/gemini/grounded-news/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const companyName = req.query.companyName as string | undefined;
      const groundedResult = await geminiService.getGroundedMarketNews(symbol, companyName);
      res.json({ success: true, data: groundedResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Search Grounding failed' });
    }
  });

  // 11. Feature 2: Gemini Multi-Turn Chat (supports gemini-3.5-flash, gemini-3.1-flash-lite, gemini-3.1-pro-preview)
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { messages, model, role, marketContext } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'Messages array is required' });
      }
      const chatResponse = await geminiService.chat({ messages, model, role, marketContext });
      res.json({ success: true, data: chatResponse });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Chat generation failed' });
    }
  });

  // Mount Vite in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AlphaPulse Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
