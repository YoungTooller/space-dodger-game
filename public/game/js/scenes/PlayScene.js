/**
 * PlayScene — основная игровая сцена.
 * Корабль двигается влево/вправо у нижней части экрана и стреляет вверх,
 * сверху вниз летят препятствия и бонус «Щит».
 */
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
    this.isPaused = false;
    this.touchDir = 0;
    this.movePointerId = null;
    this.fireHeld = false;
    this.fireCooldown = 0;
    this.playTimeMs = 0;
    this.hunterWarned = false;
  }

  create() {
    const { width, height } = this.scale;

    this.isTouch = this.sys.game.device.input.touch;
    // На телефонах корабль чуть выше, чтобы не перекрываться кнопкой «огонь»
    this.shipBottomOffset = this.isTouch ? 130 : 90;

    this.cameras.main.setBackgroundColor('#070812');

    this.createTextures();
    this.createStarfield(width, height);

    this.player = this.physics.add.image(width / 2, height - this.shipBottomOffset, 'ship');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(28, 40, true);
    this.player.setDepth(10);

    this.obstacles = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.bullets = this.physics.add.group();

    this.physics.world.setBounds(0, 0, width, height);

    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.collectShield, null, this);
    // Пули поражают только «стреляемые» цели (охотника), остальное пролетает насквозь
    this.physics.add.overlap(
      this.bullets,
      this.obstacles,
      this.bulletHitObstacle,
      this.bulletCanHit,
      this
    );

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
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
  }

  // ---------- Генерация текстур (без внешних картинок) ----------

  createTextures() {
    if (this.textures.exists('ship')) return; // текстуры создаются один раз на сессию

    // Корабль: белый корпус + фиолетовый "нос" + бирюзовые двигатели
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

    // Дрон: корпус + "крылья"
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

    // Охотник: оранжевый "наконечник" носом вниз с жёлтым глазом
    const hunter = this.make.graphics({ x: 0, y: 0, add: false });
    hunter.fillStyle(0xff6b3d, 1);
    hunter.fillTriangle(0, 0, 38, 0, 19, 42);
    hunter.fillStyle(0x5c1608, 1);
    hunter.fillTriangle(8, 4, 30, 4, 19, 26);
    hunter.fillStyle(0xffd166, 1);
    hunter.fillCircle(19, 12, 5);
    hunter.fillStyle(0x2a0a02, 1);
    hunter.fillCircle(19, 13, 2);
    hunter.generateTexture('hunter', 38, 42);
    hunter.destroy();

    // Пуля игрока
    const bullet = this.make.graphics({ x: 0, y: 0, add: false });
    bullet.fillStyle(0x4fd8e0, 1);
    bullet.fillRoundedRect(0, 0, 6, 16, 3);
    bullet.fillStyle(0xffffff, 0.9);
    bullet.fillRect(2, 2, 2, 8);
    bullet.generateTexture('bullet', 6, 16);
    bullet.destroy();

    // Бонус "Щит"
    const shield = this.make.graphics({ x: 0, y: 0, add: false });
    shield.lineStyle(3, 0x4fd8e0, 1);
    shield.strokeCircle(14, 14, 12);
    shield.fillStyle(0x4fd8e0, 0.35);
    shield.fillCircle(14, 14, 8);
    shield.generateTexture('shield_pickup', 28, 28);
    shield.destroy();

    // Текстуры звёздного фона (два слоя параллакса)
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

  // ---------- Управление ----------

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    const dirFromPointer = (pointer) => (pointer.x < this.scale.width / 2 ? -1 : 1);

    // Движение тапами по левой/правой половине экрана.
    // Нажатия на кнопки (пауза, «огонь») движением не считаются.
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (this.isPaused || this.isGameOver) return;
      if (currentlyOver && currentlyOver.length > 0) return;
      this.movePointerId = pointer.id;
      this.touchDir = dirFromPointer(pointer);
    });
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && pointer.id === this.movePointerId) {
        this.touchDir = dirFromPointer(pointer);
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (pointer.id === this.movePointerId) {
        this.touchDir = 0;
        this.movePointerId = null;
      }
    });

    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  // ---------- UI ----------

  setupUI(width, height) {
    const base = { fontFamily: 'Verdana, sans-serif', color: '#f4f6fb' };

    this.scoreText = this.add
      .text(20, 16, 'Очки: 0', { ...base, fontSize: '22px' })
      .setDepth(20);

    this.bestText = this.add
      .text(20, 44, `Рекорд: ${this.best}`, { ...base, fontSize: '16px', color: '#9aa3b5' })
      .setDepth(20);

    this.pauseButton = this.add
      .text(width - 20, 16, '❚❚', { ...base, fontSize: '22px' })
      .setOrigin(1, 0)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    this.pauseButton.on('pointerdown', () => this.togglePause());

    const hint = this.isTouch
      ? 'Тап слева/справа — движение\nКруглая кнопка внизу — выстрел'
      : '← A / D → — движение\n↑ / W — выстрел\nEsc / P — пауза';
    this.hintText = this.add
      .text(width / 2, 90, hint, {
        ...base,
        fontSize: '14px',
        color: '#6b7280',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.tweens.add({ targets: this.hintText, alpha: 0, delay: 5000, duration: 1000 });

    this.flashText = this.add
      .text(width / 2, height * 0.3, '', {
        ...base,
        fontSize: '24px',
        color: '#4fd8e0',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20);

    if (this.isTouch) this.createFireButton(width, height);
  }

  createFireButton(width, height) {
    const radius = 32;
    const circle = this.add
      .circle(0, 0, radius, 0x4fd8e0, 0.18)
      .setStrokeStyle(2, 0x4fd8e0, 0.9)
      .setDepth(20);
    const label = this.add
      .text(0, 0, '▲', { fontFamily: 'Verdana, sans-serif', fontSize: '22px', color: '#4fd8e0' })
      .setOrigin(0.5)
      .setDepth(21);
    const zone = this.add.zone(0, 0, radius * 2 + 16, radius * 2 + 16).setInteractive().setDepth(22);

    const release = () => {
      this.fireHeld = false;
      circle.setFillStyle(0x4fd8e0, 0.18);
    };
    zone.on('pointerdown', () => {
      if (this.isPaused || this.isGameOver) return;
      this.fireHeld = true;
      circle.setFillStyle(0x4fd8e0, 0.45);
    });
    zone.on('pointerup', release);
    zone.on('pointerout', release);
    zone.on('pointerupoutside', release);

    this.fireUI = { circle, label, zone };
    this.positionFireButton(width, height);
  }

  positionFireButton(width, height) {
    if (!this.fireUI) return;
    const x = width / 2;
    const y = height - 48;
    this.fireUI.circle.setPosition(x, y);
    this.fireUI.label.setPosition(x, y);
    this.fireUI.zone.setPosition(x, y);
  }

  flashMessage(msg) {
    this.flashText.setText(msg);
    this.flashText.setAlpha(1);
    this.tweens.killTweensOf(this.flashText);
    this.tweens.add({ targets: this.flashText, alpha: 0, duration: 1000, delay: 900 });
  }

  addScore(points) {
    this.score += points;
    this.scoreText.setText('Очки: ' + this.score);
  }

  // ---------- Стрельба ----------

  fire() {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = 320; // мс между выстрелами

    const bullet = this.bullets.create(this.player.x, this.player.y - 30, 'bullet');
    bullet.setDepth(8);
    bullet.body.setSize(6, 16, true);
    bullet.body.setVelocityY(-700);
  }

  bulletCanHit(bullet, obstacle) {
    const type = obstacle.getData('type');
    return !!(type && type.shootable);
  }

  bulletHitObstacle(bullet, obstacle) {
    const type = obstacle.getData('type');
    bullet.destroy();

    this.spawnExplosion(obstacle.x, obstacle.y, 0xff6b3d);
    obstacle.setData('scored', true);
    obstacle.destroy();
    this.addScore(type.killScore || 1);
  }

  spawnExplosion(x, y, color) {
    const boom = this.add.circle(x, y, 14, color, 0.9).setDepth(9);
    this.tweens.add({
      targets: boom,
      scale: 2.6,
      alpha: 0,
      duration: 260,
      onComplete: () => boom.destroy(),
    });
  }

  // ---------- Спавн объектов ----------

  spawnObstacle() {
    if (this.isGameOver) return;
    const width = this.scale.width;

    const allTypes = [
      { key: 'ast_small', baseSpeed: 230, score: 1, w: 22, h: 22, weight: 5 },
      { key: 'ast_medium', baseSpeed: 150, score: 1, w: 42, h: 42, weight: 3 },
      { key: 'drone', baseSpeed: 170, score: 1, w: 50, h: 16, weight: 2, zigzag: true },
      // Охотник: появляется не сразу, подруливает к игроку, сбивается выстрелом
      {
        key: 'hunter',
        baseSpeed: 110,
        score: 1,
        killScore: 3,
        w: 38,
        h: 42,
        weight: 2,
        homing: true,
        shootable: true,
        minTime: 12000,
      },
    ];

    const types = allTypes.filter((t) => !t.minTime || this.playTimeMs >= t.minTime);
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

    if (type.key === 'ast_small' || type.key === 'ast_medium') {
      obstacle.setAngularVelocity(Phaser.Math.Between(-60, 60));
    }

    if (type.homing && !this.hunterWarned) {
      this.hunterWarned = true;
      this.flashMessage(this.isTouch ? 'Охотник!\nСбей его выстрелом' : 'Охотник!\nСбей его — W / ↑');
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

  // ---------- Сложность ----------

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

  // ---------- Столкновения ----------

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

  // ---------- Пауза ----------

  togglePause() {
    if (this.isGameOver) return;
    if (this.isPaused) this.resumeGame();
    else this.pauseGame();
  }

  pauseGame() {
    this.isPaused = true;
    this.touchDir = 0;
    this.movePointerId = null;
    this.fireHeld = false;

    this.physics.pause();
    [this.obstacleTimer, this.pickupTimer, this.difficultyTimer, this.shieldTimerEvent].forEach(
      (t) => t && (t.paused = true)
    );

    this.showPauseOverlay();
  }

  resumeGame() {
    this.isPaused = false;
    this.touchDir = 0;
    this.movePointerId = null;

    this.physics.resume();
    [this.obstacleTimer, this.pickupTimer, this.difficultyTimer, this.shieldTimerEvent].forEach(
      (t) => t && (t.paused = false)
    );

    this.hidePauseOverlay();
  }

  showPauseOverlay() {
    const { width, height } = this.scale;
    const base = { fontFamily: 'Verdana, sans-serif', color: '#f4f6fb' };

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x070812, 0.78);

    const title = this.add
      .text(width / 2, height / 2 - 76, 'Пауза', { ...base, fontSize: '30px', fontStyle: 'bold' })
      .setOrigin(0.5);

    const resumeBtn = this.add
      .text(width / 2, height / 2, 'Продолжить', {
        ...base,
        fontSize: '20px',
        color: '#070812',
        backgroundColor: '#4fd8e0',
        padding: { x: 26, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerdown', () => this.resumeGame());
    resumeBtn.on('pointerover', () => resumeBtn.setStyle({ backgroundColor: '#7c5cff', color: '#f4f6fb' }));
    resumeBtn.on('pointerout', () => resumeBtn.setStyle({ backgroundColor: '#4fd8e0', color: '#070812' }));

    const exitBtn = this.add
      .text(width / 2, height / 2 + 66, 'Выйти на лендинг', {
        ...base,
        fontSize: '16px',
        color: '#9aa3b5',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.exitToLanding());
    exitBtn.on('pointerover', () => exitBtn.setColor('#4fd8e0'));
    exitBtn.on('pointerout', () => exitBtn.setColor('#9aa3b5'));

    this.pauseOverlay = this.add.container(0, 0, [bg, title, resumeBtn, exitBtn]).setDepth(30);
  }

  hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy(true);
      this.pauseOverlay = null;
    }
  }

  exitToLanding() {
    window.location.href = '/';
  }

  // ---------- Game Over ----------

  endGame() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.fireHeld = false;

    this.physics.pause();
    this.player.setTint(0xff5555);
    if (this.pauseButton) this.pauseButton.disableInteractive().setAlpha(0.3);
    if (this.fireUI) this.fireUI.zone.disableInteractive();
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

  // ---------- Ресайз окна ----------

  onResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.physics.world.setBounds(0, 0, width, height);

    if (this.player) {
      this.player.y = height - this.shipBottomOffset;
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
    if (this.hintText) this.hintText.setPosition(width / 2, 90);
    if (this.flashText) this.flashText.setPosition(width / 2, height * 0.3);
    if (this.pauseButton) this.pauseButton.setPosition(width - 20, 16);
    this.positionFireButton(width, height);

    if (this.pauseOverlay) {
      // проще перерисовать оверлей заново под новый размер, чем пересчитывать каждый элемент
      this.hidePauseOverlay();
      this.showPauseOverlay();
    }
  }

  // ---------- Игровой цикл ----------

  update(time, delta) {
    if (this.isGameOver || this.isPaused) return;

    this.playTimeMs += delta;
    this.fireCooldown -= delta;

    const dt = delta / 16.6667;
    this.starsFar.tilePositionY -= 0.4 * this.speedMultiplier * dt;
    this.starsNear.tilePositionY -= 1.2 * this.speedMultiplier * dt;

    let dir = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dir = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) dir = 1;
    else if (this.touchDir !== 0) dir = this.touchDir;

    this.player.setVelocityX(dir * 420);

    // Стрельба: стрелка вверх / W (можно удерживать) или кнопка на экране
    if (this.cursors.up.isDown || this.keys.W.isDown || this.fireHeld) {
      this.fire();
    }

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

      // Охотник стремится встать напротив игрока (пока не пролетел мимо него)
      if (type && type.homing) {
        if (obstacle.y < this.player.y) {
          const maxSpeed = 150 * Math.min(this.speedMultiplier, 2);
          const dx = this.player.x - obstacle.x;
          obstacle.body.setVelocityX(Phaser.Math.Clamp(dx * 3, -maxSpeed, maxSpeed));
        } else {
          obstacle.body.setVelocityX(0);
        }
      }

      if (obstacle.y > this.scale.height + 60) {
        if (!obstacle.getData('scored')) {
          this.addScore(type ? type.score : 1);
        }
        obstacle.destroy();
      }
    });

    this.bullets.children.each((bullet) => {
      if (bullet.active && bullet.y < -30) bullet.destroy();
    });

    this.pickups.children.each((pickup) => {
      if (!pickup.active) return;
      if (pickup.y > this.scale.height + 40) {
        pickup.destroy();
      }
    });
  }
}
