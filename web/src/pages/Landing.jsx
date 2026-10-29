import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StarField from '../components/StarField.jsx';
import FeedbackModal from '../components/FeedbackModal.jsx';
import { HeroStage, EnemyStage, ControlsStage, PortalStage } from '../components/Stages.jsx';
import useSectionScroll from '../hooks/useSectionScroll.js';
import { ENEMIES } from '../data/enemies.js';
import '../styles/landing.css';

const SECTIONS = ['Старт', 'Враги', 'Управление', 'Играть'];

// Порядок появления элементов внутри секции: --i * 100мс
const r = (n) => ({ '--i': n });

export default function Landing() {
  const [section, setSection] = useState(0);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);
  const [hoverEnemy, setHoverEnemy] = useState(null);
  const [autoEnemy, setAutoEnemy] = useState(0);

  // Пока открыта форма отзыва, листание отключено
  const goTo = useSectionScroll(SECTIONS.length, section, setSection, !isFeedbackOpen);

  // Лендинг не скроллится обычным образом — страница «приколочена» к экрану
  useEffect(() => {
    document.documentElement.classList.add('lp-lock');
    return () => document.documentElement.classList.remove('lp-lock');
  }, []);

  // На секции «Враги» витрина сама переключается между врагами
  useEffect(() => {
    if (section !== 1 || hoverEnemy !== null) return undefined;
    const id = setInterval(() => setAutoEnemy((i) => (i + 1) % ENEMIES.length), 3400);
    return () => clearInterval(id);
  }, [section, hoverEnemy]);

  const enemyFocus = hoverEnemy !== null ? hoverEnemy : autoEnemy;

  const slideClass = (i, extra = '') =>
    `lp-slide ${extra}${section === i ? ' is-active' : ''}${i < section ? ' is-before' : ''}`;

  return (
    <div className="lp-root">
      <StarField section={section} />

      <header className="lp-header">
        <span className="logotype">Space&nbsp;Dodger</span>
        <nav className="topbar-actions">
          <button className="topbar-link" type="button" onClick={() => setFeedbackOpen(true)}>
            Оставить отзыв
          </button>
          <Link className="topbar-link" to="/reviews">
            Отзывы
          </Link>
          <a className="topbar-link" href="/game/">
            Играть
          </a>
        </nav>
      </header>

      <main className="lp-slides">
        {/* ---------- 1. Старт ---------- */}
        <section className={slideClass(0)} aria-hidden={section !== 0}>
          <div className="lp-col">
            <h1 className="reveal" style={r(0)}>
              Уворачивайся.
              <br />
              Ускоряйся.
              <br />
              Лети дальше всех.
            </h1>
            <p className="lp-lead reveal" style={r(1)}>
              Бесконечная аркада про маленький корабль, который каждые пятнадцать секунд жалеет, что
              согласился на этот рейс. Астероиды летят гуще, дрон петляет хитрее — а вы уводите нос
              корабля в сторону и считаете очки.
            </p>
            <div className="lp-actions reveal" style={r(2)}>
              <a className="btn-primary" href="/game/">
                Играть
              </a>
              <button className="btn-ghost" type="button" onClick={() => goTo(1)}>
                Кто на меня летит
              </button>
            </div>
            <p className="lp-meta reveal" style={r(3)}>
              Работает прямо в браузере на Phaser 3. Рекорд сохраняется у вас локально — регистрация
              не нужна.
            </p>
          </div>
          <div className="lp-stage-wrap">
            <div className="lp-stage reveal-stage">
              <HeroStage />
            </div>
          </div>
        </section>

        {/* ---------- 2. Враги ---------- */}
        <section className={slideClass(1)} aria-hidden={section !== 1}>
          <div className="lp-col">
            <h2 className="reveal" style={r(0)}>
              Кто летит на вас
            </h2>
            <p className="lp-lead reveal" style={r(1)}>
              Одних надо обходить, других — сбивать. Пули астероиды и дронов не берут: они
              пролетают насквозь.
            </p>

            <ul className="enemy-list">
              {ENEMIES.map((enemy, i) => (
                <li key={enemy.key} className="reveal" style={r(i + 2)}>
                  <button
                    type="button"
                    className={`enemy-item${enemyFocus === i ? ' is-focus' : ''}`}
                    onMouseEnter={() => setHoverEnemy(i)}
                    onMouseLeave={() => setHoverEnemy(null)}
                    onFocus={() => setHoverEnemy(i)}
                    onBlur={() => setHoverEnemy(null)}
                    onClick={() => setHoverEnemy(i)}
                  >
                    <span className="enemy-name">{enemy.name}</span>
                    <span className={`badge ${enemy.shootable ? 'badge-shoot' : 'badge-dodge'}`}>
                      {enemy.shootable ? 'Сбивать' : 'Уворачиваться'}
                    </span>
                    <span className="enemy-desc">
                      <span>{enemy.text}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="lp-note reveal" style={r(ENEMIES.length + 2)}>
              Бонус «Щит» — бирюзовая сфера: 3 секунды неуязвимости, блокирует и пули стрелка.
            </p>
          </div>
          <div className="lp-stage-wrap">
            <div className="lp-stage reveal-stage">
              <EnemyStage index={enemyFocus} />
            </div>
          </div>
        </section>

        {/* ---------- 3. Управление ---------- */}
        <section className={slideClass(2)} aria-hidden={section !== 2}>
          <div className="lp-col lp-col-wide">
            <h2 className="reveal" style={r(0)}>
              Управление
            </h2>
            <p className="lp-lead reveal" style={r(1)}>
              Корабль ходит влево-вправо и стреляет вверх. Охотник на схеме справа подруливает под
              вас — как в игре, — а три точных выстрела его уничтожают.
            </p>
            <div className="lp-controls reveal" style={r(2)}>
              <div>
                <h3>На компьютере</h3>
                <ul>
                  <li>
                    <kbd>←</kbd> / <kbd>A</kbd> — влево
                  </li>
                  <li>
                    <kbd>→</kbd> / <kbd>D</kbd> — вправо
                  </li>
                  <li>
                    <kbd>↑</kbd> / <kbd>W</kbd> — выстрел
                  </li>
                  <li>
                    <kbd>Esc</kbd> / <kbd>P</kbd> — пауза
                  </li>
                </ul>
              </div>
              <div>
                <h3>На телефоне и планшете</h3>
                <ul>
                  <li>Тап и удержание слева — влево</li>
                  <li>Тап и удержание справа — вправо</li>
                  <li>Круглая кнопка «▲» внизу — выстрел</li>
                  <li>Кнопка «❚❚» в углу — пауза</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="lp-stage-wrap">
            <div className="lp-stage reveal-stage">
              <ControlsStage active={section === 2} />
            </div>
          </div>
        </section>

        {/* ---------- 4. Играть ---------- */}
        <section className={slideClass(3, 'lp-center-slide ')} aria-hidden={section !== 3}>
          <div className="lp-stage-wrap lp-stage-back">
            <div className="lp-stage reveal-stage">
              <PortalStage />
            </div>
          </div>
          <div className="lp-center-col">
            <h2 className="reveal" style={r(0)}>
              Готовы к вылету?
            </h2>
            <div className="lp-cta reveal" style={r(1)}>
              <a className="btn-primary large" href="/game/">
                Играть в Space Dodger
              </a>
            </div>
            <div className="lp-links reveal" style={r(2)}>
              <button className="btn-ghost" type="button" onClick={() => setFeedbackOpen(true)}>
                Оставить отзыв
              </button>
              <Link className="btn-ghost" to="/reviews">
                Читать отзывы
              </Link>
            </div>
            <p className="lp-foot reveal" style={r(3)}>
              Сделано на Phaser 3 и React. Исходный код игры лежит рядом, в {' '}
              <code>public/game/</code>.
            </p>
          </div>
        </section>
      </main>

      <div className={`lp-hint${section === 0 ? ' is-visible' : ''}`} aria-hidden="true">
        <span className="lp-mouse">
          <i />
        </span>
        Листайте вниз
      </div>

      <nav className="lp-dots" aria-label="Разделы">
        {SECTIONS.map((name, i) => (
          <button
            key={name}
            type="button"
            className={`lp-dot${i === section ? ' is-active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={name}
            aria-current={i === section ? 'true' : undefined}
          >
            <span className="lp-dot-label">{name}</span>
          </button>
        ))}
      </nav>

      {isFeedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}
