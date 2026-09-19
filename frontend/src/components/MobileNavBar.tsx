import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, Plus, Compass, TrendingUp } from 'lucide-react';

export function MobileNavBar() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { label: 'Home', icon: Home, to: '/', active: path === '/' },
    { label: 'My Polls', icon: BarChart2, to: '/dashboard', active: path === '/dashboard' },
    { label: 'Create', icon: Plus, to: '/create', isCenter: true },
    { label: 'Explore', icon: Compass, to: '/#polls', active: path.startsWith('/poll') },
    { label: 'Analytics', icon: TrendingUp, to: '/dashboard', active: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
      {/* Background card container with curved top and subtle shadow/blur */}
      <div className="pointer-events-auto relative w-full bg-[#0d111c]/90 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.5)] px-4 py-2 pb-safe">
        <div className="flex items-center justify-around relative">
          {navItems.map((item, idx) => {
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <div key={idx} className="relative flex flex-col items-center -mt-6">
                  <Link
                    to={item.to}
                    aria-label="Create Poll"
                    className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-[0_4px_24px_rgba(124,58,237,0.55)] border-[3px] border-[#080b14] active:scale-95 transition-all duration-200"
                  >
                    <Plus className="w-7 h-7 stroke-[2.5]" />
                  </Link>
                  <span className="text-[11px] font-semibold text-violet-400 mt-1">
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={idx}
                to={item.to}
                className="flex flex-col items-center justify-center py-1 flex-1 transition-colors duration-150"
              >
                <div
                  className={`relative p-1 rounded-xl transition-all duration-200 ${
                    item.active ? 'text-violet-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors duration-150 ${
                    item.active ? 'text-violet-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
