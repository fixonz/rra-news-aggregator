'use client'

import PriceAlerts from "@/components/price-alerts"
import { useEffect, useState, useCallback, useRef } from "react"
import NewsFeed from "@/components/news-feed"
import PriceTicker from "@/components/price-ticker"
import WorldClock from "@/components/world-clock"
import { AlertTriangle, RefreshCw, Moon, Sun, Search, Settings } from "lucide-react"
import MarketAnalysis from "@/components/market-analysis"

export default function CryptoTerminal() {
  const [importantAlert, setImportantAlert] = useState<string | null>(null)
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>("")
  const [status, setStatus] = useState<"online" | "partial" | "error" | "connecting">("connecting")
  const [apiStatus, setApiStatus] = useState({
    telegram: "checking",
    news: "checking",
    prices: "checking",
  })
  const [searchInput, setSearchInput] = useState("")
  const [filterTerm, setFilterTerm] = useState("")
  const [searchVisible, setSearchVisible] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [theme, setTheme] = useState<"amber" | "green" | "blue">("amber")

  const searchDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchDebounceTimeoutRef.current) clearTimeout(searchDebounceTimeoutRef.current)
    searchDebounceTimeoutRef.current = setTimeout(() => {
      if (filterTerm !== value) setFilterTerm(value)
    }, 300)
  }, [filterTerm])

  useEffect(() => () => {
    if (searchDebounceTimeoutRef.current) clearTimeout(searchDebounceTimeoutRef.current)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeDisplay(new Date().toLocaleString()), 1000)
    setCurrentTimeDisplay(new Date().toLocaleString())
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const [telegramRes, newsRes, pricesRes] = await Promise.all([
          fetch("/api/telegram-posts"),
          fetch("/api/rss-news"),
          fetch("/api/crypto-prices"),
        ])

        const telegramData = telegramRes.ok ? await telegramRes.json() : null
        const newsData = newsRes.ok ? await newsRes.json() : null
        const pricesData = pricesRes.ok ? await pricesRes.json() : null

        setApiStatus({
          telegram: telegramRes.ok ? (telegramData?.posts?.length > 0 ? "online" : "empty") : "error",
          news: newsRes.ok ? (newsData?.news?.length > 0 ? "online" : "empty") : "error",
          prices: pricesRes.ok ? (pricesData?.prices?.length > 0 ? "online" : "empty") : "error",
        })

        const statuses = [
          telegramRes.ok && telegramData?.posts?.length > 0,
          newsRes.ok && newsData?.news?.length > 0,
          pricesRes.ok && pricesData?.prices?.length > 0,
        ]

        if (statuses.every(Boolean)) setStatus("online")
        else if (statuses.some(Boolean)) setStatus("partial")
        else setStatus("error")
      } catch {
        setStatus("error")
      }
    }

    checkApiStatus()
    const interval = setInterval(checkApiStatus, 300000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const checkImportantNews = async () => {
      try {
        const res = await fetch("/api/important-news")
        const data = await res.json()
        if (data.importantNews) {
          setImportantAlert(data.importantNews)
          setTimeout(() => setImportantAlert(null), 30000)
        }
      } catch {}
    }

    checkImportantNews()
    const interval = setInterval(checkImportantNews, 180000)
    return () => clearInterval(interval)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => prev === "amber" ? "green" : prev === "green" ? "blue" : "amber")
  }

  const handleRefresh = () => {
    setRefreshTrigger(c => c + 1)
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
    setTimeout(() => {
      if (isRefreshing) setIsRefreshing(false)
    }, 10000)
  }

  const handleSearchToggle = () => {
    setSearchVisible(!searchVisible)
    if (!searchVisible) setTimeout(() => document.getElementById("search-input")?.focus(), 100)
    else {
      setSearchInput("")
      setFilterTerm("")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-500"
      case "mock":
      case "empty": return "text-yellow-500"
      case "error": return "text-red-500"
      case "checking": return "text-blue-500"
      default: return "text-gray-500"
    }
  }

  const getThemeTextColor = () =>
    theme === "amber" ? "text-amber-400" : theme === "green" ? "text-lime-400" : "text-cyan-400"

  const getThemeAccentColor = () =>
    theme === "amber" ? "text-amber-200" : theme === "green" ? "text-lime-300" : "text-cyan-300"

  const themeClasses = {
    main: getThemeTextColor(),
    accent: getThemeAccentColor(),
    border: theme === "amber" ? "border-amber-900" : theme === "green" ? "border-lime-900" : "border-cyan-900",
    header: theme === "amber" ? "text-amber-200" : theme === "green" ? "text-lime-300" : "text-cyan-300",
    button: theme === "amber" ? "hover:bg-amber-900/50" : theme === "green" ? "hover:bg-lime-900/50" : "hover:bg-cyan-900/50",
  }

  return (
    <div className={`flex flex-col h-full bg-black ${themeClasses.main} border border-gray-800 font-mono`}>
      <div className="flex-none bg-black border-b border-gray-800 p-1 flex justify-between items-center">
        <div className={`text-xs ${themeClasses.accent} flex items-center`}>
          <img src="/placeholder-logo.png" alt="RRA NEWS logo" className="h-7 w-auto mr-2" />
          <button onClick={handleRefresh} disabled={isRefreshing}
            className={`ml-2 p-0.5 hover:bg-gray-700 rounded focus:outline-none disabled:opacity-50 ${themeClasses.accent}`}>
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="ml-2">| STATUS:</span>
          <span className={`ml-1 ${getStatusColor(status)}`}>{status.toUpperCase()}</span>
          <span className="ml-2">{["TG", "NEWS", "PRICE"].map((label, i) => (
            <span key={label} className={`ml-1 ${getStatusColor(Object.values(apiStatus)[i])}`}>{label}</span>
          ))}</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <button onClick={handleSearchToggle} className={`p-1 rounded ${themeClasses.button}`}>
              <Search className="w-3 h-3" />
            </button>
            <button onClick={toggleTheme} className={`p-1 rounded ${themeClasses.button}`}>
              {theme === "amber" ? <Moon className="w-3 h-3" /> : theme === "green" ? <Sun className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
            </button>
          </div>
          <WorldClock theme={theme} />
          <div className={`text-xs ${themeClasses.accent}`}>{currentTimeDisplay}</div>
        </div>
      </div>

      {importantAlert && (
        <div className="bg-red-700 text-white p-1 flex items-center justify-center text-xs border-b border-red-500">
          <AlertTriangle className="mr-2 h-3 w-3 flex-shrink-0" />
          <span className="font-semibold truncate">{importantAlert}</span>
        </div>
      )}

      {searchVisible && (
        <div className="flex-none p-1 border-b border-gray-800 flex items-center">
          <Search className={`w-3 h-3 mr-2 ${themeClasses.accent}`} />
          <input
            id="search-input"
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="Search news and feeds..."
            className="bg-transparent border-none outline-none text-xs flex-1"
          />
          {searchInput && (
            <button onClick={() => {
              setSearchInput("")
              setFilterTerm("")
            }} className="text-gray-500 hover:text-gray-300">
              ×
            </button>
          )}
        </div>
      )}

      <div className="flex-none">
        <PriceTicker theme={theme} />
      </div>

      {/* ✅ Added PriceAlerts here */}
      <div className="flex-none border-t border-b border-gray-800">
        <PriceAlerts />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full overflow-y-auto border-l border-gray-800">
          <MarketAnalysis />
          <NewsFeed filterTerm={filterTerm} refreshTrigger={refreshTrigger} theme={theme} />
        </div>
      </div>
    </div>
  )
}
