import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Check, Copy, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';
import type { Poll, VoteTally } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLivePoll } from '../hooks/useLivePoll';
import { useToast } from '../components/Toast';
import { PollOptionBar } from '../components/PollOptionBar';

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

  // Live tally from WebSocket
  const { counts, totalVoters, connected } = useLivePoll(shareCode);

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
      toast('Your response was counted.', 'success');
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('already voted')) {
        setHasVoted(true);
        localStorage.setItem(votedKey, '1');
        toast('You have already submitted a vote on this poll.', 'info');
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-stone-500 font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-stone-700" />
          <span>Opening dispatch…</span>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (fetchError || !poll) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center p-8 bg-white border border-stone-200 rounded-2xl max-w-md">
          <p className="font-serif text-2xl text-stone-950 mb-2">Inquiry Not Found</p>
          <p className="text-stone-600 text-sm">{fetchError || 'This poll code is invalid or has been archived.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── Main poll card (Editorial Broadside) ───────────────────────────── */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 shadow-xs">
          {/* Metadata bar */}
          <div className="flex items-center justify-between gap-4 pb-5 mb-6 border-b border-stone-100 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider border ${
                  poll.is_active
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-stone-100 text-stone-600 border-stone-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${poll.is_active ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                {poll.is_active ? 'Active Inquiry' : 'Concluded'}
              </span>

              <span className={`inline-flex items-center gap-1.5 text-stone-500`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                <span>{connected ? 'Live Sync' : 'Reconnecting'}</span>
              </span>
            </div>

            <div className="text-stone-600 tabular-nums">
              <span className="font-semibold text-stone-900">{liveTotal}</span>{' '}
              {liveTotal === 1 ? 'total response' : 'total responses'}
            </div>
          </div>

          {/* Question Headline */}
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-950 font-normal tracking-tight leading-tight mb-3">
            {poll.title}
          </h1>

          {poll.description && (
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-8">
              {poll.description}
            </p>
          )}

          {/* Options */}
          <div className="space-y-3 mt-6">
            {mergedOptions.map(opt => (
              <PollOptionBar
                key={opt.id}
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
            ))}
          </div>

          {/* Action row */}
          <div className="mt-8 pt-6 border-t border-stone-200 flex items-center justify-between flex-wrap gap-4">
            <AnimatePresence mode="wait">
              {hasVoted ? (
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  Response recorded in real-time
                </div>
              ) : !poll.is_active ? (
                <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">
                  Voting is closed for this inquiry
                </span>
              ) : (
                <span className="text-xs text-stone-500">
                  {selectedOption ? 'Click cast vote to commit your choice.' : 'Select an option to vote.'}
                </span>
              )}
            </AnimatePresence>

            {!hasVoted && poll.is_active && (
              <button
                id="submit-vote-btn"
                onClick={handleVote}
                disabled={!selectedOption || voting}
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed bg-stone-900 hover:bg-stone-800 text-stone-50"
              >
                {voting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{voting ? 'Casting vote…' : 'Cast vote'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Sidebar: QR Code & Link Sharing ───────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">
          {/* Share & QR Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs text-center">
            <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
              Live QR Access
            </div>
            <p className="text-xs text-stone-600 mb-4">
              Scan from any mobile device to participate
            </p>
            <div className="p-3 bg-[#faf9f5] border border-stone-200/80 rounded-xl inline-block mb-4">
              <QRCodeSVG
                value={shareUrl}
                size={148}
                level="M"
                bgColor="#faf9f5"
                fgColor="#1c1917"
              />
            </div>
            <div className="font-mono text-[11px] text-stone-400">
              Code: <span className="font-bold text-stone-700 uppercase">{shareCode}</span>
            </div>
          </div>

          {/* Copy link card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">
              Share link
            </div>
            <div className="bg-[#faf9f5] border border-stone-200 rounded-lg p-2.5 mb-3">
              <p className="text-xs font-mono text-stone-600 truncate">{shareUrl}</p>
            </div>
            <button
              id="copy-link-btn"
              onClick={handleCopyLink}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Copied to clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy inquiry URL</span>
                </>
              )}
            </button>
          </div>

          {/* Participation breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-3 pb-2 border-b border-stone-100">
              Response Breakdown
            </div>
            <div className="space-y-2.5">
              {mergedOptions.map(opt => {
                const pct = liveTotal > 0 ? Math.round((opt.vote_count / liveTotal) * 100) : 0;
                return (
                  <div key={opt.id} className="flex items-center justify-between text-xs">
                    <span className="text-stone-700 truncate max-w-[150px]">{opt.text}</span>
                    <span className="font-mono font-medium tabular-nums text-stone-900">
                      {opt.vote_count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
