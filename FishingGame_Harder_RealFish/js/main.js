class GameAudio {
  constructor() {
    this.muted = false;
    this.context = null;
  }
  ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.context = new AudioContextClass();
    }
    if (this.context && this.context.state === 'suspended') this.context.resume();
  }
  tone(freq, duration, type = 'square', volume = 0.04) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.context) return;
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }
  play(name) {
    const map = {
      cast: () => this.tone(280, 0.08, 'triangle', 0.05),
      bite: () => this.tone(520, 0.12, 'square', 0.05),
      catch: () => {
        this.tone(600, 0.08, 'square', 0.05);
        setTimeout(() => this.tone(840, 0.12, 'square', 0.04), 80);
      },
      lose: () => this.tone(170, 0.32, 'sawtooth', 0.04),
      feed: () => {
        this.tone(380, 0.06, 'square', 0.05);
        setTimeout(() => this.tone(460, 0.08, 'triangle', 0.04), 55);
      },
      bossClear: () => {
        this.tone(520, 0.08, 'square', 0.04);
        setTimeout(() => this.tone(720, 0.1, 'square', 0.04), 70);
        setTimeout(() => this.tone(980, 0.14, 'triangle', 0.04), 150);
      }
    };
    if (map[name]) map[name]();
  }
}

class BossCreature {
  constructor(game, config) {
    this.game = game;
    this.name = config.name;
    this.type = config.type;
    this.requiredFish = config.requiredFish;
    this.progress = 0;
    this.x = 0;
    this.y = 0;
    this.floatTime = Math.random() * 10;
  }

  resetProgress() {
    this.progress = 0;
  }

  update(dt) {
    this.floatTime += dt;
    const entering = this.game.traveling ? Math.max(0, this.game.boatTravelOffset - 0.55) / 0.45 : 1;
    const slideX = this.game.traveling ? this.game.width * (1.18 - entering * 0.35) : this.game.width * 0.83;
    this.x = slideX;
    this.y = this.game.waterTop - 4 + Math.sin(this.floatTime * 1.5) * 6;
  }

  feed() {
    if (this.progress >= this.requiredFish) return false;
    this.progress += 1;
    return true;
  }

  get complete() {
    return this.progress >= this.requiredFish;
  }

  get mouthX() {
    if (this.type === 'turtle') return this.x - 88;
    if (this.type === 'shark') return this.x - 118;
    return this.x - 146;
  }

  get mouthY() {
    if (this.type === 'turtle') return this.y + 18;
    if (this.type === 'shark') return this.y + 16;
    return this.y + 24;
  }

  px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  draw(ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#071721';
    ctx.fillRect(-116, 48, this.type === 'whale' ? 190 : this.type === 'shark' ? 170 : 138, 12);
    ctx.globalAlpha = 1;
    if (this.type === 'turtle') this.drawTurtle(ctx);
    if (this.type === 'shark') this.drawShark(ctx);
    if (this.type === 'whale') this.drawWhale(ctx);
    ctx.restore();
  }

  drawTurtle(ctx) {
    this.px(ctx, -88, 14, 26, 18, '#d7c996');
    this.px(ctx, -62, 8, 10, 10, '#213722');
    this.px(ctx, -42, 0, 62, 42, '#6a4327');
    this.px(ctx, -28, 8, 40, 26, '#422716');
    this.px(ctx, -8, 0, 24, 8, '#87633f');
    this.px(ctx, 22, 8, 24, 10, '#688345');
    this.px(ctx, 44, 18, 16, 10, '#688345');
    this.px(ctx, -24, 36, 22, 10, '#688345');
    this.px(ctx, 16, 36, 28, 10, '#688345');
    this.px(ctx, 26, -4, 18, 14, '#688345');
    this.px(ctx, -72, 18, 10, 4, '#0d1820');
    this.px(ctx, -86, 22, 14, 4, '#fff4d8');
  }

