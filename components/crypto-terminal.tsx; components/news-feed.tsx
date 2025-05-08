"use client";

import { useEffect, useState } from "react";
import NewsFeed from "@/components/news-feed";
import PriceTicker from "@/components/price-ticker";
import WorldClock from "@/components/world-clock";
import CommandInput from "@/components/command-input";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function CryptoTerminal() {
  const [importantAlert, setImportantAlert] = useState<string | null>(null);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>("");
  const [status, setStatus] = useState<"online" | "partial" | "error" | "connecting">("connecting");
  const [apiStatus, setApiStatus] = useState({
    telegram: "checking",
    news: "checking",
    prices: "checking",
  });
  const [filterTerm, setFilterTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(new Date().toLocaleString());
    }, 1000);
    setCurrentTimeDisplay(new Date().toLocaleString()); 
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const telegramResponse = await fetch("/api/telegram-posts");
        const telegramData = telegramResponse.ok ? await telegramResponse.json() : null;
        setApiStatus((prev) => ({ ...prev, telegram: telegramResponse.ok ? (telegramData?.posts?.length > 0 ? "online" : "empty") : "error" }));
        const newsResponse = await fetch("/api/rss-news");
        const newsData = newsResponse.ok ? await newsResponse.json() : null;
        setApiStatus((prev) => ({ ...prev, news: newsResponse.ok ? (newsData?.news?.length > 0 ? "online" : "empty") : "error" }));
        const pricesResponse = await fetch("/api/crypto-prices");
        const pricesData = pricesResponse.ok ? await pricesResponse.json() : null;
        setApiStatus((prev) => ({ ...prev, prices: pricesResponse.ok ? (pricesData?.prices?.length > 0 ? "online" : "empty") : "error" }));

        const statuses = { 
          telegram: telegramResponse.ok && telegramData?.posts?.length > 0, 
          news: newsResponse.ok && newsData?.news?.length > 0, 
          prices: pricesResponse.ok && pricesData?.prices?.length > 0 
        };
        if (Object.values(statuses).every((s) => s)) setStatus("online");
        else if (Object.values(statuses).some((s) => s)) setStatus("partial");
        else setStatus("error");
      } catch (error) {
        console.error("API status check failed:", error);
        setStatus("error");
      }
    };
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkForImportantNews = async () => {
      try {
        const response = await fetch("/api/important-news");
        const data = await response.json();
        if (data.importantNews) {
          setImportantAlert(data.importantNews);
          setTimeout(() => { setImportantAlert(null); }, 30000);
        }
      } catch (error) {
        console.error("Failed to fetch important news:", error);
      }
    };
    checkForImportantNews();
    const interval = setInterval(checkForImportantNews, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger(count => count + 1);
    console.log("Manual refresh triggered.");
  };

  const getStatusColor = (status: string) => {
      switch (status) {
          case "online": return "text-green-500";
          case "mock": return "text-yellow-500";
          case "empty": return "text-yellow-500";
          case "error": return "text-red-500";
          case "checking": return "text-blue-500";
          default: return "text-gray-500";
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
          <span
            className={ status === "online" ? "text-green-500" : status === "partial" ? "text-yellow-500" : status === "error" ? "text-red-500" : "text-blue-500" }
          >{" "}{status.toUpperCase()}</span>
          {" | "}<span className={getStatusColor(apiStatus.telegram)}>TG</span>
          {" | "}<span className={getStatusColor(apiStatus.news)}>NEWS</span>
          {" | "}<span className={getStatusColor(apiStatus.prices)}>PRICE</span>
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