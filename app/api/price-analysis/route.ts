// app/api/price-analysis/route.ts
import { NextResponse } from "next/server";

interface PriceAlert {
  symbol: string;
  coinId: string;
  alertType: 'spike' | 'drop' | 'volume_surge' | 'ath' | 'atl';
  currentPrice: number;
  previousPrice: number;
  changePercentage: number;
  timeframe: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

interface PriceCorrelation {
  newsId: string;
  newsTitle: string;
  newsTimestamp: string;
  affectedCoins: {
    symbol: string;
    priceImpact: number;
    correlation: number; // -1 to 1
  }[];
  overallMarketImpact: number;
}

interface AnalysisResponse {
  alerts: PriceAlert[];
  correlations: PriceCorrelation[];
  marketSummary: {
    overallSentiment: 'bullish' | 'bearish' | 'neutral';
    majorMovers: string[];
    totalMarketCap: number;
    btcDominance: number;
  };
}

// Cache for price history to detect changes
let priceHistory: Record<string, number[]> = {};
let lastAnalysisTime = 0;
const ANALYSIS_INTERVAL = 2 * 60 * 1000; // 2 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeCorrelations = searchParams.get('correlations') === 'true';
  
  try {
    // Don't run analysis too frequently
    if (Date.now() - lastAnalysisTime < ANALYSIS_INTERVAL) {
      return NextResponse.json({
        alerts: [],
        correlations: [],
        marketSummary: null,
        message: "Analysis throttled - too frequent requests"
      });
    }
    
    // Fetch current prices
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    const pricesResponse = await fetch(`${baseUrl}/api/crypto-prices`);
    if (!pricesResponse.ok) {
      throw new Error("Failed to fetch current prices");
    }
    
    const { prices } = await pricesResponse.json();
    const alerts = analyzeForAlerts(prices);
    
    let correlations: PriceCorrelation[] = [];
    if (includeCorrelations) {
      correlations = await analyzeNewsCorrelations(prices);
    }
    
    const marketSummary = calculateMarketSummary(prices);
    
    lastAnalysisTime = Date.now();
    
    return NextResponse.json({
      alerts,
      correlations,
      marketSummary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error in price analysis:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Analysis failed",
        alerts: [],
        correlations: [],
        marketSummary: null
      },
      { status: 500 }
    );
  }
}

