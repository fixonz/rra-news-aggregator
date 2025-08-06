import React, { useEffect, useRef, useState } from "react";

// Top coins to monitor (CoinGecko IDs)
const TOP_COINS = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "dogecoin",
  "ripple",
  "cardano",
  "avalanche-2",
  "tron",
  "shiba-inu"
];

function getMoodColor(avgChange: number) {
  if (avgChange > 2) return "#22c55e"; // green
  if (avgChange > 0.5) return "#a3e635"; // lime
  if (avgChange > -0.5) return "#facc15"; // yellow
  if (avgChange > -2) return "#f87171"; // orange
  return "#ef4444"; // red
}

export default function MarketMoodDashboard() {
  const [prices, setPrices] = useState<Record<string, { price: number; change24h: number; history: Array<{ t: number; p: number }> }>>({});
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [volatility, setVolatility] = useState(0);
  const [avgChange, setAvgChange] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Subscribe to MCP for live prices
  useEffect(() => {
    const endpoint = "https://mcp.api.coingecko.com/sse";
    const es = new window.EventSource(endpoint);
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "price_update" && TOP_COINS.includes(data.id)) {
          setPrices(prev => {
            const prevHistory = prev[data.id]?.history || [];
            const newHistory = [...prevHistory, { t: Date.now(), p: data.current_price }].slice(-30);
            return {
              ...prev,
              [data.id]: {
                price: data.current_price,
                change24h: data.price_change_percentage_24h || 0,
                history: newHistory
              }
            };
          });
        }
      } catch {}
    };
    return () => { es.close(); };
  }, []);

  // Calculate volatility and average change
  useEffect(() => {
    const allChanges = Object.values(prices).map(c => c.change24h);
    if (allChanges.length > 0) {
      setAvgChange(allChanges.reduce((a, b) => a + b, 0) / allChanges.length);
      // Volatility: stddev of 24h change
      const mean = allChanges.reduce((a, b) => a + b, 0) / allChanges.length;
      const variance = allChanges.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allChanges.length;
      setVolatility(Math.sqrt(variance));
    }
  }, [prices]);

  // Rotate spotlight
  useEffect(() => {
    const interval = setInterval(() => {
      setSpotlightIdx(i => (i + 1) % TOP_COINS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const spotlightCoin = TOP_COINS[spotlightIdx];
  const spotlight = prices[spotlightCoin];
  const moodColor = getMoodColor(avgChange);
  const pulseRate = Math.max(0.5, Math.min(2, volatility / 2));

  return (
    <div className="w-full flex flex-col items-center justify-center py-8">
      {/* Mood Ring/Bar */}
      <div className="relative flex flex-col items-center mb-6">
        <div
          className="rounded-full shadow-lg"
          style={{
            width: 120,
            height: 120,
            background: `radial-gradient(circle at 60% 40%, ${moodColor} 60%, #18181b 100%)`,
            boxShadow: `0 0 40px 10px ${moodColor}80`,
            animation: `pulse ${1 / pulseRate}s infinite alternate`
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: moodColor }}>
              {avgChange > 1 ? "Bullish" : avgChange < -1 ? "Bearish" : "Neutral"}
            </span>
            <span className="text-xs text-gray-300 mt-1">Avg 24h Change: {avgChange.toFixed(2)}%</span>
            <span className="text-xs text-gray-400">Volatility: {volatility.toFixed(2)}%</span>
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0% { box-shadow: 0 0 40px 10px ${moodColor}80; }
            100% { box-shadow: 0 0 80px 20px ${moodColor}cc; }
          }
        `}</style>
      </div>
      {/* Trending Coin Spotlight */}
      <div className="w-full max-w-md bg-zinc-900 rounded-lg shadow-lg p-6 flex flex-col items-center mb-4 border border-zinc-700">
        <div className="text-lg font-semibold mb-2">Trending Coin Spotlight</div>
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold" style={{ color: moodColor }}>{spotlightCoin.toUpperCase()}</span>
          {spotlight && (
            <>
              <span className={`text-lg ${spotlight.change24h > 0 ? "text-green-400" : spotlight.change24h < 0 ? "text-red-400" : "text-gray-300"}`}>
                {spotlight.price?.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
              <span className={`text-sm ${spotlight.change24h > 0 ? "text-green-400" : spotlight.change24h < 0 ? "text-red-400" : "text-gray-300"}`}>
                {spotlight.change24h > 0 ? "+" : ""}{spotlight.change24h?.toFixed(2)}%
              </span>
            </>
          )}
        </div>
        {/* Sparkline */}
        {spotlight && (
          <svg width="180" height="40" className="mt-2">
            <polyline
              fill="none"
              stroke={moodColor}
              strokeWidth="2"
              points={spotlight.history.map((h, i) => `${i * 6},${40 - ((h.p - Math.min(...spotlight.history.map(hh => hh.p))) / (Math.max(...spotlight.history.map(hh => hh.p)) - Math.min(...spotlight.history.map(hh => hh.p)) + 0.0001)) * 36}`).join(" ")}
            />
          </svg>
        )}
      </div>
      {/* Powered by CoinGecko MCP */}
      <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
        <span>Powered by</span>
        <a href="https://www.coingecko.com/en/api" target="_blank" rel="noopener noreferrer" className="font-bold text-amber-400 underline">CoinGecko MCP</a>
      </div>
    </div>
  );
}