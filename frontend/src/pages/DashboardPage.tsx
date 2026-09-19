import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Check, Clock, Copy, ExternalLink, Loader2, Plus, Radio, TrendingUp, X } from 'lucide-react';
import { api } from '../api/client';
import type { Poll } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { MOCK_POLLS } from '../data/mockPolls';
import { getVotingPath, getVotingUrl } from '../utils/pollUrl';

function PollStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-widest border ${
      isActive
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-600 border-slate-200 dark:border-slate-700'
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
        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
      <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-700 rounded mb-4" />
      <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
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
      toast('Showing sample polls while the poll service is unavailable', 'info');
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
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-white/[0.06]"
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
            <Radio className="w-3.5 h-3.5 text-cyan-500/60" />
            Control Room
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {user?.username}
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-500 text-sm mt-2 max-w-xl">
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

      {usingMockData && (
        <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-600 dark:text-cyan-300">
          Sample poll data is enabled so you can preview dashboard and analytics behavior.
        </div>
      )}

      {/* Stats strip */}
      {!loading && polls.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          <StatBox label="Total polls"   value={polls.length}       accent="text-slate-700 dark:text-slate-300"   icon={TrendingUp} />
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
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">No polls yet</h2>
          <p className="text-slate-600 dark:text-slate-500 text-sm max-w-sm mx-auto mb-7">
            Create your first poll and share it — results update live as votes come in.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold text-sm transition-all duration-200 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Create your first poll
            </Link>
            <button
              type="button"
              onClick={() => { setPolls(MOCK_POLLS); setUsingMockData(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 text-sm font-semibold transition-all"
            >
              <BarChart2 className="w-4 h-4" />
              Load sample polls
            </button>
          </div>
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
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = getVotingUrl(poll.share_code);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast('Vote link copied! Anyone can use this link to vote.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy link', 'error');
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-card rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-600/60 ${
        poll.is_active ? 'border-slate-200 dark:border-slate-700/60' : 'border-slate-200 dark:border-slate-800/40 opacity-70'
      }`}
    >
      {/* Top */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <PollStatusBadge isActive={poll.is_active} />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              Code: <span className="font-extrabold text-sm text-cyan-600 dark:text-cyan-400 tracking-wider select-all">{poll.share_code}</span>
            </span>
          </div>
          <div className="text-xs font-mono text-slate-500 tabular-nums">
            <AnimatedCounter value={poll.total_votes} className="font-bold text-slate-700 dark:text-slate-300" />
            {' '}{poll.total_votes === 1 ? 'vote' : 'votes'}
          </div>
        </div>
        <h3 className="font-display font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-3">
          {poll.title}
        </h3>
      </div>

      {/* Option mini-bars */}
      <div className="space-y-2 py-3 border-y border-slate-200 dark:border-white/[0.05]">
        {poll.options.slice(0, 3).map(opt => {
          const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
          return (
            <div key={opt.id} className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 w-28 truncate">{opt.text}</span>
              <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500/70 to-violet-500/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className="font-mono text-slate-600 dark:text-slate-400 w-8 text-right">{pct}%</span>
            </div>
          );
        })}
        {poll.options.length > 3 && (
          <p className="text-[10px] font-mono text-slate-500">+{poll.options.length - 3} more options</p>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1 gap-2">
        <div className="flex items-center gap-1.5">
          <Link
            to={getVotingPath(poll.share_code)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition-all duration-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Vote Page
          </Link>

          <button
            onClick={handleCopy}
            title="Copy share link for anyone to vote"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-200"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Share Link'}</span>
          </button>
        </div>

        {poll.is_active && (
          <button
            id={`close-poll-${poll.share_code}`}
            onClick={() => onClose(poll.share_code)}
            disabled={closing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-50 transition-all duration-200"
          >
            {closing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Close
          </button>
        )}
      </div>
    </motion.div>
  );
}
