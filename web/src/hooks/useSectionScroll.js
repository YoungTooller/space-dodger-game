import { useCallback, useEffect, useRef } from 'react';

// Пауза после переключения: за это время анимация камеры успевает доехать до секции,
// а «хвост» инерции колеса/трекпада не перелистывает сразу дальше.
const COOLDOWN_MS = 1100;

/**
 * Листание «по секциям»: один жест колеса, свайп или клавиша = один переход.
 * Возвращает goTo(index) — для точек навигации и кнопок.
 */
export default function useSectionScroll(count, index, setIndex, enabled = true) {
  const state = useRef({ index, lockedUntil: 0, lastWheelAt: 0 });
  state.current.index = index;

  const goTo = useCallback(
    (target) => {
      const s = state.current;
      const next = Math.max(0, Math.min(count - 1, target));
      if (next === s.index) return;
      s.lockedUntil = performance.now() + COOLDOWN_MS;
      s.index = next; // чтобы повторный вызов до ререндера видел новое значение
      setIndex(next);
    },
    [count, setIndex]
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const step = (dir) => {
      if (performance.now() < state.current.lockedUntil) return;
      goTo(state.current.index + dir);
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return; // зум страницы не трогаем
      e.preventDefault();

      const s = state.current;
      const now = performance.now();
      const gap = now - s.lastWheelAt;
      s.lastWheelAt = now;

      if (now < s.lockedUntil) return;
      if (Math.abs(e.deltaY) < 4) return;
      if (gap < 90 && Math.abs(e.deltaY) < 40) return; // затухающий хвост трекпада
      step(e.deltaY > 0 ? 1 : -1);
    };

    const onKey = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          step(1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          step(-1);
          break;
        case ' ':
          if (tag === 'BUTTON' || tag === 'A') return; // пробел на кнопке — это клик
          e.preventDefault();
          step(e.shiftKey ? -1 : 1);
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(count - 1);
          break;
        default:
      }
    };

    let touchY = null;
    const onTouchStart = (e) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
      if (touchY === null) return;
      const dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) > 50) step(dy > 0 ? 1 : -1);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, count, goTo]);

  return goTo;
}
