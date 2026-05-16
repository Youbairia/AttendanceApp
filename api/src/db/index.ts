import Database from 'better-sqlite3';
import { config, DB_PATH } from '../config';

export type EmployeeInput = {
  name: string;
  role?: string;
  department?: string;
};

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function getBusinessDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.appTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS face_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      embedding TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'PRESENT',
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confidence REAL,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS app_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_employees_department
      ON employees(department);

    CREATE INDEX IF NOT EXISTS idx_embeddings_employee
      ON face_embeddings(employee_id);

    CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
      ON attendance_logs(employee_id, date);

    CREATE INDEX IF NOT EXISTS idx_attendance_date_status
      ON attendance_logs(date, status);

    CREATE INDEX IF NOT EXISTS idx_events_created_at
      ON app_events(created_at);
  `);
}

export function logEvent(type: string, message?: string, payload?: unknown) {
  db.prepare(`
    INSERT INTO app_events (type, message, payload)
    VALUES (?, ?, ?)
  `).run(type, message || null, payload ? JSON.stringify(payload) : null);
}

export function getEmployees() {
  return db.prepare(`
    SELECT e.*, COUNT(fe.id) AS embedding_count
    FROM employees e
    LEFT JOIN face_embeddings fe ON fe.employee_id = e.id
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `).all();
}

export function getTodayAttendance() {
  const today = getBusinessDate();
  return db.prepare(`
    SELECT al.*, e.name, e.role, e.department
    FROM attendance_logs al
    JOIN employees e ON e.id = al.employee_id
    WHERE al.date = ?
    ORDER BY al.detected_at DESC
  `).all(today);
}

export function getAttendanceReport(from: string, to: string) {
  return db.prepare(`
    SELECT al.*, e.name, e.role, e.department
    FROM attendance_logs al
    JOIN employees e ON e.id = al.employee_id
    WHERE al.date BETWEEN ? AND ?
    ORDER BY al.date DESC, e.name ASC
  `).all(from, to);
}

export function markPresent(employeeId: number, confidence: number | null, detectedAt?: string) {
  const today = getBusinessDate();
  const timestamp = detectedAt || new Date().toISOString();
  const existing = db.prepare(`
    SELECT id
    FROM attendance_logs
    WHERE employee_id = ? AND date = ?
    LIMIT 1
  `).get(employeeId, today) as { id: number } | undefined;

  if (existing) {
    return { inserted: false, id: existing.id, date: today };
  }

  const result = db.prepare(`
    INSERT INTO attendance_logs (employee_id, date, status, detected_at, confidence)
    VALUES (?, ?, 'PRESENT', ?, ?)
  `).run(employeeId, today, timestamp, confidence);

  const payload = { inserted: true, id: Number(result.lastInsertRowid), date: today };
  logEvent('ATTENDANCE_MARKED_API', `Employee ${employeeId} marked present`, {
    employeeId,
    confidence,
    detectedAt: timestamp,
    ...payload,
  });
  return payload;
}

export function getAttendanceSummary(from: string, to: string) {
  return db.prepare(`
    SELECT
      e.id AS employee_id,
      e.name,
      e.role,
      e.department,
      SUM(CASE WHEN al.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
      SUM(CASE WHEN al.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
      COUNT(al.id) AS total_logs
    FROM employees e
    LEFT JOIN attendance_logs al
      ON al.employee_id = e.id AND al.date BETWEEN ? AND ?
    GROUP BY e.id
    ORDER BY e.name ASC
  `).all(from, to);
}

export function markAbsentForToday() {
  const today = getBusinessDate();
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO attendance_logs (employee_id, date, status, detected_at, confidence)
    SELECT e.id, ?, 'ABSENT', ?, NULL
    FROM employees e
    WHERE NOT EXISTS (
      SELECT 1
      FROM attendance_logs al
      WHERE al.employee_id = e.id AND al.date = ?
    )
  `).run(today, now, today);

  const payload = { date: today, marked: result.changes };
  logEvent('ABSENT_MARKER_RUN', `Marked ${result.changes} employees absent`, payload);
  return payload;
}

export function getDbStats() {
  const employees = db.prepare('SELECT COUNT(*) AS count FROM employees').get() as { count: number };
  const embeddings = db.prepare('SELECT COUNT(*) AS count FROM face_embeddings').get() as { count: number };
  const logs = db.prepare('SELECT COUNT(*) AS count FROM attendance_logs').get() as { count: number };

  return {
    path: DB_PATH,
    employees: employees.count,
    embeddings: embeddings.count,
    attendance_logs: logs.count,
  };
}
