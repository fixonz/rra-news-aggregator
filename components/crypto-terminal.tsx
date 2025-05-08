"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import NewsFeed from "@/components/news-feed"
import PriceTicker from "@/components/price-ticker"
import WorldClock from "@/components/world-clock"
import { AlertTriangle, RefreshCw, Moon, Sun, Search, Filter, Settings, Bell } from "lucide-react"

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Debounce logic for search
  const searchDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle search input changes with debounce
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
    
    // Clear any existing timeout
    if (searchDebounceTimeoutRef.current) {
      clearTimeout(searchDebounceTimeoutRef.current);
    }
    
    // Set a new timeout to update filterTerm after 300ms of no typing
    searchDebounceTimeoutRef.current = setTimeout(() => {
      console.log(`Debounce complete, setting filter to: "${value}"`);
      
      // Only update if the value actually changed to reduce unnecessary re-renders
      if (filterTerm !== value) {
        setFilterTerm(value);
      }
    }, 300);
  }, [filterTerm]);
  
  // Clean up the timeout when component unmounts
  useEffect(() => {
    return () => {
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
      }
    };
  }, []);

  // Update time every second for local display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(new Date().toLocaleString())
    }, 1000)
    // Set initial time on client mount to avoid hydration mismatch
    setCurrentTimeDisplay(new Date().toLocaleString())
    return () => clearInterval(timer)
  }, [])

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        // Check Telegram API
        const telegramResponse = await fetch("/api/telegram-posts")
        const telegramData = telegramResponse.ok ? await telegramResponse.json() : null
        setApiStatus((prev) => ({
          ...prev,
          telegram: telegramResponse.ok ? (telegramData?.posts?.length > 0 ? "online" : "empty") : "error",
        }))

        // Check News API
        const newsResponse = await fetch("/api/rss-news")
        const newsData = newsResponse.ok ? await newsResponse.json() : null
        setApiStatus((prev) => ({
          ...prev,
          news: newsResponse.ok ? (newsData?.news?.length > 0 ? "online" : "empty") : "error",
        }))

        // Check Prices API
        const pricesResponse = await fetch("/api/crypto-prices")
        const pricesData = pricesResponse.ok ? await pricesResponse.json() : null
        setApiStatus((prev) => ({
          ...prev,
          prices: pricesResponse.ok ? (pricesData?.prices?.length > 0 ? "online" : "empty") : "error",
        }))

        // Set overall status
        const statuses = {
          telegram: telegramResponse.ok && telegramData?.posts?.length > 0,
          news: newsResponse.ok && newsData?.news?.length > 0,
          prices: pricesResponse.ok && pricesData?.prices?.length > 0,
        }

        if (Object.values(statuses).every((s) => s)) {
          setStatus("online")
        } else if (Object.values(statuses).some((s) => s)) {
          setStatus("partial")
        } else {
          setStatus("error")
        }
      } catch (error) {
        console.error("API status check failed:", error)
        setStatus("error")
      }
    }

    checkApiStatus()
    // Check status every 5 minutes
    const interval = setInterval(checkApiStatus, 300000)
    return () => clearInterval(interval)
  }, [])

  // Check for important news every 3 minutes
  useEffect(() => {
    const checkForImportantNews = async () => {
      try {
        const response = await fetch("/api/important-news")
        const data = await response.json()

        if (data.importantNews) {
          setImportantAlert(data.importantNews)

          // Clear alert after 30 seconds
          setTimeout(() => {
            setImportantAlert(null)
          }, 30000)
        }
      } catch (error) {
        console.error("Failed to fetch important news:", error)
      }
    }

    checkForImportantNews()
    const interval = setInterval(checkForImportantNews, 180000)

    return () => clearInterval(interval)
  }, [])

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(current => {
      if (current === "amber") return "green"
      if (current === "green") return "blue"
      return "amber"
    })
  }

  const handleRefresh = () => {
    setRefreshTrigger(count => count + 1)
    setIsRefreshing(true)
    console.log("Manual refresh triggered.")
    
    // Show refresh state for at least 1 second for visual feedback
    // But also add a timeout to ensure it stops even if refresh fails
    setTimeout(() => setIsRefreshing(false), 1000)
    
    // Add a maximum timeout in case the refresh takes too long
    setTimeout(() => {
      if (isRefreshing) {
        console.log("Refresh taking too long, resetting state")
        setIsRefreshing(false)
      }
    }, 10000) // 10 second failsafe
  }

  const handleSearchToggle = () => {
    setSearchVisible(!searchVisible)
    if (!searchVisible) {
      setTimeout(() => document.getElementById("search-input")?.focus(), 100)
    } else {
      // Clear both the immediate input and the debounced filter term
      setSearchInput("")
      setFilterTerm("")
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-500"
      case "mock":
        return "text-yellow-500"
      case "empty":
        return "text-yellow-500"
      case "error":
        return "text-red-500"
      case "checking":
        return "text-blue-500"
      default:
        return "text-gray-500"
    }
  }

  // Get theme-specific text color
  const getThemeTextColor = () => {
    switch (theme) {
      case "amber": return "text-amber-400"
      case "green": return "text-lime-400"
      case "blue": return "text-cyan-400"
    }
  }

  const getThemeAccentColor = () => {
    switch (theme) {
      case "amber": return "text-amber-200"
      case "green": return "text-lime-300"
      case "blue": return "text-cyan-300"
    }
  }

  const themeClasses = {
    main: getThemeTextColor(),
    accent: getThemeAccentColor(),
    border: theme === "amber" ? "border-amber-900" : theme === "green" ? "border-lime-900" : "border-cyan-900",
    header: theme === "amber" ? "text-amber-200" : theme === "green" ? "text-lime-300" : "text-cyan-300",
    button: theme === "amber" ? "hover:bg-amber-900/50" : theme === "green" ? "hover:bg-lime-900/50" : "hover:bg-cyan-900/50",
  }

  // Add this to debug search term changes
  useEffect(() => {
    console.log(`[CryptoTerminal] Filter term changed: "${filterTerm}"`);
  }, [filterTerm]);

  return (
    <div className={`flex flex-col h-full bg-black ${themeClasses.main} border border-gray-800 font-mono`}>
      <div className="flex-none bg-black border-b border-gray-800 p-1 flex justify-between items-center">
        <div className={`text-xs ${themeClasses.accent} flex items-center`}>
          <img src="/placeholder-logo.png" alt="RRA NEWS logo" className="h-7 w-auto mr-2" />
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`ml-2 p-0.5 hover:bg-gray-700 rounded focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.accent}`}
            title="Refresh Feed"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="ml-2">| STATUS:</span>
          <span
            className={
              status === "online"
                ? "text-green-500"
                : status === "partial"
                  ? "text-yellow-500"
                  : status === "error"
                    ? "text-red-500"
                    : "text-blue-500"
            }
          >
            {" "}
            {status.toUpperCase()}
          </span>
          {" | "}
          <span className={getStatusColor(apiStatus.telegram)}>TG</span>
          {" | "}
          <span className={getStatusColor(apiStatus.news)}>NEWS</span>
          {" | "}
          <span className={getStatusColor(apiStatus.prices)}>PRICE</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <button 
              onClick={handleSearchToggle} 
              className={`p-1 rounded ${themeClasses.button} focus:outline-none`}
              title="Search"
            >
              <Search className="w-3 h-3" />
            </button>
            <button 
              onClick={toggleTheme} 
              className={`p-1 rounded ${themeClasses.button} focus:outline-none`}
              title={`Switch theme (Current: ${theme})`}
            >
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
            <button 
              onClick={() => {
                setSearchInput("")
                setFilterTerm("")
              }}
              className="text-gray-500 hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="flex-none">
        <PriceTicker theme={theme} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-full overflow-y-auto border-l border-gray-800">
          <NewsFeed filterTerm={filterTerm} refreshTrigger={refreshTrigger} theme={theme} />
        </div>
      </div>
    </div>
  )
}
