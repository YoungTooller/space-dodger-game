import { useEffect, useRef } from 'react';

const COLORS = ['255,255,255', '255,255,255', '160,236,242', '190,175,255'];

/**
 * Фон-«космос» на 2D-canvas. Звёзды медленно летят на зрителя,
 * а при каждой смене секции на ~1 секунду разгоняются в линии (варп).
 */
export default function StarField({ section }) {
  const canvasRef = useRef(null);
  const boostRef = useRef(0);
  const prevSection = useRef(section);

  useEffect(() => {
    if (prevSection.current !== section) {
      prevSection.current = section;
      boostRef.current = 1;
    }
  }, [section]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let extentX = 1;
    let extentY = 1;
    let stars = [];
    let raf = 0;
    let last = performance.now();

    const makeStar = (anywhere) => ({
      x: (Math.random() * 2 - 1) * extentX,
      y: (Math.random() * 2 - 1) * extentY,
      z: anywhere ? 0.05 + Math.random() * 0.95 : 1,
      speed: 0.4 + Math.random() * 0.9,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (!width || !height) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const maxDim = Math.max(width, height);
      extentX = width / maxDim;
      extentY = height / maxDim;
      const count = Math.max(90, Math.min(520, Math.round((width * height) / 4200)));
      stars = Array.from({ length: count }, () => makeStar(true));
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (!width || !height) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      boostRef.current = Math.max(0, boostRef.current - dt * 0.85);
      const boost = reduceMotion ? 0 : boostRef.current;
      const flow = (reduceMotion ? 0.015 : 0.035) + boost * 1.6;

      ctx.fillStyle = '#070812';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const focal = Math.max(width, height) * 0.5;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const prevZ = s.z;
        s.z -= flow * s.speed * dt;
        if (s.z <= 0.03) {
          stars[i] = makeStar(false);
          continue;
        }

        const px = cx + (s.x / s.z) * focal;
        const py = cy + (s.y / s.z) * focal;
        if (px < -40 || px > width + 40 || py < -40 || py > height + 40) {
          stars[i] = makeStar(false);
          continue;
        }

        const near = 1 - s.z;
        const alpha = Math.min(1, 0.25 + near * 1.1);
        const size = 0.5 + near * 2;
        const rgba = `rgba(${s.color},${alpha.toFixed(2)})`;

        if (boost > 0.04) {
          // хвост: где звезда была несколько кадров назад
          const tailZ = s.z + (prevZ - s.z) * 7;
          const tx = cx + (s.x / tailZ) * focal;
          const ty = cy + (s.y / tailZ) * focal;
          ctx.strokeStyle = rgba;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(px, py);
          ctx.stroke();
        } else {
          ctx.fillStyle = rgba;
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