function analyzeForAlerts(prices: any[]): PriceAlert[] {
  const alerts: PriceAlert[] = [];
  
  prices.forEach(coin => {
    const symbol = coin.symbol;
    const currentPrice = coin.price;
    
    // Initialize price history if not exists
    if (!priceHistory[symbol]) {
      priceHistory[symbol] = [];
    }
    
    // Store current price
    priceHistory[symbol].push(currentPrice);
    
    // Keep only last 10 data points
    if (priceHistory[symbol].length > 10) {
      priceHistory[symbol] = priceHistory[symbol].slice(-10);
    }
    
    // Need at least 2 data points for comparison
    if (priceHistory[symbol].length < 2) return;
    
    const previousPrices = priceHistory[symbol];
    const previousPrice = previousPrices[previousPrices.length - 2];
    const changePercentage = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    // Alert conditions
    if (Math.abs(changePercentage) > 10) {
      alerts.push({
        symbol,
        coinId: coin.coinGeckoId,
        alertType: changePercentage > 0 ? 'spike' : 'drop',
        currentPrice,
        previousPrice,
        changePercentage,
        timeframe: '5m',
        significance: Math.abs(changePercentage) > 20 ? 'critical' : 
                     Math.abs(changePercentage) > 15 ? 'high' : 'medium',
        timestamp: new Date().toISOString()
      });
    }
    
    // Volume surge detection
    if (coin.volume24h > 0) {
      const avgVolume = previousPrices.length > 5 ? 
        previousPrices.reduce((a, b) => a + b, 0) / previousPrices.length : 0;
      
      if (avgVolume > 0 && coin.volume24h > avgVolume * 2) {
        alerts.push({
          symbol,
          coinId: coin.coinGeckoId,
          alertType: 'volume_surge',
          currentPrice,
          previousPrice,
          changePercentage: ((coin.volume24h - avgVolume) / avgVolume) * 100,
          timeframe: '24h',
          significance: 'high',
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  return alerts.sort((a, b) => 
    (b.significance === 'critical' ? 3 : b.significance === 'high' ? 2 : 1) -
    (a.significance === 'critical' ? 3 : a.significance === 'high' ? 2 : 1)
  );
}

async function analyzeNewsCorrelations(prices: any[]): Promise<PriceCorrelation[]> {
  try {
    // Fetch recent news
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    const newsResponse = await fetch(`${baseUrl}/api/rss-news`);
    if (!newsResponse.ok) return [];
    
    const { news } = await newsResponse.json();
    const recentNews = news.slice(0, 10); // Analyze last 10 news items
    
    const correlations: PriceCorrelation[] = [];
    
    recentNews.forEach((newsItem: any) => {
      if (!newsItem.isPriceImpacting) return;
      
      const affectedCoins = prices.map(coin => ({
        symbol: coin.symbol,
        priceImpact: coin.change24h,
        correlation: calculateNewsCorrelation(newsItem, coin)
      })).filter(coin => Math.abs(coin.correlation) > 0.3);
      
      if (affectedCoins.length > 0) {
        correlations.push({
          newsId: newsItem.id,
          newsTitle: newsItem.title,
          newsTimestamp: newsItem.publishedAt,
          affectedCoins,
          overallMarketImpact: affectedCoins.reduce((sum, coin) => 
            sum + coin.priceImpact, 0) / affectedCoins.length
        });
      }
    });
    
    return correlations;
  } catch (error) {
    console.error("Error analyzing news correlations:", error);
    return [];
  }
}

function calculateNewsCorrelation(newsItem: any, coin: any): number {
  const title = newsItem.title.toLowerCase();
  const summary = (newsItem.summary || '').toLowerCase();
  const coinName = coin.name.toLowerCase();
  const coinSymbol = coin.symbol.toLowerCase();
  
  let correlation = 0;
  
  // Direct mentions
  if (title.includes(coinName) || title.includes(coinSymbol)) {
    correlation += 0.8;
  }
  if (summary.includes(coinName) || summary.includes(coinSymbol)) {
    correlation += 0.6;
  }
  
  // Generic crypto news affects all coins but with lower correlation
  const cryptoKeywords = ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'sec', 'regulation'];
  const hasGenericKeywords = cryptoKeywords.some(keyword => 
    title.includes(keyword) || summary.includes(keyword));
  
  if (hasGenericKeywords) {
    correlation += 0.3;
  }
  
  // Sentiment impact
  const bullishKeywords = ['surge', 'rally', 'bullish', 'rise', 'gain'];
  const bearishKeywords = ['crash', 'drop', 'bearish', 'fall', 'decline'];
  
  const isBullish = bullishKeywords.some(keyword => 
    title.includes(keyword) || summary.includes(keyword));
  const isBearish = bearishKeywords.some(keyword => 
    title.includes(keyword) || summary.includes(keyword));
  
  if (isBullish && coin.change24h > 0) correlation += 0.2;
  if (isBearish && coin.change24h < 0) correlation += 0.2;
  if (isBullish && coin.change24h < 0) correlation -= 0.1;
  if (isBearish && coin.change24h > 0) correlation -= 0.1;
  
  return Math.min(1, Math.max(-1, correlation));
}

function calculateMarketSummary(prices: any[]) {
  const totalMarketCap = prices.reduce((sum, coin) => sum + (coin.marketCap || 0), 0);
  const btc = prices.find(coin => coin.symbol === 'BTC');
  const btcDominance = btc ? (btc.marketCap / totalMarketCap) * 100 : 0;
  
  const positiveChanges = prices.filter(coin => coin.change24h > 0).length;
  const negativeChanges = prices.filter(coin => coin.change24h < 0).length;
  
  let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (positiveChanges > negativeChanges * 1.5) overallSentiment = 'bullish';
  else if (negativeChanges > positiveChanges * 1.5) overallSentiment = 'bearish';
  
  const majorMovers = prices
    .filter(coin => Math.abs(coin.change24h) > 5)
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
    .slice(0, 5)
    .map(coin => coin.symbol);
  
  return {
    overallSentiment,
    majorMovers,
    totalMarketCap,
    btcDominance: Math.round(btcDominance * 100) / 100
  };
}
