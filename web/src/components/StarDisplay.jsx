export default function StarDisplay({ rating }) {
  return (
    <span className="star-display" aria-label={`Оценка: ${rating} из 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? 'star-filled' : ''}>
          ★
        </span>
      ))}
    </span>
  );
}
