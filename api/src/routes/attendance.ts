import express from 'express';
import { getAttendanceReport, getAttendanceSummary, getTodayAttendance, markPresent } from '../db';
import { config } from '../config';
import { getWatcherStatus, startWatcher, stopWatcher } from '../services/faceEngine';

export const attendanceRouter = express.Router();

attendanceRouter.get('/today', (_req, res) => {
  res.json(getTodayAttendance());
});

attendanceRouter.post('/mark', (req, res) => {
  if (config.edgeApiKey && req.header('x-edge-api-key') !== config.edgeApiKey) {
    res.status(401).json({ error: 'invalid edge api key' });
    return;
  }

  const employeeId = Number(req.body?.employee_id);
  const confidence = req.body?.confidence == null ? null : Number(req.body.confidence);
  const detectedAt = req.body?.detected_at ? String(req.body.detected_at) : undefined;

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    res.status(400).json({ error: 'employee_id must be a positive integer' });
    return;
  }

  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 100)) {
    res.status(400).json({ error: 'confidence must be between 0 and 100' });
    return;
  }

  res.json(markPresent(employeeId, confidence, detectedAt));
});

attendanceRouter.get('/report', (req, res) => {
  const from = String(req.query.from || '');
  const to = String(req.query.to || '');

  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params are required' });
    return;
  }

  res.json(getAttendanceReport(from, to));
});

attendanceRouter.get('/summary', (req, res) => {
  const from = String(req.query.from || '');
  const to = String(req.query.to || '');

  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params are required' });
    return;
  }

  res.json(getAttendanceSummary(from, to));
});

attendanceRouter.get('/watcher-status', (_req, res) => {
  res.json(getWatcherStatus());
});

attendanceRouter.post('/start-watcher', (_req, res) => {
  res.json(startWatcher());
});

attendanceRouter.post('/stop-watcher', (_req, res) => {
  res.json(stopWatcher());
});
