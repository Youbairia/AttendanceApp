import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiGet, WS_URL } from '../api';

type Attendance = {
  id: number;
  employee_id: number;
  name: string;
  role: string;
  department: string;
  status: string;
  detected_at: string;
  confidence: number | null;
};

export default function TodaysAttendance() {
  const [rows, setRows] = useState<Attendance[]>([]);

  async function refresh() {
    setRows(await apiGet<Attendance[]>('/api/attendance/today'));
  }

  useEffect(() => {
    refresh();
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data);
      if (event.event === 'ATTENDANCE_MARKED' || event.event === 'ABSENT_MARKED') refresh();
    };
    return () => socket.close();
  }, []);

  return (
    <section className="page fadePage">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Real-time</p>
          <h2>Today&apos;s Attendance</h2>
          <p>Live view of all employees marked present or absent today.</p>
        </div>
        <button className="secondary" onClick={refresh}><RefreshCw size={18} /> Refresh</button>
      </header>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Status</th>
              <th>Time</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.name}</strong></td>
                <td>{row.department || '—'}</td>
                <td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
                <td>{row.detected_at ? new Date(row.detected_at).toLocaleTimeString() : '—'}</td>
                <td>{row.confidence == null ? '—' : `${Math.round(row.confidence)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="emptyState">No attendance records yet. Start the camera to record presence.</div>}
      </div>
    </section>
  );
}
