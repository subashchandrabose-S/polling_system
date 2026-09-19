import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart2, Clock, KeyRound, Loader2, Radio, RefreshCw, Search, Users } from 'lucide-react';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { getVotingPath } from '../utils/pollUrl';
import { api, type Poll } from '../api/client';
import { MOCK_POLLS } from '../data/mockPolls';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest ${
      active
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
        : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
      {active ? 'Live' : 'Closed'}
    </span>
  );
}

function PollPreview({ poll, index }: { poll: Poll; index: number }) {
  const topOptions = poll.options.slice(0, 3);
  const total = Math.max(poll.total_votes, ...poll.options.map(option => option.vote_count));

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl p-5 flex flex-col gap-4 border-slate-200 dark:border-slate-700/50 hover:border-cyan-500/40 transition-colors shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge active={poll.is_active} />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              Code: <span className="font-extrabold text-sm text-cyan-600 dark:text-cyan-400 tracking-wider select-all">{poll.share_code}</span>
            </span>
          </div>
          <h2 className="font-display mt-2.5 text-xl font-bold leading-snug text-slate-900 dark:text-white">
            {poll.title}
          </h2>
          {poll.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
              {poll.description}
            </p>
          )}
        </div>
        <Radio className="w-5 h-5 mt-1 text-cyan-500 shrink-0" />
      </div>

      <div className="space-y-2.5 my-1">
        {topOptions.map((option, optionIndex) => {
          const percentage = total > 0 ? Math.round((option.vote_count / total) * 100) : 0;
          return (
            <div key={option.id || optionIndex} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-slate-600 dark:text-slate-300 font-medium">{option.text}</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">{percentage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.15 + optionIndex * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                />
              </div>
            </div>
          );
        })}
        {poll.options.length > 3 && (
          <p className="text-[11px] font-mono text-slate-400">+{poll.options.length - 3} more options</p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 dark:border-white/[0.06] pt-4">
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5" title="Total votes">
            <Users className="w-3.5 h-3.5 text-cyan-500" />
            <AnimatedCounter value={total} /> {total === 1 ? 'vote' : 'votes'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            {poll.options.length} options
          </span>
        </div>
        <Link
          to={getVotingPath(poll.share_code)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105 shadow-md shadow-primary/20"
        >
          Take Poll <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.article>
  );
}

export function ExplorePage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function loadPolls() {
    setLoading(true);
    try {
      const res = await api.polls.getPublicPolls();
      if (res && res.polls && res.polls.length > 0) {
        setPolls(res.polls);
      } else {
        setPolls(MOCK_POLLS);
      }
    } catch {
      setPolls(MOCK_POLLS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolls();
  }, []);

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = joinCode.trim().replace(/^.*\/voting\//, '').replace(/^.*\/poll\//, '');
    if (cleanCode) {
      navigate(getVotingPath(cleanCode));
    }
  }

  const visiblePolls = useMemo(() => {
    return polls.filter(poll => {
      const matchesFilter = filter === 'all' || (filter === 'active' ? poll.is_active : !poll.is_active);
      const matchesSearch = !searchQuery.trim() ||
        poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poll.share_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (poll.description && poll.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [polls, filter, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12 font-sans">
      {/* Header with Title & Quick Join Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-6 border-b border-slate-200 pb-8 dark:border-white/[0.06]"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">
              <Radio className="w-3.5 h-3.5 text-cyan-500 animate-pulse" /> Public Poll Gallery
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Explore & Take Polls
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Browse public polls created by the community or enter a poll code to cast your vote instantly.
            </p>
          </div>

          {/* Quick Join Box */}
          <form onSubmit={handleJoinSubmit} className="flex items-center gap-2 max-w-md w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="Enter 8-digit poll code…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold text-xs whitespace-nowrap transition-all shadow-md shadow-primary/20"
            >
              Take Poll
            </button>
          </form>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search polls by title or code…"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={loadPolls}
              title="Refresh poll list"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>

            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              {([
                ['all', 'All'],
                ['active', 'Live'],
                ['closed', 'Closed'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === value
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Poll Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-mono">Loading real-time polls…</p>
        </div>
      ) : visiblePolls.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {visiblePolls.map((poll, index) => (
            <PollPreview key={poll.id || poll.share_code || index} poll={poll} index={index} />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-2xl py-16 text-center text-slate-500">
          <Clock className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold">No polls matched your search.</p>
          <button
            onClick={() => { setSearchQuery(''); setFilter('all'); }}
            className="mt-3 text-xs text-primary font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