  drawShark(ctx) {
    this.px(ctx, -120, 18, 46, 18, '#81939d');
    this.px(ctx, -74, 8, 90, 26, '#81939d');
    this.px(ctx, 16, 12, 58, 22, '#81939d');
    this.px(ctx, 74, 18, 38, 16, '#81939d');
    this.px(ctx, -26, -18, 28, 26, '#42545d');
    this.px(ctx, 110, 8, 22, 16, '#81939d');
    this.px(ctx, 132, -4, 18, 18, '#81939d');
    this.px(ctx, 132, 26, 18, 18, '#81939d');
    this.px(ctx, -64, 34, 34, 12, '#42545d');
    this.px(ctx, -114, 28, 58, 8, '#eef8ff');
    this.px(ctx, -92, 16, 8, 8, '#0d1820');
    this.px(ctx, -124, 26, 10, 4, '#ffffff');
    this.px(ctx, -112, 26, 10, 4, '#ffffff');
    this.px(ctx, -100, 26, 10, 4, '#ffffff');
  }

  drawWhale(ctx) {
    this.px(ctx, -150, 16, 58, 28, '#68839b');
    this.px(ctx, -92, 0, 108, 42, '#68839b');
    this.px(ctx, 16, 6, 86, 36, '#68839b');
    this.px(ctx, 102, 14, 36, 22, '#68839b');
    this.px(ctx, 138, 0, 22, 18, '#68839b');
    this.px(ctx, 138, 32, 22, 18, '#68839b');
    this.px(ctx, -8, -34, 26, 34, '#314457');
    this.px(ctx, -126, 34, 138, 10, '#e4f3fa');
    this.px(ctx, -86, 12, 8, 8, '#0d1820');
    this.px(ctx, -144, 26, 18, 4, '#d9eef6');
    this.px(ctx, -20, 40, 44, 10, '#314457');
  }
}

class FishingGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.worldWidth = this.width;
    this.waterTop = 180;
    this.waterHeight = this.height - this.waterTop;
    this.running = false;
    this.paused = false;
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.zoom = 1;
    this.lastTime = 0;
    this.images = [];
    this.fish = [];
    this.ripples = [];
    this.keys = new Set();
    this.audio = new GameAudio();
    this.collectedFish = 0;
    this.fedFishTotal = 0;
    this.messageTimer = 0;
    this.messageText = 'Hard mode: fish are faster, bite shorter, and bosses eat more.';
    this.bossConfigs = [
      { name: 'Sea Turtle', type: 'turtle', requiredFish: 5 },
      { name: 'Reef Shark', type: 'shark', requiredFish: 9 },
      { name: 'Blue Whale', type: 'whale', requiredFish: 14 },
      { name: 'Hungry Shark', type: 'shark', requiredFish: 20 }
    ];
    this.hardMode = true;
    this.currentBossIndex = 0;
    this.boss = null;
    this.traveling = false;
    this.travelTimer = 0;
    this.travelDuration = 4.8;
    this.pendingBossIndex = null;
    this.boatTravelOffset = 0;
    this.destinationName = '';
    this.ui = {
      menu: document.getElementById('menuOverlay'),
      pause: document.getElementById('pauseOverlay'),
      gameOver: document.getElementById('gameOverOverlay'),
      finalScore: document.getElementById('finalScore'),
      gameOverTitle: document.getElementById('gameOverTitle'),
      gameOverText: document.getElementById('gameOverText')
    };
    this.player = new FishingPlayer(this);
    this.preloadAssets().then(() => {
      this.setupEvents();
      this.resize();
      this.resetGame();
      requestAnimationFrame(this.loop.bind(this));
    });
  }

  async preloadAssets() {
    const paths = ['assets/images/goldfish.png', 'assets/images/bass.png', 'assets/images/catfish.png'];
    this.images = await Promise.all(paths.map(path => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = path;
    })));
  }

  setupEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', event => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
      this.player.setMouse(x, y);
    });
    window.addEventListener('mousedown', event => {
      if (event.button !== 0) return;
      this.audio.ensureContext();
      if (!this.running || this.paused) return;
      this.player.chargeCast();
      this.player.isReeling = true;
    });
    window.addEventListener('mouseup', event => {
      if (event.button !== 0) return;
      this.player.isReeling = false;
      this.player.releaseCast();
    });
    window.addEventListener('click', () => {
      if (!this.running || this.paused) return;
      this.audio.play('cast');
      this.addRipple(this.player.hook.x, this.player.hook.y, 8);
      this.player.lineLength = Math.max(0, this.player.lineLength - 1.2);
    });
    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (event.key === 'Escape') this.togglePause();
      if (key === 'r') {
        this.resetGame();
        this.start();
      }
      if (['1', '2', '3'].includes(event.key)) this.player.setBait(Number(event.key) - 1);
      if (key === 'm') this.audio.muted = !this.audio.muted;
      if (key === 'f') this.feedBoss();
    });
    window.addEventListener('keyup', event => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener('contextmenu', event => {
      event.preventDefault();
      this.player.cycleBait(1);
    });
    window.addEventListener('blur', () => {
      if (this.running) this.pause(true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.running) this.pause(true);
    });
    window.addEventListener('fishHooked', () => {
      this.player.hasFishAttached = true;
    });
    window.addEventListener('gameCast', () => this.addRipple(this.player.hook.x, this.player.hook.y, 15));
    window.addEventListener('fishCaught', () => this.audio.play('catch'));
    window.addEventListener('lineBreak', () => this.audio.play('lose'));
    document.getElementById('playBtn').addEventListener('click', () => this.start());
    document.getElementById('restartBtn').addEventListener('click', () => {
      this.resetGame();
      this.start();
    });
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * ratio);
    this.canvas.height = Math.round(window.innerHeight * ratio);
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.worldWidth = this.width;
    this.waterTop = Math.round(this.height * 0.19);
    this.waterHeight = this.height - this.waterTop;
    this.ctx.imageSmoothingEnabled = false;
    this.player.rodBase.x = Math.round(this.width * 0.18);
    this.player.rodBase.y = Math.round(this.waterTop - 38);
  }

  resetGame() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.zoom = 1;
    this.running = false;
    this.paused = false;
    this.ripples = [];
    this.collectedFish = 0;
    this.fedFishTotal = 0;
    this.currentBossIndex = 0;
    this.traveling = false;
    this.travelTimer = 0;
    this.pendingBossIndex = null;
    this.boatTravelOffset = 0;
    this.destinationName = '';
    this.boss = new BossCreature(this, this.bossConfigs[this.currentBossIndex]);
    this.messageText = 'Hard mode: fish are faster, bite shorter, and bosses eat more.';
    this.messageTimer = 5;
    this.player.reset();
    this.spawnFish(6);
    this.showOverlay(this.ui.menu, true);
    this.showOverlay(this.ui.pause, false);
    this.showOverlay(this.ui.gameOver, false);
  }

  start() {
    this.running = true;
    this.paused = false;
    this.showOverlay(this.ui.menu, false);
    this.showOverlay(this.ui.pause, false);
  }

  pause(force = false) {
    this.paused = force || !this.paused;
    this.showOverlay(this.ui.pause, this.paused);
  }

  togglePause() {
    if (this.running) this.pause();
  }

  finishGame(win = false) {
    this.running = false;
    this.paused = false;
    this.ui.finalScore.textContent = `${this.fedFishTotal}`;
    this.ui.gameOverTitle.textContent = win ? 'You Win' : 'Game Over';
    this.ui.gameOverText.textContent = win
      ? 'All bosses are full. You cleared the fishing route.'
      : 'You ran out of line. Try again and feed every boss.';
    this.showOverlay(this.ui.gameOver, true);
  }

  showOverlay(node, visible) {
    node.classList.toggle('hidden', !visible);
    node.classList.toggle('visible', visible);
  }

  spawnFish(count) {
    this.fish = Array.from({ length: count }, (_, index) => new Fish(this, this.images[index % this.images.length], index));
  }

  addRipple(x, y, radius) {
    this.ripples.push({ x, y, radius, alpha: 0.8 });
  }

  setMessage(text, time = 2.6) {
    this.messageText = text;
    this.messageTimer = time;
  }

  canFeedBoss() {
    const hookNearSurface = this.player.hook.y <= this.waterTop + 34;
    const lineShort = this.player.lineLength < 16;
    return !this.player.hasFishAttached && (hookNearSurface || !this.player.isCasting || lineShort);
  }

  beginTravelToBoss(nextIndex) {
    this.traveling = true;
    this.travelTimer = 0;
    this.pendingBossIndex = nextIndex;
    this.destinationName = this.bossConfigs[nextIndex].name;
    this.player.reset();
    this.player.hasFishAttached = false;
    this.setMessage(`Boss fed. Sailing to ${this.destinationName}...`, this.travelDuration);
  }

  completeTravel() {
    if (this.pendingBossIndex == null) return;
    this.currentBossIndex = this.pendingBossIndex;
    this.pendingBossIndex = null;
    this.traveling = false;
    this.travelTimer = 0;
    this.boatTravelOffset = 0;
    this.boss = new BossCreature(this, this.bossConfigs[this.currentBossIndex]);
    this.spawnFish(Math.min(12, 6 + this.currentBossIndex * 2));
    this.player.reset();
    this.fish.forEach(fish => fish.resetPosition());
    this.setMessage(`Arrived at ${this.boss.name}. Catch fish and feed it.`, 3);
  }

  feedBoss() {
    if (!this.running || this.paused || !this.boss || this.traveling) return;
    if (this.collectedFish <= 0) {
      this.setMessage('Catch fish first.', 1.8);
      return;
    }
    if (!this.canFeedBoss()) {
      this.setMessage('Reel the hook near the boat, then press F.', 2.2);
      return;
    }
    if (!this.boss.feed()) return;

    this.collectedFish -= 1;
    this.fedFishTotal += 1;
    this.score = this.fedFishTotal;
    this.audio.play('feed');
    this.addRipple(this.boss.mouthX, this.boss.mouthY, 14);

    if (this.boss.complete) {
      this.audio.play('bossClear');
      const nextIndex = this.currentBossIndex + 1;
      this.level += 1;
      this.lives = Math.min(4, this.lives + 1);
      if (nextIndex >= this.bossConfigs.length) {
        this.finishGame(true);
        return;
      }
      this.beginTravelToBoss(nextIndex);
    } else {
      this.setMessage(`Fed ${this.boss.name}: ${this.boss.progress}/${this.boss.requiredFish}`, 1.8);
    }
  }

  update(dt) {
    if (!this.running || this.paused) return;

    if (this.traveling) {
      this.travelTimer += dt;
      const progress = Math.min(1, this.travelTimer / this.travelDuration);
      this.boatTravelOffset = progress;
      if (this.boss) this.boss.update(dt);
      this.ripples.forEach(ripple => {
        ripple.radius += dt * 50;
        ripple.alpha -= dt * 0.7;
      });
      this.ripples = this.ripples.filter(ripple => ripple.alpha > 0);
      this.messageTimer = Math.max(0, this.messageTimer - dt);
      if (progress >= 1) this.completeTravel();
      return;
    }

    if (this.keys.has('arrowup') || this.keys.has('w')) this.player.setMouse(this.player.mouse.x, this.player.mouse.y - 220 * dt);
    if (this.keys.has('arrowdown') || this.keys.has('s')) this.player.setMouse(this.player.mouse.x, this.player.mouse.y + 220 * dt);
    if (this.keys.has('arrowleft') || this.keys.has('a')) this.player.setMouse(this.player.mouse.x - 220 * dt, this.player.mouse.y);
    if (this.keys.has('arrowright') || this.keys.has('d')) this.player.setMouse(this.player.mouse.x + 220 * dt, this.player.mouse.y);

    this.player.update(dt);
    if (this.boss) this.boss.update(dt);
    const context = { player: this.player };

    for (const fish of this.fish) {
      fish.update(dt, context);
      if (fish.fsm.currentState === 'HOOKED') {
        const nearSurface = fish.y < this.waterTop + 8;
        const nearRod = Math.hypot(fish.x - this.player.rodTip.x, fish.y - this.player.rodTip.y) < 44;
        if (nearSurface || nearRod) {
          this.collectedFish += 1;
          this.player.hasFishAttached = false;
          fish.resetPosition();
          this.player.isCasting = false;
          window.dispatchEvent(new CustomEvent('fishCaught'));
          this.addRipple(this.player.hook.x, this.player.hook.y, 18);
          this.setMessage(`Fish collected: ${this.collectedFish}. Bring the hook close and press F for ${this.boss.name}.`, 2.2);
        }
      }
      if (fish.fsm.currentState === 'ESCAPE_ATTEMPT' && fish.distanceToBait(this.player.hook) < 24) {
        this.player.lineLength -= dt * 68;
      }
    }

    if (this.player.lineLength <= 0) {
      this.lives -= 1;
      window.dispatchEvent(new CustomEvent('lineBreak'));
      this.player.reset();
      this.player.hasFishAttached = false;
      this.fish.forEach(f => f.resetPosition());
      this.setMessage('Line snapped. Hard mode punishes bad timing.', 2.2);
      if (this.lives <= 0) this.finishGame(false);
    }

    this.ripples.forEach(ripple => {
      ripple.radius += dt * 50;
      ripple.alpha -= dt * 0.7;
    });
    this.ripples = this.ripples.filter(ripple => ripple.alpha > 0);
    this.messageTimer = Math.max(0, this.messageTimer - dt);
  }

  drawCloud(x, y, scale = 1) {
    const ctx = this.ctx;
    const w = 74 * scale;
    const h = 26 * scale;
    ctx.fillStyle = '#f8feff';
    ctx.fillRect(x, y, w, h);
    ctx.fillRect(x + 14 * scale, y - 10 * scale, 24 * scale, 12 * scale);
    ctx.fillRect(x + 36 * scale, y - 16 * scale, 22 * scale, 16 * scale);
    ctx.fillRect(x + 58 * scale, y - 8 * scale, 18 * scale, 10 * scale);
  }

  drawBoat() {
    const ctx = this.ctx;
    const travelShift = this.traveling ? Math.sin(this.boatTravelOffset * Math.PI) * this.width * 0.22 : 0;
    const x = this.width * 0.19 + travelShift;
    const y = this.waterTop - 8 + Math.sin(performance.now() * 0.004) * 2;

    ctx.fillStyle = '#0b2a3a';
    ctx.fillRect(x + 20, y - 78, 6, 54);
    ctx.fillStyle = '#e2ecef';
    ctx.fillRect(x - 2, y - 38, 126, 24);
    ctx.fillRect(x + 36, y - 68, 52, 32);
    ctx.fillRect(x + 86, y - 58, 20, 20);
    ctx.fillStyle = '#88959d';
    ctx.fillRect(x + 40, y - 62, 12, 10);
    ctx.fillRect(x + 56, y - 62, 12, 10);
    ctx.fillRect(x + 72, y - 62, 12, 10);
    ctx.fillStyle = '#ffbe54';
    ctx.fillRect(x + 26, y - 58, 7, 34);
    ctx.fillStyle = '#ffcf74';
    ctx.beginPath();
    ctx.moveTo(x + 33, y - 56);
    ctx.lineTo(x + 82, y - 42);
    ctx.lineTo(x + 33, y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d1463f';
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 14);
    ctx.lineTo(x + 148, y - 14);
    ctx.lineTo(x + 126, y + 14);
    ctx.lineTo(x + 8, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2f7fb';
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 16);
    ctx.lineTo(x + 154, y - 16);
    ctx.lineTo(x + 130, y + 10);
    ctx.lineTo(x + 2, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1e3647';
    ctx.fillRect(x + 20, y - 3, 18, 5);
    ctx.fillRect(x + 45, y - 3, 18, 5);
    ctx.fillRect(x + 70, y - 3, 18, 5);
    ctx.fillRect(x + 95, y - 3, 18, 5);

    if (!this.traveling) {
      const px = this.player.rodBase.x - 6;
      const py = this.player.rodBase.y - 30;
      ctx.fillStyle = '#f39f49';
      ctx.fillRect(px, py, 14, 18);
      ctx.fillStyle = '#2a2f38';
      ctx.fillRect(px + 2, py + 18, 10, 16);
      ctx.fillStyle = '#152330';
      ctx.fillRect(px + 1, py + 4, 12, 8);
      ctx.fillStyle = '#46b65a';
      ctx.fillRect(px + 3, py + 6, 8, 4);
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const now = performance.now() * 0.001;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#86d7ff';
    ctx.fillRect(0, 0, this.width, this.waterTop);
    this.drawCloud(this.width * 0.06, this.waterTop * 0.18, 1.8);
    this.drawCloud(this.width * 0.72, this.waterTop * 0.28, 1.5);

    ctx.fillStyle = '#8ad9ff';
    ctx.fillRect(0, this.waterTop - 8, this.width, 6);
    ctx.fillStyle = '#ffffff';
    for (let x = 0; x < this.width; x += 34) {
      const bump = Math.sin(x * 0.02 + now * 3.3) * 2;
      ctx.fillRect(x, this.waterTop - 6 + bump, 22, 4);
    }

    this.drawBoat();

    if (this.traveling) {
      const islandX = this.width * (0.92 - this.boatTravelOffset * 0.55);
      ctx.fillStyle = '#d9f3a4';
      ctx.fillRect(islandX, this.waterTop - 14, 90, 16);
      ctx.fillStyle = '#78c36b';
      ctx.fillRect(islandX + 10, this.waterTop - 28, 58, 14);
      ctx.fillStyle = '#295d39';
      ctx.fillRect(islandX + 42, this.waterTop - 42, 12, 16);
      ctx.fillRect(islandX + 46, this.waterTop - 58, 4, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText(`SAILING TO ${this.destinationName.toUpperCase()}`, this.width * 0.52, 34);
    }
    if (this.boss) this.boss.draw(ctx);

    const waterGrad = ctx.createLinearGradient(0, this.waterTop, 0, this.height);
    waterGrad.addColorStop(0, '#1d98c8');
    waterGrad.addColorStop(0.38, '#1a89b6');
    waterGrad.addColorStop(0.68, '#166986');
    waterGrad.addColorStop(1, '#0c3749');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, this.waterTop, this.width, this.height - this.waterTop);

    const zones = [0.18, 0.52, 0.82];
    const zoneColors = ['rgba(255,255,255,0.06)', 'rgba(0,30,45,0.07)', 'rgba(0,12,18,0.14)'];
    zones.forEach((p, i) => {
      ctx.fillStyle = zoneColors[i];
      ctx.fillRect(0, this.waterTop + (this.height - this.waterTop) * p, this.width, (this.height - this.waterTop) * 0.18);
    });

    for (let i = 0; i < 26; i += 1) {
      const y = this.waterTop + 14 + i * 24 + Math.sin(now * 2 + i) * 2;
      ctx.fillStyle = `rgba(255,255,255,${0.035 - i * 0.0008})`;
      for (let x = 0; x < this.width; x += 38) {
        ctx.fillRect(x, y + Math.sin(x * 0.024 + i) * 3, 18, 2);
      }
    }

    for (let i = 0; i < 15; i += 1) {
      const rayX = (this.width / 15) * i + Math.sin(now + i) * 16;
      const grad = ctx.createLinearGradient(rayX, this.waterTop, rayX + 60, this.height);
      grad.addColorStop(0, 'rgba(255,255,255,0.05)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(rayX, this.waterTop);
      ctx.lineTo(rayX + 50, this.height);
      ctx.lineTo(rayX + 92, this.height);
      ctx.lineTo(rayX + 18, this.waterTop);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#0d2331';
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, this.height - 120);
    ctx.lineTo(this.width * 0.11, this.height - 180);
    ctx.lineTo(this.width * 0.18, this.height - 130);
    ctx.lineTo(this.width * 0.30, this.height - 220);
    ctx.lineTo(this.width * 0.38, this.height - 148);
    ctx.lineTo(this.width * 0.48, this.height - 250);
    ctx.lineTo(this.width * 0.61, this.height - 184);
    ctx.lineTo(this.width * 0.72, this.height - 220);
    ctx.lineTo(this.width * 0.84, this.height - 142);
    ctx.lineTo(this.width, this.height - 176);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#17384a';
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, this.height - 86);
    ctx.lineTo(this.width * 0.14, this.height - 136);
    ctx.lineTo(this.width * 0.28, this.height - 112);
    ctx.lineTo(this.width * 0.42, this.height - 184);
    ctx.lineTo(this.width * 0.58, this.height - 128);
    ctx.lineTo(this.width * 0.78, this.height - 148);
    ctx.lineTo(this.width, this.height - 108);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#24556c';
    for (let i = 0; i < 18; i += 1) {
      const x = 40 + i * (this.width / 18);
      const h = 24 + (i % 4) * 16;
      ctx.fillRect(x, this.height - h - 6, 4, h);
      ctx.fillRect(x - 6, this.height - h * 0.62 - 4, 14, 4);
    }
  }

  drawRipples() {
    for (const ripple of this.ripples) {
      this.ctx.save();
      this.ctx.globalAlpha = ripple.alpha;
      this.ctx.strokeStyle = '#f4fbff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  drawHudBox(x, y, w, h, bg, border = '#09131a') {
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(x, y, w, h);
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = border;
    this.ctx.strokeRect(x, y, w, h);
  }

  drawBossPanel() {
    const ctx = this.ctx;
    const boxW = 360;
    const boxH = 84;
    const x = this.width - boxW - 24;
    const y = this.height - 120;
    this.drawHudBox(x, y, boxW, boxH, 'rgba(227,236,240,0.94)', '#344954');
    ctx.fillStyle = '#12232d';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`BOSS ${this.currentBossIndex + 1}: ${this.boss.name.toUpperCase()}`, x + 14, y + 22);
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(`Needs fish: ${this.boss.progress}/${this.boss.requiredFish}`, x + 14, y + 46);
    ctx.fillText('Press F near the boat to feed', x + 14, y + 66);
    ctx.fillStyle = '#405b69';
    ctx.fillRect(x + 208, y + 18, 130, 18);
    ctx.fillStyle = '#5cd26a';
    ctx.fillRect(x + 210, y + 20, 126 * (this.boss.progress / this.boss.requiredFish), 14);
  }

  drawHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.font = 'bold 34px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    this.drawHudBox(24, 18, 150, 52, '#254f95');
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(this.collectedFish), 126, 44);
    ctx.fillStyle = '#8de6ff';
    ctx.fillText('><>', 44, 44);

    this.drawHudBox(188, 18, 150, 52, '#9a2f35');
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(this.player.baitIndex + 1), 290, 44);
    ctx.fillStyle = ['#ff99a1', '#d7ecff', '#ffe564'][this.player.baitIndex];
    ctx.fillText('[]', 210, 44);

    this.drawHudBox(356, 16, 278, 56, '#2d8b28');
    this.drawHudBox(402, 20, 226, 48, '#f2f3f0');
    ctx.fillStyle = '#1a2518';
    ctx.fillText(String(this.fedFishTotal).padStart(2, '0'), 524, 44);
    ctx.fillStyle = '#d7ff58';
    ctx.fillText('$', 370, 44);

    this.drawHudBox(this.width - 92, 18, 50, 50, '#c43e40');
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(this.lives), this.width - 72, 44);

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#eafcff';
    ctx.fillText(`LINE ${Math.max(0, Math.round(this.player.lineLength))}`, 28, this.height - 120);
    ctx.fillText(`STAGE ${this.level}`, 28, this.height - 94);
    ctx.fillText(`BAIT ${this.player.currentBait.toUpperCase()}`, 28, this.height - 68);
    ctx.fillText(`COLLECTED ${this.collectedFish}`, 28, this.height - 42);

    this.drawBossPanel();

    const boxW = 420;
    const boxH = 56;
    const boxX = (this.width - boxW) / 2;
    const boxY = this.height - 66;
    this.drawHudBox(boxX, boxY, boxW, boxH, 'rgba(228,237,241,0.92)', '#677a85');
    ctx.fillStyle = '#1f313b';
    ctx.font = '16px "Courier New", monospace';
    ctx.textAlign = 'center';
    const text = this.messageTimer > 0 ? this.messageText : 'Hard mode: tighter catches, faster escapes, hungrier bosses.';
    ctx.fillText(text, this.width / 2, this.height - 36);

    ctx.restore();
  }

  draw() {
    this.drawBackground();
    if (!this.traveling) this.fish.slice().sort((a, b) => a.depth - b.depth).forEach(fish => fish.draw(this.ctx));
    this.drawRipples();
    if (!this.traveling) this.player.draw(this.ctx);
    this.drawHUD();
  }

  loop(timestamp) {
    const dt = Math.min(0.033, (timestamp - this.lastTime) / 1000 || 0.016);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => new FishingGame());
