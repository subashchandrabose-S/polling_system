import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Radio, Zap, Globe, Lock, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AnimatedCounter } from '../components/AnimatedCounter';

/* ── Animated grid canvas background ─────────────────────────────────────────── */
function GridCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let t = 0;

    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function draw() {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const CELL = 56;
      const cols = Math.ceil(canvas.width  / CELL) + 1;
      const rows = Math.ceil(canvas.height / CELL) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * CELL;
          const y = r * CELL;
          const dist = Math.sqrt(
            Math.pow((x - canvas.width / 2) / canvas.width, 2) +
            Math.pow((y - canvas.height / 2) / canvas.height, 2),
          );
          const wave = Math.sin(t * 0.8 - dist * 8) * 0.5 + 0.5;
          const alpha = wave * 0.08 + 0.02;
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(34,211,238,${alpha})`;
          ctx.fill();
        }
      }
      t += 0.016;
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

/* ── Floating stat card ──────────────────────────────────────────────────────── */
function StatCard({
  value, label, accent, delay
}: { value: number; label: string; accent: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl p-5 text-center"
    >
      <div className={`text-3xl font-display font-bold tabular-nums ${accent}`}>
        <AnimatedCounter value={value} duration={1500} />
      </div>
      <div className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

/* ── Feature card ────────────────────────────────────────────────────────────── */
function FeatureCard({
  icon: Icon, title, description, accent, delay
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card gradient-border rounded-2xl p-6 hover:bg-slate-800/40 transition-colors duration-300 group"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accent} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}

/* ── Landing Page ────────────────────────────────────────────────────────────── */
export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [liveCount, setLiveCount] = useState(1247);

  // Simulate live counter ticking up
  useEffect(() => {
    const id = setInterval(() => {
      setLiveCount(n => n + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a0f1e] to-slate-950" />
      <div className="absolute inset-0 grid-bg opacity-50" />
      <GridCanvas />

      {/* Radial glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pt-20 pb-24 sm:pt-32 sm:pb-32">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-cyan-500/20 text-xs font-mono text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Real-time stream engine powered by Redis Pub/Sub
            <span className="opacity-60">•</span>
            <span className="flex items-center gap-1">
              <AnimatedCounter value={liveCount} duration={600} />
              <span className="text-slate-500"> votes live</span>
            </span>
          </div>
        </motion.div>

        {/* Hero headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05] mb-6">
            Real-Time Polls{' '}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent bg-size-200 animate-shimmer">
              Powered by Redis
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Create live polls that update instantly across every device.
            Built on Redis Pub/Sub and WebSockets for sub-100ms vote propagation.
          </p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20"
        >
          <Link
            to={isAuthenticated ? '/dashboard' : '/signup'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30 glow-cyan"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Start for free'}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium text-sm transition-all duration-200"
          >
            Sign in
          </Link>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-20 max-w-2xl mx-auto">
          <StatCard value={liveCount}   label="Votes Cast"   accent="text-cyan-400"   delay={0.35} />
          <StatCard value={389}         label="Active Polls" accent="text-violet-400"  delay={0.45} />
          <StatCard value={12}          label="ms Latency"   accent="text-emerald-400" delay={0.55} />
        </div>

        {/* Feature cards */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center text-sm font-mono uppercase tracking-widest text-slate-600 mb-6"
        >
          How it works
        </motion.h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={Radio}
            title="Redis Pub/Sub Streams"
            description="Every vote is published to Redis instantly and broadcast to all connected clients via WebSocket subscriptions."
            accent="bg-red-500/15 border border-red-500/30 text-red-400"
            delay={0.65}
          />
          <FeatureCard
            icon={Zap}
            title="WebSocket Live Sync"
            description="Poll tallies update in real-time across every browser tab and device — no polling, no refresh needed."
            accent="bg-violet-500/15 border border-violet-500/30 text-violet-400"
            delay={0.72}
          />
          <FeatureCard
            icon={BarChart3}
            title="Animated Results"
            description="Watch vote counts animate live with smooth bar transitions, particle effects, and stream indicators."
            accent="bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
            delay={0.79}
          />
          <FeatureCard
            icon={Globe}
            title="QR Code Sharing"
            description="Share polls instantly with auto-generated QR codes. Anyone can scan and vote from mobile."
            accent="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            delay={0.86}
          />
          <FeatureCard
            icon={Activity}
            title="Live Activity Feed"
            description="See a real-time stream of vote events as they arrive from your audience in the live sidebar."
            accent="bg-amber-500/15 border border-amber-500/30 text-amber-400"
            delay={0.93}
          />
          <FeatureCard
            icon={Lock}
            title="Auth & Rate Limiting"
            description="JWT authentication with Redis-backed rate limiting keeps your polls secure and abuse-free."
            accent="bg-pink-500/15 border border-pink-500/30 text-pink-400"
            delay={1.0}
          />
        </div>
      </div>
    </div>
  );
}
