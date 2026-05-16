import cron from 'node-cron';
import { config } from '../config';
import { markAbsentForToday } from '../db';
import { broadcast } from '../services/websocket';

export function startAbsentMarker() {
  const [hour = '14', minute = '00'] = config.absentMarkTime.split(':');
  const expression = `${Number(minute)} ${Number(hour)} * * *`;

  cron.schedule(expression, () => {
    const result = markAbsentForToday();
    broadcast({ event: 'ABSENT_MARKED', ...result });
  });
}
