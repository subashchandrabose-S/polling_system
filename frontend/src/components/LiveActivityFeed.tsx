import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export interface ActivityEvent {
  id: string;
  optionText: string;
  ts: number;
}

interface LiveActivityFeedProps {
  events: ActivityEvent[];
}

function timeAgo(ts: number) {
  const sec = Math.round((Date.now() - ts) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  return `${Math.round(sec / 60)}m ago`;
}

function EventItem({ event }: { event: ActivityEvent }) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.97 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center gap-2.5 py-1.5 border-b border-slate-800/60 last:border-0"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
      <span className="text-[11px] text-slate-300 flex-1 truncate font-sans">
        Vote cast for{' '}
        <span className="text-cyan-400 font-medium">"{event.optionText}"</span>
      </span>
      <span className="text-[10px] font-mono text-slate-600 shrink-0">
        {timeAgo(event.ts)}
      </span>
    </motion.div>
  );
}

export function LiveActivityFeed({ events }: LiveActivityFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events]);

  return (
    <div className="glass-card rounded-2xl p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
          Live Activity
        </span>
        {events.length > 0 && (
          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400">
            {events.length}
          </span>
        )}
      </div>

      <div
        ref={listRef}
        className="max-h-[160px] overflow-y-auto space-y-0 pr-1"
      >
        {events.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-[11px] font-mono text-slate-600">Waiting for votes…</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full bg-slate-700 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {events.slice(0, 12).map(ev => (
              <EventItem key={ev.id} event={ev} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
