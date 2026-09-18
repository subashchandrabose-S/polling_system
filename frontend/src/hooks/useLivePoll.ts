import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE } from '../api/client';
import type { ActivityEvent } from '../components/LiveActivityFeed';

interface LivePollState {
  counts: Record<string, number>;
  totalVoters: number;
  connected: boolean;
  msgCount: number;
  events: ActivityEvent[];
}

const INITIAL_BACKOFF = 1000;
const MAX_BACKOFF = 30000;
const MAX_EVENTS = 20;

export function useLivePoll(
  shareCode: string | undefined,
  optionMap?: Record<string, string>,   // optionId → optionText
): LivePollState {
  const [state, setState] = useState<LivePollState>({
    counts: {},
    totalVoters: 0,
    connected: false,
    msgCount: 0,
    events: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF);
  const mountedRef = useRef(true);
  const optionMapRef = useRef(optionMap ?? {});

  // Keep optionMap ref up-to-date without triggering reconnect
  useEffect(() => {
    optionMapRef.current = optionMap ?? {};
  }, [optionMap]);

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
          last_option_id?: string;
        };

        // Build a new activity event if we know the option text
        const lastOptionId = data.last_option_id;
        const optionText =
          lastOptionId && optionMapRef.current[lastOptionId]
            ? optionMapRef.current[lastOptionId]
            : lastOptionId
            ? `Option`
            : null;

        setState(prev => {
          const newEvents = optionText
            ? [
                { id: `${Date.now()}-${Math.random()}`, optionText, ts: Date.now() },
                ...prev.events,
              ].slice(0, MAX_EVENTS)
            : prev.events;

          return {
            ...prev,
            counts: data.counts ?? prev.counts,
            totalVoters: data.total_voters ?? prev.totalVoters,
            msgCount: prev.msgCount + 1,
            events: newEvents,
          };
        });
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
