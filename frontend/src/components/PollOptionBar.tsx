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
      className={`w-full text-left p-4 sm:p-4.5 rounded-xl border transition-all relative overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
        hasVoted
          ? isWinner
            ? 'border-stone-900 bg-stone-100/70 shadow-xs'
            : 'border-stone-200/80 bg-white/70'
          : isSelected
          ? 'border-stone-900 bg-stone-100/80 ring-1 ring-stone-900/10'
          : 'border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50/70 cursor-pointer shadow-xs'
      }`}
    >
      {/* Animated result fill bar */}
      {hasVoted && (
        <motion.div
          className={`absolute inset-y-0 left-0 ${
            isWinner ? 'bg-stone-200/90' : 'bg-stone-100/80'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        />
      )}

      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Left: radio indicator + text */}
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className={`w-4 h-4 rounded-full shrink-0 border transition-all flex items-center justify-center ${
              isSelected && !hasVoted
                ? 'border-stone-900 bg-stone-900'
                : hasVoted && isWinner
                ? 'border-stone-900 bg-stone-900'
                : 'border-stone-300 bg-white group-hover:border-stone-500'
            }`}
          >
            {(isSelected || (hasVoted && isWinner)) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#faf9f5]" />
            )}
          </span>
          <span
            className={`text-sm sm:text-base leading-relaxed tracking-tight ${
              isSelected || (hasVoted && isWinner)
                ? 'font-semibold text-stone-950'
                : 'font-normal text-stone-800'
            }`}
          >
            {text}
          </span>
        </div>

        {/* Right: percentage + vote count */}
        {hasVoted && (
          <div className="text-right shrink-0">
            <div
              className={`text-base font-serif font-semibold tabular-nums ${
                isWinner ? 'text-stone-950' : 'text-stone-600'
              }`}
            >
              {pct}%
            </div>
            <div className="text-[11px] font-mono text-stone-500 tabular-nums">
              {votes} {votes === 1 ? 'vote' : 'votes'}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
