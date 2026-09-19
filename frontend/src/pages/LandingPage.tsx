import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, KeyRound, Radio } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getVotingPath } from '../utils/pollUrl';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [pollCode, setPollCode] = useState('');
  const navigate = useNavigate();

  function handleQuickVote(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = pollCode.trim().replace(/^.*\/voting\//, '').replace(/^.*\/poll\//, '');
    if (cleanCode) {
      navigate(getVotingPath(cleanCode));
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden font-sans bg-[var(--bg-base)] flex items-center">

      {/* Decorative Wavy Background Shape */}
      <div className="absolute right-0 top-0 bottom-0 w-[55%] pointer-events-none overflow-hidden z-0 hidden lg:block">
        <svg viewBox="0 0 800 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-[-10%] top-[-10%] h-[120%] w-auto opacity-80 animate-float" style={{ animationDuration: '8s' }}>
          <path d="M720.5 491.5C834 681 928 857 783 954C638 1051 354 1069 203.5 918.5C53 768 -35.5 450.5 13 259.5C61.5 68.5 248.5 -5.00003 440.5 0.999966C632.5 6.99996 607 302 720.5 491.5Z" fill="url(#paint0_linear_wave)"/>
          <defs>
            <linearGradient id="paint0_linear_wave" x1="13" y1="0.999966" x2="783" y2="954" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E5F0FF" />
              <stop offset="1" stopColor="#B3D4FF" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Floating Elements (Blue Pill and Dots) */}
      <div className="absolute right-[15%] bottom-[20%] w-24 h-48 bg-primary rounded-full rotate-45 z-0 hidden lg:block opacity-90 hover-lift" style={{ animation: 'float 6s ease-in-out infinite' }}></div>
      <div className="absolute right-[10%] top-[30%] w-12 h-12 bg-red-400 rounded-xl rotate-12 z-0 hidden lg:block hover-lift" style={{ animation: 'float 5s ease-in-out infinite 1s' }}></div>

      <div className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-8 grid lg:grid-cols-2 gap-12 items-center py-12">

        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-light text-primary text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            VoteHub Realtime Polling Engine
          </div>

          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-navy leading-[1.1] mb-6">
            Ask. Share.<br />
            <span className="text-primary">Anyone Can Vote.</span>
          </h1>

          <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-lg">
            Create polls and share with anyone across the globe. No login required for voters — real-time results sync with sub-100ms latency.
          </p>

          {/* Quick Enter Code Box */}
          <form onSubmit={handleQuickVote} className="glass-card p-2 sm:p-2.5 rounded-2xl mb-8 flex flex-col sm:flex-row items-center gap-2 border-slate-200 dark:border-slate-700/60 shadow-lg">
            <div className="relative flex-1 w-full">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={pollCode}
                onChange={e => setPollCode(e.target.value)}
                placeholder="Have a poll code? Enter code here…"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-transparent border-none text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={!pollCode.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 disabled:opacity-40 text-white font-semibold text-sm transition-all shadow-md shadow-cyan-500/20 whitespace-nowrap"
            >
              Vote Now →
            </button>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
            <Link
              to={isAuthenticated ? '/create' : '/signup'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-all duration-200 hover-lift shadow-lg shadow-primary/30"
            >
              {isAuthenticated ? 'Create a Poll' : 'Create a Poll Free'}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Instant Anonymous Voting
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              WebSocket + Redis Sync
            </div>
          </div>
        </motion.div>

        {/* Right Content: Floating Interactive Card Example */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden lg:block z-10"
        >
          <div className="glass-card p-8 shadow-2xl hover-lift bg-white/95 dark:bg-[var(--bg-card)]/95 backdrop-blur-xl border border-white dark:border-[var(--border)] max-w-sm mx-auto rounded-[24px]">

            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold text-primary bg-accent-light px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-primary animate-pulse" /> Live Poll
              </span>
              <span className="text-xs font-mono text-slate-400">
                1,123 votes
              </span>
            </div>

            <h3 className="font-display text-xl font-bold text-navy dark:text-white mb-6 leading-snug">
              What is your primary programming language for 2026?
            </h3>

            <div className="space-y-3">
              {/* Option 1 */}
              <div className="relative group p-3.5 rounded-xl border border-primary/40 bg-primary/5 dark:bg-primary/10 transition-colors">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="font-semibold text-navy dark:text-white">Go (Golang)</span>
                  </div>
                  <span className="font-bold text-primary">52%</span>
                </div>
              </div>

              {/* Option 2 */}
              <div className="relative group p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">TypeScript / React</span>
                  </div>
                  <span className="font-bold text-slate-500 dark:text-slate-400">34%</span>
                </div>
              </div>

              {/* Option 3 */}
              <div className="relative group p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Rust</span>
                  </div>
                  <span className="font-bold text-slate-500 dark:text-slate-400">14%</span>
                </div>
              </div>
            </div>

            <Link
              to="/polls"
              className="block w-full mt-6 py-3 rounded-xl text-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-navy dark:text-white font-semibold text-xs transition-colors"
            >
              Browse All Active Polls →
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
