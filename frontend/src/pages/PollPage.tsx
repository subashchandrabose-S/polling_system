import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, KeyRound, Loader2, Radio, Share2, MessageCircle, Compass } from 'lucide-react';
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
import { getVotingPath, getVotingUrl } from '../utils/pollUrl';

export function PollPage() {
  const { shareCode: routeShareCode } = useParams<{ shareCode?: string }>();
  const [searchParams] = useSearchParams();
  const rawShareCode = routeShareCode || searchParams.get('code') || searchParams.get('shareCode') || undefined;
  const shareCode = rawShareCode ? rawShareCode.trim() : undefined;
  
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualCode, setManualCode] = useState('');

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
  const shareUrl = shareCode ? getVotingUrl(shareCode) : '';

  // Load poll on mount
  useEffect(() => {
    if (!shareCode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError('');
    api.polls.getByShareCode(shareCode)
      .then(setPoll)
      .catch(err => setFetchError((err as Error).message || 'Poll not found'))
      .finally(() => setLoading(false));
  }, [shareCode]);

  // Check if already voted (session-level via localStorage)
  const votedKey = `voted:${shareCode}`;
  useEffect(() => {
    if (shareCode && localStorage.getItem(votedKey)) {
      setHasVoted(true);
    } else {
      setHasVoted(false);
    }
  }, [votedKey, shareCode]);

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
      toast('Poll link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy link', 'error');
    }
  }

  function handleManualJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = manualCode.trim().replace(/^.*\/voting\//, '').replace(/^.*\/poll\//, '');
    if (cleanCode) {
      navigate(getVotingPath(cleanCode));
    }
  }

  // ── No shareCode provided or empty state ──────────────────────────────────
  if (!shareCode) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 sm:p-10 shadow-xl border-slate-200 dark:border-slate-700/60"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
            <Radio className="w-7 h-7" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
            Join & Take a Poll
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            Enter an 8-character poll code to jump into the voting booth instantly.
          </p>

          <form onSubmit={handleManualJoin} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="e.g. 7kX9pLmQ"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-base font-mono text-center text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold text-sm transition-all shadow-lg shadow-primary/25"
            >
              Open Voting Booth →
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
            <Link
              to="/polls"
              className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              <Compass className="w-4 h-4" /> Browse all active public polls
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="relative">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full border border-primary/30 animate-pulse" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest">Connecting to live poll…</span>
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
          <p className="font-display text-xl text-slate-900 dark:text-white mb-2">Poll Not Found</p>
          <p className="text-slate-400 text-sm mb-6">{fetchError || 'This share code is invalid or has expired.'}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/polls"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-md shadow-primary/20"
            >
              Explore Public Polls
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium"
            >
              Return Home
            </Link>
          </div>
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
          className="lg:col-span-8 glass-card rounded-2xl p-6 sm:p-10 shadow-sm border-slate-200 dark:border-slate-700/50"
        >
          {/* Status bar */}
          <div className="flex items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-widest border ${
                poll.is_active
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${poll.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {poll.is_active ? 'Active' : 'Closed'}
              </span>

              <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${connected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`}>
                <Radio className="w-3.5 h-3.5" />
                {connected ? 'Live Sync' : 'Reconnecting…'}
              </span>
            </div>

            <div className="text-sm font-mono tabular-nums">
              <AnimatedCounter value={liveTotal} className="font-bold text-slate-900 dark:text-white text-lg" />
              <span className="text-slate-500 text-xs ml-1">
                {liveTotal === 1 ? 'vote cast' : 'votes cast'}
              </span>
            </div>
          </div>

          {/* Question */}
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white font-bold tracking-tight leading-tight mb-3">
            {poll.title}
          </h1>

          {poll.description && (
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
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
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between flex-wrap gap-4">
            <AnimatePresence mode="wait">
              {hasVoted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl"
                >
                  <Check className="w-4 h-4 text-emerald-500" />
                  Your vote has been counted!
                </motion.div>
              ) : !poll.is_active ? (
                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                  Voting is closed for this poll
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  {selectedOption ? 'Ready to cast your vote.' : 'Select an option above to vote.'}
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
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
              >
                {voting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{voting ? 'Casting vote…' : 'Submit My Vote'}</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Stream indicator */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <StreamIndicator connected={connected} msgCount={msgCount} />
          </motion.div>

          {/* Share Box with QR & Instant Social Links */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Public Share Link
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-mono font-medium">
                Anyone can vote
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Share this link or QR code with anyone. No account or login required to vote.
            </p>

            {/* QR Preview */}
            <div className="mx-auto mb-4 p-3 bg-white rounded-xl max-w-fit shadow-sm border border-slate-100">
              <QRCodeSVG
                value={shareUrl}
                size={140}
                level="H"
                bgColor="#ffffff"
                fgColor="#0f172a"
                includeMargin
                className="max-w-full h-auto"
              />
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-3.5 text-center mb-4 border border-slate-200 dark:border-slate-700/60 shadow-inner">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                Poll Code
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-cyan-600 dark:text-cyan-400 select-all">
                {shareCode}
              </div>
            </div>

            {/* Copy Button */}
            <motion.button
              id="copy-link-btn"
              onClick={handleCopyLink}
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 mb-3"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Direct Vote Link</span>
                </>
              )}
            </motion.button>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Vote on this live poll: ${poll.title} ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Vote on: "${poll.title}"`)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-500 hover:text-cyan-500 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-500" />
                Twitter / X
              </a>
            </div>
          </motion.div>

          {/* Live activity feed */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <LiveActivityFeed events={events} />
          </motion.div>

        </div>

      </div>
    </div>
  );
}
