import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Loader2, Radio } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';
import type { Poll, VoteTally } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLivePoll } from '../hooks/useLivePoll';
import { useToast } from '../components/Toast';
import { PollOptionBar } from '../components/PollOptionBar';
import { StreamIndicator } from '../components/StreamIndicator';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { fireConfetti } from '../utils/confetti';

export function PollPage() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const { token } = useAuth();
  const { toast } = useToast();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build a stable optionMap once poll loads
  const optionMap = useMemo(() => {
    if (!poll) return {};
    return Object.fromEntries(poll.options.map(o => [o.id, o.text]));
  }, [poll]);

  // Live tally from WebSocket — now also gives us msgCount and events
  const { counts, totalVoters, connected, msgCount, events } = useLivePoll(shareCode, optionMap);

  // Merge live counts over the poll's stored counts
  const mergedOptions = useMemo(() => {
    if (!poll) return [];
    return poll.options.map(opt => ({
      ...opt,
      vote_count: counts[opt.id] ?? opt.vote_count,
    }));
  }, [poll, counts]);

  const liveTotal = useMemo(
    () => (totalVoters > 0 ? totalVoters : poll?.total_votes ?? 0),
    [totalVoters, poll],
  );

  const winnerCount = Math.max(...mergedOptions.map(o => o.vote_count), 0);
  const shareUrl = `${window.location.origin}/poll/${shareCode}`;

  // Load poll on mount
  useEffect(() => {
    if (!shareCode) return;
    setLoading(true);
    api.polls.getByShareCode(shareCode)
      .then(setPoll)
      .catch(err => setFetchError((err as Error).message))
      .finally(() => setLoading(false));
  }, [shareCode]);

  // Check if already voted (session-level via localStorage)
  const votedKey = `voted:${shareCode}`;
  useEffect(() => {
    if (localStorage.getItem(votedKey)) setHasVoted(true);
  }, [votedKey]);

  async function handleVote() {
    if (!selectedOption || !shareCode || hasVoted || voting) return;
    setVoting(true);
    try {
      const tally: VoteTally = await api.votes.cast(shareCode, selectedOption, token);
      setHasVoted(true);
      localStorage.setItem(votedKey, '1');
      // Fire confetti burst!
      fireConfetti();
      // Merge tally into poll
      setPoll(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          total_votes: tally.total_voters,
          options: prev.options.map(o => ({
            ...o,
            vote_count: tally.counts[o.id] ?? o.vote_count,
          })),
        };
      });
      toast('🎉 Vote recorded in real-time!', 'success');
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('already voted')) {
        setHasVoted(true);
        localStorage.setItem(votedKey, '1');
        toast('You have already voted on this poll.', 'info');
      } else {
        toast(msg || 'Failed to submit vote', 'error');
      }
    } finally {
      setVoting(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy link', 'error');
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="relative">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-pulse-ring" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest">Loading poll…</span>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (fetchError || !poll) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-10 glass-card rounded-2xl max-w-md mx-4"
        >
          <div className="text-4xl mb-4">🔍</div>
          <p className="font-display text-xl text-white mb-2">Poll Not Found</p>
          <p className="text-slate-400 text-sm">{fetchError || 'This share code is invalid or has been archived.'}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Main poll card ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-8 glass-card rounded-2xl p-6 sm:p-10"
        >
          {/* Status bar */}
          <div className="flex items-center justify-between gap-4 pb-5 mb-6 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-widest border ${
                poll.is_active
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800/60 text-slate-500 border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${poll.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                {poll.is_active ? 'Active' : 'Closed'}
              </span>

              <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${connected ? 'text-cyan-400' : 'text-slate-600'}`}>
                <Radio className="w-3 h-3" />
                {connected ? 'Live Sync' : 'Reconnecting…'}
              </span>
            </div>

            <div className="text-sm font-mono tabular-nums">
              <AnimatedCounter value={liveTotal} className="font-bold text-white text-lg" />
              <span className="text-slate-500 text-xs ml-1">
                {liveTotal === 1 ? 'response' : 'responses'}
              </span>
            </div>
          </div>

          {/* Question */}
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white font-bold tracking-tight leading-tight mb-3">
            {poll.title}
          </h1>

          {poll.description && (
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
              {poll.description}
            </p>
          )}

          {/* Options */}
          <div className="space-y-3 mt-6">
            {mergedOptions.map((opt, i) => (
              <motion.div
                key={opt.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
              >
                <PollOptionBar
                  id={opt.id}
                  text={opt.text}
                  votes={opt.vote_count}
                  total={liveTotal}
                  isSelected={selectedOption === opt.id}
                  hasVoted={hasVoted}
                  isWinner={hasVoted && opt.vote_count === winnerCount && winnerCount > 0}
                  onClick={() => { if (!hasVoted && poll.is_active) setSelectedOption(opt.id); }}
                  disabled={hasVoted || !poll.is_active}
                />
              </motion.div>
            ))}
          </div>

          {/* Action row */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-4">
            <AnimatePresence mode="wait">
              {hasVoted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" />
                  Vote recorded in real-time
                </motion.div>
              ) : !poll.is_active ? (
                <span className="text-xs font-mono text-slate-600 uppercase tracking-wider">
                  Voting is closed
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  {selectedOption ? 'Click to cast your vote.' : 'Select an option above.'}
                </span>
              )}
            </AnimatePresence>

            {!hasVoted && poll.is_active && (
              <motion.button
                id="submit-vote-btn"
                onClick={handleVote}
                disabled={!selectedOption || voting}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
              >
                {voting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{voting ? 'Casting vote…' : 'Cast vote'}</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Stream indicator */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <StreamIndicator connected={connected} msgCount={msgCount} />
          </motion.div>

          {/* Live activity feed */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <LiveActivityFeed events={events} />
          </motion.div>

          {/* QR Code card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-2xl p-5 text-center"
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
              QR Access
            </div>
            <p className="text-xs text-slate-500 mb-4">Scan to vote from any device</p>
            <div className="p-3 bg-white rounded-xl inline-block mb-3">
              <QRCodeSVG
                value={shareUrl}
                size={136}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <div className="font-mono text-[10px] text-slate-600">
              Code: <span className="font-bold text-cyan-400 uppercase">{shareCode}</span>
            </div>
          </motion.div>

          {/* Copy link card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
              Share link
            </div>
            <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-2.5 mb-3">
              <p className="text-[11px] font-mono text-slate-400 truncate">{shareUrl}</p>
            </div>
            <motion.button
              id="copy-link-btn"
              onClick={handleCopyLink}
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy poll link</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3 pb-2 border-b border-white/[0.06]">
              Response Breakdown
            </div>
            <div className="space-y-2.5">
              {mergedOptions.map(opt => {
                const pct = liveTotal > 0 ? Math.round((opt.vote_count / liveTotal) * 100) : 0;
                return (
                  <div key={opt.id} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 truncate max-w-[130px]">{opt.text}</span>
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className="font-mono text-slate-500 w-10 text-right tabular-nums">
                      {opt.vote_count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
