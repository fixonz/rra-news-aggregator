// components/price-alerts.tsx
"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, AlertTriangle, Volume2, Target, Clock } from "lucide-react"

interface PriceAlert {
  symbol: string
  coinId: string
  alertType: 'spike' | 'drop' | 'volume' | 'target' | 'time'
  triggered: boolean
  value: number
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

  useEffect(() => {
    // Simulated fetch of alert data
    const fetchAlerts = async () => {
     

    fetchAlerts()
  }, [])

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
                {alert.triggered ? "Triggered" : "Waiting"} · Value: {alert.value}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
