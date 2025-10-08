// frontend/src/App.js
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default function App() {
  const [devices, setDevices] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    axios.get(`${BACKEND}/api/devices`).then(res => setDevices(res.data)).catch(()=>{});
    const socket = io(BACKEND);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('initial_devices', (d) => setDevices(d));
    socket.on('device_update', ({ deviceId, state }) => {
      setDevices(prev => ({ ...prev, [deviceId]: state }));
    });
    return () => socket.disconnect();
  }, []);

  const sendToggle = (id) => {
    axios.post(`${BACKEND}/api/device/${id}/command`, { command: 'toggle' }).catch(()=>{});
  };

  return (
    <div style={{ padding: 16, fontFamily: 'Arial' }}>
      <h1>Mini Digital Twin — Dashboard</h1>
      <p>Backend socket: {connected ? 'connected' : 'disconnected'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {Object.keys(devices).length === 0 && <div>Aucun device détecté — lance le simulateur</div>}
        {Object.entries(devices).map(([id, st]) => (
          <div key={id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
            <h3>{id}</h3>
            <pre style={{ whiteSpace:'pre-wrap' }}>{JSON.stringify(st.payload, null, 2)}</pre>
            <div>Dernière MAJ: {st.updatedAt ? new Date(st.updatedAt).toLocaleTimeString() : '-'}</div>
            <button onClick={() => sendToggle(id)} style={{ marginTop: 8 }}>Envoyer commande</button>
          </div>
        ))}
      </div>
    </div>
  );
}
