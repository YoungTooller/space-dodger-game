const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#070812',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
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
