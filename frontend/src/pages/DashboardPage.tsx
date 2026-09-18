import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ExternalLink, Loader2, Plus, Radio, TrendingUp, X } from 'lucide-react';
import { api } from '../api/client';
import type { Poll } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { AnimatedCounter } from '../components/AnimatedCounter';

function PollStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-widest border ${
      isActive
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-slate-800/60 text-slate-600 border-slate-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
      {isActive ? 'Active' : 'Closed'}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 shimmer-bg">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-20 bg-slate-800 rounded-lg" />
        <div className="h-4 w-16 bg-slate-800 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-slate-800 rounded mb-2" />
      <div className="h-4 w-1/2 bg-slate-700 rounded mb-4" />
      <div className="h-8 w-full bg-slate-800 rounded-lg" />
    </div>
  );
}

function StatBox({ label, value, accent, icon: Icon }: {
  label: string;
  value: number;
  accent: string;
  icon: React.ElementType;
}) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accent}`} />
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">{label}</span>
      </div>
      <div className={`font-display text-3xl sm:text-4xl font-bold tabular-nums ${accent}`}>
        <AnimatedCounter value={value} duration={900} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.polls.getMyPolls(token);
      setPolls(res.polls);
    } catch (err) {
      toast((err as Error).message || 'Failed to load polls', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { fetchPolls(); }, [fetchPolls]);

  async function handleClose(shareCode: string) {
    if (!token) return;
    setClosingId(shareCode);
    try {
      await api.polls.close(token, shareCode);
      setPolls(prev => prev.map(p => p.share_code === shareCode ? { ...p, is_active: false } : p));
      toast('Poll concluded successfully', 'success');
    } catch (err) {
      toast((err as Error).message || 'Failed to close poll', 'error');
    } finally {
      setClosingId(null);
    }
  }

  const activePolls = polls.filter(p => p.is_active);
  const closedPolls = polls.filter(p => !p.is_active);
  const totalVotesCast = polls.reduce((s, p) => s + p.total_votes, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 font-sans">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 mb-8 border-b border-white/[0.06]"
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
            <Radio className="w-3.5 h-3.5 text-cyan-500/60" />
            Control Room
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {user?.username}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-xl">
            Monitor real-time participation and dispatch new polls to your audience.
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold text-sm transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New poll
        </Link>
      </motion.div>

      {/* Stats strip */}
      {!loading && polls.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          <StatBox label="Total polls"   value={polls.length}       accent="text-slate-300"   icon={TrendingUp} />
          <StatBox label="Active polls"  value={activePolls.length} accent="text-emerald-400" icon={Radio} />
          <StatBox label="Total votes"   value={totalVotesCast}     accent="text-cyan-400"    icon={TrendingUp} />
        </motion.div>
      )}

      {/* Polls list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : polls.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-24 glass-card rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
            <Radio className="w-8 h-8 text-cyan-500/60" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">No polls yet</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-7">
            Create your first poll and share it — results update live as votes come in.
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold text-sm transition-all duration-200 hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Create your first poll
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {/* Active */}
          {activePolls.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
                  Active Polls ({activePolls.length})
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <AnimatePresence>
                  {activePolls.map((poll, i) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      index={i}
                      onClose={handleClose}
                      closing={closingId === poll.share_code}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Closed */}
          {closedPolls.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-600">
                  Archived Polls ({closedPolls.length})
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {closedPolls.map((poll, i) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    index={i}
                    onClose={handleClose}
                    closing={closingId === poll.share_code}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Poll Card ────────────────────────────────────────────────────────────────

function PollCard({
  poll, index = 0, onClose, closing,
}: {
  poll: Poll;
  index?: number;
  onClose: (shareCode: string) => void;
  closing: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-card rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-slate-600/60 ${
        poll.is_active ? 'border-slate-700/60' : 'border-slate-800/40 opacity-70'
      }`}
    >
      {/* Top */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <PollStatusBadge isActive={poll.is_active} />
          <div className="text-xs font-mono text-slate-500 tabular-nums">
            <AnimatedCounter value={poll.total_votes} className="font-bold text-slate-300" />
            {' '}{poll.total_votes === 1 ? 'vote' : 'votes'}
          </div>
        </div>
        <h3 className="font-display font-semibold text-white leading-snug line-clamp-2 mb-3">
          {poll.title}
        </h3>
      </div>

      {/* Option mini-bars */}
      <div className="space-y-2 py-3 border-y border-white/[0.05]">
        {poll.options.slice(0, 3).map(opt => {
          const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
          return (
            <div key={opt.id} className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 w-28 truncate">{opt.text}</span>
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500/70 to-violet-500/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className="font-mono text-slate-600 w-8 text-right">{pct}%</span>
            </div>
          );
        })}
        {poll.options.length > 3 && (
          <p className="text-[10px] font-mono text-slate-700">+{poll.options.length - 3} more options</p>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1">
        <Link
          to={`/poll/${poll.share_code}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open live
        </Link>

        {poll.is_active && (
          <button
            id={`close-poll-${poll.share_code}`}
            onClick={() => onClose(poll.share_code)}
            disabled={closing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-all duration-200"
          >
            {closing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Close
          </button>
        )}
      </div>
    </motion.div>
  );
}
