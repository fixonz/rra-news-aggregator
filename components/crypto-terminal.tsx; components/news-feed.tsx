"use client";

import { useEffect, useState } from "react";
import NewsFeed from "@/components/news-feed";
import PriceTicker from "@/components/price-ticker";
import WorldClock from "@/components/world-clock";
import CommandInput from "@/components/command-input";
import { AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Target } from "lucide-react";

interface PriceAlert {
  symbol: string;
  coinId: string;
  alertType: "spike" | "drop" | "target";
  message: string;
  timestamp: string;
}

export default function CryptoTerminal() {
  const [importantAlert, setImportantAlert] = useState<string | null>(null);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>("");
  const [status, setStatus] = useState<"online" | "partial" | "error" | "connecting">("connecting");
  const [apiStatus, setApiStatus] = useState({
    telegram: "checking",
    news: "checking",
    prices: "checking",
    analysis: "checking",
  });
  const [filterTerm, setFilterTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const telegramRes = await fetch("/api/telegram-posts");
        const telegram = telegramRes.ok ? await telegramRes.json() : null;

        const newsRes = await fetch("/api/rss-news");
        const news = newsRes.ok ? await newsRes.json() : null;

        const pricesRes = await fetch("/api/crypto-prices");
        const prices = pricesRes.ok ? await pricesRes.json() : null;

        const analysisRes = await fetch("/api/price-analysis");
        const analysis = analysisRes.ok ? await analysisRes.json() : null;

        setApiStatus({
          telegram: telegramRes.ok ? (telegram?.posts?.length > 0 ? "online" : "empty") : "error",
          news: newsRes.ok ? (news?.news?.length > 0 ? "online" : "empty") : "error",
          prices: pricesRes.ok ? (prices?.prices?.length > 0 ? "online" : "empty") : "error",
          analysis: analysisRes.ok ? (analysis?.alerts?.length > 0 ? "online" : "empty") : "error",
        });

        const statuses = [telegram?.posts?.length, news?.news?.length, prices?.prices?.length, analysis?.alerts?.length];
        if (statuses.every(Boolean)) setStatus("online");
        else if (statuses.some(Boolean)) setStatus("partial");
        else setStatus("error");
      } catch (err) {
        console.error("API status check failed:", err);
        setStatus("error");
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchImportantNews = async () => {
      try {
        const res = await fetch("/api/important-news");
        const data = await res.json();
        if (data.importantNews) {
          setImportantAlert(data.importantNews);
          setTimeout(() => setImportantAlert(null), 30000);
        }
      } catch (err) {
        console.error("Failed to fetch important news:", err);
      }
    };

    fetchImportantNews();
    const interval = setInterval(fetchImportantNews, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPriceAlerts = async () => {
      try {
        const res = await fetch("/api/price-analysis");
        const data = await res.json();
        if (data.alerts) {
          setPriceAlerts(data.alerts.slice(0, 3)); // Show top 3 alerts
        }
      } catch (err) {
        console.error("Failed to fetch price alerts:", err);
      }
    };

    fetchPriceAlerts();
    const interval = setInterval(fetchPriceAlerts, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger((c) => c + 1);
    console.log("Manual refresh triggered.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-500";
      case "empty":
      case "mock": return "text-yellow-500";
      case "error": return "text-red-500";
      case "checking": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  const getAlertIcon = (type: PriceAlert["alertType"]) => {
    switch (type) {
      case "spike": return <TrendingUp className="w-4 h-4 mr-1" />;
      case "drop": return <TrendingDown className="w-4 h-4 mr-1" />;
      case "target": return <Target className="w-4 h-4 mr-1" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-500 border border-green-900 font-mono">
      <div className="flex-none bg-black border-b border-green-900 p-1 flex justify-between items-center">
        <div className="text-xs text-amber-200 flex items-center">
          <button 
            onClick={handleRefresh}
            className="mr-2 p-0.5 text-cyan-400 hover:bg-gray-700 rounded focus:outline-none"
            title="Refresh Feed"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <span>CRYPTO TERMINAL v1.1 | STATUS:</span>
          <span className={getStatusColor(status)}>{" "}{status.toUpperCase()}</span>
          {" | "}<span className={getStatusColor(apiStatus.telegram)}>TG</span>
          {" | "}<span className={getStatusColor(apiStatus.news)}>NEWS</span>
          {" | "}<span className={getStatusColor(apiStatus.prices)}>PRICE</span>
          {" | "}<span className={getStatusColor(apiStatus.analysis)}>ALERTS</span>
        </div>
        <div className="flex items-center space-x-3">
          <WorldClock />
          <div className="text-xs text-amber-200">{currentTimeDisplay}</div>
        </div>
      </div>

      {importantAlert && (
        <div className="bg-red-900 text-red-100 p-1 animate-pulse flex items-center justify-center text-sm border-b border-red-700">
          <AlertTriangle className="mr-2 h-4 w-4" />
          <span className="font-bold">{importantAlert}</span>
        </div>
      )}

      {priceAlerts.length > 0 && (
        <div className="bg-gray-900 text-yellow-300 p-1 border-b border-yellow-800 text-sm">
          {priceAlerts.map((alert, i) => (
            <div key={i} className="flex items-center justify-center gap-2">
              {getAlertIcon(alert.alertType)}
              <span className="font-bold">{alert.symbol.toUpperCase()}</span> - {alert.message}
              <span className="text-xs text-gray-400 ml-2">({new Date(alert.timestamp).toLocaleTimeString()})</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-none">
        <PriceTicker />
      </div>

      <div className="flex-none">
        <CommandInput onFilterChange={setFilterTerm} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full overflow-y-auto border-l border-gray-700">
          <NewsFeed filterTerm={filterTerm} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
