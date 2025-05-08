"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
}

interface PriceTickerProps {
  theme?: "amber" | "green" | "blue"
}

export default function PriceTicker({ theme = "amber" }: PriceTickerProps) {
  const [prices, setPrices] = useState<CryptoPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedFrom, setLastFetchedFrom] = useState<string>("") // For debugging

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true)
        // ALWAYS fetch from our backend API to leverage caching
        const response = await fetch("/api/crypto-prices")
        setLastFetchedFrom("/api/crypto-prices")

        if (!response.ok) {
          const errorData = await response.text() // Get more details on error
          console.error("Price API response not OK:", response.status, errorData)
          throw new Error(`Failed to fetch prices: ${response.status} - ${errorData}`)
        }

        const data = await response.json()
        if (data.error) { // Check if our API returned an error object
          throw new Error(`API Error: ${data.error}`)
        }

        setPrices(data.prices || [])
        setError(null)
      } catch (error) {
        console.error("Failed to fetch prices from /api/crypto-prices:", error)
        setError(error instanceof Error ? error.message : String(error))
        // No secondary fallback here, rely on the API's robustness or its own fallback if any
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
    // Refresh prices every 2 minutes
    const interval = setInterval(fetchPrices, 120000)

    return () => clearInterval(interval)
  }, [])

  // Get theme-based colors
  const getThemeTextColor = () => {
    switch (theme) {
      case "amber": return "text-amber-400"
      case "green": return "text-lime-400"
      case "blue": return "text-cyan-400"
      default: return "text-amber-400"
    }
  }

  const getThemeHighlightColor = () => {
    switch (theme) {
      case "amber": return "text-amber-200"
      case "green": return "text-lime-200"
      case "blue": return "text-cyan-200"
      default: return "text-amber-200"
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border-b border-gray-700 p-1 overflow-hidden font-mono text-amber-400">
        <div className="flex animate-pulse space-x-8">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="h-4 bg-gray-700/50 w-10 rounded-sm"></div>
              <div className="h-4 bg-gray-700/50 w-16 rounded-sm"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-black p-1 overflow-hidden border-b border-gray-800 font-mono ${getThemeTextColor()} ${error ? 'opacity-75' : 'opacity-100'} transition-opacity duration-300`}>
      {error && (
        <div className="absolute top-0 left-1 text-red-600 text-[10px] font-bold z-10" title={`Last fetch failed: ${error}`}>!</div>
      )}
      <div className="flex space-x-8 animate-[scroll_45s_linear_infinite]">
        {(prices.length > 0 ? prices : [{ symbol: "LDG", name: "Loading...", price: 0, change24h: 0}]).map((crypto) => {
          const changeAbs = Math.abs(crypto.change24h).toFixed(1)
          let changeColor = "text-gray-500"
          if (crypto.change24h > 0.01) changeColor = "text-green-500"
          if (crypto.change24h < -0.01) changeColor = "text-red-500"

          return (
            <div key={crypto.symbol} className="flex items-center space-x-2 whitespace-nowrap">
              <span className={`font-semibold text-xs ${getThemeHighlightColor()}`}>{crypto.symbol}</span>
              <span className={`text-xs ${getThemeTextColor()}`}>
                ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center text-xs ${changeColor}`}>
                {crypto.change24h > 0.01 && <ArrowUp className="w-3 h-3 mr-0.5" />}
                {crypto.change24h < -0.01 && <ArrowDown className="w-3 h-3 mr-0.5" />}
                {crypto.change24h === 0 && <span className="w-3 h-3 mr-0.5 text-center">–</span>}
                {changeAbs}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
