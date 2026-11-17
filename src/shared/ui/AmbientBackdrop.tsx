import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_THEME_KEY,
  SYSTEM_THEME_MAP,
  resolveThemeKey,
  type ThemeKey,
} from '@/src/shared/theme/themes';

interface TwinklePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  glowRadius: number;
  phase: number;
  speed: number;
  maxAlpha: number;
  color: 'primary' | 'ivory' | 'tertiary' | 'secondary';
}

const COLOR_KEYS: TwinklePoint['color'][] = [
  'primary',
  'secondary',
  'ivory',
  'tertiary',
  'secondary',
  'ivory',
];

function createPoint(width: number, height: number, randomPhase = false): TwinklePoint {
  const radius = 0.55 + Math.random() * 0.75;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.1,
    vy: (Math.random() - 0.5) * 0.08 - 0.02,
    radius,
    glowRadius: radius * (2.4 + Math.random() * 1.8),
    phase: randomPhase ? Math.random() * Math.PI : 0,
    speed: 0.005 + Math.random() * 0.009,
    maxAlpha: 0.16 + Math.random() * 0.22,
    color: COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
  };
}

export const AmbientBackdrop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeKey, setThemeKey] = useState<ThemeKey>(() =>
    typeof document !== 'undefined'
      ? resolveThemeKey(document.documentElement.dataset.theme)
      : DEFAULT_THEME_KEY
  );
  const themeKeyRef = useRef<ThemeKey>(themeKey);

  useEffect(() => {
    themeKeyRef.current = themeKey;
  }, [themeKey]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncTheme = () => {
      setThemeKey(resolveThemeKey(document.documentElement.dataset.theme));
    };
    syncTheme();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          syncTheme();
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const calcPointCount = (w: number, h: number) => {
      const area = w * h;
      return Math.max(18, Math.min(34, Math.round(area / 52000)));
    };

    let points: TwinklePoint[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = calcPointCount(width, height);
      if (points.length === 0) {
        points = Array.from({ length: targetCount }, () => createPoint(width, height, true));
      } else if (points.length < targetCount) {
        while (points.length < targetCount) {
          points.push(createPoint(width, height, true));
        }
      } else if (points.length > targetCount) {
        points = points.slice(0, targetCount);
      }
    };

    const getPalette = (color: TwinklePoint['color']) => {
      const p = SYSTEM_THEME_MAP[themeKeyRef.current].particleColors;
      if (color === 'primary') {
        return { core: 'rgba(255, 255, 255, 0.85)', mid: p.primaryMid, outer: p.primaryOuter };
      }
      if (color === 'secondary') {
        return { core: 'rgba(255, 255, 255, 0.85)', mid: p.secondaryMid, outer: p.secondaryOuter };
      }
      if (color === 'tertiary') {
        return { core: 'rgba(255, 255, 255, 0.82)', mid: p.tertiaryMid, outer: p.tertiaryOuter };
      }
      return {
        core: 'rgba(255, 255, 255, 0.90)',
        mid: 'rgba(255, 255, 255, 0.45)',
        outer: 'rgba(255, 255, 255, 0)',
      };
    };

    const drawPoint = (p: TwinklePoint, alpha: number) => {
      if (alpha <= 0.01) return;
      const palette = getPalette(p.color);

      ctx.save();
      ctx.globalAlpha = alpha;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowRadius);
      grad.addColorStop(0, palette.core);
      grad.addColorStop(0.35, palette.mid);
      grad.addColorStop(1, palette.outer);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    resize();

    let rafId = 0;

    const renderStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of points) {
        const alpha = Math.sin(p.phase) * p.maxAlpha;
        drawPoint(p, Math.max(0.1, alpha));
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.phase += p.speed;
        p.x += p.vx;
        p.y += p.vy;

        if (p.phase >= Math.PI) {
          points[i] = createPoint(width, height, false);
          continue;
        }

        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;
        if (p.y < -12) p.y = height + 12;
        if (p.y > height + 12) p.y = -12;

        const wave = Math.sin(p.phase);
        const alpha = Math.pow(wave, 1.5) * p.maxAlpha;
        drawPoint(p, alpha);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    if (reducedMotion) {
      renderStatic();
    } else {
      rafId = window.requestAnimationFrame(tick);
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      window.cancelAnimationFrame(rafId);
      if (reducedMotion) {
        renderStatic();
      } else {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    window.addEventListener('resize', resize);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  const orbs = SYSTEM_THEME_MAP[themeKey].ambientOrbs;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden qsl-ambient-bg"
    >
      <div
        className="absolute -top-44 -left-36 w-[720px] h-[720px] rounded-full blur-[95px] qsl-drift-a"
        style={{ background: orbs[0] }}
      />
      <div
        className="absolute top-[12%] -right-40 w-[760px] h-[760px] rounded-full blur-[110px] qsl-drift-b"
        style={{ background: orbs[1] }}
      />
      <div
        className="absolute -bottom-48 left-[22%] w-[780px] h-[600px] rounded-full blur-[105px] qsl-drift-c"
        style={{ background: orbs[2] }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
