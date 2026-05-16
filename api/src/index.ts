import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config';
import { getDbStats, initDb, logEvent } from './db';
import { employeesRouter } from './routes/employees';
import { attendanceRouter } from './routes/attendance';
import { attachWebSocket } from './services/websocket';
import { startAbsentMarker } from './jobs/absentMarker';

initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    message: 'Face Attendance API is running',
    dashboard: 'http://127.0.0.1:5173/',
    health: '/health',
    employees: '/api/employees',
    today: '/api/attendance/today',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    timezone: config.appTimezone,
    cameraSource: config.cameraSource,
    database: getDbStats(),
  });
});

app.use('/api/employees', employeesRouter);
app.use('/api/attendance', attendanceRouter);

const server = http.createServer(app);
attachWebSocket(server);
startAbsentMarker();

server.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Python engine: ${config.pythonPath}`);
  console.log(`Camera source: ${config.cameraSource}`);
  logEvent('API_STARTED', `API started on port ${config.port}`, {
    port: config.port,
    pythonPath: config.pythonPath,
    cameraSource: config.cameraSource,
  });
});

function shutdown(signal: string) {
  logEvent('API_STOPPED', `API stopped by ${signal}`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
