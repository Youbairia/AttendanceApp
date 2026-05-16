import { useEffect, useState } from 'react';
import { Camera, Play, RefreshCw, Square } from 'lucide-react';
import { apiGet, apiPost, WS_URL } from '../api';

type WatcherStatus = {
  running: boolean;
  pid: number | null;
  cameraSource: string;
};

export default function MarkAttendance() {
  const [status, setStatus] = useState<WatcherStatus | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function refreshStatus() {
    setStatus(await apiGet<WatcherStatus>('/api/attendance/watcher-status'));
  }

  async function start() {
    setBusy(true);
    await apiPost('/api/attendance/start-watcher');
    await refreshStatus();
    setBusy(false);
  }

  async function stop() {
    setBusy(true);
    await apiPost('/api/attendance/stop-watcher');
    await refreshStatus();
    setBusy(false);
  }

  useEffect(() => {
    refreshStatus();
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data);
      setEvents((current) => [message.data, ...current].slice(0, 10));
      if (event.event === 'WATCHER_STARTED' || event.event === 'WATCHER_STOPPED') {
        refreshStatus();
      }
    };
    return () => socket.close();
  }, []);

  return (
    <section className="page fadePage">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Check-in</p>
          <h2>Mark Your Attendance</h2>
          <p>Start the camera to automatically record your presence in the system.</p>
        </div>
        <div className="actions">
          <button disabled={busy || status?.running} onClick={start}><Play size={18} /> Start Camera</button>
          <button disabled={busy || !status?.running} className="secondary" onClick={stop}><Square size={18} /> Stop Camera</button>
          <button className="ghost" onClick={refreshStatus}><RefreshCw size={18} /> Refresh</button>
        </div>
      </header>

      <div className="statusGrid">
        <div className="metric">
          <strong>Camera Status</strong>
          <span className={status?.running ? 'goodText' : 'mutedText'}>
            {status?.running ? '🟢 Running' : '⚫ Stopped'}
          </span>
        </div>
        <div className="metric">
          <strong>Camera Source</strong>
          <span>{status?.cameraSource ?? 'Not configured'}</span>
        </div>
        <div className="metric">
          <strong>Process ID</strong>
          <span>{status?.pid ?? 'N/A'}</span>
        </div>
      </div>

      <div className="cameraPanel wide">
        <Camera size={52} />
        <h3>How to Check In</h3>
        <p>Click "Start Camera" above, then look directly at the lens. Your face will be automatically recognized and attendance recorded.</p>
      </div>

      {events.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className="cardHeader">
            <div>
              <p className="eyebrow">System Log</p>
              <h3>Recent Events</h3>
            </div>
          </div>
          <pre className="log" style={{ marginTop: 0 }}>{events.join('\n')}</pre>
        </div>
      )}
    </section>
  );
}
