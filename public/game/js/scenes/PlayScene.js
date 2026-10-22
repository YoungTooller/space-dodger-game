/**
 * PlayScene — основная игровая сцена.
 * Корабль двигается влево/вправо у нижней части экрана и стреляет вверх,
 * сверху вниз летят препятствия и бонус «Щит».
 */
class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  preload() {
    const path = 'assets/';
    [
      'ship',
      'ast_small',
      'ast_medium',
      'drone',
      'hunter',
      'gunner',
      'bullet',
      'enemy_bullet',
      'shield_pickup',
    ].forEach((key) => this.load.image(key, `${path}${key}.png`));
  }

  init() {
    this.score = 0;
    this.best = parseInt(localStorage.getItem('spaceDodgerBest') || '0', 10);
    this.speedMultiplier = 1;
    this.spawnDelay = 1100;
    this.shielded = false;
    this.shieldDuration = 3000; // мс
    this.shieldRemaining = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.touchDir = 0;
    this.movePointerId = null;
    this.fireHeld = false;
    this.fireCooldown = 0;
    this.playTimeMs = 0;
    this.hunterWarned = false;
    this.gunnerWarned = false;
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
    this.player.body.setSize(24, 38, true);
    this.player.setDepth(10);

    this.obstacles = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.bullets = this.physics.add.group(); // пули игрока
    this.enemyBullets = this.physics.add.group(); // пули стрелков

    this.physics.world.setBounds(0, 0, width, height);

    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.collectShield, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.hitEnemyBullet, null, this);
    // Пули игрока поражают только «стреляемые» цели, остальное пролетает насквозь
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

  // ---------- Текстуры ----------
  // Спрайты кораблей, препятствий, пуль и бонуса лежат в assets/ и грузятся в preload().
  // Здесь генерируется только бесшовный звёздный фон.

  createTextures() {
    if (this.textures.exists('starfield_far')) return; // создаём один раз на сессию

    this.drawStarfield('starfield_far', 320, 55, 0.25, 1);
    this.drawStarfield('starfield_near', 320, 35, 0.55, 2);
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

    this.createShieldHud();

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
      .text(width / 2, 104, hint, {
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

  // Индикатор щита в левом верхнем углу: иконка + полоска + секунды до конца
  createShieldHud() {
    const y = 76;
    const barWidth = 110;
    this.shieldBarWidth = barWidth;
    this.shieldHud = {
      icon: this.add
        .circle(30, y, 8, 0x4fd8e0, 0.25)
        .setStrokeStyle(2, 0x4fd8e0, 1)
        .setDepth(20),
      barBg: this.add.rectangle(46, y, barWidth, 8, 0x1b1f36).setOrigin(0, 0.5).setDepth(20),
      barFill: this.add.rectangle(46, y, barWidth, 8, 0x4fd8e0).setOrigin(0, 0.5).setDepth(21),
      label: this.add
        .text(46 + barWidth + 8, y, '', {
          fontFamily: 'Verdana, sans-serif',
          fontSize: '13px',
          color: '#4fd8e0',
        })
        .setOrigin(0, 0.5)
        .setDepth(20),
    };
    this.setShieldHudVisible(false);
  }

  setShieldHudVisible(visible) {
    Object.values(this.shieldHud).forEach((obj) => obj.setVisible(visible));
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

  // ---------- Стрельба игрока ----------

  fire() {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = 320; // мс между выстрелами

    const bullet = this.bullets.create(this.player.x, this.player.y - 36, 'bullet');
    bullet.setDepth(8);
    bullet.body.setSize(8, 22, true);
    bullet.body.setVelocityY(-700);
  }

  bulletCanHit(bullet, obstacle) {
    const type = obstacle.getData('type');
    return !!(type && type.shootable);
  }

  bulletHitObstacle(bullet, obstacle) {
    const type = obstacle.getData('type');
    bullet.destroy();

    const hp = (obstacle.getData('hp') || 1) - 1;
    if (hp > 0) {
      // Цель с запасом прочности: мигнёт белым и полетит дальше
      obstacle.setData('hp', hp);
      obstacle.setTintFill(0xffffff);
      this.time.delayedCall(90, () => obstacle.active && obstacle.clearTint());
      return;
    }

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

  // ---------- Стрельба врагов ----------

  enemyShoot(shooter) {
    const bullet = this.enemyBullets.create(shooter.x, shooter.y + 28, 'enemy_bullet');
    bullet.setDepth(6);
    bullet.body.setSize(10, 10, true);

    // Целимся в текущее положение игрока (упреждения нет — от пули можно уйти)
    const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, this.player.x, this.player.y);
    const speed = 260 * Math.min(this.speedMultiplier, 1.5);
    bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  hitEnemyBullet(player, bullet) {
    bullet.destroy();
    if (this.shielded) {
      this.cameras.main.flash(120, 79, 216, 224);
      return;
    }
    this.endGame();
  }

  // ---------- Спавн объектов ----------

  spawnObstacle() {
    if (this.isGameOver) return;
    const width = this.scale.width;

    const allTypes = [
      { key: 'ast_small', baseSpeed: 230, score: 1, w: 34, h: 30, weight: 5, hit: 0.6 },
      { key: 'ast_medium', baseSpeed: 150, score: 1, w: 60, h: 52, weight: 3, hit: 0.6 },
      { key: 'drone', baseSpeed: 170, score: 1, w: 64, h: 34, weight: 2, zigzag: true, hit: 0.7 },
      // Охотник: подруливает к игроку, сбивается одним выстрелом
      {
        key: 'hunter',
        baseSpeed: 110,
        score: 1,
        killScore: 3,
        w: 50,
        h: 42,
        hit: 0.7,
        weight: 2,
        homing: true,
        homeSpeed: 150,
        shootable: true,
        minTime: 12000,
      },
      // Стрелок: медленно ползёт к игроку, стреляет в него, нужно 2 попадания
      {
        key: 'gunner',
        baseSpeed: 70,
        score: 1,
        killScore: 5,
        w: 46,
        h: 50,
        hit: 0.7,
        weight: 2,
        homing: true,
        homeSpeed: 90,
        shootable: true,
        shoots: true,
        fireInterval: 1700,
        hp: 2,
        minTime: 25000,
      },
    ];

    // Не больше одного стрелка на экране одновременно
    const hasGunner = this.obstacles.getChildren().some((o) => {
      const t = o.active && o.getData('type');
      return t && t.key === 'gunner';
    });

    const types = allTypes.filter(
      (t) => (!t.minTime || this.playTimeMs >= t.minTime) && !(t.key === 'gunner' && hasGunner)
    );
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
    const hit = type.hit || 0.8; // доля спрайта, которая реально «бьёт»
    obstacle.body.setSize(type.w * hit, type.h * hit, true);
    obstacle.setData('type', type);
    obstacle.setData('scored', false);
    obstacle.setData('hp', type.hp || 1);
    obstacle.setData('nextShot', this.playTimeMs + 1200);
    obstacle.setData('baseX', x);
    obstacle.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
    obstacle.body.setVelocityY(type.baseSpeed * this.speedMultiplier);

    if (type.key === 'ast_small' || type.key === 'ast_medium') {
      obstacle.setAngularVelocity(Phaser.Math.Between(-60, 60));
    }

    if (type.key === 'hunter' && !this.hunterWarned) {
      this.hunterWarned = true;
      this.flashMessage(this.isTouch ? 'Охотник!\nСбей его выстрелом' : 'Охотник!\nСбей его — W / ↑');
    }
    if (type.key === 'gunner' && !this.gunnerWarned) {
      this.gunnerWarned = true;
      this.flashMessage('Стрелок!\nУворачивайся от пуль\nи сбей его (2 попадания)');
    }
  }

  spawnPickup() {
    if (this.isGameOver) return;
    const width = this.scale.width;
    const x = Phaser.Math.Between(30, width - 30);
    const pickup = this.pickups.create(x, -30, 'shield_pickup');
    pickup.setDepth(5);
    pickup.body.setSize(28, 28, true);
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

  // ---------- Столкновения и щит ----------

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
    this.shieldRemaining = this.shieldDuration; // повторный подбор обновляет таймер

    if (!this.shieldRing) {
      this.shieldRing = this.add
        .circle(this.player.x, this.player.y, 38, 0x4fd8e0, 0.15)
        .setStrokeStyle(2, 0x4fd8e0, 0.9)
        .setDepth(9);
    }
    this.shieldRing.setVisible(true).setAlpha(1).setScale(1);

    this.setShieldHudVisible(true);
    this.updateShield(0);

    this.flashMessage('Щит активен!');
  }

  deactivateShield() {
    this.shielded = false;
    this.shieldRemaining = 0;
    this.player.setAlpha(1);
    if (this.shieldRing) this.shieldRing.setVisible(false);
    this.setShieldHudVisible(false);
  }

  // Вызывается каждый кадр: тратит время щита и обновляет индикацию.
  // Время считается в update(), поэтому на паузе щит не «сгорает».
  updateShield(delta) {
    if (!this.shielded) return;

    this.shieldRemaining -= delta;
    if (this.shieldRemaining <= 0) {
      this.deactivateShield();
      return;
    }

    const ratio = this.shieldRemaining / this.shieldDuration;
    const ending = this.shieldRemaining < 1000;
    // В последнюю секунду щит и корабль мигают — игрок видит, что защита кончается
    const blinkOn = !ending || Math.floor(this.playTimeMs / 110) % 2 === 0;

    const { barFill, label, icon } = this.shieldHud;
    barFill.setScale(ratio, 1);
    barFill.setFillStyle(ending ? 0xff6b3d : 0x4fd8e0);
    icon.setAlpha(blinkOn ? 1 : 0.3);
    label.setText(`Щит ${(this.shieldRemaining / 1000).toFixed(1)} с`);
    label.setColor(ending ? '#ff6b3d' : '#4fd8e0');

    this.shieldRing.setPosition(this.player.x, this.player.y);
    this.shieldRing.setAlpha(blinkOn ? 1 : 0.2);
    this.shieldRing.setScale(1 + 0.05 * Math.sin(this.playTimeMs / 150));

    this.player.setAlpha(blinkOn ? 1 : 0.45);
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
    [this.obstacleTimer, this.pickupTimer, this.difficultyTimer].forEach(
      (t) => t && (t.paused = true)
    );

    this.showPauseOverlay();
  }

  resumeGame() {
    this.isPaused = false;
    this.touchDir = 0;
    this.movePointerId = null;

    this.physics.resume();
    [this.obstacleTimer, this.pickupTimer, this.difficultyTimer].forEach(
      (t) => t && (t.paused = false)
    );

    this.hidePauseOverlay();
  }

  showPauseOverlay() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const btnWidth = Math.min(240, width - 48);

    // Затемнение сделано интерактивным, чтобы клики «не проваливались»
    // на кнопки паузы/огня под ним
    const dim = this.add.rectangle(cx, cy, width, height, 0x070812, 0.82).setInteractive();

    const title = this.add
      .text(cx, cy - 130, 'Пауза', {
        fontFamily: 'Verdana, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#f4f6fb',
      })
      .setOrigin(0.5);

    const resumeBtn = this.createMenuButton(cx, cy - 40, btnWidth, 'Продолжить', 'primary', () =>
      this.resumeGame()
    );
    const restartBtn = this.createMenuButton(cx, cy + 24, btnWidth, 'Начать заново', 'secondary', () =>
      this.restartGame()
    );
    const exitBtn = this.createMenuButton(cx, cy + 88, btnWidth, 'Выйти на лендинг', 'secondary', () =>
      this.exitToLanding()
    );

    this.pauseOverlay = this.add
      .container(0, 0, [dim, title, ...resumeBtn, ...restartBtn, ...exitBtn])
      .setDepth(30);
  }

  // Кнопка меню: прямоугольник + подпись. Срабатывает по отпусканию (как обычный клик),
  // только если нажатие началось на этой же кнопке.
  createMenuButton(x, y, width, label, variant, onClick) {
    const palette =
      variant === 'primary'
        ? { fill: 0x4fd8e0, hover: 0x7c5cff, down: 0x5a3fd1, text: '#070812', textHover: '#f4f6fb' }
        : { fill: 0x1b1f36, hover: 0x2a2f52, down: 0x151830, text: '#f4f6fb', textHover: '#4fd8e0' };

    const rect = this.add
      .rectangle(x, y, width, 48, palette.fill)
      .setInteractive({ useHandCursor: true });
    if (variant !== 'primary') rect.setStrokeStyle(1, 0x2a2f52);

    const text = this.add
      .text(x, y, label, { fontFamily: 'Verdana, sans-serif', fontSize: '18px', color: palette.text })
      .setOrigin(0.5);

    let pressed = false;
    rect.on('pointerover', () => {
      rect.setFillStyle(palette.hover);
      text.setColor(palette.textHover);
    });
    rect.on('pointerout', () => {
      pressed = false;
      rect.setFillStyle(palette.fill);
      text.setColor(palette.text);
    });
    rect.on('pointerdown', () => {
      pressed = true;
      rect.setFillStyle(palette.down);
    });
    rect.on('pointerup', () => {
      if (!pressed) return;
      pressed = false;
      onClick();
    });

    return [rect, text];
  }

  hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy(true);
      this.pauseOverlay = null;
    }
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('spaceDodgerBest', String(this.best));
    }
  }

  restartGame() {
    this.saveBest();
    this.physics.resume();
    this.scene.restart();
  }

  exitToLanding() {
    this.saveBest(); // рекорд не должен пропадать, если выходим из паузы
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

    this.saveBest();

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
    if (this.hintText) this.hintText.setPosition(width / 2, 104);
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
    this.updateShield(delta);

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

      // Охотник и стрелок стремятся встать напротив игрока (пока не пролетели мимо него)
      if (type && type.homing) {
        if (obstacle.y < this.player.y) {
          const maxSpeed = type.homeSpeed * Math.min(this.speedMultiplier, 2);
          const dx = this.player.x - obstacle.x;
          obstacle.body.setVelocityX(Phaser.Math.Clamp(dx * 3, -maxSpeed, maxSpeed));
        } else {
          obstacle.body.setVelocityX(0);
        }
      }

      // Стрелок стреляет, пока он на экране и не слишком близко к игроку
      if (
        type &&
        type.shoots &&
        obstacle.y > 20 &&
        obstacle.y < this.player.y - 140 &&
        this.playTimeMs >= obstacle.getData('nextShot')
      ) {
        this.enemyShoot(obstacle);
        obstacle.setData('nextShot', this.playTimeMs + type.fireInterval);
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

    this.enemyBullets.children.each((bullet) => {
      if (!bullet.active) return;
      if (
        bullet.y > this.scale.height + 30 ||
        bullet.y < -30 ||
        bullet.x < -30 ||
        bullet.x > this.scale.width + 30
      ) {
        bullet.destroy();
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
