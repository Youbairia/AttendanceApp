import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, CheckCircle2, Clock, Users } from 'lucide-react';
import { apiGet, WS_URL } from '../api';

type Employee = {
  id: number;
  name: string;
  role: string;
  department: string;
  embedding_count: number;
};

type Attendance = {
  id: number;
  employee_id: number;
  name: string;
  status: string;
  detected_at: string;
  confidence: number | null;
};

type WatcherStatus = {
  running: boolean;
  pid: number | null;
  cameraSource: string;
};

const dayMs = 24 * 60 * 60 * 1000;

function isoDate(offset: number) {
  return new Date(Date.now() + offset * dayMs).toISOString().slice(0, 10);
}

function shortDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [today, setToday] = useState<Attendance[]>([]);
  const [week, setWeek] = useState<Attendance[]>([]);
  const [watcher, setWatcher] = useState<WatcherStatus | null>(null);

  async function load() {
    const from = isoDate(-6);
    const to = isoDate(0);
    const [employeeRows, todayRows, weekRows, watcherStatus] = await Promise.all([
      apiGet<Employee[]>('/api/employees'),
      apiGet<Attendance[]>('/api/attendance/today'),
      apiGet<Attendance[]>(`/api/attendance/report?from=${from}&to=${to}`),
      apiGet<WatcherStatus>('/api/attendance/watcher-status'),
    ]);
    setEmployees(employeeRows);
    setToday(todayRows);
    setWeek(weekRows);
    setWatcher(watcherStatus);
  }

  useEffect(() => {
    load();
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data);
      if (['ATTENDANCE_MARKED', 'ABSENT_MARKED', 'WATCHER_STARTED', 'WATCHER_STOPPED'].includes(event.event)) {
        load();
      }
    };
    return () => socket.close();
  }, []);

  const presentCount = today.filter((row) => row.status === 'PRESENT').length;
  const absentCount = today.filter((row) => row.status === 'ABSENT').length;
  const latest = today.slice(0, 5);

  const weeklyBars = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => isoDate(index - 6));
    const counts = days.map((date) => ({
      date,
      count: week.filter((row) => row.detected_at && row.detected_at.startsWith(date) && row.status === 'PRESENT').length,
    }));
    const max = Math.max(1, ...counts.map((item) => item.count));
    return counts.map((item) => ({ ...item, height: Math.max(8, Math.round((item.count / max) * 120)) }));
  }, [week]);

  return (
    <section className="page fadePage">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">System Overview</p>
          <h2>Dashboard</h2>
          <p>Real-time attendance monitoring and analytics at a glance.</p>
        </div>
      </header>

      <div className="metricGrid">
        <div className="metricCard stagger1">
          <span>Total Employees</span>
          <strong>{employees.length}</strong>
          <Users size={24} />
        </div>
        <div className="metricCard stagger2">
          <span>Present Today</span>
          <strong>{presentCount}</strong>
          <CheckCircle2 size={24} />
        </div>
        <div className="metricCard stagger3">
          <span>Absent Today</span>
          <strong>{absentCount}</strong>
          <CalendarDays size={24} />
        </div>
        <div className="metricCard stagger4">
          <span>Camera Status</span>
          <strong>{watcher?.running ? 'Live' : 'Idle'}</strong>
          <Activity size={24} />
        </div>
      </div>

      <div className="dashboardGrid">
        <div className="card">
          <div className="cardHeader">
            <div>
              <p className="eyebrow">Weekly Trend</p>
              <h3>Attendance by Day</h3>
            </div>
          </div>
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <div className="barChart">
              {weeklyBars.map((item) => (
                <div className="barItem" key={item.date}>
                  <div className="barTrack"><span style={{ height: item.height }} /></div>
                  <small>{shortDay(item.date)}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div>
              <p className="eyebrow">Live Activity</p>
              <h3>Recent Check-ins</h3>
            </div>
            <Clock size={20} />
          </div>
          <div className="feedList">
            {latest.map((row) => (
              <div className="feedItem" key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <span>{row.detected_at ? new Date(row.detected_at).toLocaleTimeString() : 'N/A'}</span>
                </div>
                <span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span>
              </div>
            ))}
            {!latest.length && <div className="emptyState">No attendance activity yet</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
