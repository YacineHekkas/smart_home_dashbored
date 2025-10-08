// backend/index.js
const express = require('express');
const http = require('http');
const mqtt = require('mqtt');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

const MQTT_HOST = process.env.MQTT_HOST || 'mosquitto';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_URL = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// In-memory device states (deviceId -> lastState)
const devices = {};

// Connect to MQTT
const client = mqtt.connect(MQTT_URL);

client.on('connect', () => {
  console.log('Connected to MQTT broker', MQTT_URL);
  client.subscribe('home/+/state', (err) => {
    if (err) console.error('Subscribe error', err);
    else console.log('Subscribed to home/+/state');
  });
});

client.on('message', (topic, message) => {
  try {
    const parts = topic.split('/');
    if (parts.length >= 3 && parts[0] === 'home' && parts[2] === 'state') {
      const deviceId = parts[1];
      let parsed;
      try { parsed = JSON.parse(message.toString()); } catch { parsed = message.toString(); }
      devices[deviceId] = { topic, payload: parsed, updatedAt: Date.now() };
      io.emit('device_update', { deviceId, state: devices[deviceId] });
      console.log(`[MQTT] state ${deviceId} =>`, devices[deviceId]);
    }
  } catch (e) {
    console.error('Error handling message', e);
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Mini Digital Twin backend — API available at /api/devices');
});

// List devices
app.get('/api/devices', (req, res) => {
  res.json(devices);
});

/**
 * Secure publish route:
 * - ensures we send exactly one HTTP response
 * - times out after 5s if MQTT callback never called
 */
app.post('/api/device/:id/command', (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const topic = `home/${id}/set`;
  const message = JSON.stringify(payload);

  console.log('[CMD] incoming', { id, payload });

  let responded = false;
  const safeJson = (obj, status = 200) => {
    if (responded || res.headersSent) return;
    responded = true;
    try {
      return res.status(status).json(obj);
    } catch (e) {
      console.error('[CMD] safeJson error', e);
    }
  };

  // publish with callback
  try {
    client.publish(topic, message, { qos: 0 }, (err) => {
      console.log('[CMD] publish callback', { id, err: err ? err.message : null });
      if (err) return safeJson({ error: err.message }, 500);
      return safeJson({ ok: true, topic, message });
    });
  } catch (e) {
    console.error('[CMD] publish threw', e);
    safeJson({ error: 'publish threw exception' }, 500);
  }

  // fallback timeout
  setTimeout(() => {
    if (!responded && !res.headersSent) {
      console.warn('[CMD] publish callback timeout, returning 202');
      safeJson({ ok: true, topic, message, note: 'timeout: mqtt callback not invoked' }, 202);
    }
  }, 5000);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  socket.emit('initial_devices', devices);

  socket.on('command', ({ deviceId, payload }) => {
    const topic = `home/${deviceId}/set`;
    const message = JSON.stringify(payload || {});
    client.publish(topic, message, { qos: 0 }, (err) => {
      if (err) socket.emit('command_result', { error: err.message });
      else socket.emit('command_result', { ok: true, topic, message });
    });
  });

  socket.on('disconnect', () => console.log('Socket disconnected', socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
