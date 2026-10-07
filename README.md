# AlphaPulse AI — Quantitative Market Intelligence & Paper Trading Terminal

![AlphaPulse AI](https://img.shields.io/badge/AlphaPulse-AI%20Quant%20Terminal-cyan?style=for-the-badge)
![Gemini API](https://img.shields.io/badge/Powered%20By-Google%20Gemini%203.8-indigo?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)

AlphaPulse AI is an institutional-grade stock market technical analysis and virtual paper-trading terminal. It combines real-time financial market feeds, automated quantitative risk management, and multi-modal AI intelligence powered by Google Gemini.

---

## 🌟 Key Features

### 1. 📈 Real-Time Exchange Market Data & Technical Indicators
* **Live Exchange Data**: Real-time price quotes, intraday high/low ranges, trading volume, and price change metrics.
* **Technical Indicators Engine**: Real-time calculation of 14-period Relative Strength Index (RSI), Moving Average Convergence Divergence (MACD line, signal line, and histogram), 20-day Simple Moving Average (SMA 20), and 50-day Simple Moving Average (SMA 50).
* **Interactive Candle & Volume Charts**: High-fidelity chart visualizations with period controls (1D, 1W, 1M, 3M, 1Y).

### 2. 🤖 Gemini Quantitative Copilot Chatbot
* **Multi-Turn Reasoning**: Multi-turn conversational interface grounded in active stock market context and portfolio metrics.
* **Role Personas**:
  * **Quant Advisor**: Strategic trade allocation, entry targets, and expected risk/reward ratios.
  * **Chief Risk Officer (CRO)**: Capital preservation, 40% maximum position limits, and draw-down audit.
  * **Chart Analyst**: Pure technical structure, moving average alignments, and RSI momentum channels.
* **Model Selection**: Supports `gemini-3.8-flash` (General Tasks), `gemini-3.1-flash-lite` (Fast Execution), and `gemini-3.1-pro-preview` (Deep Reasoning) with automatic resilient model fallbacks.

### 3. ⚡ 1-Click Order Ticket Execution Integration
* **Instant Order Population**: Copilot automatically detects trade execution setups in responses and renders an interactive **"⚡ Open Order Ticket"** action card.
* **Zero Manual Data Entry**: Clicking the button pre-fills the paper order ticket with symbol, side (BUY/SELL), and share count, opening the confirmation modal instantly.

### 4. 🎙️ Real-Time Live Voice Assistant (`gemini-3.8-live`)
* **Full-Duplex Speech**: Native real-time audio interaction over WebSocket using 16kHz PCM input and 24kHz model speech output.
* **Hands-Free Market Briefings**: Verbally request market analysis or portfolio status while reviewing charts.

### 5. 🔍 Google Search Grounded Market Intelligence
* **Live Financial News**: Real-time breaking catalysts and news summaries powered by Gemini Search Grounding (`googleSearch` tool).
* **Source Citations**: Extracted news publisher links and grounded search queries.

### 6. 🔔 Subtle Technical Indicator Alert System
* **Automated Trigger Detection**: Monitors the active stock for key technical events:
  * **RSI Oversold / Overbought**: Alerts when 14-period RSI crosses below 30 or above 70.
  * **Golden Cross / Moving Average Alignment**: Alerts when 20-day SMA crosses above 50-day SMA with price leading.
  * **Bearish Breakdown**: Alerts when price breaches key moving average supports.
  * **MACD Crossover**: Alerts on momentum histogram expansion.
* **Actionable Toasts**: Slide-in notifications with Web Audio synthesized chimes and direct **"Ask Copilot"** and **"Simulate Trade"** triggers.

### 7. 🛡️ Quantitative Risk Management Engine
* **40% Position Limit Rule**: Enforces maximum single-asset exposure to prevent portfolio concentration risk.
* **Single-Order Ceiling**: Enforces $25,000 maximum single ticket size.
* **Automated Risk-to-Reward Ratios**: Calculates minimum 1:1.5 target ratios and protective stop-losses.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React Icons
* **Backend**: Node.js, Express, TypeScript (`tsx`)
* **AI & Multi-Modal SDK**: Official `@google/genai` TypeScript SDK (`GoogleGenAI`)
* **Live Audio Streaming**: WebSockets (`ws` library), Web Audio API (PCM 16kHz audio recording & 24kHz audio playback)
* **Market Data Provider**: Real-time Yahoo Finance feed API with simulated demo mode fallback

---

## 🚀 Getting Started

### Prerequisites

* **Node.js**: v18.0.0 or higher
* **npm** or **bun**
* **Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/alphapulse-ai.git
   cd alphapulse-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Set your Gemini API key in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

### Running Development Server

Start the full-stack Express + Vite dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/market-data/:symbol` | `GET` | Fetches real-time price quote, high/low, and volume for a symbol |
| `/api/indicators/:symbol` | `GET` | Calculates RSI, MACD, SMA 20, SMA 50, and historical candle data |
| `/api/portfolio` | `GET` | Retrieves current paper portfolio balance, positions, and unrealized P/L |
| `/api/portfolio/reset` | `POST` | Resets virtual cash balance (default: $100,000) |
| `/api/gemini/chat` | `POST` | Multi-turn Copilot chat grounded in live exchange data |
| `/api/gemini/grounded-news/:symbol` | `GET` | Fetches Google Search grounded market news and catalysts |
| `/live` | `WS` | Full-duplex WebSocket connection for `gemini-3.8-live` audio streaming |

---

## ⚠️ Disclaimer

AlphaPulse AI is a **virtual paper-trading and educational simulation tool**. No real monetary transactions are executed. All stock prices and calculations are provided for technical analysis, strategy testing, and research demonstration purposes only. Always consult a certified financial advisor before making real investment decisions.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
