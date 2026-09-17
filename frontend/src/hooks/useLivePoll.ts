import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE } from '../api/client';

interface LivePollState {
  counts: Record<string, number>;
  totalVoters: number;
  connected: boolean;
}

const INITIAL_BACKOFF = 1000;
const MAX_BACKOFF = 30000;

export function useLivePoll(shareCode: string | undefined): LivePollState {
  const [state, setState] = useState<LivePollState>({
    counts: {},
    totalVoters: 0,
    connected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!shareCode || !mountedRef.current) return;

    const url = `${WS_BASE}/ws/poll/${shareCode}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      backoffRef.current = INITIAL_BACKOFF;
      setState(prev => ({ ...prev, connected: true }));
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data as string) as {
          share_code: string;
          total_voters: number;
          counts: Record<string, number>;
        };
        setState(prev => ({
          ...prev,
          counts: data.counts ?? prev.counts,
          totalVoters: data.total_voters ?? prev.totalVoters,
        }));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, connected: false }));

      // Exponential backoff reconnect
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF);
      setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };
  }, [shareCode]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [connect]);

  return state;
}
