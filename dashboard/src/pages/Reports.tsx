import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { apiGet } from '../api';

type RecordRow = {
  id: number;
  name: string;
  role: string;
  department: string;
  date: string;
  status: string;
  detected_at: string;
  confidence: number | null;
};

const today = new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<RecordRow[]>([]);

  const counts = useMemo(() => {
    const map = new Map<string, { present: number; absent: number }>();
    for (const row of rows) {
      const item = map.get(row.name) || { present: 0, absent: 0 };
      if (row.status === 'PRESENT') item.present += 1;
      if (row.status === 'ABSENT') item.absent += 1;
      map.set(row.name, item);
    }
    return [...map.entries()];
  }, [rows]);

  async function load() {
    setRows(await apiGet<RecordRow[]>(`/api/attendance/report?from=${from}&to=${to}`));
  }

  function exportCsv() {
    const header = ['Name', 'Role', 'Department', 'Date', 'Status', 'Detected At', 'Confidence'];
    const csv = [header, ...rows.map((r) => [r.name, r.role, r.department, r.date, r.status, r.detected_at, r.confidence ?? ''])]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="page fadePage">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Analytics</p>
          <h2>Attendance Reports</h2>
          <p>Review historical attendance data and export records for analysis.</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', alignItems: 'end', marginBottom: 'var(--spacing-lg)' }}>
          <label>
            <strong>From Date</strong>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <strong>To Date</strong>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <button onClick={load}><Search size={18} /> Generate Report</button>
            <button className="secondary" onClick={exportCsv}><Download size={18} /> Export CSV</button>
          </div>
        </div>
      </div>

      {counts.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <p className="eyebrow">Summary</p>
          <div className="summary">
            {counts.map(([name, count]) => (
              <div className="metric" key={name}>
                <strong>{name}</strong>
                <span>
                  <span style={{ color: 'var(--success)' }}>✓ {count.present}</span>
                  {' • '}
                  <span style={{ color: 'var(--danger)' }}>✗ {count.absent}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Status</th>
              <th>Detected Time</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.name}</strong></td>
                <td>{row.date}</td>
                <td><span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
                <td>{row.detected_at ? new Date(row.detected_at).toLocaleTimeString() : '—'}</td>
                <td>{row.confidence == null ? '—' : `${Math.round(row.confidence)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="emptyState">Select a date range and click "Generate Report" to view attendance history.</div>}
      </div>
    </section>
  );
}
