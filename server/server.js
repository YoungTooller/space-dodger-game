const path = require('path');
const express = require('express');
const reviewsRouter = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 8080;

const GAME_DIR = path.join(__dirname, '..', 'public', 'game');
const WEB_DIST_DIR = path.join(__dirname, '..', 'web', 'dist');

app.use(express.json());

// API
app.use('/api/reviews', reviewsRouter);

// Сама игра    
app.use('/game', express.static(GAME_DIR));

// Лендинг + страница отзывов
app.use(express.static(WEB_DIST_DIR));

// Фоллбэк для клиентского роутинга React
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/game')) return next();
  res.sendFile(path.join(WEB_DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Space Dodger server: http://localhost:${PORT}`);
});
