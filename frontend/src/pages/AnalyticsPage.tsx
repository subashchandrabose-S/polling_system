import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BarChart2,
  Radio,
  TrendingUp,
  Zap,
  Globe,
  Users,
  RefreshCw,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { api } from '../api/client';
import type { Poll } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { useLivePoll } from '../hooks/useLivePoll';
import { AnimatedCounter } from '../components/AnimatedCounter';
import type { ActivityEvent } from '../components/LiveActivityFeed';
import { MOCK_POLLS } from '../data/mockPolls';

// ── Colour palette for option bars ──────────────────────────────────────────
const OPTION_COLORS = [
  { bar: 'from-cyan-400 to-blue-500',    text: 'text-cyan-500',   bg: 'bg-cyan-500/10 border-cyan-500/30' },
  { bar: 'from-violet-400 to-purple-500',text: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/30' },
  { bar: 'from-emerald-400 to-teal-500', text: 'text-emerald-500',bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { bar: 'from-rose-400 to-pink-500',    text: 'text-rose-500',   bg: 'bg-rose-500/10 border-rose-500/30' },
  { bar: 'from-amber-400 to-orange-500', text: 'text-amber-500',  bg: 'bg-amber-500/10 border-amber-500/30' },
];

function getColor(i: number) { return OPTION_COLORS[i % OPTION_COLORS.length]; }

// ── Option progress bar ──────────────────────────────────────────────────────
function OptionBar({
  text, votes, pct, colorIdx, isWinner,
}: { text: string; votes: number; pct: number; colorIdx: number; isWinner: boolean }) {
  const col = getColor(colorIdx);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl p-4 border transition-all duration-300 ${
        isWinner
          ? `${col.bg} shadow-sm`
          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isWinner ? (
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${col.text}`} />
          ) : (
            <Circle className="w-4 h-4 shrink-0 text-slate-400" />
          )}
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{text}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {votes.toLocaleString()} votes
          </span>
          <span className={`text-lg font-bold font-mono tabular-nums ${isWinner ? col.text : 'text-slate-600 dark:text-slate-300'}`}>
            {pct}%
          </span>
        </div>
      </div>
      {/* Progress track */}
      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${col.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}

// ── Mini activity event ──────────────────────────────────────────────────────
function ActivityRow({ event }: { event: ActivityEvent }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 5000); return () => clearInterval(id); }, []);
  const sec = Math.round((Date.now() - event.ts) / 1000);
  const timeStr = sec < 5 ? 'just now' : sec < 60 ? `${sec}s ago` : `${Math.round(sec / 60)}m ago`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40"
    >
      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
      <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">
        +1 vote for{' '}
        <span className="text-cyan-500 font-semibold">"{event.optionText}"</span>
      </span>
      <span className="text-[10px] font-mono text-slate-400 shrink-0">{timeStr}</span>
    </motion.div>
  );
}

// ── Poll selector card ───────────────────────────────────────────────────────
function PollSelectorCard({
  polls, selectedId, onSelect,
}: { polls: Poll[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-700/40">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-4 h-4 text-violet-500" />
        <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Select Poll to Analyse</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {polls.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 border ${
              selectedId === p.id
                ? 'bg-violet-500/10 border-violet-500/40 text-violet-600 dark:text-violet-300 font-semibold'
                : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              <span className="truncate">{p.title}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5 ml-3.5">
              {p.total_votes.toLocaleString()} votes &bull; {p.is_active ? 'Active' : 'Closed'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main analytics data view ─────────────────────────────────────────────────
function LivePollAnalytics({ poll }: { poll: Poll }) {
  const optionMap = useMemo(
    () => Object.fromEntries(poll.options.map(o => [o.id, o.text])),
    [poll]
  );
  const { counts, totalVoters, connected, msgCount, events } = useLivePoll(poll.share_code, optionMap);

  const liveTotal = totalVoters > 0 ? totalVoters : poll.total_votes;
  const mergedOptions = poll.options.map(o => ({
    ...o,
    vote_count: counts[o.id] ?? o.vote_count,
  }));
  const maxVotes = Math.max(...mergedOptions.map(o => o.vote_count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* ── Left Column: Main poll card ──────────────────────────────────── */}
      <div className="lg:col-span-7 space-y-5">

        {/* Poll header card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700/40"
        >
          {/* Status row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
                poll.is_active
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${poll.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {poll.is_active ? 'Live' : 'Closed'}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${connected ? 'text-cyan-500' : 'text-slate-400'}`}>
                <Radio className="w-3 h-3" />
                {connected ? 'Real-time sync active' : 'Reconnecting…'}
              </span>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <AnimatedCounter value={liveTotal} className="text-2xl font-bold font-display text-slate-900 dark:text-white" />
                <span className="text-xs text-slate-500">votes</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {msgCount > 0 ? `Updated just now` : 'Awaiting votes'}
              </div>
            </div>
          </div>

          {/* Question */}
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-1">
            {poll.title}
          </h2>
          {poll.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{poll.description}</p>
          )}

          {/* Powered by Redis tag */}
          <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400">
              Results update in real-time as votes come in — powered by{' '}
              <span className="text-red-400 font-semibold">Redis Pub/Sub</span>
              {' '}→{' '}
              <span className="text-violet-400 font-semibold">Go WebSocket</span>
              {' '}→{' '}
              <span className="text-cyan-400 font-semibold">Browser</span>
            </span>
          </div>
        </motion.div>

        {/* Options */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          {mergedOptions.map((opt, i) => {
            const pct = liveTotal > 0 ? Math.round((opt.vote_count / liveTotal) * 100) : 0;
            const isWinner = opt.vote_count === maxVotes && opt.vote_count > 0;
            return (
              <OptionBar
                key={opt.id}
                text={opt.text}
                votes={opt.vote_count}
                pct={pct}
                colorIdx={i}
                isWinner={isWinner}
              />
            );
          })}
        </motion.div>

        {/* Stat boxes */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Total Votes', value: liveTotal, icon: Users, color: 'text-cyan-500' },
            { label: 'Options', value: poll.options.length, icon: BarChart2, color: 'text-violet-500' },
            { label: 'Events', value: msgCount, icon: Activity, color: 'text-emerald-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-4 border border-slate-200 dark:border-slate-700/40">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
              </div>
              <AnimatedCounter value={value} className={`text-2xl font-bold font-display ${color}`} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right Column: Live Activity + Tech Stack ─────────────────────── */}
      <div className="lg:col-span-5 space-y-5">

        {/* Tech stack pipeline */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-700/40"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Real-time Stack
            </span>
            <span className={`ml-auto flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              connected ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
              {connected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>

          {/* Redis → Go → WS → Browser pipeline */}
          <div className="flex items-center justify-between px-2">
            {/* Redis node */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                connected ? 'bg-red-500/15 border-red-500/40 shadow-lg shadow-red-500/10' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}>
                <span className={`text-sm font-bold font-mono ${connected ? 'text-red-400' : 'text-slate-500'}`}>
                  R
                </span>
              </div>
              <span className={`text-[9px] font-mono uppercase ${connected ? 'text-red-400' : 'text-slate-500'}`}>Redis</span>
              <span className={`text-[8px] font-mono ${connected ? 'text-red-300' : 'text-slate-600'}`}>Pub/Sub</span>
            </div>

            {/* Flow line */}
            <div className="flex-1 relative mx-1 h-0.5 bg-slate-200 dark:bg-slate-700 overflow-visible">
              {connected && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-red-400 via-violet-400 to-transparent animate-pulse"
                  style={{ width: '70%' }}
                />
              )}
            </div>

            {/* Go node */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                connected ? 'bg-blue-500/15 border-blue-500/40 shadow-lg shadow-blue-500/10' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}>
                <span className={`text-sm font-bold font-mono ${connected ? 'text-blue-400' : 'text-slate-500'}`}>Go</span>
              </div>
              <span className={`text-[9px] font-mono uppercase ${connected ? 'text-blue-400' : 'text-slate-500'}`}>Golang</span>
              <span className={`text-[8px] font-mono ${connected ? 'text-blue-300' : 'text-slate-600'}`}>Gin/WS Hub</span>
            </div>

            {/* Flow line */}
            <div className="flex-1 relative mx-1 h-0.5 bg-slate-200 dark:bg-slate-700 overflow-visible">
              {connected && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-violet-400 via-cyan-400 to-transparent animate-pulse"
                  style={{ width: '70%', animationDelay: '0.4s' }}
                />
              )}
            </div>

            {/* WebSocket node */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                connected ? 'bg-violet-500/15 border-violet-500/40 shadow-lg shadow-violet-500/10' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}>
                <Zap className={`w-5 h-5 ${connected ? 'text-violet-400' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[9px] font-mono uppercase ${connected ? 'text-violet-400' : 'text-slate-500'}`}>WebSocket</span>
              <span className={`text-[8px] font-mono ${connected ? 'text-violet-300' : 'text-slate-600'}`}>Gorilla</span>
            </div>

            {/* Flow line */}
            <div className="flex-1 relative mx-1 h-0.5 bg-slate-200 dark:bg-slate-700 overflow-visible">
              {connected && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-transparent animate-pulse"
                  style={{ width: '70%', animationDelay: '0.8s' }}
                />
              )}
            </div>

            {/* Browser node */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                connected ? 'bg-cyan-500/15 border-cyan-500/40 shadow-lg shadow-cyan-500/10' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}>
                <Activity className={`w-5 h-5 ${connected ? 'text-cyan-400' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[9px] font-mono uppercase ${connected ? 'text-cyan-400' : 'text-slate-500'}`}>Browser</span>
              <span className={`text-[8px] font-mono ${connected ? 'text-cyan-300' : 'text-slate-600'}`}>React/Vite</span>
            </div>
          </div>

          {/* Waveform */}
          <div className="flex items-center justify-center gap-1 h-8 mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
            {connected
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-violet-400 animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 8}px`,
                      animationDelay: `${i * 0.08}s`,
                      animationDuration: `${0.8 + Math.random() * 0.6}s`,
                    }}
                  />
                ))
              : Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-1 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                ))}
          </div>
        </motion.div>

        {/* Live activity feed */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-700/40"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Live Activity</span>
            {events.length > 0 && (
              <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-500">
                {events.length}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-600">Waiting for votes…</div>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {events.slice(0, 10).map(ev => (
                  <ActivityRow key={ev.id} event={ev} />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Powered by Redis badge */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.06] flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-red-400 font-mono">R</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Powered by <span className="text-red-400 font-semibold">Redis Pub/Sub</span>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Main AnalyticsPage ───────────────────────────────────────────────────────
export function AnalyticsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  const fetchPolls = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.polls.getMyPolls(token);
      setPolls(res.polls);
      setUsingMockData(false);
    } catch (err) {
      setPolls(MOCK_POLLS);
      setUsingMockData(true);
      const firstActive = MOCK_POLLS.find(p => p.is_active) ?? MOCK_POLLS[0];
      setSelectedPollId(firstActive.id);
      toast('Showing sample analytics while the poll service is unavailable', 'info');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { fetchPolls(); }, [fetchPolls]);

  useEffect(() => {
    if (polls.length === 0) {
      setSelectedPollId(null);
      return;
    }
    if (!polls.some(poll => poll.id === selectedPollId)) {
      const firstActive = polls.find(poll => poll.is_active) ?? polls[0];
      setSelectedPollId(firstActive.id);
    }
  }, [polls, selectedPollId]);

  const selectedPoll = polls.find(p => p.id === selectedPollId) ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 font-sans">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-white/[0.06]"
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
            <BarChart2 className="w-3.5 h-3.5 text-violet-500" />
            Analytics Studio
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Live Poll{' '}
            <span className="bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent">
              Analytics
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-lg">
            Real-time vote tracking powered by Redis Pub/Sub, Go WebSockets, and React streaming.
          </p>
        </div>
        <button
          onClick={fetchPolls}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {usingMockData && (
        <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-xs text-violet-600 dark:text-violet-300">
          Sample analytics are enabled so you can preview live result visualizations.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <span className="text-sm font-mono uppercase tracking-widest">Loading analytics…</span>
          </div>
        </div>
      ) : polls.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-24 glass-card rounded-2xl"
        >
          <BarChart2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">No polls yet</h2>
          <p className="text-slate-500 text-sm mb-5">Create a poll to start seeing real-time analytics here.</p>
          <button
            type="button"
            onClick={() => {
              setPolls(MOCK_POLLS);
              setUsingMockData(true);
              setSelectedPollId(MOCK_POLLS[0].id);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-semibold transition-all hover:scale-105"
          >
            <BarChart2 className="w-4 h-4" />
            View sample analytics
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Sidebar poll selector */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="xl:col-span-3"
          >
            <PollSelectorCard polls={polls} selectedId={selectedPollId} onSelect={setSelectedPollId} />
          </motion.div>

          {/* Main analytics view */}
          <div className="xl:col-span-9">
            <AnimatePresence mode="wait">
              {selectedPoll ? (
                <motion.div
                  key={selectedPoll.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <LivePollAnalytics poll={selectedPoll} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center h-48 glass-card rounded-2xl text-slate-400 text-sm font-mono"
                >
                  Select a poll to view analytics
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
