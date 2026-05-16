import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer | null = null;

export function attachWebSocket(server: http.Server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ event: 'CONNECTED' }));
  });

  return wss;
}

export function broadcast(payload: unknown) {
  if (!wss) return;
  const message = JSON.stringify(payload);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
