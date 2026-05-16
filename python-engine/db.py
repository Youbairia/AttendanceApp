import json
import os
import sqlite3
from datetime import date, datetime

import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def resolve_db_path():
    configured = os.getenv('DB_PATH')
    if configured:
        if os.path.isabs(configured):
            return configured
        return os.path.join(PROJECT_ROOT, configured)
    return os.path.join(PROJECT_ROOT, 'attendance.db')

DB_PATH = resolve_db_path()

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.executescript('''
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
    ''')
    conn.commit()
    conn.close()

def save_employee(name, role='', department=''):
    conn = get_conn()
    c = conn.cursor()
    c.execute("INSERT INTO employees (name, role, department) VALUES (?, ?, ?)", (name, role, department))
    employee_id = c.lastrowid
    conn.commit()
    conn.close()
    return employee_id

def save_embedding(employee_id, embedding):
    conn = get_conn()
    c = conn.cursor()
    embedding_json = json.dumps(embedding.tolist())
    c.execute("INSERT INTO face_embeddings (employee_id, embedding) VALUES (?, ?)", (employee_id, embedding_json))
    conn.commit()
    conn.close()

def get_all_embeddings():
    conn = get_conn()
    c = conn.cursor()
    c.execute('''
        SELECT e.id, e.name, fe.embedding
        FROM employees e
        JOIN face_embeddings fe ON e.id = fe.employee_id
    ''')
    rows = c.fetchall()
    conn.close()
    result = []
    for row in rows:
        result.append({
            'id': row['id'],
            'name': row['name'],
            'embedding': np.array(json.loads(row['embedding']))
        })
    return result

def already_marked_today(employee_id):
    conn = get_conn()
    c = conn.cursor()
    today = date.today().isoformat()
    c.execute("SELECT id FROM attendance_logs WHERE employee_id = ? AND date = ?", (employee_id, today))
    row = c.fetchone()
    conn.close()
    return row is not None

def mark_attendance(employee_id, confidence):
    conn = get_conn()
    c = conn.cursor()
    today = date.today().isoformat()
    detected_at = datetime.now().isoformat(timespec='seconds')
    c.execute('''
        INSERT INTO attendance_logs (employee_id, date, status, detected_at, confidence)
        VALUES (?, ?, 'PRESENT', ?, ?)
    ''', (employee_id, today, detected_at, confidence))
    conn.commit()
    conn.close()
    return detected_at

if __name__ == '__main__':
    init_db()
    print(json.dumps({"success": True, "message": "database initialized"}), flush=True)
