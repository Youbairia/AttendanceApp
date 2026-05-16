import dotenv from 'dotenv';
import path from 'path';

export const ROOT_DIR = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

export const DB_PATH = process.env.DB_PATH
  ? path.resolve(ROOT_DIR, process.env.DB_PATH)
  : path.join(ROOT_DIR, 'attendance.db');
export const PYTHON_ENGINE_DIR = path.join(ROOT_DIR, 'python-engine');

export const config = {
  port: Number(process.env.PORT || 3001),
  cameraIndex: process.env.CAMERA_INDEX || '0',
  cameraSource: process.env.CAMERA_SOURCE || process.env.CAMERA_INDEX || '0',
  absentMarkTime: process.env.ABSENT_MARK_TIME || '14:00',
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  edgeApiKey: process.env.EDGE_API_KEY || '',
  pythonPath: resolvePythonPath(process.env.PYTHON_PATH || 'python3'),
};

function resolvePythonPath(value: string) {
  if (path.isAbsolute(value) || value.includes('/') || value.includes('\\')) {
    return path.resolve(ROOT_DIR, value);
  }

  return value;
}
