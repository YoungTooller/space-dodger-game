import { useState } from 'react';
import HeroArt from '../components/HeroArt.jsx';
import BriefingRow from '../components/BriefingRow.jsx';
import FeedbackModal from '../components/FeedbackModal.jsx';
import { Link } from 'react-router-dom';

export default function Landing() {
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <div className="stars-bg" aria-hidden="true" />

      <header className="topbar">
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

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>
              Уворачивайся.
              <br />
              Ускоряйся.
              <br />
              Лети дальше всех.
            </h1>
            <p className="hero-sub">
              Бесконечная аркада про маленький корабль, который каждые пятнадцать
              секунд жалеет, что согласился на этот рейс. Астероиды летят гуще,
              дрон петляет хитрее — а вы уводите нос корабля в сторону и считаете
              очки.
            </p>
            <div className="hero-actions">
              <a className="btn-primary" href="/game/">
                Играть
              </a>
              <a className="btn-ghost" href="#controls">
                Как управлять
              </a>
            </div>
            <p className="hero-meta">
              Работает прямо в браузере на Phaser 3. Рекорд сохраняется у вас
              локально — регистрация не нужна.
            </p>
          </div>

          <HeroArt />
        </section>

        <section className="briefing" id="features">
          <h2>Что вас ждёт в полёте</h2>

          <div className="briefing-rows">
            <BriefingRow
              title="Три типа препятствий"
              icon={
                <svg className="row-icon" viewBox="0 0 60 60">
                  <polygon
                    className="icon-rock"
                    points="30,6 40,10 50,20 52,32 44,44 32,50 20,46 10,36 8,22 16,12"
                  />
                </svg>
              }
            >
              Мелкие астероиды проносятся быстро, крупные глыбы медленно
              перекрывают полосу, а дрон летит по синусоиде, так что
              предугадать его траекторию с первого раза не выйдет.
            </BriefingRow>

            <BriefingRow
              title="Бонус «Щит»"
              icon={
                <svg className="row-icon" viewBox="0 0 60 60">
                  <circle className="icon-shield-ring" cx="30" cy="30" r="22" />
                  <circle className="icon-shield-fill" cx="30" cy="30" r="14" />
                </svg>
              }
            >
              Раз в 9–13 секунд появляется бирюзовая сфера. Поймайте её — и
              три секунды любые столкновения будут просто разлетаться в
              стороны, не задевая корабль.
            </BriefingRow>

            <BriefingRow
              title="Сложность растёт сама"
              icon={
                <svg className="row-icon" viewBox="0 0 60 60">
                  <path
                    className="icon-speed"
                    d="M10 42 L24 24 L34 32 L50 12"
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle className="icon-speed-dot" cx="50" cy="12" r="5" />
                </svg>
              }
            >
              Каждые 15 секунд скорость препятствий и частота их появления
              увеличиваются. Игра не заканчивается — заканчиваетесь вы, когда
              перестаёте успевать.
            </BriefingRow>

            <BriefingRow
              title="Клавиатура или тап"
              icon={
                <svg className="row-icon" viewBox="0 0 60 60">
                  <rect className="icon-phone" x="18" y="6" width="24" height="48" rx="5" />
                  <rect className="icon-phone-screen" x="21" y="12" width="18" height="32" rx="1" />
                </svg>
              }
            >
              На компьютере — стрелки или A/D. На телефоне — просто держите
              палец на левой или правой половине экрана. Холст сам
              подстраивается под размер окна.
            </BriefingRow>
          </div>
        </section>

        <section className="controls" id="controls">
          <h2>Управление</h2>
          <div className="controls-columns">
            <div className="controls-col">
              <h3>На компьютере</h3>
              <ul>
                <li><kbd>←</kbd> / <kbd>A</kbd> — влево</li>
                <li><kbd>→</kbd> / <kbd>D</kbd> — вправо</li>
                <li><kbd>Esc</kbd> / <kbd>P</kbd> — пауза</li>
                <li><kbd>Space</kbd> / <kbd>Enter</kbd> — рестарт после гибели</li>
              </ul>
            </div>
            <div className="controls-col">
              <h3>На телефоне и планшете</h3>
              <ul>
                <li>Тап и удержание слева от центра экрана — влево</li>
                <li>Тап и удержание справа от центра экрана — вправо</li>
                <li>Кнопка «❚❚» в углу экрана — пауза</li>
                <li>Тап по кнопке «Играть снова» — рестарт</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="cta-footer">
          <h2>Готовы к вылету?</h2>
          <a className="btn-primary large" href="/game/">
            Играть в Space Dodger
          </a>
        </section>
      </main>

      <footer>
        <p>
          Сделано на Phaser 3 и React. Исходный код игры лежит рядом, в папке{' '}
          <code>public/game/</code>.
        </p>
      </footer>

      {isFeedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
