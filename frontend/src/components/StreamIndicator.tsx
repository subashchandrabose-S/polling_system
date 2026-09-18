import { useEffect, useRef, useState } from 'react';
import { Activity, Radio, Zap } from 'lucide-react';

interface StreamIndicatorProps {
  connected: boolean;
  msgCount?: number;
}

// Rolling message-per-second tracker
function useMessagesPerSecond(msgCount: number) {
  const [mps, setMps] = useState(0);
  const prevRef = useRef({ count: msgCount, ts: Date.now() });

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - prevRef.current.ts) / 1000;
      const delta = msgCount - prevRef.current.count;
      setMps(elapsed > 0 ? Math.round(delta / elapsed) : 0);
      prevRef.current = { count: msgCount, ts: now };
    }, 1000);
    return () => clearInterval(id);
  }, [msgCount]);

  return mps;
}

export function StreamIndicator({ connected, msgCount = 0 }: StreamIndicatorProps) {
  const mps = useMessagesPerSecond(msgCount);
  const [particles, setParticles] = useState<{ id: number; x: number }[]>([]);
  const particleId = useRef(0);

  // Emit a particle every time a new message arrives
  useEffect(() => {
    if (!connected || msgCount === 0) return;
    const id = particleId.current++;
    setParticles(p => [...p.slice(-8), { id, x: Math.random() * 80 + 10 }]);
    const t = setTimeout(() => setParticles(p => p.filter(px => px.id !== id)), 1200);
    return () => clearTimeout(t);
  }, [msgCount, connected]);

  return (
    <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 grid-bg opacity-40 rounded-2xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-cyan-400" />
            {connected && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse-ring" />
            )}
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Redis Stream
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
          connected
            ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
            : 'text-slate-500 border-slate-700 bg-slate-800/50'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>

      {/* Stream Pipeline: Redis → WS → Browser */}
      <div className="relative flex items-center justify-between mb-4 px-1">
        {/* Redis node */}
        <div className="flex flex-col items-center gap-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-500 ${
            connected ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-slate-800 border border-slate-700 text-slate-600'
          }`}>
            R
          </div>
          <span className="text-[9px] font-mono text-slate-600 uppercase">Redis</span>
        </div>

        {/* Flow line 1 */}
        <div className="flex-1 relative mx-1 h-px bg-slate-800 overflow-visible">
          {connected && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-red-400 via-cyan-400 to-transparent animate-stream-flow"
              style={{ width: '60%' }}
            />
          )}
        </div>

        {/* WebSocket node */}
        <div className="flex flex-col items-center gap-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
            connected ? 'bg-violet-500/20 border border-violet-500/40' : 'bg-slate-800 border border-slate-700'
          }`}>
            <Zap className={`w-3.5 h-3.5 ${connected ? 'text-violet-400' : 'text-slate-600'}`} />
          </div>
          <span className="text-[9px] font-mono text-slate-600 uppercase">WS</span>
        </div>

        {/* Flow line 2 */}
        <div className="flex-1 relative mx-1 h-px bg-slate-800 overflow-visible">
          {connected && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-violet-400 via-cyan-400 to-transparent animate-stream-flow"
              style={{ width: '60%', animationDelay: '0.6s' }}
            />
          )}
        </div>

        {/* Browser node */}
        <div className="flex flex-col items-center gap-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
            connected ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-slate-800 border border-slate-700'
          }`}>
            <Activity className={`w-3.5 h-3.5 ${connected ? 'text-cyan-400' : 'text-slate-600'}`} />
          </div>
          <span className="text-[9px] font-mono text-slate-600 uppercase">Client</span>
        </div>
      </div>

      {/* Waveform bars */}
      <div className="flex items-center justify-center gap-1 h-6 mb-3">
        {connected ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="stream-bar" style={{ animationDelay: `${i * 0.1}s` }} />
          ))
        ) : (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="w-[3px] h-1 rounded-full bg-slate-700" />
          ))
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-[10px] font-mono">
        <div className="text-slate-500">
          Events: <span className={`font-semibold ${connected ? 'text-cyan-400' : 'text-slate-600'}`}>{msgCount}</span>
        </div>
        <div className="text-slate-500">
          Rate: <span className={`font-semibold ${connected ? 'text-violet-400' : 'text-slate-600'}`}>{mps}/s</span>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute bottom-0 w-1 h-1 rounded-full bg-cyan-400"
            style={{
              left: `${p.x}%`,
              animation: 'particle-rise 1.2s ease-out forwards',
            }}
          />
        ))}
      </div>
    </div>
  );
}
