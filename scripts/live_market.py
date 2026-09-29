#!/usr/bin/env python3
"""
Live Market Data Streamer using yfinance.

Features:
- Live 1-minute interval market prices (Yahoo Finance)
- Multi-stock, 24/7 cryptocurrency (e.g. BTC-USD, ETH-USD) and Forex (EURUSD=X) tracking
- Optional continuous CSV file export
- Safe rate-limiting (10-30s intervals)

Usage:
  python live_market.py --tickers AAPL,NVDA,BTC-USD --interval 10 --export live_data.csv
"""

import sys
import time
import argparse
import os
from datetime import datetime

try:
    import yfinance as yf
    import pandas as pd
except ImportError:
    print("❌ Missing dependencies! Please run:")
    print("pip install yfinance pandas")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="Live Market Data Streamer (yfinance)")
    parser.add_argument(
        "--tickers",
        "-t",
        default="AAPL,NVDA,BTC-USD",
        help="Comma-separated stock/crypto tickers (e.g. AAPL,NVDA,MSFT,BTC-USD,EURUSD=X)",
    )
    parser.add_argument(
        "--interval",
        "-i",
        type=int,
        default=10,
        help="Polling interval in seconds (default: 10 seconds)",
    )
    parser.add_argument(
        "--export",
        "-e",
        default="",
        help="Optional CSV file path to continuously log streamed data",
    )
    return parser.parse_args()


def fetch_live_quote(symbol):
    try:
        ticker = yf.Ticker(symbol)
        # 1-minute bars for today's session (closest to live tick)
        data = ticker.history(period="1d", interval="1m")

        if not data.empty:
            latest = data.iloc[-1]
            return {
                "symbol": symbol,
                "timestamp": str(data.index[-1]),
                "price": float(latest["Close"]),
                "open": float(latest["Open"]),
                "high": float(latest["High"]),
                "low": float(latest["Low"]),
                "volume": int(latest["Volume"]),
                "status": "OK",
            }
        else:
            return {"symbol": symbol, "status": "NO_DATA"}
    except Exception as e:
        return {"symbol": symbol, "status": f"ERROR: {str(e)}"}


def main():
    args = parse_args()
    tickers = [s.strip().toUpperCase() if hasattr(s, "toUpperCase") else s.strip().upper() for s in args.tickers.split(",") if s.strip()]
    csv_file = args.export

    print("=" * 65)
    print("🚀 ALPHAPULSE - LIVE MARKET DATA STREAMER")
    print(f"📊 Tracking Tickers: {', '.join(tickers)}")
    print(f"⏱️  Refresh Interval: {args.interval}s")
    if csv_file:
        print(f"💾 Logging to CSV: {csv_file}")
    print("=" * 65)
    print("⚠️  Note: Free unauthenticated Yahoo feeds carry a ~15 min exchange delay")
    print("    during standard equity hours. 24/7 Cryptos stream continuously.")
    print("=" * 65)
    print("Press Ctrl+C to stop.\n")

    # CSV headers if export requested
    if csv_file and not os.path.exists(csv_file):
        df_init = pd.DataFrame(columns=["Timestamp", "Symbol", "Price", "Open", "High", "Low", "Volume"])
        df_init.to_csv(csv_file, index=False)

    try:
        while True:
            records = []
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"--- Poll Tick: {now_str} ---")

            for sym in tickers:
                res = fetch_live_quote(sym)
                if res["status"] == "OK":
                    print(
                        f"  📈 {res['symbol']:<8} | Price: ${res['price']:>9.2f} | "
                        f"H: ${res['high']:>8.2f} | L: ${res['low']:>8.2f} | Vol: {res['volume']:,}"
                    )
                    records.append({
                        "Timestamp": res["timestamp"],
                        "Symbol": res["symbol"],
                        "Price": res["price"],
                        "Open": res["open"],
                        "High": res["high"],
                        "Low": res["low"],
                        "Volume": res["volume"]
                    })
                else:
                    print(f"  ⚠️  {sym:<8} | Status: {res['status']}")

            if csv_file and records:
                df = pd.DataFrame(records)
                df.to_csv(csv_file, mode="a", header=False, index=False)
                print(f"  📁 Appended {len(records)} row(s) to {csv_file}")

            print()
            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n👋 Live data stream gracefully stopped.")


if __name__ == "__main__":
    main()
