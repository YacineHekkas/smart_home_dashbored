"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Lightbulb, Thermometer, Camera, Gauge, Power, Zap, Home, Activity } from "lucide-react"

interface DeviceState {
  topic: string
  payload: any
  updatedAt: number
}

interface DeviceCardProps {
  deviceId: string
  state: DeviceState
  onCommand: (command: any) => void
}

const getDeviceIcon = (deviceId: string, payload: any) => {
  const id = deviceId.toLowerCase()

  if (id.includes("light") || id.includes("luce")) {
    return <Lightbulb className="w-5 h-5" />
  }
  if (id.includes("temp") || id.includes("thermo")) {
    return <Thermometer className="w-5 h-5" />
  }
  if (id.includes("camera")) {
    return <Camera className="w-5 h-5" />
  }
  if (id.includes("meter") || id.includes("energy")) {
    return <Gauge className="w-5 h-5" />
  }
  if (id.includes("sensor")) {
    return <Activity className="w-5 h-5" />
  }
  if (id.includes("power") || id.includes("ac")) {
    return <Power className="w-5 h-5" />
  }

  return <Home className="w-5 h-5" />
}

const getDeviceColor = (deviceId: string, payload: any) => {
  if (payload?.state === "on" || payload?.status === "active") {
    return "from-green-500/20 to-emerald-500/20 border-green-500/30"
  }
  if (payload?.state === "off" || payload?.status === "inactive") {
    return "from-gray-500/20 to-slate-500/20 border-gray-500/30"
  }
  return "from-primary/20 to-accent/20 border-primary/30"
}

export function DeviceCard({ deviceId, state, onCommand }: DeviceCardProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    await onCommand({ command: "toggle" })
    setTimeout(() => setIsToggling(false), 500)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleTimeString()
  }

  const renderPayloadValue = (payload: any) => {
    if (typeof payload === "object" && payload !== null) {
      // Extract key metrics
      if (payload.temperature !== undefined) {
        return <div className="text-3xl font-bold text-foreground">{payload.temperature}°C</div>
      }
      if (payload.power !== undefined || payload.watts !== undefined) {
        const value = payload.power || payload.watts
        return (
          <div>
            <div className="text-3xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Watts</div>
          </div>
        )
      }
      if (payload.brightness !== undefined) {
        return (
          <div>
            <div className="text-3xl font-bold text-foreground">{payload.brightness}%</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Brightness</div>
          </div>
        )
      }
      if (payload.state !== undefined) {
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${payload.state === "on" ? "bg-green-500" : "bg-gray-500"}`} />
            <span className="text-lg font-semibold capitalize">{payload.state}</span>
          </div>
        )
      }

      // Show all properties for complex objects
      return (
        <div className="space-y-1">
          {Object.entries(payload)
            .slice(0, 3)
            .map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{key}:</span>
                <span className="text-foreground font-medium">{String(value)}</span>
              </div>
            ))}
        </div>
      )
    }

    return <div className="text-lg font-medium text-foreground">{String(payload)}</div>
  }

  return (
    <div
      className={`glass-card rounded-2xl p-5 space-y-4 bg-gradient-to-br ${getDeviceColor(deviceId, state.payload)} transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            {getDeviceIcon(deviceId, state.payload)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-balance">{deviceId}</h3>
            <p className="text-xs text-muted-foreground">{formatTime(state.updatedAt)}</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-primary/20"
          onClick={handleToggle}
          disabled={isToggling}
        >
          <Zap className={`w-4 h-4 ${isToggling ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="py-2">{renderPayloadValue(state.payload)}</div>

      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Topic</span>
          <span className="text-foreground font-mono truncate max-w-[180px]" title={state.topic}>
            {state.topic}
          </span>
        </div>
      </div>
    </div>
  )
}
