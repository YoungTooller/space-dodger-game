const express = require('express');
const db = require('../db');

const router = express.Router();

const MAX_TEXT_LENGTH = 1000;
const MAX_NAME_LENGTH = 60;

// GET /api/reviews - список отзывов
router.get('/', (req, res) => {
  const reviews = db
    .prepare('SELECT id, name, rating, text, created_at FROM reviews ORDER BY id DESC')
    .all();
  res.json(reviews);
});

// POST /api/reviews - оставить отзыв
router.post('/', (req, res) => {
  const body = req.body || {};

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LENGTH) : '';
  const rating = Number(body.rating);

  if (!text || text.length > MAX_TEXT_LENGTH) {
    return res
      .status(400)
      .json({ error: `Текст отзыва обязателен и должен быть короче ${MAX_TEXT_LENGTH} символов.` });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Оценка должна быть целым числом от 1 до 5.' });
  }

  const stmt = db.prepare('INSERT INTO reviews (name, rating, text) VALUES (?, ?, ?)');
  const info = stmt.run(name || 'Аноним', rating, text);

  const created = db
    .prepare('SELECT id, name, rating, text, created_at FROM reviews WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json(created);
});

module.exports = router;
