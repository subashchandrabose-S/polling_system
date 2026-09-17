import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
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
    if (username.trim().length < 3) e.username = 'Username must contain at least 3 characters';
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
      toast('Account registered successfully', 'success');
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

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white border border-stone-200 rounded-2xl p-7 sm:p-9 shadow-xs">
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-[#faf9f5] flex items-center justify-center font-serif text-lg mx-auto mb-3">
              ¶
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-stone-950">Create account</h1>
            <p className="text-stone-600 text-xs sm:text-sm mt-1">Join PollStream to dispatch and manage real-time polls</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4.5" noValidate>
            {/* Username */}
            <div>
              <label htmlFor="signup-username" className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1.5">
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: undefined })); }}
                placeholder="editor_name"
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#faf9f5] border text-stone-900 placeholder:text-stone-400 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white ${
                  errors.username ? 'border-red-400 bg-red-50/20' : 'border-stone-300 hover:border-stone-400'
                }`}
              />
              {errors.username && <p className="mt-1 text-xs font-mono text-red-600">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1.5">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                placeholder="editor@domain.com"
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#faf9f5] border text-stone-900 placeholder:text-stone-400 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white ${
                  errors.email ? 'border-red-400 bg-red-50/20' : 'border-stone-300 hover:border-stone-400'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs font-mono text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1.5">
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
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[#faf9f5] border text-stone-900 placeholder:text-stone-400 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white ${
                    errors.password ? 'border-red-400 bg-red-50/20' : 'border-stone-300 hover:border-stone-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs font-mono text-red-600">{errors.password}</p>}

              {/* Password complexity indicator */}
              {password.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < strengthScore
                            ? strengthScore <= 1 ? 'bg-red-500' : strengthScore === 2 ? 'bg-amber-500' : 'bg-emerald-600'
                            : 'bg-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-mono text-stone-500">
                    Security strength: {strengthScore <= 1 ? 'Basic' : strengthScore === 2 ? 'Moderate' : 'Strong'}
                  </p>
                </div>
              )}
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-stone-50 font-medium text-sm transition-colors shadow-xs"
            >
              {loading ? <LoadingSpinner size="sm" /> : <UserPlus className="w-4 h-4" />}
              <span>{loading ? 'Registering…' : 'Create account'}</span>
            </button>
          </form>

          <p className="text-center text-xs text-stone-500 mt-6 pt-5 border-t border-stone-100">
            Already have an account?{' '}
            <Link to="/login" className="text-stone-900 underline underline-offset-4 hover:text-stone-600 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
