import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';

const BACKEND_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const oauthUrl = (provider: string) =>
  BACKEND_BASE
    ? `${BACKEND_BASE}/api/v1/auth/oauth/${provider}`
    : `/api/v1/auth/oauth/${provider}`;

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.4 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.6A14.7 14.7 0 019.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 000 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.4-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-3.9-13.5-9.4l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.02-.01-2-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.62-2.81 5.63-5.48 5.93.43.37.82 1.1.82 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.83.58C20.57 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
  </svg>
);


export function SignupPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (username.trim().length < 3) e.username = 'Username must be at least 3 characters';
    if (!email.includes('@') || !email.includes('.')) e.email = 'Please provide a valid email address';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.auth.signup(username.trim(), email, password);
      login(res.token, res.user);
      toast('Account created successfully! 🎉', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast((err as Error).message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  const strengthScore = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const strengthLabel = strengthScore <= 1 ? 'Weak' : strengthScore === 2 ? 'Moderate' : 'Strong';
  const strengthColor = strengthScore <= 1 ? 'bg-rose-500' : strengthScore === 2 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 font-sans">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card gradient-border rounded-2xl p-7 sm:p-9">
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/25">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Create account</h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1.5">Join PollStream and start running live polls</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username */}
            <div>
              <label htmlFor="signup-username" className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: undefined })); }}
                placeholder="your_username"
                className={`w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/70 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-white dark:focus:bg-slate-900 ${
                  errors.username ? 'border-rose-500/60 bg-rose-500/5' : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              />
              {errors.username && <p className="mt-1 text-[11px] font-mono text-rose-400">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                placeholder="you@domain.com"
                className={`w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/70 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-white dark:focus:bg-slate-900 ${
                  errors.email ? 'border-rose-500/60 bg-rose-500/5' : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              />
              {errors.email && <p className="mt-1 text-[11px] font-mono text-rose-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl bg-white dark:bg-slate-900/70 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-white dark:focus:bg-slate-900 ${
                    errors.password ? 'border-rose-500/60 bg-rose-500/5' : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11px] font-mono text-rose-400">{errors.password}</p>}

              {/* Strength meter */}
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2.5"
                >
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-400 ${
                          i < strengthScore ? strengthColor : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-slate-600">
                    Strength: <span className="text-slate-400">{strengthLabel}</span>
                  </p>
                </motion.div>
              )}
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 disabled:opacity-50 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/25"
            >
              {loading ? <LoadingSpinner size="sm" /> : <UserPlus className="w-4 h-4" />}
              <span>{loading ? 'Creating account…' : 'Create account'}</span>
            </button>
          </form>

          {/* Social OAuth divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="px-3 bg-white dark:bg-[var(--bg-card)] text-slate-500 font-mono uppercase tracking-widest">
                or sign up with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              id="signup-google"
              href={oauthUrl('google')}
              className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20 hover:scale-[1.02] active:scale-95"
            >
              <GoogleIcon />
              Google
            </a>
            <a
              id="signup-github"
              href={oauthUrl('github')}
              className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20 hover:scale-[1.02] active:scale-95"
            >
              <GithubIcon />
              GitHub
            </a>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6 pt-5 border-t border-slate-200 dark:border-white/[0.06]">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
