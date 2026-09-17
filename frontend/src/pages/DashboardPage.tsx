import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Clock, ExternalLink, Loader2, Plus, X
} from 'lucide-react';
import { api } from '../api/client';
import type { Poll } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';

function PollStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider border ${
        isActive
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-stone-100 text-stone-600 border-stone-300'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-stone-400'}`} />
      {isActive ? 'Active' : 'Closed'}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 animate-pulse shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3.5 w-16 bg-stone-200 rounded" />
        <div className="h-4 w-20 bg-stone-200 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-stone-200 rounded mb-2" />
      <div className="h-4 w-1/2 bg-stone-100 rounded mb-4" />
      <div className="h-8 w-full bg-stone-100 rounded" />
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
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 font-sans">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 mb-8 border-b border-stone-200">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
            Dispatch Desk
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-950">
            Welcome back, <span className="italic">{user?.username}</span>
          </h1>
          <p className="text-stone-600 text-sm mt-1.5 max-w-xl">
            Monitor real-time participation tallies and dispatch new community inquiries.
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-50 text-sm font-medium transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New inquiry</span>
        </Link>
      </div>

      {/* Editorial Stats Strip */}
      {!loading && polls.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-stone-200 border border-stone-200 rounded-xl overflow-hidden mb-10 shadow-xs">
          <div className="bg-white p-4 sm:p-5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">Total polls</div>
            <div className="font-serif text-2xl sm:text-3xl font-medium text-stone-950 tabular-nums">
              {polls.length}
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">Active polls</div>
            <div className="font-serif text-2xl sm:text-3xl font-medium text-emerald-850 tabular-nums">
              {activePolls.length}
            </div>
          </div>
          <div className="bg-white p-4 sm:p-5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">Total responses</div>
            <div className="font-serif text-2xl sm:text-3xl font-medium text-stone-950 tabular-nums">
              {totalVotesCast}
            </div>
          </div>
        </div>
      )}

      {/* Polls list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-20 bg-white border border-stone-200 rounded-2xl p-8">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-500 font-serif text-xl">
            §
          </div>
          <h2 className="font-serif text-2xl font-normal text-stone-900 mb-2">No polls dispatched yet</h2>
          <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
            Create your first question to share a direct URL or scan code for instant voter responses.
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-50 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create inquiry
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Active polls */}
          {activePolls.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono uppercase tracking-wider text-stone-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Active Inquiries ({activePolls.length})
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

          {/* Closed polls */}
          {closedPolls.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Archived Inquiries ({closedPolls.length})
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

// ── Poll card sub-component ──────────────────────────────────────────────────

function PollCard({
  poll,
  onClose,
  closing,
}: {
  poll: Poll;
  index?: number;
  onClose: (shareCode: string) => void;
  closing: boolean;
}) {

  return (
    <div
      className={`bg-white border rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 ${
        poll.is_active ? 'border-stone-200 hover:border-stone-300' : 'border-stone-200/60 bg-stone-50/50'
      }`}
    >
      {/* Top details */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <PollStatusBadge isActive={poll.is_active} />
          <div className="text-xs font-mono text-stone-500 tabular-nums">
            <span className="font-semibold text-stone-800">{poll.total_votes}</span>{' '}
            {poll.total_votes === 1 ? 'response' : 'responses'}
          </div>
        </div>

        <h3 className="font-serif text-lg font-medium text-stone-900 leading-snug line-clamp-2">
          {poll.title}
        </h3>
      </div>

      {/* Option preview list */}
      <div className="space-y-2 py-2 border-y border-stone-100">
        {poll.options.slice(0, 3).map(opt => {
          const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
          return (
            <div key={opt.id} className="text-xs flex items-center gap-2">
              <span className="text-stone-700 w-32 truncate">{opt.text}</span>
              <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-stone-700 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-stone-500 w-8 text-right tabular-nums">{pct}%</span>
            </div>
          );
        })}
        {poll.options.length > 3 && (
          <p className="text-[11px] font-mono text-stone-400">+{poll.options.length - 3} additional options</p>
        )}
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between pt-1">
        <Link
          to={`/poll/${poll.share_code}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open live page</span>
        </Link>

        {poll.is_active && (
          <button
            id={`close-poll-${poll.share_code}`}
            onClick={() => onClose(poll.share_code)}
            disabled={closing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-stone-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {closing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <X className="w-3 h-3" />
            )}
            Conclude
          </button>
        )}
      </div>
    </div>
  );
}
