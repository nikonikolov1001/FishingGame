class FishingPlayer {
  constructor(game) {
    this.game = game;
    this.rodBase = { x: 210, y: 148 };
    this.rodTip = { x: 308, y: 196 };
    this.mouse = { x: 520, y: 330 };
    this.hook = { x: 320, y: 236, vx: 0, vy: 0, radius: 10 };
    this.lineLength = 82;
    this.maxLineLength = 82;
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
    this.hook.x = this.rodTip.x + 20;
    this.hook.y = this.rodTip.y + 48;
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
    const angle = Math.max(-0.78, Math.min(1.25, Math.atan2(dy, dx)));
    const rodLength = 138;
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
    const power = Math.min(15.2, 5.9 + this.castPower * 0.10);
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
    if (this.isCharging) this.castPower = (this.castPower + dt * 62) % 100;

    const targetX = this.rodTip.x + 16;
    const targetY = this.rodTip.y + 44;

    if (!this.isCasting) {
      this.hook.x += (targetX - this.hook.x) * Math.min(1, dt * 10);
      this.hook.y += (targetY - this.hook.y) * Math.min(1, dt * 10);
      this.hook.vx = 0;
      this.hook.vy = 0;
      return;
    }

    this.hook.vy += 13.8 * dt;
    if (this.isReeling) {
      const pullX = targetX - this.hook.x;
      const pullY = targetY - this.hook.y;
      this.hook.vx += pullX * dt * 1.7;
      this.hook.vy += pullY * dt * 1.7;
      this.lineLength = Math.max(4, this.lineLength - dt * 28);
    } else {
      this.lineLength = Math.min(this.maxLineLength, this.lineLength + dt * 2.7);
    }

    this.hook.vx *= 0.992;
    this.hook.vy *= 0.992;
    this.hook.x += this.hook.vx;
    this.hook.y += this.hook.vy;

    const maxX = this.game.worldWidth - 26;
    const minY = this.game.waterTop + 18;
    const maxY = this.game.height - 24;
    if (this.hook.x < 26 || this.hook.x > maxX) this.hook.vx *= -0.8;
    if (this.hook.y < minY || this.hook.y > maxY) this.hook.vy *= -0.72;
    this.hook.x = Math.max(26, Math.min(maxX, this.hook.x));
    this.hook.y = Math.max(minY, Math.min(maxY, this.hook.y));

    const distToRod = Math.hypot(this.hook.x - targetX, this.hook.y - targetY);
    const maxDistance = this.game.height * 0.68 * (this.lineLength / this.maxLineLength + 0.18);
    if (distToRod > maxDistance) {
      const dx = this.hook.x - targetX;
      const dy = this.hook.y - targetY;
      const factor = maxDistance / Math.max(1, distToRod);
      this.hook.x = targetX + dx * factor;
      this.hook.y = targetY + dy * factor;
      this.hook.vx *= 0.93;
      this.hook.vy *= 0.93;
    }

    if (this.hook.y < this.game.waterTop + 8 && this.isReeling && !this.hasFishAttached) {
      this.isCasting = false;
    }
  }

  draw(ctx) {
    const tip = this.rodTip;
    const hook = this.hook;
    const bob = Math.sin(performance.now() * 0.01) * 1.5;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.strokeStyle = '#f0f6ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(hook.x, hook.y);
    ctx.stroke();

    ctx.fillStyle = '#7b5128';
    ctx.fillRect(this.rodBase.x - 7, this.rodBase.y - 10, 14, 52);
    ctx.fillStyle = '#8f632d';
    ctx.beginPath();
    ctx.moveTo(this.rodBase.x, this.rodBase.y - 4);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 5, tip.y + 6);
    ctx.lineTo(this.rodBase.x - 5, this.rodBase.y + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#acb6bd';
    ctx.fillRect(this.rodBase.x - 18, this.rodBase.y + 8, 16, 16);
    ctx.fillStyle = '#7f8c94';
    ctx.fillRect(this.rodBase.x - 12, this.rodBase.y + 12, 28, 6);
    ctx.fillStyle = '#d7e0e5';
    ctx.fillRect(this.rodBase.x + 14, this.rodBase.y + 14, 10, 4);

    ctx.fillStyle = '#d5dce2';
    ctx.fillRect(hook.x - 2, hook.y - 2, 4, 8);
    ctx.strokeStyle = '#d5dce2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hook.x, hook.y + 8, 8, Math.PI * 0.08, Math.PI * 1.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hook.x + 1, hook.y + 15);
    ctx.lineTo(hook.x + 8, hook.y + 20);
    ctx.stroke();

    const baitColors = ['#e9747f', '#bfd8e4', '#ffe15d'];
    ctx.fillStyle = baitColors[this.baitIndex];
    ctx.fillRect(hook.x - 8, hook.y - 5 + bob, 8, 8);

    if (this.isCharging) {
      const barX = 34;
      const barY = this.game.height - 48;
      const width = 220;
      ctx.fillStyle = '#1d2f3c';
      ctx.fillRect(barX, barY, width, 18);
      ctx.fillStyle = '#fdd351';
      ctx.fillRect(barX + 3, barY + 3, (width - 6) * (this.castPower / 100), 12);
      ctx.strokeStyle = '#f4fbff';
      ctx.lineWidth = 3;
      ctx.strokeRect(barX, barY, width, 18);
    }

    ctx.restore();
  }
}

window.FishingPlayer = FishingPlayer;
