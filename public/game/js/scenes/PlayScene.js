class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  init() {
    this.score = 0;
    this.best = parseInt(localStorage.getItem('spaceDodgerBest') || '0', 10);
    this.speedMultiplier = 1;
    this.spawnDelay = 1100;
    this.shielded = false;
    this.isGameOver = false;
    this.touchDir = 0;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#070812');

    this.createTextures();
    this.createStarfield(width, height);

    this.player = this.physics.add.image(width / 2, height - 90, 'ship');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(28, 40, true);
    this.player.setDepth(10);

    this.obstacles = this.physics.add.group();
    this.pickups = this.physics.add.group();

    this.physics.world.setBounds(0, 0, width, height);

    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.collectShield, null, this);

    this.setupInput();
    this.setupUI(width, height);

    this.obstacleTimer = this.time.addEvent({
      delay: this.spawnDelay,
      loop: true,
      callback: this.spawnObstacle,
      callbackScope: this,
    });

    this.pickupTimer = this.time.addEvent({
      delay: Phaser.Math.Between(9000, 13000),
      loop: true,
      callback: this.spawnPickup,
      callbackScope: this,
    });

    this.difficultyTimer = this.time.addEvent({
      delay: 15000,
      loop: true,
      callback: this.increaseDifficulty,
      callbackScope: this,
    });

    this.scale.on('resize', this.onResize, this);
  }

  createTextures() {
    if (this.textures.exists('ship')) return;

    const ship = this.make.graphics({ x: 0, y: 0, add: false });
    ship.fillStyle(0xf4f6fb, 1);
    ship.fillRoundedRect(0, 14, 28, 32, 6);
    ship.fillStyle(0x7c5cff, 1);
    ship.fillTriangle(14, 0, 0, 20, 28, 20);
    ship.fillStyle(0x4fd8e0, 1);
    ship.fillRect(3, 42, 6, 8);
    ship.fillRect(19, 42, 6, 8);
    ship.generateTexture('ship', 28, 50);
    ship.destroy();

    this.drawRock('ast_small', 22, 0xc1633b);
    this.drawRock('ast_medium', 42, 0x8a8f98);

    const drone = this.make.graphics({ x: 0, y: 0, add: false });
    drone.fillStyle(0x9c2e6b, 1);
    drone.fillTriangle(8, 8, 0, 0, 0, 16);
    drone.fillTriangle(42, 8, 50, 0, 50, 16);
    drone.fillStyle(0xe14f9c, 1);
    drone.fillRoundedRect(8, 0, 34, 16, 5);
    drone.fillStyle(0x2c0f22, 1);
    drone.fillCircle(25, 8, 4);
    drone.generateTexture('drone', 50, 16);
    drone.destroy();

    const shield = this.make.graphics({ x: 0, y: 0, add: false });
    shield.lineStyle(3, 0x4fd8e0, 1);
    shield.strokeCircle(14, 14, 12);
    shield.fillStyle(0x4fd8e0, 0.35);
    shield.fillCircle(14, 14, 8);
    shield.generateTexture('shield_pickup', 28, 28);
    shield.destroy();

    this.drawStarfield('starfield_far', 320, 55, 0.25, 1);
    this.drawStarfield('starfield_near', 320, 35, 0.55, 2);
  }

  drawRock(key, size, color) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    const points = [];
    const spikes = 9;
    for (let i = 0; i < spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2;
      const r = (size / 2) * Phaser.Math.FloatBetween(0.72, 1);
      points.push(
        new Phaser.Geom.Point(size / 2 + Math.cos(angle) * r, size / 2 + Math.sin(angle) * r)
      );
    }
    g.fillPoints(points, true);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  drawStarfield(key, size, count, minAlpha, maxRadius) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, size);
      const y = Phaser.Math.Between(0, size);
      const r = Phaser.Math.FloatBetween(0.6, maxRadius);
      const a = Phaser.Math.FloatBetween(minAlpha, 1);
      g.fillStyle(0xffffff, a);
      g.fillCircle(x, y, r);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  createStarfield(width, height) {
    this.starsFar = this.add
      .tileSprite(width / 2, height / 2, width, height, 'starfield_far')
      .setDepth(0);
    this.starsNear = this.add
      .tileSprite(width / 2, height / 2, width, height, 'starfield_near')
      .setDepth(1);
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    const updateTouch = (pointer) => {
      this.touchDir = pointer.x < this.scale.width / 2 ? -1 : 1;
    };
    this.input.on('pointerdown', updateTouch);
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) updateTouch(pointer);
    });
    this.input.on('pointerup', () => {
      this.touchDir = 0;
    });
  }

  setupUI(width, height) {
    const base = { fontFamily: 'Verdana, sans-serif', color: '#f4f6fb' };

    this.scoreText = this.add
      .text(20, 16, 'Очки: 0', { ...base, fontSize: '22px' })
      .setDepth(20);

    this.bestText = this.add
      .text(20, 44, `Рекорд: ${this.best}`, { ...base, fontSize: '16px', color: '#9aa3b5' })
      .setDepth(20);

    this.hintText = this.add
      .text(width / 2, height - 20, '← A/D → или тап по левой/правой части экрана', {
        ...base,
        fontSize: '14px',
        color: '#6b7280',
      })
      .setOrigin(0.5, 1)
      .setDepth(20);
    this.tweens.add({ targets: this.hintText, alpha: 0, delay: 3500, duration: 1000 });

    this.flashText = this.add
      .text(width / 2, height * 0.3, '', {
        ...base,
        fontSize: '28px',
        color: '#4fd8e0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20);
  }

  flashMessage(msg) {
    this.flashText.setText(msg);
    this.flashText.setAlpha(1);
    this.tweens.killTweensOf(this.flashText);
    this.tweens.add({ targets: this.flashText, alpha: 0, duration: 1000, delay: 500 });
  }

  spawnObstacle() {
    if (this.isGameOver) return;
    const width = this.scale.width;

    const types = [
      { key: 'ast_small', baseSpeed: 230, score: 1, w: 22, h: 22, weight: 5 },
      { key: 'ast_medium', baseSpeed: 150, score: 1, w: 42, h: 42, weight: 3 },
      { key: 'drone', baseSpeed: 170, score: 1, w: 50, h: 16, weight: 2, zigzag: true },
    ];
    const total = types.reduce((sum, t) => sum + t.weight, 0);
    let roll = Phaser.Math.Between(1, total);
    let type = types[0];
    for (const t of types) {
      if (roll <= t.weight) {
        type = t;
        break;
      }
      roll -= t.weight;
    }

    const margin = type.w / 2 + 10;
    const x = Phaser.Math.Between(margin, width - margin);
    const obstacle = this.obstacles.create(x, -40, type.key);
    obstacle.setDepth(5);
    obstacle.body.setSize(type.w * 0.8, type.h * 0.8, true);
    obstacle.setData('type', type);
    obstacle.setData('scored', false);
    obstacle.setData('baseX', x);
    obstacle.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
    obstacle.body.setVelocityY(type.baseSpeed * this.speedMultiplier);

    if (type.key !== 'drone') {
      obstacle.setAngularVelocity(Phaser.Math.Between(-60, 60));
    }
  }

  spawnPickup() {
    if (this.isGameOver) return;
    const width = this.scale.width;
    const x = Phaser.Math.Between(30, width - 30);
    const pickup = this.pickups.create(x, -30, 'shield_pickup');
    pickup.setDepth(5);
    pickup.body.setSize(24, 24, true);
    pickup.body.setVelocityY(160);
    this.tweens.add({
      targets: pickup,
      scale: { from: 0.85, to: 1.15 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  increaseDifficulty() {
    this.speedMultiplier = Math.min(this.speedMultiplier * 1.12, 3.2);
    this.spawnDelay = Math.max(this.spawnDelay * 0.92, 420);

    this.obstacleTimer.remove(false);
    this.obstacleTimer = this.time.addEvent({
      delay: this.spawnDelay,
      loop: true,
      callback: this.spawnObstacle,
      callbackScope: this,
    });

    this.flashMessage('Ускорение!');
  }

  hitObstacle(player, obstacle) {
    if (this.shielded) {
      obstacle.destroy();
      this.cameras.main.flash(150, 79, 216, 224);
      return;
    }
    this.endGame();
  }

  collectShield(player, pickup) {
    pickup.destroy();
    this.activateShield();
  }

  activateShield() {
    this.shielded = true;
    this.player.setTint(0x4fd8e0);

    if (!this.shieldRing) {
      this.shieldRing = this.add
        .circle(this.player.x, this.player.y, 30, 0x4fd8e0, 0.15)
        .setStrokeStyle(2, 0x4fd8e0, 0.9)
        .setDepth(9);
    }
    this.shieldRing.setVisible(true);

    if (this.shieldTimerEvent) this.shieldTimerEvent.remove(false);
    this.shieldTimerEvent = this.time.delayedCall(3000, this.deactivateShield, [], this);

    this.flashMessage('Щит активен!');
  }

  deactivateShield() {
    this.shielded = false;
    this.player.clearTint();
    if (this.shieldRing) this.shieldRing.setVisible(false);
  }

  endGame() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.physics.pause();
    this.player.setTint(0xff5555);
    [this.obstacleTimer, this.pickupTimer, this.difficultyTimer].forEach(
      (t) => t && t.remove(false)
    );

    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('spaceDodgerBest', String(this.best));
    }

    this.time.delayedCall(450, () => {
      this.scene.start('GameOverScene', { score: this.score, best: this.best });
    });
  }

  onResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.physics.world.setBounds(0, 0, width, height);

    if (this.player) {
      this.player.y = Math.min(this.player.y, height - 40);
      this.player.x = Phaser.Math.Clamp(this.player.x, 20, width - 20);
    }
    if (this.starsFar) {
      this.starsFar.setSize(width, height);
      this.starsFar.setPosition(width / 2, height / 2);
    }
    if (this.starsNear) {
      this.starsNear.setSize(width, height);
      this.starsNear.setPosition(width / 2, height / 2);
    }
    if (this.hintText) this.hintText.setPosition(width / 2, height - 20);
    if (this.flashText) this.flashText.setPosition(width / 2, height * 0.3);
  }

  update(time, delta) {
    if (this.isGameOver) return;

    const dt = delta / 16.6667;
    this.starsFar.tilePositionY -= 0.4 * this.speedMultiplier * dt;
    this.starsNear.tilePositionY -= 1.2 * this.speedMultiplier * dt;

    let dir = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dir = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) dir = 1;
    else if (this.touchDir !== 0) dir = this.touchDir;

    this.player.setVelocityX(dir * 420);

    if (this.shieldRing && this.shielded) {
      this.shieldRing.setPosition(this.player.x, this.player.y);
    }

    this.obstacles.children.each((obstacle) => {
      if (!obstacle.active) return;
      const type = obstacle.getData('type');

      if (type && type.zigzag) {
        const baseX = obstacle.getData('baseX');
        const phase = obstacle.getData('phase');
        obstacle.x = Phaser.Math.Clamp(
          baseX + Math.sin(time * 0.0025 + phase) * 50,
          20,
          this.scale.width - 20
        );
      }

      if (obstacle.y > this.scale.height + 60) {
        if (!obstacle.getData('scored')) {
          this.score += type ? type.score : 1;
          this.scoreText.setText('Очки: ' + this.score);
        }
        obstacle.destroy();
      }
    });

    this.pickups.children.each((pickup) => {
      if (!pickup.active) return;
      if (pickup.y > this.scale.height + 40) {
        pickup.destroy();
      }
    });
  }
}
