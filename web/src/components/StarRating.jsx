const STARS = [1, 2, 3, 4, 5];

export default function StarRating({ value, onChange }) {
  return (
    <div className="star-rating" role="radiogroup" aria-label="Оценка">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} из 5`}
          className={`star ${star <= value ? 'star-filled' : ''}`}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
