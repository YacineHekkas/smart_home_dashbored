"use client"

import { useState, useEffect } from "react"

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="border-b border-border/50 backdrop-blur-sm bg-card/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-balance bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Your Smart home 
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time device monitoring and control</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-xs text-muted-foreground">{currentTime.toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
