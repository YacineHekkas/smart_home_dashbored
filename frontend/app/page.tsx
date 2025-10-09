"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DeviceCard } from "@/components/device-card";
import { ConnectionStatus } from "@/components/connection-status";
import { io, type Socket } from "socket.io-client";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

interface DeviceState {
  topic: string;
  payload: any;
  updatedAt: number;
}

interface DevicesMap {
  [key: string]: DeviceState;
}

type DeviceEntry = {
  key: string; // might be "room/deviceId" or "deviceId" depending on backend
  room: string;
  deviceId: string;
  state: DeviceState;
};

export default function Dashboard() {
  const [devices, setDevices] = useState<DevicesMap>({});
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("All");

  useEffect(() => {
    // initial HTTP fetch
    fetch(`${BACKEND}/api/devices`)
      .then((res) => res.json())
      .then((data) => setDevices(data))
      .catch((err) => console.error("Failed to fetch devices:", err));

    // setup socket
    const s = io(BACKEND, { transports: ["websocket", "polling"] });

    s.on("connect", () => {
      setConnected(true);
      console.log("socket connected", s.id);
    });
    s.on("disconnect", () => {
      setConnected(false);
      console.log("socket disconnected");
    });

    // handle both old and new payload formats
    s.on("initial_devices", (data: DevicesMap) => {
      setDevices(data || {});
    });

    s.on(
      "device_update",
      (payload: any) => {
        // payload may be { deviceId, state } (old) or { key, data } (new)
        if (payload == null) return;
        if (payload.key && payload.data) {
          const key = payload.key;
          setDevices((prev) => ({ ...prev, [key]: payload.data }));
          return;
        }
        if (payload.deviceId && payload.state) {
          // old format: deviceId as simple key
          setDevices((prev) => ({ ...prev, [payload.deviceId]: payload.state }));
          return;
        }
        // unknown shape — try to guess
        try {
          const k = Object.keys(payload)[0];
          if (k) setDevices((prev) => ({ ...prev, [k]: payload[k] }));
        } catch {}
      }
    );

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  // Helper: parse a map entry key and/or topic into { room, deviceId }
  const parseKeyAndTopic = (key: string, state: DeviceState): { room: string; deviceId: string } => {
    // If key contains '/', it's 'room/deviceId'
    if (key.includes("/")) {
      const [room, deviceId] = key.split("/");
      return { room, deviceId };
    }
    // Else try parse from topic: expected formats:
    // home/<room>/<deviceId>/state  OR  home/<deviceId>/state
    const topic = state?.topic || "";
    const parts = topic.split("/");
    if (parts.length >= 4 && parts[0] === "home" && parts[3] === "state") {
      return { room: parts[1], deviceId: parts[2] };
    }
    if (parts.length >= 3 && parts[0] === "home" && parts[2] === "state") {
      // legacy: no room -> use 'unknown' room
      return { room: "unknown", deviceId: parts[1] };
    }
    // fallback: room unknown, deviceId = key
    return { room: "unknown", deviceId: key };
  };

  // Convert devices map to array of DeviceEntry with parsed room/deviceId
  const deviceEntries: DeviceEntry[] = useMemo(() => {
    return Object.entries(devices).map(([key, state]) => {
      const parsed = parseKeyAndTopic(key, state);
      return { key, room: parsed.room, deviceId: parsed.deviceId, state };
    });
  }, [devices]);

  // build set of rooms (include requested rooms in a fixed order)
  const staticRooms = ["room1", "room2", "eating", "bathroom"];
  const discoveredRooms = Array.from(new Set(deviceEntries.map((d) => d.room))).filter((r) => r && !staticRooms.includes(r));
  const allRooms = Array.from(new Set(["All", ...staticRooms, ...discoveredRooms]));

  // Filtered list according to selectedRoom
  const filteredEntries = useMemo(() => {
    if (selectedRoom === "All") return deviceEntries;
    return deviceEntries.filter((d) => d.room === selectedRoom);
  }, [deviceEntries, selectedRoom]);

  // Send command via backend REST API (includes room to disambiguate)
  const handleDeviceCommand = async (deviceKey: string, command: any) => {
    // parse the key
    let room = "unknown";
    let deviceId = deviceKey;
    if (deviceKey.includes("/")) {
      const [r, id] = deviceKey.split("/");
      room = r;
      deviceId = id;
    } else {
      // attempt to find matching entry
      const found = deviceEntries.find((e) => e.key === deviceKey);
      if (found) {
        room = found.room || "unknown";
        deviceId = found.deviceId;
      } else {
        // try to parse from devices map using topic
        const entry = Object.entries(devices).find(([k, v]) => k === deviceKey || v.topic?.includes(deviceKey));
        if (entry) {
          const parsed = parseKeyAndTopic(entry[0], entry[1]);
          room = parsed.room;
          deviceId = parsed.deviceId;
        }
      }
    }

    // backend expects body with room if ambiguous, so include it
    const body = { ...command, room };
    try {
      await fetch(`${BACKEND}/api/device/${deviceId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("Failed to send command:", err);
      // fallback: try socket command
      if (socket) socket.emit("command", { deviceId, room, payload: command });
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="wave-bg" />

      <div className="relative z-10">
        <DashboardHeader />

        <main className="container mx-auto px-4 py-6 space-y-8">
          <ConnectionStatus connected={connected} />

          <div className="flex items-center gap-3 flex-wrap">
            {allRooms.map((room) => (
              <button
                key={room}
                onClick={() => setSelectedRoom(room)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedRoom === room ? "bg-primary text-primary-foreground" : "bg-card/20 text-muted-foreground"
                }`}
              >
                {room}
              </button>
            ))}
          </div>

          {filteredEntries.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground">No Devices Detected</h3>
                <p className="text-muted-foreground">Start your device simulator to see connected devices appear here</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEntries.map((entry) => (
                <DeviceCard
                  key={entry.key}
                  deviceKey={entry.key}
                  room={entry.room}
                  deviceId={entry.deviceId}
                  state={entry.state}
                  onCommand={(cmd) => handleDeviceCommand(entry.key, cmd)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
