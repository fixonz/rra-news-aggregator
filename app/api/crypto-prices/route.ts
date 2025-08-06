// app/api/crypto-prices/route.ts
import { NextResponse } from "next/server"

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  priceHistory?: number[]; // Added for trend analysis
  lastUpdate: string;
  coinGeckoId: string; // Added for CoinGecko integration
}

interface PriceCacheEntry {
  timestamp: number;
  data: CryptoPrice[];
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
  market_cap: number;
  last_updated: string;
}

const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for more frequent updates
let priceCache: PriceCacheEntry | null = null;

// Top cryptocurrencies to monitor with their CoinGecko IDs
const MONITORED_COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'binancecoin', symbol: 'BNB' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'cardano', symbol: 'ADA' },
  { id: 'avalanche-2', symbol: 'AVAX' },
  { id: 'polkadot', symbol: 'DOT' },
  { id: 'chainlink', symbol: 'LINK' },
  { id: 'polygon', symbol: 'MATIC' },
  { id: 'uniswap', symbol: 'UNI' },
  { id: 'litecoin', symbol: 'LTC' },
  { id: 'dogecoin', symbol: 'DOGE' },
  { id: 'shiba-inu', symbol: 'SHIB' },
  { id: 'ripple', symbol: 'XRP' },
  { id: 'tron', symbol: 'TRX' }
];

export async function GET() {
  try {
    // Check cache
    if (priceCache && (Date.now() - priceCache.timestamp < PRICE_CACHE_DURATION)) {
      console.log("Returning cached crypto prices");
      return NextResponse.json({ 
        prices: priceCache.data,
        cached: true,
        cacheAge: Date.now() - priceCache.timestamp
      });
    }
    
    console.log("Fetching fresh crypto prices from CoinGecko");

    // Prepare coin IDs for batch request
    const coinIds = MONITORED_COINS.map(coin => coin.id).join(',');
    
    // Enhanced CoinGecko API call with more data points
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h,24h,7d`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoNewsAggregator/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data: CoinGeckoMarketData[] = await response.json();

    // Transform and enhance the data
    const prices: CryptoPrice[] = data.map((coin) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume || 0,
      marketCap: coin.market_cap || 0,
      lastUpdate: coin.last_updated,
      coinGeckoId: coin.id,
      // We'll add price history in a separate endpoint for performance
      priceHistory: []
    }));

    // Store in cache
    priceCache = {
      timestamp: Date.now(),
      data: prices,
    };

    console.log(`Successfully fetched ${prices.length} crypto prices`);

    return NextResponse.json({ 
      prices,
      cached: false,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("Error fetching crypto prices:", error);

    // Return cached data if available, even if expired
    if (priceCache) {
      console.log("Returning stale cached data due to API error");
      return NextResponse.json({
        prices: priceCache.data,
        cached: true,
        stale: true,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Fallback to mock data if no cache available
    return NextResponse.json(
      {
        prices: generateFallbackPrices(),
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: true
      },
      { status: 500 },
    );
  }
}

// Fallback prices in case of API failure
function generateFallbackPrices(): CryptoPrice[] {
  return MONITORED_COINS.map(coin => ({
    symbol: coin.symbol,
    name: coin.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    price: Math.random() * 50000, // Random price for demo
    change24h: (Math.random() - 0.5) * 10, // Random change
    volume24h: Math.random() * 1000000000,
    marketCap: Math.random() * 100000000000,
    lastUpdate: new Date().toISOString(),
    coinGeckoId: coin.id,
    priceHistory: []
  }));
}
