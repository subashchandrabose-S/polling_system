import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Create account</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5">Join PollStream and start running live polls</p>
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
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border text-white placeholder:text-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-slate-900 ${
                  errors.username ? 'border-rose-500/60 bg-rose-500/5' : 'border-slate-700/60 hover:border-slate-600'
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
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border text-white placeholder:text-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-slate-900 ${
                  errors.email ? 'border-rose-500/60 bg-rose-500/5' : 'border-slate-700/60 hover:border-slate-600'
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
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-900/70 border text-white placeholder:text-slate-600 text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-slate-900 ${
                    errors.password ? 'border-rose-500/60 bg-rose-500/5' : 'border-slate-700/60 hover:border-slate-600'
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
                          i < strengthScore ? strengthColor : 'bg-slate-800'
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

          <p className="text-center text-xs text-slate-600 mt-6 pt-5 border-t border-white/[0.06]">
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
