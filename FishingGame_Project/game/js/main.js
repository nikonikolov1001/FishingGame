class GameAudio {
  constructor() {
    this.muted = false;
    this.context = null;
  }

  ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.context = new AudioContextClass();
      }
    }
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  tone(freq, duration, type = 'sine', volume = 0.04) {
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
      cast: () => this.tone(320, 0.08, 'triangle', 0.05),
      bite: () => this.tone(580, 0.15, 'square', 0.04),
      catch: () => {
        this.tone(660, 0.1, 'triangle', 0.05);
        setTimeout(() => this.tone(880, 0.14, 'triangle', 0.04), 100);
      },
      lose: () => this.tone(180, 0.35, 'sawtooth', 0.04)
    };
    if (map[name]) map[name]();
  }
}

class FishingGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.worldWidth = this.width;
    this.waterTop = 110;
    this.waterHeight = this.height - this.waterTop - 40;
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

    this.ui = {
      score: document.getElementById('scoreValue'),
      lives: document.getElementById('livesValue'),
      level: document.getElementById('levelValue'),
      line: document.getElementById('lineValue'),
      bait: document.getElementById('baitValue'),
      zoom: document.getElementById('zoomValue'),
      menu: document.getElementById('menuOverlay'),
      pause: document.getElementById('pauseOverlay'),
      gameOver: document.getElementById('gameOverOverlay'),
      finalScore: document.getElementById('finalScore'),
      muteBtn: document.getElementById('muteBtn')
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
    const paths = [
      'assets/images/fish-trout-underwater.jpg',
      'assets/images/fish-lake-trout.jpg',
      'assets/images/fish-surface-trout.jpg'
    ];

    this.images = await Promise.all(paths.map(path => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = path;
    })));
  }

  setupEvents() {
    window.addEventListener('load', () => this.refreshUI());
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', event => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
      this.player.setMouse(x, y);
    });
    window.addEventListener('click', () => {
      if (!this.running || this.paused) return;
      this.audio.play('cast');
      this.addRipple(this.player.hook.x, this.player.hook.y, 12);
    });
    window.addEventListener('mousedown', event => {
      if (event.button !== 0) return;
      this.audio.ensureContext();
      this.player.chargeCast();
      this.player.isReeling = true;
    });
    window.addEventListener('mouseup', event => {
      if (event.button !== 0) return;
      this.player.isReeling = false;
      this.player.releaseCast();
    });
    window.addEventListener('keydown', event => {
      this.keys.add(event.key.toLowerCase());
      if (event.key === 'Escape') {
        this.togglePause();
      }
      if (event.key.toLowerCase() === 'r') {
        this.resetGame();
        this.start();
      }
      if (['1','2','3'].includes(event.key)) {
        this.player.setBait(Number(event.key) - 1);
      }
    });
    window.addEventListener('keyup', event => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('contextmenu', event => {
      event.preventDefault();
      this.player.cycleBait(1);
    });
    window.addEventListener('wheel', event => {
      const delta = Math.sign(event.deltaY);
      this.zoom = Math.max(0.8, Math.min(1.5, this.zoom - delta * 0.05));
    }, { passive: true });
    window.addEventListener('blur', () => {
      if (this.running) this.pause(true);
    });
    window.addEventListener('focus', () => this.refreshUI());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.running) {
        this.pause(true);
      }
    });

    window.addEventListener('fishHooked', () => {
      this.player.hasFishAttached = true;
    });
    window.addEventListener('gameCast', () => {
      this.addRipple(this.player.hook.x, this.player.hook.y, 18);
    });
    window.addEventListener('fishCaught', () => this.audio.play('catch'));
    window.addEventListener('lineBreak', () => this.audio.play('lose'));

    document.getElementById('playBtn').addEventListener('click', () => this.start());
    document.getElementById('restartBtn').addEventListener('click', () => {
      this.resetGame();
      this.start();
    });
    this.ui.muteBtn.addEventListener('click', () => {
      this.audio.muted = !this.audio.muted;
      this.ui.muteBtn.textContent = this.audio.muted ? '🔇 Sound Off' : '🔊 Sound On';
    });
  }

  resize() {
    this.canvas.width = Math.max(960, window.innerWidth * window.devicePixelRatio * 0.9);
    this.canvas.height = Math.max(540, (window.innerHeight - 110) * window.devicePixelRatio * 0.9);
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.worldWidth = this.width;
    this.waterTop = Math.round(this.height * 0.13);
    this.waterHeight = this.height - this.waterTop - 42;
    this.player.rodBase.x = Math.max(120, this.width * 0.15);
    this.player.rodBase.y = Math.max(100, this.waterTop - 8);
  }

  resetGame() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.zoom = 1;
    this.running = false;
    this.paused = false;
    this.ripples = [];
    this.player.reset();
    this.spawnFish(5);
    this.showOverlay(this.ui.menu, true);
    this.showOverlay(this.ui.pause, false);
    this.showOverlay(this.ui.gameOver, false);
    this.refreshUI();
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
    if (!this.running) return;
    this.pause();
  }

  gameOver() {
    this.running = false;
    this.paused = false;
    this.ui.finalScore.textContent = this.score;
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

  update(dt) {
    if (!this.running || this.paused) {
      this.refreshUI();
      return;
    }

    if (this.keys.has('arrowup') || this.keys.has('w')) this.player.setMouse(this.player.mouse.x, this.player.mouse.y - 180 * dt);
    if (this.keys.has('arrowdown') || this.keys.has('s')) this.player.setMouse(this.player.mouse.x, this.player.mouse.y + 180 * dt);
    if (this.keys.has('arrowleft') || this.keys.has('a')) this.player.setMouse(this.player.mouse.x - 180 * dt, this.player.mouse.y);
    if (this.keys.has('arrowright') || this.keys.has('d')) this.player.setMouse(this.player.mouse.x + 180 * dt, this.player.mouse.y);

    this.player.update(dt);
    const context = { player: this.player };

    for (const fish of this.fish) {
      fish.update(dt, context);

      if (fish.fsm.currentState === 'HOOKED') {
        const nearSurface = fish.y < this.waterTop + 35;
        const nearRod = Math.hypot(fish.x - this.player.rodTip.x, fish.y - this.player.rodTip.y) < 70;
        if (nearSurface || nearRod) {
          this.score += 10;
          this.player.hasFishAttached = false;
          fish.resetPosition();
          window.dispatchEvent(new CustomEvent('fishCaught'));
          this.addRipple(this.player.hook.x, this.player.hook.y, 22);
          if (this.score % 50 === 0) {
            this.level += 1;
            this.spawnFish(Math.min(9, 4 + this.level));
            window.dispatchEvent(new CustomEvent('levelUp', { detail: { level: this.level } }));
          }
        }
      }

      if (fish.fsm.currentState === 'ESCAPE_ATTEMPT' && fish.distanceToBait(this.player.hook) < 24) {
        this.player.lineLength -= dt * 38;
      }
    }

    if (this.player.lineLength <= 0) {
      this.lives -= 1;
      window.dispatchEvent(new CustomEvent('lineBreak'));
      this.player.reset();
      this.player.hasFishAttached = false;
      this.fish.forEach(f => f.resetPosition());
      if (this.lives <= 0) {
        this.gameOver();
      }
    }

    this.ripples.forEach(ripple => {
      ripple.radius += dt * 55;
      ripple.alpha -= dt * 0.7;
    });
    this.ripples = this.ripples.filter(ripple => ripple.alpha > 0);

    this.refreshUI();
  }

  drawBackground() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    const sky = ctx.createLinearGradient(0, 0, 0, this.waterTop);
    sky.addColorStop(0, '#9ed7ff');
    sky.addColorStop(1, '#dff4ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.waterTop);

    ctx.fillStyle = '#1f3628';
    ctx.beginPath();
    ctx.moveTo(0, this.waterTop - 15);
    for (let x = 0; x <= this.width; x += 90) {
      const y = this.waterTop - 15 - Math.sin(x * 0.013) * 14 - Math.cos(x * 0.007) * 9;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    const water = ctx.createLinearGradient(0, this.waterTop, 0, this.height);
    water.addColorStop(0, '#4ca9d8');
    water.addColorStop(0.18, '#2c8fc2');
    water.addColorStop(0.55, '#145f8a');
    water.addColorStop(1, '#093b58');
    ctx.fillStyle = water;
    ctx.fillRect(0, this.waterTop, this.width, this.waterHeight);

    for (let i = 0; i < 24; i += 1) {
      const y = this.waterTop + i * 24 + Math.sin((performance.now() * 0.001) + i) * 4;
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + i * 0.001})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= this.width; x += 40) {
        const waveY = y + Math.sin(x * 0.02 + i) * 3;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }

    const floor = ctx.createLinearGradient(0, this.height - 150, 0, this.height);
    floor.addColorStop(0, 'rgba(82, 77, 47, 0.2)');
    floor.addColorStop(1, 'rgba(80, 67, 36, 0.9)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, this.height - 140, this.width, 140);

    for (let i = 0; i < 14; i += 1) {
      const baseX = (this.width / 14) * i + 20;
      const h = 55 + (i % 4) * 25;
      ctx.strokeStyle = 'rgba(61, 106, 70, 0.75)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(baseX, this.height - 5);
      ctx.quadraticCurveTo(baseX - 10, this.height - h * 0.55, baseX + 4, this.height - h);
      ctx.stroke();
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

  draw() {
    this.drawBackground();
    this.ctx.save();
    this.ctx.scale(this.zoom, this.zoom);
    this.fish.forEach(fish => fish.draw(this.ctx));
    this.ctx.restore();
    this.drawRipples();
    this.player.draw(this.ctx);

    this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Fish FSM states: SWIM → NOTICE_BAIT → APPROACH → BITE → HOOKED → ESCAPE_ATTEMPT`, 24, 32);
  }

  refreshUI() {
    this.ui.score.textContent = this.score;
    this.ui.lives.textContent = this.lives;
    this.ui.level.textContent = this.level;
    this.ui.line.textContent = Math.max(0, Math.round(this.player.lineLength));
    this.ui.bait.textContent = this.player.currentBait;
    this.ui.zoom.textContent = `${this.zoom.toFixed(1)}x`;
  }

  loop(timestamp) {
    const dt = Math.min(0.033, (timestamp - this.lastTime) / 1000 || 0.016);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FishingGame();
});
