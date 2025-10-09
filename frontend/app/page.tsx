"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DeviceCard } from "@/components/device-card"
import { ConnectionStatus } from "@/components/connection-status"
import { io, type Socket } from "socket.io-client"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

interface DeviceState {
  topic: string
  payload: any
  updatedAt: number
}

interface Devices {
  [key: string]: DeviceState
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Devices>({})
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // Fetch initial devices
    fetch(`${BACKEND}/api/devices`)
      .then((res) => res.json())
      .then((data) => setDevices(data))
      .catch((err) => console.error("Failed to fetch devices:", err))

    // Setup Socket.IO connection
    const socketInstance = io(BACKEND)

    socketInstance.on("connect", () => {
      console.log("Connected to backend")
      setConnected(true)
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from backend")
      setConnected(false)
    })

    socketInstance.on("initial_devices", (data: Devices) => {
      setDevices(data)
    })

    socketInstance.on("device_update", ({ deviceId, state }: { deviceId: string; state: DeviceState }) => {
      setDevices((prev) => ({ ...prev, [deviceId]: state }))
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const handleDeviceCommand = async (deviceId: string, command: any) => {
    try {
      await fetch(`${BACKEND}/api/device/${deviceId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      })
    } catch (err) {
      console.error("Failed to send command:", err)
    }
  }

  const deviceEntries = Object.entries(devices)

  return (
    <div className="min-h-screen relative">
      <div className="wave-bg" />

      <div className="relative z-10">
        <DashboardHeader />

        <main className="container mx-auto px-4 py-6 space-y-8">
          <ConnectionStatus connected={connected} />

          {deviceEntries.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground">No Devices Detected</h3>
                <p className="text-muted-foreground">
                  Start your device simulator to see connected devices appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {deviceEntries.map(([id, state]) => (
                <DeviceCard
                  key={id}
                  deviceId={id}
                  state={state}
                  onCommand={(command) => handleDeviceCommand(id, command)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
