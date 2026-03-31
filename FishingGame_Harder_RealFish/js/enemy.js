class Fish {
  constructor(game, sprite, variant = 0) {
    this.game = game;
    this.sprite = sprite;
    this.variant = variant;
    this.speciesName = ['Goldfish', 'Bass', 'Catfish'][variant % 3];
    this.baseWidth = [66, 92, 88][variant % 3];
    this.baseHeight = [38, 42, 46][variant % 3];
    this.noticeRadius = 190;
    this.biteRadius = 20;
    this.escapeStrength = 1.15 + Math.random() * 1.05;
    this.caught = false;
    this.biteTimer = 0;
    this.escapeTimer = 0;
    this.depth = 0.5;
    this.scale = 1;
    this.alpha = 1;
    this.shadowBlur = 8;
    this.fsm = new FiniteStateMachine(this, 'SWIM');
    this.registerStates();
    this.resetPosition();
  }

  applyDepthProfile() {
    const top = this.game.waterTop + 58;
    const bottom = this.game.height - 80;
    this.y = top + (bottom - top) * this.depth;
    this.scale = 0.38 + this.depth * 0.88;
    this.alpha = 0.96 - this.depth * 0.18;
    this.shadowBlur = 4 + this.depth * 6;
    this.width = this.baseWidth * this.scale;
    this.height = this.baseHeight * this.scale;
    this.noticeRadius = 120 + (1 - this.depth) * 70;
    this.biteRadius = 12 + this.scale * 5;
    this.tint = this.depth > 0.7 ? 0.82 : this.depth > 0.4 ? 0.9 : 1;
  }

  resetPosition() {
    this.depth = 0.08 + Math.random() * 0.84;
    this.applyDepthProfile();
    this.x = Math.random() * this.game.worldWidth;
    this.vx = (Math.random() > 0.5 ? 1 : -1) * (52 + (1 - this.depth) * 38 + Math.random() * 52);
    this.vy = (Math.random() - 0.5) * (14 + this.depth * 18);
    this.dir = Math.sign(this.vx) || 1;
    this.patrolTargetY = this.y;
    this.caught = false;
    this.biteTimer = 0;
    this.escapeTimer = 0;
    this.fsm.setState('SWIM');
  }

  registerStates() {
    this.fsm.addState('SWIM', {
      enter: owner => owner.choosePatrolTarget(),
      update: (owner, dt, context) => {
        const bait = context.player.hook;
        owner.moveToward(owner.x + owner.vx * dt, owner.patrolTargetY, dt, 0.65);
        owner.wander(dt);
        if (owner.distanceToBait(bait) < owner.noticeRadius && bait.y > owner.game.waterTop + 20) {
          owner.fsm.setState('NOTICE_BAIT');
        }
      }
    });

    this.fsm.addState('NOTICE_BAIT', {
      update: (owner, dt, context) => {
        const bait = context.player.hook;
        const dist = owner.distanceToBait(bait);
        owner.moveToward(owner.x, bait.y, dt, 0.9);
        owner.vx *= 0.985;
        if (dist < owner.noticeRadius * 0.66) owner.fsm.setState('APPROACH');
        else if (dist > owner.noticeRadius * 1.25) owner.fsm.setState('SWIM');
      }
    });

    this.fsm.addState('APPROACH', {
      update: (owner, dt, context) => {
        const bait = context.player.hook;
        owner.seek(bait.x, bait.y, dt, 1.7 + (1 - owner.depth) * 0.55);
        const dist = owner.distanceToBait(bait);
        if (dist < owner.biteRadius) owner.fsm.setState('BITE');
        else if (dist > owner.noticeRadius * 1.4) owner.fsm.setState('SWIM');
      }
    });

    this.fsm.addState('BITE', {
      enter: owner => {
        owner.biteTimer = 0.22 + Math.random() * 0.18;
        owner.game.audio.play('bite');
      },
      update: (owner, dt, context) => {
        owner.biteTimer -= dt;
        owner.seek(context.player.hook.x, context.player.hook.y, dt, 2.25);
        if (owner.biteTimer <= 0) {
          owner.fsm.setState('HOOKED');
          window.dispatchEvent(new CustomEvent('fishHooked', { detail: { fish: owner } }));
        }
      }
    });

    this.fsm.addState('HOOKED', {
      enter: owner => {
        owner.caught = true;
        owner.escapeTimer = 1.0 + Math.random() * 0.95 + owner.depth * 0.55;
      },
      update: (owner, dt, context) => {
        const hook = context.player.hook;
        owner.x += (hook.x - owner.x) * Math.min(1, dt * 6.2);
        owner.y += (hook.y - owner.y) * Math.min(1, dt * 6.2);
        owner.escapeTimer -= dt;
        if (owner.escapeTimer <= 0) owner.fsm.setState('ESCAPE_ATTEMPT');
      }
    });

    this.fsm.addState('ESCAPE_ATTEMPT', {
      enter: owner => {
        owner.caught = false;
        const angle = Math.random() * Math.PI * 2;
        owner.vx = Math.cos(angle) * 330 * owner.escapeStrength;
        owner.vy = Math.sin(angle) * 280 * owner.escapeStrength;
      },
      update: (owner, dt, context) => {
        owner.x += owner.vx * dt;
        owner.y += owner.vy * dt;
        owner.vx *= 0.984;
        owner.vy *= 0.984;
        if (owner.distanceToBait(context.player.hook) > 150) owner.fsm.setState('SWIM');
      }
    });
  }

  choosePatrolTarget() {
    const drift = (Math.random() - 0.5) * (70 + this.depth * 80);
    const minY = this.game.waterTop + 40;
    const maxY = this.game.height - 58;
    this.patrolTargetY = Math.max(minY, Math.min(maxY, this.y + drift));
  }

  distanceToBait(bait) {
    return Math.hypot(this.x - bait.x, this.y - bait.y);
  }

  moveToward(targetX, targetY, dt, blend) {
    this.x += (targetX - this.x) * Math.min(1, dt * blend);
    this.y += (targetY - this.y) * Math.min(1, dt * blend);
  }

  seek(targetX, targetY, dt, speedFactor) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.vx += (dx / length) * speedFactor * 26;
    this.vy += (dy / length) * speedFactor * 26;
    this.vx *= 0.965;
    this.vy *= 0.965;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.dir = Math.sign(this.vx) || this.dir;
  }

  wander(dt) {
    this.x += this.vx * dt;
    this.y += Math.sin((performance.now() * 0.0012) + this.variant * 1.7) * dt * (5 + this.depth * 5) + this.vy * dt;
    this.dir = Math.sign(this.vx) || this.dir;
  }

  update(dt, context) {
    this.fsm.update(dt, context);
    if (this.x < -120) this.x = this.game.worldWidth + 70;
    if (this.x > this.game.worldWidth + 120) this.x = -70;

    const minY = this.game.waterTop + 32;
    const maxY = this.game.height - 38;
    if (this.y < minY || this.y > maxY) {
      this.vy *= -1;
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.dir < 0 ? -1 : 1, 1);

    ctx.globalAlpha = 0.2 * this.alpha;
    ctx.fillStyle = '#071b27';
    ctx.beginPath();
    ctx.ellipse(0, this.height * 0.22, this.width * 0.44, this.height * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = this.alpha;
    ctx.filter = `contrast(1.05) saturate(${this.depth > 0.6 ? 0.88 : 1.08}) brightness(${this.tint})`;
    ctx.drawImage(this.sprite, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.filter = 'none';

    if (this.depth < 0.3) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#f4fdff';
      ctx.fillRect(-this.width * 0.12, -this.height * 0.26, this.width * 0.32, 4);
    }

    if (this.fsm.currentState === 'BITE' || this.fsm.currentState === 'HOOKED') {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -this.height * 0.38, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

window.Fish = Fish;
