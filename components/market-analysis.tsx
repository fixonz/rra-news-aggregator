import React, { useEffect, useState } from "react";

interface MarketSummary {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  majorMovers: string[];
  totalMarketCap: number;
  btcDominance?: number;
}

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
        setSummary(data.marketSummary);
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

  return (
    <div className="p-4 bg-zinc-900 rounded-lg shadow border border-zinc-700 max-w-xl mx-auto my-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg font-bold">Market Analysis</span>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          summary.overallSentiment === 'bullish' ? 'bg-green-900 text-green-300' :
          summary.overallSentiment === 'bearish' ? 'bg-red-900 text-red-300' :
          'bg-yellow-900 text-yellow-300'
        }`}>
          {summary.overallSentiment.toUpperCase()}
        </span>
      </div>
      <div className="mb-2 text-sm text-gray-300">
        <span className="font-semibold">Total Market Cap:</span> ${summary.totalMarketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      {summary.btcDominance !== undefined && (
        <div className="mb-2 text-sm text-gray-300">
          <span className="font-semibold">BTC Dominance:</span> {summary.btcDominance}%
        </div>
      )}
      <div className="mb-2 text-sm text-gray-300">
        <span className="font-semibold">Top Movers:</span> {summary.majorMovers && summary.majorMovers.length > 0 ? summary.majorMovers.join(", ") : 'N/A'}
      </div>
    </div>
  );
}