class FishingPlayer {
  constructor(game) {
    this.game = game;
    this.rodBase = { x: 160, y: 120 };
    this.rodTip = { x: 240, y: 160 };
    this.mouse = { x: 300, y: 250 };
    this.hook = { x: 300, y: 220, vx: 0, vy: 0, radius: 13 };
    this.lineLength = 100;
    this.maxLineLength = 100;
    this.castPower = 0;
    this.isCharging = false;
    this.isCasting = false;
    this.isReeling = false;
    this.hasFishAttached = false;
    this.baitTypes = ['Worm', 'Minnow', 'Shiny Spoon'];
    this.baitIndex = 0;
  }

  reset() {
    this.lineLength = this.maxLineLength;
    this.castPower = 0;
    this.isCharging = false;
    this.isCasting = false;
    this.isReeling = false;
    this.hasFishAttached = false;
    this.hook.x = this.rodTip.x + 40;
    this.hook.y = this.rodTip.y + 70;
    this.hook.vx = 0;
    this.hook.vy = 0;
  }

  setMouse(x, y) {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  aim() {
    const dx = this.mouse.x - this.rodBase.x;
    const dy = this.mouse.y - this.rodBase.y;
    const angle = Math.atan2(dy, dx);
    const rodLength = 140;
    this.rodTip.x = this.rodBase.x + Math.cos(angle) * rodLength;
    this.rodTip.y = this.rodBase.y + Math.sin(angle) * rodLength;
  }

  chargeCast() {
    if (!this.game.running) return;
    this.isCharging = true;
  }

  releaseCast() {
    if (!this.isCharging || !this.game.running) return;
    this.isCharging = false;
    this.isCasting = true;
    const dx = this.mouse.x - this.rodTip.x;
    const dy = this.mouse.y - this.rodTip.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const power = Math.min(16, 7 + this.castPower * 0.11);
    this.hook.x = this.rodTip.x;
    this.hook.y = this.rodTip.y;
    this.hook.vx = (dx / length) * power;
    this.hook.vy = (dy / length) * power;
    this.castPower = 0;
    window.dispatchEvent(new CustomEvent('gameCast', { detail: { bait: this.currentBait } }));
  }

  get currentBait() {
    return this.baitTypes[this.baitIndex];
  }

  cycleBait(direction) {
    const total = this.baitTypes.length;
    this.baitIndex = (this.baitIndex + direction + total) % total;
  }

  setBait(index) {
    this.baitIndex = Math.max(0, Math.min(index, this.baitTypes.length - 1));
  }

  update(dt) {
    this.aim();

    if (this.isCharging) {
      this.castPower = (this.castPower + dt * 55) % 100;
    }

    const targetX = this.rodTip.x + 40;
    const targetY = this.rodTip.y + 70;

    if (!this.isCasting) {
      this.hook.x += (targetX - this.hook.x) * Math.min(1, dt * 8);
      this.hook.y += (targetY - this.hook.y) * Math.min(1, dt * 8);
      this.hook.vx = 0;
      this.hook.vy = 0;
      return;
    }

    this.hook.vy += 10 * dt;
    if (this.isReeling) {
      const pullX = targetX - this.hook.x;
      const pullY = targetY - this.hook.y;
      this.hook.vx += pullX * dt * 1.8;
      this.hook.vy += pullY * dt * 1.8;
      this.lineLength = Math.max(18, this.lineLength - dt * 16);
    } else {
      this.lineLength = Math.min(this.maxLineLength, this.lineLength + dt * 4);
    }

    this.hook.vx *= 0.992;
    this.hook.vy *= 0.992;
    this.hook.x += this.hook.vx;
    this.hook.y += this.hook.vy;

    const maxX = this.game.worldWidth - 30;
    const maxY = this.game.waterTop + this.game.waterHeight - 25;
    if (this.hook.x < 30 || this.hook.x > maxX) this.hook.vx *= -0.8;
    if (this.hook.y < this.game.waterTop + 20 || this.hook.y > maxY) this.hook.vy *= -0.7;
    this.hook.x = Math.max(30, Math.min(maxX, this.hook.x));
    this.hook.y = Math.max(this.game.waterTop + 20, Math.min(maxY, this.hook.y));

    const distToRod = Math.hypot(this.hook.x - targetX, this.hook.y - targetY);
    const maxDistance = this.game.height * 0.68 * (this.lineLength / 100 + 0.25);
    if (distToRod > maxDistance) {
      const dx = this.hook.x - targetX;
      const dy = this.hook.y - targetY;
      const factor = maxDistance / Math.max(1, distToRod);
      this.hook.x = targetX + dx * factor;
      this.hook.y = targetY + dy * factor;
      this.hook.vx *= 0.94;
      this.hook.vy *= 0.94;
    }

    if (this.hook.y < this.game.waterTop + 35 && this.isReeling && !this.hasFishAttached) {
      this.isCasting = false;
    }
  }

  draw(ctx) {
    ctx.save();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3b2b1f';
    ctx.beginPath();
    ctx.moveTo(this.rodBase.x, this.rodBase.y);
    ctx.lineTo(this.rodTip.x, this.rodTip.y);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(this.rodTip.x, this.rodTip.y);
    ctx.lineTo(this.hook.x, this.hook.y);
    ctx.stroke();

    ctx.fillStyle = '#c58c3b';
    ctx.beginPath();
    ctx.arc(this.rodBase.x - 8, this.rodBase.y + 4, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#c7d1d9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.hook.x, this.hook.y, this.hook.radius * 0.58, Math.PI * 0.2, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.hook.x + 4, this.hook.y + 8);
    ctx.lineTo(this.hook.x + 10, this.hook.y + 12);
    ctx.stroke();

    if (this.isCharging) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(24, this.game.height - 52, 220, 18);
      ctx.fillStyle = '#59d9ff';
      ctx.fillRect(24, this.game.height - 52, 2.2 * this.castPower, 18);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.strokeRect(24, this.game.height - 52, 220, 18);
    }

    ctx.restore();
  }
}

window.FishingPlayer = FishingPlayer;
