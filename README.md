
# Smart Home monitor 

**A modern, containerized IoT monitor for prototyping home automation** — real-time MQTT device monitoring, room-based grouping, device control (turn lights on/off, adjust brightness), and a simulated device environment for development.

---

![Dashboard screenshot 1](https://github.com/user-attachments/assets/29b195ab-2aa6-4399-9efd-eb77dc1f1b27)
![Dashboard screenshot 2](https://github.com/user-attachments/assets/3db50523-3eb9-4120-8728-4796d51cf701)

---

## Table of contents

* [Project overview](#project-overview)
* [What I built / key work done](#what-i-built--key-work-done)
* [Architecture & components](#architecture--components)
* [Features](#features)
* [MQTT topic & payload design](#mqtt-topic--payload-design)
* [Quick start (local)](#quick-start-local)
* [Backend API & Socket events](#backend-api--socket-events)
* [Sensor simulator](#sensor-simulator)
* [Frontend notes & UI behaviors](#frontend-notes--ui-behaviors)
* [Common commands / examples](#common-commands--examples)
* [Troubleshooting](#troubleshooting)
* [Future improvements](#future-improvements)
* [Contributing & license](#contributing--license)

---

## Project overview

This repository implements a Mini Digital Twin / Smart Home Dashboard that demonstrates how IoT devices can be simulated, monitored, and controlled in real time. The system is fully containerized using Docker Compose and uses MQTT as the device communication protocol. The frontend is a modern React/Next UI with glassmorphism styling and animated background. The backend bridges MQTT → WebSocket and exposes a small REST API for device commands.

This project is ideal for learning IoT messaging patterns, building prototypes for home automation, or as a foundation for adding hardware devices later.

---

## What I built / key work done

* Designed and implemented a backend that subscribes to MQTT topics, keeps an **in-memory registry** of devices, and broadcasts real-time updates to the frontend using Socket.IO.
* Implemented a **room-aware topic structure** (`home/<room>/<deviceId>/state`) and backward compatibility for `home/<deviceId>/state`.
* Built a frontend dashboard (Next.js + Tailwind) that:

  * automatically discovers devices,
  * groups & filters devices by room (`room1`, `room2`, `eating`, `bathroom`, etc.),
  * renders device-specific cards (temperature, gas/CO, light, energy),
  * provides controls to **turn lights on/off** and change brightness.
* Created an improved **sensor simulator** that publishes per-room sensor data and listens to `home/+/+/set` to react to UI commands (so toggles in the UI update the simulator).
* Polished UI: lighter purple glassmorphic theme, animated floating background blobs, responsive grid layout and robust error handling to avoid crashes when messages arrive asynchronously.


---

## Architecture & components
<img width="1964" height="3194" alt="image" src="https://github.com/user-attachments/assets/8c995546-ee13-4345-8f85-249751885035" />

```

```

Containers (provided in `docker-compose.yml`):

* `mosquitto` — MQTT broker (ports 1883, 9001)
* `backend` — Node.js service bridging MQTT and Socket.IO (port 4000)
* `frontend` — React / Next frontend (port 3000)
* `sensor_sim` — Python publisher emulator (publishes sensor messages & responds to set topics)

---

## Features

* Real-time device discovery and updates via Socket.IO.
* Room-aware grouping and filtering (preset: `room1`, `room2`, `eating`, `bathroom`).
* Device cards that automatically render appropriate metrics (temperature, brightness, CO, power).
* Actionable controls for lights: toggle ON/OFF and +/- brightness.
* Simulator that publishes sensors (temperature, gas/CO, light state) for every room and listens to `set` topics.
* Backwards compatibility with legacy `home/<deviceId>/state` topics.
* Glassmorphic, lighter purple animated UI with accessible layout.

---

## MQTT topic & payload design

**Topic patterns**

* State (device → broker):
  `home/<room>/<deviceId>/state`
  (legacy) `home/<deviceId>/state`
* Commands (backend/UI → device):
  `home/<room>/<deviceId>/set`
  (legacy) `home/<deviceId>/set`

**Example state payloads**

* Temperature sensor (`temp1`):

```json
{
  "type": "temperature",
  "value": 23.5,
  "ts": 1690000000
}
```

* Gas/CO sensor (`gas1`):

```json
{
  "type": "gas_co",
  "co_ppm": 2.1,
  "gas_leak": false,
  "ts": 1690000000
}
```

* Smart light (`light1`):

```json
{
  "type": "light",
  "state": "on",
  "brightness": 80,
  "ts": 1690000000
}
```

**Example set/command payloads**

* Toggle light ON:

```json
{ "state": "on" }
```

* Set brightness to 60:

```json
{ "brightness": 60 }
```

---

## Quick start (local)

**Requirements:** Docker & Docker Compose.

1. Clone the repo:

```bash
git clone https://github.com/YacineHekkas/smart_home_dashbored.git
cd smart_home_dashbored
```

2. Build and run containers:

```bash
docker-compose up --build
```

3. Open the frontend:

* [http://localhost:3000](http://localhost:3000) (or the port configured in your compose)

4. The frontend will auto-discover devices published by `sensor_sim`. Use the room filter buttons to view devices per room. Use the light controls on each card to toggle or change brightness.

---

## Backend API & Socket events

**REST endpoints**

* `GET /api/devices`
  Returns the current in-memory `devices` map (keys are `room/deviceId` or legacy `deviceId`).

* `POST /api/device/:id/command`
  Body: any JSON. Recommended: include `room` property to disambiguate if a deviceId exists in multiple rooms:

```json
{ "room": "eating", "state": "on" }
```

This publishes to `home/<room>/<id>/set` (or legacy fallback).

**Socket.IO events**

* Server → Client:

  * `initial_devices` — object with all discovered devices
  * `device_update` — sent when a device publishes new state (payload shapes supported: legacy `{ deviceId, state }` or enhanced `{ key, data }`)
* Client → Server:

  * `command` — `{ deviceId, room, payload }` — server will publish that payload to the correct `home/<room>/<deviceId>/set` topic

---

## Sensor simulator

The provided `sensor_sim/publisher.py`:

* Publishes simulated devices for these rooms: `room1`, `room2`, `eating`, `bathroom`.
* Devices per room:

  * `temp1` — temperature sensor (publishes `value` or `temperature`)
  * `gas1` — gas/CO sensor (publishes `co_ppm` and `gas_leak`)
  * `light1` — light device (`state` = `'on'|'off'`, `brightness`)
* Listens to `home/+/+/set` and applies commands (so when a light command is published, the simulator updates its internal state and re-publishes the state to `home/<room>/<deviceId>/state`). This provides immediate UI feedback in the dashboard.

---

## Frontend notes & UI behaviors

* Built with Next.js (App Router) + Tailwind CSS.
* Uses Socket.IO client to receive `initial_devices` and `device_update`.
* Dashboard groups devices by room; room filter buttons include `All`, default rooms (`room1`, `room2`, `eating`, `bathroom`) and any discovered rooms.
* Device card logic:

  * Attempts to infer device type (light, temp, camera, energy, sensor) from `deviceId` or payload.
  * Light controls send `{state: 'on'|'off'}` and `{brightness: N}` commands via `POST /api/device/:id/command` (frontend includes `room` to disambiguate).
* Robust guards are implemented to avoid runtime crashes when messages arrive out-of-order.

---

## Common commands / examples

* Turn `light1` in `eating` room ON via curl:

```bash
curl -X POST http://localhost:4000/api/device/light1/command \
  -H "Content-Type: application/json" \
  -d '{"room":"eating","state":"on"}'
```

* Toggle via Socket.IO (client-side):

```js
socket.emit('command', { deviceId: 'light1', room: 'eating', payload: { state: 'on' } });
```

* Publish a manual MQTT temperature update (for testing):

```bash
mosquitto_pub -h localhost -p 1883 -t "home/room1/temp1/state" -m '{"type":"temperature","value":24.2,"ts":1690000000}'
```

---

## Contributing

Contributions welcome. Suggested process:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/new-device-type`
3. Make changes and add tests if needed.
4. Open a PR describing the change and testing steps.

---

## License

This project is provided under the **MIT License** — feel free to reuse and adapt for personal or research projects. Add a `LICENSE` file with MIT text if you want it included.

---

