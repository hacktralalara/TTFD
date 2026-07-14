import { useEffect, useRef } from 'react';

type Star = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  depth: number; // 0 = далёкий слой, 1 = ближний; задаёт скорость параллакса
};

type Nebula = {
  x: number; // доли ширины/высоты экрана
  y: number;
  radius: number; // доля меньшей стороны
  color: string;
  depth: number;
  driftPhase: number;
};

const NEBULAS: Nebula[] = [
  { x: 0.22, y: 0.28, radius: 0.55, color: '46, 16, 101', depth: 0.15, driftPhase: 0 },
  { x: 0.78, y: 0.2, radius: 0.5, color: '13, 74, 84', depth: 0.25, driftPhase: 2.1 },
  { x: 0.55, y: 0.85, radius: 0.6, color: '30, 58, 138', depth: 0.35, driftPhase: 4.4 },
];

export function GalacticBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const applySize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    applySize();
    window.addEventListener('resize', applySize);

    // Три слоя глубины: далёкие звёзды мелкие и медленные, ближние — крупнее и быстрее.
    const stars: Star[] = [];
    for (let i = 0; i < 300; i++) {
      const depth = Math.random();
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.3 + depth * 1.6,
        speed: 0.04 + depth * 0.4,
        alpha: Math.random(),
        depth,
      });
    }

    // Параллакс от мыши и скролла, с плавным догоняющим движением.
    const mouseTarget = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };
    let scrollY = window.scrollY;

    const onMouseMove = (event: MouseEvent) => {
      mouseTarget.x = (event.clientX / width - 0.5) * 2;
      mouseTarget.y = (event.clientY / height - 0.5) * 2;
    };
    const onScroll = () => {
      scrollY = window.scrollY;
    };

    if (!reducedMotion) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    const MOUSE_RANGE = 26; // px сдвига ближнего слоя от мыши
    const SCROLL_RANGE = 0.35; // множитель сдвига от скролла для ближнего слоя

    let animationFrameId = 0;
    let time = 0;

    const drawNebulas = () => {
      const base = Math.min(width, height);
      for (const nebula of NEBULAS) {
        const drift = reducedMotion ? 0 : Math.sin(time * 0.00018 + nebula.driftPhase) * base * 0.03;
        const px = mouse.x * MOUSE_RANGE * nebula.depth;
        const py = mouse.y * MOUSE_RANGE * nebula.depth - scrollY * SCROLL_RANGE * nebula.depth;
        const cx = nebula.x * width + drift + px;
        const cy = nebula.y * height + drift * 0.6 + py;
        const r = nebula.radius * base;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `rgba(${nebula.color}, 0.16)`);
        gradient.addColorStop(0.55, `rgba(${nebula.color}, 0.07)`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const render = () => {
      time = performance.now();

      mouse.x += (mouseTarget.x - mouse.x) * 0.05;
      mouse.y += (mouseTarget.y - mouse.y) * 0.05;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      drawNebulas();

      for (const star of stars) {
        if (!reducedMotion) {
          star.y -= star.speed;
          if (star.y < -4) {
            star.y = height + 4;
            star.x = Math.random() * width;
          }

          star.alpha += (Math.random() - 0.5) * 0.05;
          if (star.alpha > 1) star.alpha = 1;
          if (star.alpha < 0.2) star.alpha = 0.2;
        }

        // Сдвиг слоя: чем ближе звезда, тем сильнее реакция на мышь и скролл.
        const px = mouse.x * MOUSE_RANGE * star.depth;
        const py = mouse.y * MOUSE_RANGE * star.depth - ((scrollY * SCROLL_RANGE * star.depth) % (height + 8));
        let x = star.x + px;
        let y = star.y + py;
        if (y < -4) y += height + 8;
        if (y > height + 4) y -= height + 8;

        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();

        if (star.radius > 1.2) {
          ctx.beginPath();
          ctx.arc(x, y, star.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * 0.2})`;
          ctx.fill();
        }
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    render();

    return () => {
      window.removeEventListener('resize', applySize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
