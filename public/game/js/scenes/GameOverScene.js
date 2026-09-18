class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.best = data.best || 0;
    this.isNewBest = this.finalScore > 0 && this.finalScore >= this.best;
  }

  create() {
    const { width, height } = this.scale;
    const centerY = height * 0.38;

    this.cameras.main.setBackgroundColor('#070812');

    this.add
      .text(width / 2, centerY, 'ИГРА ОКОНЧЕНА', {
        fontFamily: 'Verdana, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#f4f6fb',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, centerY + 50, `Очки: ${this.finalScore}`, {
        fontFamily: 'Verdana, sans-serif',
        fontSize: '24px',
        color: '#9aa3b5',
      })
      .setOrigin(0.5);

    const bestLabel = this.isNewBest ? 'Новый рекорд!' : `Рекорд: ${this.best}`;
    this.add
      .text(width / 2, centerY + 86, bestLabel, {
        fontFamily: 'Verdana, sans-serif',
        fontSize: '20px',
        color: this.isNewBest ? '#4fd8e0' : '#6b7280',
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(width / 2, centerY + 160, 'Играть снова', {
        fontFamily: 'Verdana, sans-serif',
        fontSize: '22px',
        color: '#070812',
        backgroundColor: '#4fd8e0',
        padding: { x: 26, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.scene.start('PlayScene'));
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#7c5cff', color: '#f4f6fb' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#4fd8e0', color: '#070812' }));

    this.add
      .text(width / 2, centerY + 210, 'или нажмите Space / Enter', {
        fontFamily: 'Verdana, sans-serif',
        fontSize: '14px',
        color: '#4a5063',
      })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('PlayScene'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('PlayScene'));
  }
}
