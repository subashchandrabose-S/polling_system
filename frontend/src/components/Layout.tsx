import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Plus, Search, Bell, Radio, Sun, Moon, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { MobileNavBar } from './MobileNavBar';
import { Sidebar } from './Sidebar';
import { useTheme } from '../context/ThemeContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme, isDark } = useTheme();

  function handleLogout() {
    logout();
    navigate('/');
  }

  // Hide topnav on dashboard if using full sidebar layout, or we can make a specific topnav for dashboard
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/create') || location.pathname.startsWith('/analytics');

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex font-sans selection:bg-primary/20 selection:text-primary">
      {/* Sidebar for authenticated routes */}
      {isAuthenticated && isDashboardRoute && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Header ────────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[var(--border)] shadow-sm">
          <nav className="w-full px-3 sm:px-8 h-16 flex items-center justify-between gap-2">

            {/* Left Section (Brand or Search) */}
            <div className="flex items-center gap-6 flex-1">
              {!(isAuthenticated && isDashboardRoute) && (
                <>
                  <Link to="/" className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-95">
                      <Radio className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden min-[380px]:inline font-display text-xl font-bold tracking-tight text-navy">
                      VoteHub
                    </span>
                  </Link>

                  <NavLink
                    to="/polls"
                    className={({ isActive }) =>
                      `hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-600 dark:text-slate-300 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Explore Polls
                  </NavLink>
                </>
              )}

              {/* Search Bar for Dashboard */}
              {isAuthenticated && isDashboardRoute && (
                <div className="hidden md:flex relative max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search polls, topics..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>

            {/* Right actions */}
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-4 shrink-0">
              <button
                aria-label="Toggle theme"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 rounded-xl text-slate-400 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {isAuthenticated ? (
                <>
                  <button aria-label="Notifications" className="p-2 text-slate-400 hover:text-navy dark:hover:text-white transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[var(--bg-surface)]"></span>
                  </button>

                  <NavLink
                    to="/create"
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white transition-all duration-200 hover-lift shadow-md shadow-primary/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create New</span>
                  </NavLink>

                  <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary-hover text-white transition-all hover-lift shadow-md shadow-primary/20"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* ── Page content ──────────────────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-x-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>

        <MobileNavBar />

        {/* ── Footer ────────────────────────────────────────────────────────────── */}
        {!isDashboardRoute && (
          <footer className="border-t border-slate-200 dark:border-[var(--border)] py-8 pb-24 md:pb-8 bg-white dark:bg-[var(--bg-base)] mt-auto">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-primary" />
                <span>VoteHub Engine — Distributed Real-Time Polling</span>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
