import express from 'express';
import readline from 'readline';
import { getEmployees, logEvent } from '../db';
import { spawnRegister } from '../services/faceEngine';

export const employeesRouter = express.Router();

employeesRouter.get('/', (_req, res) => {
  res.json(getEmployees());
});

employeesRouter.post('/register', (req, res) => {
  const { name, role = '', department = '' } = req.body || {};

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const child = spawnRegister({ name, role, department });
  let ended = false;

  function writeLine(payload: unknown) {
    if (!res.writableEnded) {
      res.write(`${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n`);
    }
  }

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');

  logEvent('REGISTER_REQUESTED', `Registration requested for ${name}`, { name, role, department });

  const stdout = readline.createInterface({ input: child.stdout });
  stdout.on('line', (line) => {
    writeLine(line);
  });

  child.stderr.on('data', (chunk) => {
    const payload = { event: 'REGISTER_ERROR', message: chunk.toString() };
    logEvent('REGISTER_ERROR', payload.message, payload);
    writeLine(payload);
  });

  child.on('error', (error) => {
    ended = true;
    const payload = {
      success: false,
      error: `Could not start Python registration process: ${error.message}`,
    };
    logEvent('REGISTER_ERROR', payload.error, payload);
    writeLine(payload);
    res.end();
  });

  child.on('exit', (code) => {
    if (ended) return;
    if (code !== 0) {
      writeLine({ success: false, error: `Registration exited with code ${code}` });
    } else {
      logEvent('REGISTER_COMPLETED', `Registration process completed for ${name}`, { name });
    }
    res.end();
  });
});
