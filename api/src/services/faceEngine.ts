import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path from 'path';
import readline from 'readline';
import { config, DB_PATH, PYTHON_ENGINE_DIR } from '../config';
import { broadcast } from './websocket';
import { logEvent } from '../db';

let watcherProcess: ChildProcessWithoutNullStreams | null = null;

function parseLine(line: string) {
  try {
    return JSON.parse(line);
  } catch {
    return { event: 'PYTHON_LOG', message: line };
  }
}

export function spawnRegister(args: { name: string; role?: string; department?: string }) {
  return spawn(config.pythonPath, [
    path.join(PYTHON_ENGINE_DIR, 'register.py'),
    args.name,
    args.role || '',
    args.department || '',
  ], {
    cwd: PYTHON_ENGINE_DIR,
    env: {
      ...process.env,
      CAMERA_INDEX: config.cameraIndex,
      CAMERA_SOURCE: config.cameraSource,
      DB_PATH,
    },
  });
}

export function getWatcherStatus() {
  return {
    running: Boolean(watcherProcess && !watcherProcess.killed),
    pid: watcherProcess?.pid || null,
    cameraSource: config.cameraSource,
  };
}

export function startWatcher() {
  if (watcherProcess && !watcherProcess.killed) {
    return { started: false, message: 'Watcher already running' };
  }

  watcherProcess = spawn(config.pythonPath, [path.join(PYTHON_ENGINE_DIR, 'watcher.py')], {
    cwd: PYTHON_ENGINE_DIR,
    env: {
      ...process.env,
      CAMERA_INDEX: config.cameraIndex,
      CAMERA_SOURCE: config.cameraSource,
      DB_PATH,
    },
  });

  logEvent('WATCHER_STARTED', 'Face watcher started', getWatcherStatus());
  broadcast({ event: 'WATCHER_STARTED', ...getWatcherStatus() });

  const stdout = readline.createInterface({ input: watcherProcess.stdout });
  stdout.on('line', (line) => {
    const event = parseLine(line);
    if (event.event && event.event !== 'PYTHON_LOG') {
      logEvent(event.event, event.message || null, event);
    }
    broadcast(event);
  });

  watcherProcess.stderr.on('data', (chunk) => {
    const payload = { event: 'WATCHER_ERROR', message: chunk.toString() };
    logEvent('WATCHER_ERROR', payload.message, payload);
    broadcast(payload);
  });

  watcherProcess.on('exit', (code, signal) => {
    const payload = { event: 'WATCHER_STOPPED', code, signal };
    logEvent('WATCHER_STOPPED', 'Face watcher stopped', payload);
    broadcast(payload);
    watcherProcess = null;
  });

  watcherProcess.on('error', (error) => {
    const payload = { event: 'WATCHER_ERROR', message: error.message };
    logEvent('WATCHER_ERROR', error.message, payload);
    broadcast(payload);
    watcherProcess = null;
  });

  return { started: true, message: 'Watcher started' };
}

export function stopWatcher() {
  if (!watcherProcess) {
    return { stopped: false, message: 'Watcher is not running' };
  }

  watcherProcess.kill('SIGTERM');
  watcherProcess = null;
  logEvent('WATCHER_STOP_REQUESTED', 'Face watcher stop requested');
  broadcast({ event: 'WATCHER_STOPPED' });
  return { stopped: true, message: 'Watcher stopped' };
}
