import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Compass, Radio } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Sidebar() {
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Explore Polls', path: '/polls', icon: Compass },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-surface)] border-r border-[var(--border)] h-screen sticky top-0 shrink-0 shadow-sm z-50">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20 shrink-0">
          <Radio className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-display font-bold text-lg tracking-tight text-[var(--navy)]">VoteHub</span>
          <div className="text-[10px] text-slate-400 font-mono">Real-time Polling</div>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-4 space-y-1">
        <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 px-3 mb-2">Navigation</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${
                  isActive
                    ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[var(--navy)] dark:hover:text-white hover:bg-[var(--accent-light)] dark:hover:bg-[var(--bg-card-hover)]'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate text-[var(--navy)]">
              {user?.username || 'User'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
