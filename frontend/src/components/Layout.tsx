import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Plus, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-slate-200 flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-100">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-white/[0.06]">
        <nav className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-transform duration-200 group-hover:scale-95">
              <Radio className="w-4 h-4 text-white" />
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-xl border border-cyan-400/50 animate-pulse-ring" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              PollStream
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
              Live
            </span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-white bg-white/10 border border-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/create"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-cyan-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Poll</span>
                </NavLink>

                {/* User avatar */}
                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                    {user?.username?.[0] || 'U'}
                  </div>
                  <span className="text-xs text-slate-400 max-w-[80px] truncate font-medium">
                    {user?.username}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white transition-all duration-200 hover:scale-105 hover:shadow-md hover:shadow-cyan-500/20"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Page content ──────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <motion.div
          key={typeof window !== 'undefined' ? window.location.pathname : 'page'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-500/60" />
            <span>PollStream Engine — Distributed Real-Time Polling</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Go · Redis Pub/Sub · WebSockets · MongoDB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
