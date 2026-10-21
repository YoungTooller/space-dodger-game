/**
 * main.js — точка входа: конфигурация Phaser и запуск игры.
 * Классы PlayScene и GameOverScene подключены в index.html до этого файла.
 */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#070812',
  scale: {
    mode: Phaser.Scale.RESIZE, // холст подстраивается под размер #game-container
    width: '100%',
    height: '100%',
  },
  input: {
    activePointers: 3, // мультитач: один палец двигает корабль, другой жмёт «огонь»
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [PlayScene, GameOverScene],
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
