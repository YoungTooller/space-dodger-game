import { useEffect, useState } from 'react';
import StarRating from './StarRating.jsx';

const MAX_TEXT_LENGTH = 1000;

export default function FeedbackModal({ onClose }) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setErrorMessage('Поставьте оценку от 1 до 5.');
      return;
    }
    if (!text.trim()) {
      setErrorMessage('Напишите пару слов в отзыве.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не получилось отправить отзыв.');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Что-то пошло не так. Попробуйте ещё раз.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" aria-label="Закрыть" onClick={onClose}>
          ✕
        </button>

        {status === 'success' ? (
          <div className="modal-success">
            <h2 id="feedback-modal-title">Спасибо!</h2>
            <p>Отзыв сохранён. Загляните на страницу отзывов, чтобы увидеть его среди остальных.</p>
            <button className="btn-primary" type="button" onClick={onClose}>
              Закрыть
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="feedback-modal-title">Оставить отзыв</h2>

            <label className="field">
              <span>Имя (необязательно)</span>
              <input
                type="text"
                value={name}
                maxLength={60}
                placeholder="Аноним"
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="field">
              <span>Оценка</span>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <label className="field">
              <span>Отзыв</span>
              <textarea
                value={text}
                maxLength={MAX_TEXT_LENGTH}
                rows={4}
                placeholder="Что понравилось, что бесит, чего не хватает..."
                onChange={(e) => setText(e.target.value)}
              />
            </label>

            {errorMessage && <p className="field-error">{errorMessage}</p>}

            <button className="btn-primary" type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Отправляем…' : 'Отправить'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
