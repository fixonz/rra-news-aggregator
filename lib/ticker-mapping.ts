// Utility for extracting tickers and mapping to CoinGecko IDs

// Static mapping of symbols/names to CoinGecko IDs and full names
export const TICKER_MAP: Record<string, { id: string; symbol: string; name: string }> = {
  BTC: { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  ETH: { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  BNB: { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  SOL: { id: 'solana', symbol: 'SOL', name: 'Solana' },
  ADA: { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  AVAX: { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  DOT: { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  LINK: { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  MATIC: { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  UNI: { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
  LTC: { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  DOGE: { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  SHIB: { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
  XRP: { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  TRX: { id: 'tron', symbol: 'TRX', name: 'Tron' },
};

// Lowercase name to symbol mapping for extraction
const NAME_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  binance: 'BNB',
  solana: 'SOL',
  cardano: 'ADA',
  avalanche: 'AVAX',
  polkadot: 'DOT',
  chainlink: 'LINK',
  polygon: 'MATIC',
  uniswap: 'UNI',
  litecoin: 'LTC',
  dogecoin: 'DOGE',
  shiba: 'SHIB',
  ripple: 'XRP',
  tron: 'TRX',
};

// Extract tickers from text, returning array of { symbol, id, name }
export function extractTickers(text: string): Array<{ symbol: string; id: string; name: string }> {
  const found: Record<string, boolean> = {};
  const lowerText = text.toLowerCase();
  const results: Array<{ symbol: string; id: string; name: string }> = [];

  // Check for symbol mentions
  Object.keys(TICKER_MAP).forEach((symbol) => {
    if (
      lowerText.includes(symbol.toLowerCase()) ||
      lowerText.includes('$' + symbol.toLowerCase())
    ) {
      if (!found[symbol]) {
        results.push(TICKER_MAP[symbol]);
        found[symbol] = true;
      }
    }
  });

  // Check for name mentions
  Object.entries(NAME_TO_SYMBOL).forEach(([name, symbol]) => {
    if (lowerText.includes(name) && !found[symbol]) {
      results.push(TICKER_MAP[symbol]);
      found[symbol] = true;
    }
  });

  return results;
}

// In-memory cache for historical prices: { [key: string]: { price: number, timestamp: number } }
const historicalPriceCache: Record<string, { price: number, timestamp: number }> = {};

/**
 * Fetch historical price for a coin at a specific timestamp (in seconds).
 * @param coinGeckoId CoinGecko coin ID
 * @param timestamp Unix timestamp (seconds)
 * @returns price in USD or null if not found
 */
export async function fetchHistoricalPrice(coinGeckoId: string, timestamp: number): Promise<number | null> {
  const cacheKey = `${coinGeckoId}_${timestamp}`;
  if (historicalPriceCache[cacheKey]) {
    return historicalPriceCache[cacheKey].price;
  }
  // CoinGecko expects timestamps in seconds
  const from = timestamp - 60; // 1 min before
  const to = timestamp + 60;   // 1 min after
  const url = `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // data.prices is an array of [timestamp(ms), price]
    if (!data.prices || !Array.isArray(data.prices)) return null;
    // Find the price closest to the requested timestamp
    let closest = data.prices[0];
    let minDiff = Math.abs(timestamp * 1000 - closest[0]);
    for (const [t, p] of data.prices) {
      const diff = Math.abs(timestamp * 1000 - t);
      if (diff < minDiff) {
        closest = [t, p];
        minDiff = diff;
      }
    }
    if (closest) {
      historicalPriceCache[cacheKey] = { price: closest[1], timestamp };
      return closest[1];
    }
    return null;
  } catch (e) {
    return null;
  }
}