import { useState, useEffect, useRef, useCallback } from 'react';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface WSMessage {
  type: string;
  data: any;
  timestamp?: number;
}

export function useWebSocket(gameCode?: string, role: 'admin' | 'participant' = 'participant', participantId?: string) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageListenersRef = useRef<Set<(msg: WSMessage) => void>>(new Set());

  const connect = useCallback(() => {
    if (!gameCode) return;

    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      // Send JOIN_ROOM payload
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        gameCode,
        role,
        participantId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        messageListenersRef.current.forEach(listener => listener(msg));
      } catch (err) {
        console.error('WS Parse Error:', err);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;

      // Auto reconnect after 3 seconds if gameCode present
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };
  }, [gameCode, role, participantId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const addMessageListener = useCallback((listener: (msg: WSMessage) => void) => {
    messageListenersRef.current.add(listener);
    return () => {
      messageListenersRef.current.delete(listener);
    };
  }, []);

  return { status, addMessageListener };
}
