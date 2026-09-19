import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Plus, Trash2, Radio } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getVotingPath } from '../utils/pollUrl';

export function CreatePollPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addOption() {
    if (options.length < 10) setOptions(prev => [...prev, '']);
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    setOptions(prev => prev.map((o, idx) => (idx === i ? val : o)));
    setErrors(prev => { const n = { ...prev }; delete n[`option-${i}`]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = 'Question must be at least 3 characters';
    options.forEach((opt, i) => {
      if (opt.trim().length === 0) e[`option-${i}`] = 'Option cannot be blank';
    });
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      e.expiresAt = 'Expiry must be in the future';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Parameters<typeof api.polls.create>[1] = {
        title: title.trim(),
        description: description.trim() || undefined,
        options: options.map(t => ({ text: t.trim() })),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };
      const poll = await api.polls.create(token!, payload);
      toast('Poll published successfully! 🎉', 'success');
      navigate(getVotingPath(poll.share_code), { replace: true });
    } catch (err) {
      toast((err as Error).message || 'Failed to create poll', 'error');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/70 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-white dark:focus:bg-slate-900 ${
      hasError ? 'border-rose-500/60 bg-rose-500/5' : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
    }`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 font-sans">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pb-6 mb-8 border-b border-slate-200 dark:border-white/[0.06]"
      >
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
          <Radio className="w-3.5 h-3.5 text-cyan-500/50" />
          Broadcast Studio
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Create New Poll
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          Your poll goes live instantly — votes stream in real-time via Redis Pub/Sub.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Title & Description */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-2xl p-6 sm:p-7"
        >
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-4 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
            Question Details
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="poll-title" className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                Your Question <span className="text-cyan-500">*</span>
              </label>
              <input
                id="poll-title"
                value={title}
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                placeholder="e.g. What's our most important goal for Q4?"
                maxLength={200}
                className={inputClass(!!errors.title)}
              />
              {errors.title && <p className="mt-1 text-[11px] font-mono text-rose-400">{errors.title}</p>}
            </div>
            <div>
              <label htmlFor="poll-desc" className="block text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1.5">
                Context <span className="text-slate-700 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                id="poll-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide background or context for respondents…"
                rows={3}
                maxLength={1000}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm resize-none transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
          </div>
        </motion.div>

        {/* Options */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-2xl p-6 sm:p-7"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
              Answer Options
            </div>
            <span className="text-[10px] font-mono text-slate-700">{options.length}/10</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {options.map((opt, i) => (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2.5"
                >
                  <span className="text-[10px] font-mono text-slate-700 w-5 text-center shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <input
                      id={`option-input-${i}`}
                      value={opt}
                      onChange={e => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      maxLength={200}
                      className={inputClass(!!errors[`option-${i}`])}
                    />
                    {errors[`option-${i}`] && (
                      <p className="mt-1 text-[11px] font-mono text-rose-400">{errors[`option-${i}`]}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="shrink-0 p-1.5 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-cyan-400 transition-colors duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Add option
            </button>
          )}
        </motion.div>

        {/* Expiration */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-2xl p-6 sm:p-7"
        >
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-4 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
            Schedule & Expiry
          </div>
          <label htmlFor="poll-expires" className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
            <Calendar className="w-3.5 h-3.5" />
            Auto-close at <span className="text-slate-700 font-normal lowercase ml-1">(optional)</span>
          </label>
          <input
            id="poll-expires"
            type="datetime-local"
            value={expiresAt}
            onChange={e => { setExpiresAt(e.target.value); setErrors(p => ({ ...p, expiresAt: '' })); }}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-white text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          />
          {errors.expiresAt && <p className="mt-1 text-[11px] font-mono text-rose-400">{errors.expiresAt}</p>}
          <p className="text-[11px] text-slate-700 mt-2 font-mono">
            Leave empty to keep open until manually closed.
          </p>
        </motion.div>

        {/* Submit */}
        <motion.button
          id="create-poll-submit"
          type="submit"
          disabled={loading}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 disabled:opacity-50 text-white font-semibold text-sm transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/20"
        >
          {loading ? <LoadingSpinner size="sm" /> : null}
          <span>{loading ? 'Publishing poll…' : '🚀 Publish & get live link'}</span>
        </motion.button>
      </form>
    </div>
  );
}
