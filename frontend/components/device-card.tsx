// components/device-card.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Thermometer,
  Camera,
  Gauge,
  Power,
  Zap,
  Home,
  Activity,
} from "lucide-react";

interface DeviceState {
  topic?: string;
  payload?: any;
  updatedAt?: number;
}

interface DeviceCardProps {
  deviceKey: string; // key used by backend (room/deviceId or deviceId)
  room: string;
  deviceId: string;
  state?: DeviceState | null;
  onCommand: (command: any) => void; // page will attach room when sending REST
}

const getDeviceIcon = (deviceId: string, payload: any) => {
  const id = (deviceId || "").toLowerCase();

  if (id.includes("light") || id.includes("luce")) return <Lightbulb className="w-5 h-5" />;
  if (id.includes("temp") || id.includes("thermo")) return <Thermometer className="w-5 h-5" />;
  if (id.includes("camera")) return <Camera className="w-5 h-5" />;
  if (id.includes("meter") || id.includes("energy")) return <Gauge className="w-5 h-5" />;
  if (id.includes("sensor")) return <Activity className="w-5 h-5" />;
  if (id.includes("power") || id.includes("ac")) return <Power className="w-5 h-5" />;

  return <Home className="w-5 h-5" />;
};

const getDeviceColor = (payload: any) => {
  if (payload?.state === "on" || payload?.status === "active") {
    return "from-green-500/20 to-emerald-500/20 border-green-500/30";
  }
  if (payload?.state === "off" || payload?.status === "inactive") {
    return "from-gray-500/20 to-slate-500/20 border-gray-500/30";
  }
  return "from-primary/20 to-accent/20 border-primary/30";
};

export function DeviceCard({ deviceKey, room, deviceId, state, onCommand }: DeviceCardProps) {
  // defensive defaults
  const [isBusy, setIsBusy] = useState(false);
  const payload = state?.payload ?? {};
  const updatedAt = state?.updatedAt;

  // detect lights robustly even when payload is missing
  const isLight =
    deviceId.toLowerCase().includes("light") ||
    payload?.type === "light" ||
    (payload && (payload.state === "on" || payload.state === "off" || payload.brightness !== undefined));

  const isOn = payload?.state === "on" || payload?.on === true;

  const handleToggle = async () => {
    if (!isLight) return;
    setIsBusy(true);
    const cmd = { state: isOn ? "off" : "on" };
    try {
      await onCommand(cmd);
    } catch (e) {
      console.error("Toggle failed", e);
    } finally {
      setTimeout(() => setIsBusy(false), 400);
    }
  };

  const changeBrightness = async (delta: number) => {
    const current = Number(payload?.brightness || 0);
    const next = Math.max(0, Math.min(100, current + delta));
    setIsBusy(true);
    try {
      await onCommand({ brightness: next });
    } catch (e) {
      console.error("Brightness change failed", e);
    } finally {
      setTimeout(() => setIsBusy(false), 400);
    }
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "—";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return String(timestamp);
    }
  };

  const renderPayloadValue = (pl: any) => {
    if (!pl) return <div className="text-sm text-muted-foreground">No data yet</div>;

    if (typeof pl === "object") {
      if (pl.temperature !== undefined || pl.value !== undefined) {
        const val = pl.temperature ?? pl.value;
        return <div className="text-3xl font-bold text-foreground">{val}°C</div>;
      }
      if (pl.power !== undefined || pl.watts !== undefined) {
        const val = pl.power ?? pl.watts;
        return (
          <div>
            <div className="text-3xl font-bold text-foreground">{val}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Watts</div>
          </div>
        );
      }
      if (pl.brightness !== undefined) {
        return (
          <div>
            <div className="text-3xl font-bold text-foreground">{pl.brightness}%</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Brightness</div>
          </div>
        );
      }
      if (pl.state !== undefined) {
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${pl.state === "on" ? "bg-green-500" : "bg-gray-500"}`} />
            <span className="text-lg font-semibold capitalize">{pl.state}</span>
          </div>
        );
      }

      // Show a few keys for complex objects
      return (
        <div className="space-y-1">
          {Object.entries(pl)
            .slice(0, 4)
            .map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{k}:</span>
                <span className="text-foreground font-medium">{String(v)}</span>
              </div>
            ))}
        </div>
      );
    }

    return <div className="text-lg font-medium text-foreground">{String(pl)}</div>;
  };

  return (
    <div
      className={`glass-card rounded-2xl p-5 space-y-4 bg-gradient-to-br ${getDeviceColor(
        payload
      )} transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            {getDeviceIcon(deviceId, payload)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-balance">{deviceId}</h3>
            <p className="text-xs text-muted-foreground">Room: {room}</p>
            <p className="text-xs text-muted-foreground">{formatTime(updatedAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLight ? (
            <>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => changeBrightness(-10)} disabled={isBusy}>
                -
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleToggle} disabled={isBusy}>
                {isBusy ? <Zap className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => changeBrightness(10)} disabled={isBusy}>
                +
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onCommand({ ping: true })}>
              <Zap className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="py-2">{renderPayloadValue(payload)}</div>

      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Topic</span>
          <span className="text-foreground font-mono truncate max-w-[180px]" title={state?.topic ?? ""}>
            {state?.topic ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
