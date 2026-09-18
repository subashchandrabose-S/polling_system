import { motion } from 'framer-motion';

interface PollOptionBarProps {
  id: string;
  text: string;
  votes: number;
  total: number;
  isSelected: boolean;
  hasVoted: boolean;
  isWinner: boolean;
  onClick: () => void;
  disabled: boolean;
}

export function PollOptionBar({
  id,
  text,
  votes,
  total,
  isSelected,
  hasVoted,
  isWinner,
  onClick,
  disabled,
}: PollOptionBarProps) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;

  return (
    <button
      id={`option-${id}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 ${
        hasVoted
          ? isWinner
            ? 'border-cyan-500/50 bg-slate-800/70 shadow-lg shadow-cyan-500/10'
            : 'border-slate-700/60 bg-slate-900/50'
          : isSelected
          ? 'border-cyan-500/70 bg-slate-800/80 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-500/20'
          : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-500/70 hover:bg-slate-800/50 cursor-pointer'
      }`}
    >
      {/* Animated result fill bar */}
      {hasVoted && (
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-xl ${
            isWinner
              ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/10'
              : 'bg-slate-700/25'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* Winner neon border glow */}
      {hasVoted && isWinner && (
        <div className="absolute inset-0 rounded-xl border border-cyan-500/30 pointer-events-none animate-glow-pulse" />
      )}

      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Left: indicator + text */}
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className={`w-4 h-4 rounded-full shrink-0 border-2 transition-all duration-300 flex items-center justify-center ${
              isSelected && !hasVoted
                ? 'border-cyan-400 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                : hasVoted && isWinner
                ? 'border-cyan-400 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                : 'border-slate-600 bg-transparent group-hover:border-slate-400'
            }`}
          >
            {(isSelected || (hasVoted && isWinner)) && (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
            )}
          </span>
          <span
            className={`text-sm sm:text-base leading-snug tracking-tight truncate ${
              isSelected || (hasVoted && isWinner)
                ? 'font-semibold text-white'
                : 'font-medium text-slate-300'
            }`}
          >
            {text}
          </span>
        </div>

        {/* Right: percentage + count */}
        {hasVoted && (
          <div className="text-right shrink-0">
            <div
              className={`text-lg font-display font-bold tabular-nums ${
                isWinner ? 'text-cyan-400 text-glow-cyan' : 'text-slate-500'
              }`}
            >
              {pct}%
            </div>
            <div className="text-[10px] font-mono text-slate-600 tabular-nums">
              {votes} {votes === 1 ? 'vote' : 'votes'}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
