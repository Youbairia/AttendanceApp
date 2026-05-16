import { useEffect, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { apiGet, apiPost, WS_URL } from '../api';

type Attendance = {
  id: number;
  employee_id: number;
  name: string;
  status: string;
  detected_at: string;
  confidence: number | null;
};

export default function LiveAttendance() {
  const [rows, setRows] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<string[]>([]);

  async function refresh() {
    setRows(await apiGet<Attendance[]>('/api/attendance/today'));
  }

  useEffect(() => {
    refresh();
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data);
      setEvents((current) => [message.data, ...current].slice(0, 8));
      if (event.event === 'ATTENDANCE_MARKED' || event.event === 'ABSENT_MARKED') refresh();
    };
    return () => socket.close();
  }, []);

  return (
    <section className="page">
      <header className="pageHeader">
        <div>
          <h2>Live Attendance</h2>
          <p>Watch today's recognitions update as the Python watcher emits events.</p>
        </div>
        <div className="actions">
          <button onClick={() => apiPost('/api/attendance/start-watcher').then(refresh)}><Play size={18} /> Start</button>
          <button className="secondary" onClick={() => apiPost('/api/attendance/stop-watcher')}><Square size={18} /> Stop</button>
        </div>
      </header>

      <div className="panel">
        <table>
          <thead><tr><th>Name</th><th>Status</th><th>Time</th><th>Confidence</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
                <td>{row.detected_at ? new Date(row.detected_at).toLocaleTimeString() : '-'}</td>
                <td>{row.confidence == null ? '-' : `${row.confidence}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <pre className="log">{events.join('\n')}</pre>
    </section>
  );
}
