import { useState } from 'react';
import type { FormEvent } from 'react';
import { Camera, Play } from 'lucide-react';
import { API_URL } from '../api';

export default function Register() {
  const [form, setForm] = useState({ name: '', role: '', department: '' });
  const [lines, setLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLines([]);

    try {
      const response = await fetch(`${API_URL}/api/employees/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (!response.body) {
        setLines([await response.text()]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';
        setLines((current) => [...current, ...parts.filter(Boolean)]);
      }

      if (buffer.trim()) {
        setLines((current) => [...current, buffer.trim()]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const offlineMessage = [
        'Registration failed: API server is not running or not reachable.',
        '',
        'Open Terminal and run:',
        'cd /Users/sajjadali/Desktop/frs-dev/face-attendance',
        'npm run api',
        '',
        'Then open this in your browser to check:',
        'http://localhost:3001/health',
        '',
        `Original error: ${message}`,
      ].join('\n');

      setLines([message === 'Failed to fetch' ? offlineMessage : `Registration failed: ${message}`]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page fadePage">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Enrollment</p>
          <h2>Register Employee</h2>
          <p>Add a new person to the system. Capture five face samples for secure facial recognition.</p>
        </div>
      </header>

      <div className="registerGrid">
        <form className="panel form" onSubmit={submit}>
          <label>Full Name<input required placeholder="Enter employee name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Role<input placeholder="e.g., Manager, Developer" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></label>
          <label>Department<input placeholder="e.g., Engineering, Sales" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <button disabled={busy} type="submit"><Play size={18} /> {busy ? 'Capturing Faces...' : 'Start Registration'}</button>
        </form>

        <div className="cameraPanel">
          <Camera size={48} />
          <h3>Face Capture</h3>
          <p>After clicking Start, position your face in the camera window. Press SPACE to capture each of 5 samples.</p>
        </div>
      </div>

      {lines.length > 0 && <pre className="log">{lines.join('\n')}</pre>}
    </section>
  );
}
