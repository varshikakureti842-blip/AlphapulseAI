import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { Portfolio, Position, PaperTrade } from '../types/stock';

/**
 * Persist portfolio summary metrics and open positions to Firestore
 */
export async function savePortfolioToFirestore(userId: string, portfolio: Portfolio): Promise<void> {
  if (!userId || !db) return;

  try {
    const portfolioRef = doc(db, 'users', userId, 'portfolio', 'data');
    await setDoc(portfolioRef, {
      userId,
      cash: portfolio.cash,
      portfolioValue: portfolio.portfolioValue,
      totalPnL: portfolio.totalPnL,
      totalPnLPercent: portfolio.totalPnLPercent,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    for (const pos of portfolio.positions) {
      const posRef = doc(db, 'users', userId, 'positions', pos.symbol);
      await setDoc(posRef, {
        symbol: pos.symbol,
        shares: pos.quantity,
        avgPrice: pos.averageCost,
        currentPrice: pos.currentPrice,
        marketValue: pos.marketValue,
        unrealizedPnL: pos.unrealizedPnL,
        unrealizedPnLPercent: pos.unrealizedPnLPercent,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.warn('Firestore portfolio sync notice:', err?.message || err);
  }
}

/**
 * Persist an executed trade order transaction to Firestore
 */
export async function saveTradeToFirestore(userId: string, trade: PaperTrade): Promise<void> {
  if (!userId || !db) return;

  try {
    const tradeRef = doc(db, 'users', userId, 'trades', trade.id);
    await setDoc(tradeRef, {
      id: trade.id,
      userId,
      symbol: trade.symbol,
      side: trade.action,
      quantity: trade.quantity,
      price: trade.executionPrice,
      total: trade.totalValue,
      timestamp: trade.timestamp,
      pnl: 0,
    });
  } catch (err: any) {
    console.warn('Firestore trade sync notice:', err?.message || err);
  }
}

/**
 * Load portfolio state from Firestore for user
 */
export async function loadPortfolioFromFirestore(userId: string): Promise<Partial<Portfolio> | null> {
  if (!userId || !db) return null;

  try {
    const portfolioRef = doc(db, 'users', userId, 'portfolio', 'data');
    const portfolioSnap = await getDoc(portfolioRef);

    if (!portfolioSnap.exists()) return null;

    const data = portfolioSnap.data();

    const posCol = collection(db, 'users', userId, 'positions');
    const posSnap = await getDocs(posCol);
    const positions: Position[] = [];

    posSnap.forEach((docSnap) => {
      const p = docSnap.data();
      if (p.shares > 0) {
        positions.push({
          symbol: p.symbol,
          companyName: p.symbol,
          quantity: p.shares,
          averageCost: p.avgPrice,
          currentPrice: p.currentPrice,
          marketValue: p.marketValue,
          unrealizedPnL: p.unrealizedPnL,
          unrealizedPnLPercent: p.unrealizedPnLPercent,
        });
      }
    });

    const tradeCol = collection(db, 'users', userId, 'trades');
    const q = query(tradeCol, orderBy('timestamp', 'desc'), limit(50));
    const tradeSnap = await getDocs(q);
    const trades: PaperTrade[] = [];

    tradeSnap.forEach((tDoc) => {
      const t = tDoc.data();
      trades.push({
        id: t.id,
        timestamp: t.timestamp,
        symbol: t.symbol,
        action: t.side,
        quantity: t.quantity,
        executionPrice: t.price,
        totalValue: t.total,
        reason: 'Executed paper order',
      });
    });

    return {
      cash: data.cash ?? 100000,
      portfolioValue: data.portfolioValue ?? 100000,
      totalPnL: data.totalPnL ?? 0,
      totalPnLPercent: data.totalPnLPercent ?? 0,
      positions,
      trades,
    };
  } catch (err: any) {
    console.warn('Firestore load notice:', err?.message || err);
    return null;
  }
}
