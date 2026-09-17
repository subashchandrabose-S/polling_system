import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
    if (title.trim().length < 3) e.title = 'Inquiry question must be at least 3 characters';
    options.forEach((opt, i) => {
      if (opt.trim().length === 0) e[`option-${i}`] = 'Option cannot be blank';
    });
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
        expires_at: expiresAt || undefined,
      };
      const poll = await api.polls.create(token!, payload);
      toast('Inquiry published successfully', 'success');
      navigate(`/poll/${poll.share_code}`);
    } catch (err) {
      toast((err as Error).message || 'Failed to create poll', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 font-sans">
      {/* Page header */}
      <div className="pb-6 mb-8 border-b border-stone-200">
        <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
          Drafting Desk
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-950">
          Create New Inquiry
        </h1>
        <p className="text-stone-600 text-sm mt-1.5">
          Formulate your question and choices. A live tally URL and scan code will be generated immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title & Description */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-7 shadow-xs">
          <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-4 pb-2 border-b border-stone-100">
            Prompt Details
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="poll-title" className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1.5">
                Inquiry Question <span className="text-red-500">*</span>
              </label>
              <input
                id="poll-title"
                value={title}
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                placeholder="e.g. Which architectural pattern should we adopt for the new microservice?"
                maxLength={200}
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#faf9f5] border text-stone-900 placeholder:text-stone-400 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white ${
                  errors.title ? 'border-red-400 bg-red-50/20' : 'border-stone-300 hover:border-stone-400'
                }`}
              />
              {errors.title && <p className="mt-1 text-xs font-mono text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label htmlFor="poll-desc" className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1.5">
                Background Note <span className="text-stone-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                id="poll-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide essential context or boundary constraints for respondents…"
                rows={3}
                maxLength={1000}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#faf9f5] border border-stone-300 hover:border-stone-400 text-stone-900 placeholder:text-stone-400 text-sm resize-none transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
            <div className="text-xs font-mono uppercase tracking-wider text-stone-500">
              Answer Options
            </div>
            <span className="text-xs font-mono text-stone-400">{options.length} of 10 maximum</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {options.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5"
                >
                  <span className="text-xs font-mono text-stone-400 w-5 text-center shrink-0">{i + 1}.</span>
                  <div className="flex-1">
                    <input
                      id={`option-input-${i}`}
                      value={opt}
                      onChange={e => updateOption(i, e.target.value)}
                      placeholder={`Option candidate ${i + 1}`}
                      maxLength={200}
                      className={`w-full px-3.5 py-2 rounded-lg bg-[#faf9f5] border text-stone-900 placeholder:text-stone-400 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white ${
                        errors[`option-${i}`] ? 'border-red-400 bg-red-50/20' : 'border-stone-300 hover:border-stone-400'
                      }`}
                    />
                    {errors[`option-${i}`] && (
                      <p className="mt-1 text-xs font-mono text-red-600">{errors[`option-${i}`]}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    title="Remove option"
                    className="shrink-0 p-1.5 rounded text-stone-400 hover:text-red-700 hover:bg-stone-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </AnimatePresence>
          </div>

          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-950 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add another option</span>
            </button>
          )}
        </div>

        {/* Expiration Settings */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-7 shadow-xs">
          <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-4 pb-2 border-b border-stone-100">
            Scheduling & Boundaries
          </div>
          <div>
            <label htmlFor="poll-expires" className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-stone-700 mb-2">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              Scheduled Closure <span className="text-stone-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="poll-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="px-3.5 py-2 rounded-lg bg-[#faf9f5] border border-stone-300 hover:border-stone-400 text-stone-900 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white"
            />
            <p className="text-xs text-stone-500 mt-1.5">
              Leave empty to keep the inquiry open until concluded manually from your overview.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          id="create-poll-submit"
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-stone-50 font-medium text-sm transition-colors shadow-xs"
        >
          {loading ? <LoadingSpinner size="sm" /> : null}
          <span>{loading ? 'Publishing dispatch…' : 'Publish inquiry & view live code'}</span>
        </button>
      </form>
    </div>
  );
}
