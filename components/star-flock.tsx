"use client";

import { useEffect, useRef } from "react";

const STAR_COUNT = 96;
const INFLUENCE_RADIUS = 180;
const MAX_OFFSET = 42;
const KEEP_AWAY = 12;
const SWIRL = 0.16;
const STIFFNESS = 16;
const DAMPING = 8.5;
const MAX_DPR = 2;

type Star = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  twinkleSpeed: number;
  baseAlpha: number;
  swirl: number;
  gray: number;
};

type Pointer = {
  x: number;
  y: number;
  active: boolean;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createStars(width: number, height: number, rng: () => number): Star[] {
  const stars: Star[] = [];

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const x = rng() * width;
    const y = rng() * height;
    stars.push({
      homeX: x,
      homeY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      size: rng() * 1.8 + 0.9,
      phase: rng() * Math.PI * 2,
      twinkleSpeed: 0.35 + rng() * 0.55,
      baseAlpha: 0.4 + rng() * 0.28,
      swirl: rng() < 0.5 ? -1 : 1,
      gray: 108 + rng() * 42,
    });
  }

  return stars;
}

function starInfluence(star: Star, pointer: Pointer) {
  if (!pointer.active) {
    return 0;
  }

  const dist = Math.hypot(pointer.x - star.homeX, pointer.y - star.homeY);
  if (dist > INFLUENCE_RADIUS) {
    return 0;
  }

  const t = 1 - dist / INFLUENCE_RADIUS;
  return t * t * (3 - 2 * t);
}

function starTarget(star: Star, pointer: Pointer) {
  if (!pointer.active) {
    return { x: star.homeX, y: star.homeY };
  }

  const dx = pointer.x - star.homeX;
  const dy = pointer.y - star.homeY;
  const dist = Math.hypot(dx, dy);

  if (dist > INFLUENCE_RADIUS || dist < 0.0001) {
    return { x: star.homeX, y: star.homeY };
  }

  const falloff = starInfluence(star, pointer);
  const offset = Math.min(MAX_OFFSET * falloff, Math.max(0, dist - KEEP_AWAY));
  const inv = 1 / dist;
  const swirl = offset * SWIRL * star.swirl;

  return {
    x: star.homeX + dx * inv * offset - dy * inv * swirl,
    y: star.homeY + dy * inv * offset + dx * inv * swirl,
  };
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  time: number,
  reducedMotion: boolean,
  pointer: Pointer,
) {
  for (const star of stars) {
    const twinkle = reducedMotion
      ? 1
      : 0.9 + 0.1 * Math.sin(time * star.twinkleSpeed + star.phase);
    const inf = reducedMotion ? 0 : starInfluence(star, pointer);
    const alpha = Math.min(0.95, star.baseAlpha * twinkle * (1 + 0.7 * inf));
    const size = star.size * (1 + 0.25 * inf);
    const g = Math.round(star.gray + inf * 28);

    ctx.fillStyle = `rgba(${g}, ${g + 4}, ${Math.min(255, g + 10)}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Quiet 2D star field for the home background.
 * Nearby stars drift toward the cursor, then ease back to their homes.
 */
export function StarFlock() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) {
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      return;
    }

    const rng = mulberry32(0x5f1d);
    const pointer: Pointer = { x: 0, y: 0, active: false };
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let reducedMotion = media.matches;
    let raf = 0;
    let lastTime = performance.now();
    let running = true;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const nextWidth = rect.width;
      const nextHeight = rect.height;
      if (nextWidth < 2 || nextHeight < 2) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.floor(nextWidth * dpr));
      canvas.height = Math.max(1, Math.floor(nextHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (stars.length === 0) {
        stars = createStars(nextWidth, nextHeight, rng);
      } else if (width > 0 && height > 0) {
        const scaleX = nextWidth / width;
        const scaleY = nextHeight / height;
        for (const star of stars) {
          star.homeX *= scaleX;
          star.homeY *= scaleY;
          star.x *= scaleX;
          star.y *= scaleY;
        }
      }

      width = nextWidth;
      height = nextHeight;

      if (reducedMotion) {
        ctx.clearRect(0, 0, width, height);
        drawStars(ctx, stars, 0, true, pointer);
      }
    };

    const step = (now: number) => {
      if (!running) {
        return;
      }

      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;
      const time = now / 1000;

      if (!reducedMotion && document.visibilityState === "visible") {
        for (const star of stars) {
          const target = starTarget(star, pointer);
          const ax = (target.x - star.x) * STIFFNESS - star.vx * DAMPING;
          const ay = (target.y - star.y) * STIFFNESS - star.vy * DAMPING;
          star.vx += ax * dt;
          star.vy += ay * dt;
          star.x += star.vx * dt;
          star.y += star.vy * dt;
        }

        ctx.clearRect(0, 0, width, height);
        drawStars(ctx, stars, time, false, pointer);
      }

      raf = window.requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        pointer.active = false;
      }
    };

    const onMotionChange = () => {
      reducedMotion = media.matches;
      if (reducedMotion) {
        for (const star of stars) {
          star.x = star.homeX;
          star.y = star.homeY;
          star.vx = 0;
          star.vy = 0;
        }
        ctx.clearRect(0, 0, width, height);
        drawStars(ctx, stars, 0, true, pointer);
      }
    };

    resize();
    raf = window.requestAnimationFrame(step);

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    media.addEventListener("change", onMotionChange);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    document.addEventListener("mouseleave", onPointerLeave);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      media.removeEventListener("change", onMotionChange);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      document.removeEventListener("mouseleave", onPointerLeave);
    };
  }, []);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden />
    </div>
  );
}
