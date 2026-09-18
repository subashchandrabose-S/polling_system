/**
 * Lightweight canvas confetti burst — no external dependency needed.
 * Fires a burst from the center of the viewport.
 */
export function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position:fixed;inset:0;width:100vw;height:100vh;
    pointer-events:none;z-index:9999;
  `;
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d')!;
  const COLORS = ['#22d3ee','#a78bfa','#34d399','#f472b6','#fbbf24','#60a5fa'];
  const particles: {
    x: number; y: number;
    vx: number; vy: number;
    size: number;
    color: string;
    life: number;
    rot: number;
    rotV: number;
  }[] = [];

  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 3;
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.45,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: Math.random() * 6 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.3,
    });
  }

  let running = true;

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    for (const p of particles) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.25;          // gravity
      p.vx *= 0.99;          // drag
      p.life -= 0.018;
      p.rot += p.rotV;

      if (p.life <= 0) continue;
      alive = true;

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    if (alive) {
      requestAnimationFrame(draw);
    } else {
      running = false;
      canvas.remove();
    }
  }

  requestAnimationFrame(draw);
}
