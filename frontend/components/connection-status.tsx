interface ConnectionStatusProps {
  connected: boolean
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        {connected && <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">Backend Connection</p>
        <p className="text-xs text-muted-foreground">
          {connected ? "Connected and receiving updates" : "Disconnected - attempting to reconnect"}
        </p>
      </div>
    </div>
  )
}
