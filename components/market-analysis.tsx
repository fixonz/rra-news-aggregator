import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, MinusCircle } from "lucide-react";

interface MarketSummary {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  majorMovers: string[];
  totalMarketCap: number;
  btcDominance?: number;
  coinsUp?: number;
  coinsDown?: number;
  avgChange?: number;
}

const sentimentConfig = {
  bullish: {
    color: 'from-green-400 to-green-700',
    icon: <TrendingUp className="inline w-5 h-5 mr-1 animate-bounce text-green-300" />,
    label: 'BULLISH',
  },
  bearish: {
    color: 'from-red-400 to-red-700',
    icon: <TrendingDown className="inline w-5 h-5 mr-1 animate-bounce text-red-300" />,
    label: 'BEARISH',
  },
  neutral: {
    color: 'from-yellow-400 to-yellow-700',
    icon: <MinusCircle className="inline w-5 h-5 mr-1 text-yellow-300" />,
    label: 'NEUTRAL',
  },
};

export default function MarketAnalysis() {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/price-analysis");
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        // Calculate highlights
        let coinsUp = 0, coinsDown = 0, avgChange = 0;
        if (data.alerts && Array.isArray(data.alerts)) {
          const changes = data.alerts.map((a: any) => a.change24h).filter((v: any) => typeof v === 'number');
          coinsUp = changes.filter((v: number) => v > 0).length;
          coinsDown = changes.filter((v: number) => v < 0).length;
          avgChange = changes.length > 0 ? changes.reduce((a: number, b: number) => a + b, 0) / changes.length : 0;
        }
        setSummary({ ...data.marketSummary, coinsUp, coinsDown, avgChange });
      } catch (e: any) {
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, []);

  if (loading) return <div className="p-4 text-muted-foreground">Loading market analysis...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!summary) return <div className="p-4 text-muted-foreground">No market analysis available.</div>;

  const sentiment = sentimentConfig[summary.overallSentiment];

  return (
    <div className="w-full flex justify-center my-6">
      <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-md border border-zinc-700 rounded-2xl shadow-xl px-8 py-6 max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow">Market Analysis</span>
          <span className={`flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${sentiment.color} shadow-lg animate-pulse`}>{sentiment.icon}{sentiment.label}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-2">
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-200 mb-1">Total Market Cap</div>
            <div className="text-2xl font-bold text-amber-300 mb-2">${summary.totalMarketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            {summary.btcDominance !== undefined && (
              <div className="text-sm text-gray-400">BTC Dominance: <span className="font-semibold text-blue-300">{summary.btcDominance}%</span></div>
            )}
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-200 mb-1">Market Highlights</div>
            <div className="flex flex-col gap-1 text-sm text-gray-300">
              <div>
                <span className="font-bold text-green-400">{summary.coinsUp}</span> up, <span className="font-bold text-red-400">{summary.coinsDown}</span> down
              </div>
              <div>
                Avg 24h Change: <span className={summary.avgChange > 0 ? 'text-green-400' : summary.avgChange < 0 ? 'text-red-400' : 'text-yellow-300'}>{summary.avgChange?.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}