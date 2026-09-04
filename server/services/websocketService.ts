import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

export interface ClientConnection {
  ws: WebSocket;
  role: 'admin' | 'participant';
  gameCode: string;
  participantId?: string;
  isAlive: boolean;
}

const clients = new Set<ClientConnection>();

export function initWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const client: ClientConnection = {
      ws,
      role: 'participant',
      gameCode: '',
      isAlive: true,
    };

    clients.add(client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (messageRaw: string) => {
      try {
        const msg = JSON.parse(messageRaw.toString());

        if (msg.type === 'JOIN_ROOM') {
          client.gameCode = (msg.gameCode || '').toUpperCase();
          client.role = msg.role === 'admin' ? 'admin' : 'participant';
          client.participantId = msg.participantId;

          // Send confirmation
          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            gameCode: client.gameCode,
            role: client.role,
            connectedClients: Array.from(clients).filter(c => c.gameCode === client.gameCode).length
          }));
        }
      } catch (err) {
        // ignore malformed ws message
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });

    ws.on('error', () => {
      clients.delete(client);
    });
  });

  // Heartbeat ping interval every 25s
  const heartbeatInterval = setInterval(() => {
    clients.forEach(client => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('⚡ WebSocket Server initialized on /ws');
}

export function broadcastToGame(gameCode: string, type: string, payload: any) {
  const messageStr = JSON.stringify({ type, data: payload, timestamp: Date.now() });
  clients.forEach(client => {
    if (client.gameCode.toUpperCase() === gameCode.toUpperCase() && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

export function broadcastToAdmins(gameCode: string, type: string, payload: any) {
  const messageStr = JSON.stringify({ type, data: payload, timestamp: Date.now() });
  clients.forEach(client => {
    if (
      client.gameCode.toUpperCase() === gameCode.toUpperCase() &&
      client.role === 'admin' &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(messageStr);
    }
  });
}

export function getConnectedClientCount(gameCode: string): number {
  return Array.from(clients).filter(c => c.gameCode.toUpperCase() === gameCode.toUpperCase()).length;
}
