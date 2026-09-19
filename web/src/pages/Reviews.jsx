import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StarDisplay from '../components/StarDisplay.jsx';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDate(isoLike) {
  try {
    // SQLite отдаёт 'YYYY-MM-DD HH:MM:SS' (UTC) — приводим к формату, который понимает Date
    return dateFormatter.format(new Date(isoLike.replace(' ', 'T') + 'Z'));
  } catch {
    return '';
  }
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;

    fetch('/api/reviews')
      .then((res) => {
        if (!res.ok) throw new Error('Не удалось загрузить отзывы');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setReviews(data);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="stars-bg" aria-hidden="true" />

      <header className="topbar">
        <span className="logotype">Space&nbsp;Dodger</span>
        <nav className="topbar-actions">
          <Link className="topbar-link" to="/">
            На лендинг
          </Link>
          <a className="topbar-link" href="/game/">
            Играть
          </a>
        </nav>
      </header>

      <main>
        <section className="reviews-page">
          <h1>Отзывы</h1>
          <p className="reviews-sub">Что говорят пилоты, уже разбившие пару кораблей.</p>

          {status === 'loading' && <p className="reviews-state">Загружаем отзывы…</p>}

          {status === 'error' && (
            <p className="reviews-state">
              Не получилось загрузить отзывы. Проверьте, что сервер запущен, и обновите страницу.
            </p>
          )}

          {status === 'ready' && reviews.length === 0 && (
            <p className="reviews-state">Пока отзывов нет — будьте первым!</p>
          )}

          {status === 'ready' && reviews.length > 0 && (
            <ul className="reviews-list">
              {reviews.map((review) => (
                <li key={review.id} className="review-card">
                  <div className="review-card-head">
                    <span className="review-name">{review.name}</span>
                    <StarDisplay rating={review.rating} />
                  </div>
                  <p className="review-text">{review.text}</p>
                  <span className="review-date">{formatDate(review.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer>
        <p>
          Сделано на Phaser 3 и React.
        </p>
      </footer>
    </>
  );
}
