import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] text-stone-900 flex flex-col font-sans selection:bg-stone-200 selection:text-stone-900">
      {/* Editorial Header */}
      <header className="sticky top-0 z-40 bg-[#faf9f5]/90 backdrop-blur-md border-b border-stone-200/80">
        <nav className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo / Brand mark */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-[#faf9f5] flex items-center justify-center font-serif text-base font-semibold shadow-xs transition-transform group-hover:scale-95">
              ¶
            </div>
            <span className="font-serif text-xl tracking-tight font-medium text-stone-950">
              PollStream
            </span>
            <span className="hidden md:inline-block ml-1 px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider text-stone-600 bg-stone-200/60 rounded border border-stone-300/60">
              Dispatches
            </span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'text-stone-950 bg-stone-200/70'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`
                  }
                >
                  Overview
                </NavLink>

                <NavLink
                  to="/create"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-stone-900 hover:bg-stone-800 text-stone-50 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Draft Poll</span>
                </NavLink>

                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-stone-200">
                  <div className="w-6 h-6 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center text-xs font-serif font-medium text-stone-700 uppercase">
                    {user?.username?.[0] || 'U'}
                  </div>
                  <span className="text-xs text-stone-600 max-w-[90px] truncate font-medium">{user?.username}</span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-950 hover:bg-stone-200/50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-stone-900 hover:bg-stone-800 text-stone-50 transition-colors shadow-xs"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 pb-16">{children}</main>

      {/* Understated Editorial Footer */}
      <footer className="border-t border-stone-200/80 bg-[#f5f3ec]/60 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-600" />
            <span>PollStream Engine • Distributed Live Polling</span>
          </div>
          <div className="text-stone-600">
            Engineered with Go, Redis & WebSockets
          </div>
        </div>
      </footer>
    </div>
  );
}
