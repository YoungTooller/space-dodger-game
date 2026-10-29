import { useEffect, useRef } from 'react';
import { ENEMIES } from '../data/enemies.js';

const SPRITE = (name) => `/sprites/${name}.png`;

/* ---------- 1. Старт: корабль и дрейфующие астероиды ---------- */

export function HeroStage() {
  return (
    <div className="stage" aria-hidden="true">
      <img className="rock rock-1" src={SPRITE('ast_medium')} alt="" />
      <img className="rock rock-2" src={SPRITE('ast_small')} alt="" />
      <img className="rock rock-3" src={SPRITE('ast_small')} alt="" />
      <img className="rock rock-4" src={SPRITE('ast_medium')} alt="" />
      <div className="hero-ship">
        <span className="engine-glow" />
        <img src={SPRITE('ship')} alt="" />
      </div>
    </div>
  );
}

/* ---------- 2. Враги: витрина активного врага + демо выстрела ---------- */

export function EnemyStage({ index }) {
  const current = index !== null && index !== undefined ? ENEMIES[index] : null;
  const shootable = current?.shootable ?? false;

  return (
    <div className="stage" aria-hidden="true">
      <span className="enemy-orbit" />

      {ENEMIES.map((enemy, i) => (
        <div key={enemy.key} className={`enemy-slot${i === index ? ' is-on' : ''}`}>
          <img src={SPRITE(enemy.key)} alt="" style={{ '--k': enemy.size / 8 }} />
        </div>
      ))}

      <span className="reticle-wrap">
        <span className={`reticle${shootable ? ' is-on' : ''}`} />
      </span>

      {shootable && (
        <>
          <img key={`b-${index}`} className="demo-bullet" src={SPRITE('bullet')} alt="" />
          <span key={`i-${index}`} className="impact on" />
        </>
      )}
    </div>
  );
}

/* ---------- 3. Управление: корабль двигается и стреляет по охотнику ---------- */

export function ControlsStage({ active }) {
  const stageRef = useRef(null);
  const shipRef = useRef(null);
  const targetRef = useRef(null);
  const impactRef = useRef(null);
  const bulletRefs = useRef([]);

  useEffect(() => {
    if (!active) return undefined;

    const stage = stageRef.current;
    const ship = shipRef.current;
    const target = targetRef.current;
    const impact = impactRef.current;
    const bulletEls = bulletRefs.current.filter(Boolean);
    if (!stage || !ship || !target || !impact) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = stage.clientWidth;
    let H = stage.clientHeight;
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          W = stage.clientWidth;
          H = stage.clientHeight;
        })
      : null;
    if (ro) ro.observe(stage);

    // Все элементы позиционируются от центра сцены
    const place = (el, x, y, scale = 1, rot = 0) => {
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}rad) scale(${scale})`;
    };

    if (reduceMotion) {
      place(ship, 0, H * 0.33);
      place(target, 0, -H * 0.27);
      bulletEls.forEach((el) => {
        el.style.opacity = '0';
      });
      return () => {
        if (ro) ro.disconnect();
      };
    }

    const bullets = bulletEls.map(() => ({ on: false, x: 0, y: 0 }));
    const start = performance.now();
    let last = start;
    let raf = 0;
    let shotTimer = 0;
    let tx = 0;
    let alive = true;
    let hits = 0;
    let respawnAt = 0;
    let targetScale = 1;
    let impactT = 0;
    let impactX = 0;
    let impactY = 0;
    let impactBig = false;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = (now - start) / 1000;

      // корабль ходит влево-вправо и слегка кренится по ходу движения
      const sx = Math.sin(t * 0.9) * W * 0.27;
      const shipY = H * 0.33;
      place(ship, sx, shipY, 1, Math.cos(t * 0.9) * 0.08);

      // охотник подруливает под игрока, как в игре
      const targetY = -H * 0.27;
      tx += (sx - tx) * (1 - Math.exp(-1.3 * dt));
      if (!alive && t >= respawnAt) {
        alive = true;
        hits = 0;
      }
      targetScale += ((alive ? 1 : 0) - targetScale) * (1 - Math.exp(-8 * dt));
      target.style.opacity = String(Math.max(0, Math.min(1, targetScale)));
      place(target, tx, targetY + Math.sin(t * 1.6) * 6, 0.35 + 0.65 * targetScale);

      // выстрелы
      shotTimer += dt;
      if (shotTimer > 0.45) {
        shotTimer = 0;
        const free = bullets.find((b) => !b.on);
        if (free) {
          free.on = true;
          free.x = sx;
          free.y = shipY - H * 0.1;
        }
      }

      bullets.forEach((b, i) => {
        const el = bulletEls[i];
        if (!b.on) {
          el.style.opacity = '0';
          return;
        }
        b.y -= H * 1.1 * dt;

        const hitY = targetY + H * 0.05;
        if (alive && b.y <= hitY && b.y > targetY - H * 0.2 && Math.abs(b.x - tx) < W * 0.11) {
          b.on = false;
          hits += 1;
          impactT = 1;
          impactX = b.x;
          impactY = hitY;
          impactBig = hits >= 3;
          if (hits >= 3) {
            alive = false;
            respawnAt = t + 1.5;
          }
          el.style.opacity = '0';
          return;
        }
        if (b.y < -H * 0.6) {
          b.on = false;
          el.style.opacity = '0';
          return;
        }
        el.style.opacity = '1';
        place(el, b.x, b.y);
      });

      impactT = Math.max(0, impactT - dt * 3);
      impact.style.opacity = String(impactT);
      place(impact, impactX, impactY, (impactBig ? 2.2 : 1.2) * (1.6 - impactT * 0.8));
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [active]);

  return (
    <div className="stage" ref={stageRef} aria-hidden="true">
      <img ref={targetRef} className="ctl-target" src={SPRITE('hunter')} alt="" />
      <span ref={impactRef} className="ctl-impact" />
      {[0, 1, 2, 3, 4].map((i) => (
        <img
          key={i}
          ref={(el) => {
            bulletRefs.current[i] = el;
          }}
          className="ctl-bullet"
          src={SPRITE('bullet')}
          alt=""
        />
      ))}
      <div ref={shipRef} className="ctl-ship">
        <span className="engine-glow" />
        <img src={SPRITE('ship')} alt="" />
      </div>
    </div>
  );
}

/* ---------- 4. Играть: портал, в который влетает корабль ---------- */

export function PortalStage() {
  return (
    <div className="stage stage-portal" aria-hidden="true">
      <span className="portal-glow" />
      <span className="portal-ring ring-a" />
      <span className="portal-ring ring-b" />
      <span className="portal-ring ring-c" />
      <img className="portal-ship" src={SPRITE('ship')} alt="" />
    </div>
  );
}
