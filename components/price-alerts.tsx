"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, AlertTriangle, Volume2, Target, Clock } from "lucide-react"
import * as mcp from "mcp-remote" // Install with: npm install mcp-remote

interface PriceAlert {
  symbol: string
  coinId: string
  alertType: 'spike' | 'drop' | 'volume' | 'target' | 'time'
  triggered: boolean
  value: number
  impactPercentage?: number
}

const iconMap = {
  spike: <TrendingUp className="text-green-500" />,
  drop: <TrendingDown className="text-red-500" />,
  volume: <Volume2 className="text-yellow-500" />,
  target: <Target className="text-blue-500" />,
  time: <Clock className="text-purple-500" />,
}

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true)
      setError(null)
      try {
        // Load mcp_config.json (adjust path based on location)
        const response = await fetch("/config/mcp_config.json") // Use relative path or import
        const config = await response.json()
        const mcpEndpoint = config.mcp.endpoint || "https://mcp.api.coingecko.com/sse"

        // Initialize MCP client with config
        const client = new mcp.Client({ endpoint: mcpEndpoint })
        await client.connect()

        // Listen for price updates
        client.on("price_update", (data) => {
          const { id, symbol, current_price, market_cap, volume_24h } = data
          const previousAlerts = alerts || []
          const existingAlert = previousAlerts.find(a => a.coinId === id)

          // Calculate impact percentage
          const baselinePrice = existingAlert?.value || current_price
          const impact = ((current_price - baselinePrice) / baselinePrice) * 100

          // Define alert conditions
          const newAlerts = previousAlerts.filter(a => a.coinId !== id)
          if (impact > 5) {
            newAlerts.push({
              symbol,
              coinId: id,
              alertType: "spike",
              triggered: true,
              value: current_price,
              impactPercentage: Math.round(impact)
            })
          } else if (impact < -5) {
            newAlerts.push({
              symbol,
              coinId: id,
              alertType: "drop",
              triggered: true,
              value: current_price,
              impactPercentage: Math.round(impact)
            })
          } else {
            newAlerts.push({
              symbol,
              coinId: id,
              alertType: existingAlert?.alertType || "spike",
              triggered: false,
              value: current_price,
              impactPercentage: Math.round(impact)
            })
          }
          setAlerts(newAlerts)
        })

        client.on("error", (err) => {
          setError(`MCP Error: ${err.message}`)
        })

        // Cleanup on unmount
        return () => {
          client.disconnect()
        }
      } catch (err) {
        setError(`Error initializing MCP: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  if (loading) return <div className="p-4 text-muted-foreground">Loading alerts...</div>
  if (error) return <div className="p-4 text-red-500">{error}</div>

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Price Alerts</h2>
      {alerts.length === 0 && (
        <p className="text-muted-foreground">No alerts available.</p>
      )}
      <ul className="space-y-2">
        {alerts.map((alert, idx) => (
          <li key={idx} className="flex items-center space-x-3 p-3 border rounded-md shadow-sm">
            {iconMap[alert.alertType]}
            <div>
              <div className="font-medium">{alert.symbol} - {alert.alertType.toUpperCase()}</div>
              <div className="text-sm text-muted-foreground">
                {alert.triggered ? "Triggered" : "Waiting"} · Value: {alert.value} · Impact: {alert.impactPercentage !== undefined ? `${alert.impactPercentage}%` : 'N/A'}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
