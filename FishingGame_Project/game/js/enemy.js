class Fish {
  constructor(game, sprite, variant = 0) {
    this.game = game;
    this.sprite = sprite;
    this.variant = variant;
    this.width = 110 + Math.random() * 55;
    this.height = 42 + Math.random() * 18;
    this.x = Math.random() * game.worldWidth;
    this.y = game.waterTop + 120 + Math.random() * (game.waterHeight - 220);
    this.vx = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 60);
    this.vy = (Math.random() - 0.5) * 16;
    this.dir = Math.sign(this.vx) || 1;
    this.patrolTargetY = this.y;
    this.noticeRadius = 230;
    this.biteRadius = 26;
    this.escapeStrength = 0.8 + Math.random() * 0.7;
    this.caught = false;
    this.biteTimer = 0;
    this.escapeTimer = 0;
    this.fsm = new FiniteStateMachine(this, 'SWIM');
    this.registerStates();
  }

  resetPosition() {
    this.x = Math.random() * this.game.worldWidth;
    this.y = this.game.waterTop + 100 + Math.random() * (this.game.waterHeight - 180);
    this.vx = (Math.random() > 0.5 ? 1 : -1) * (35 + Math.random() * 65);
    this.vy = (Math.random() - 0.5) * 15;
    this.dir = Math.sign(this.vx) || 1;
    this.caught = false;
    this.biteTimer = 0;
    this.escapeTimer = 0;
    this.fsm.setState('SWIM');
  }

  registerStates() {
    this.fsm.addState('SWIM', {
      enter: owner => {
        owner.choosePatrolTarget();
      },
      update: (owner, dt, context) => {
        const bait = context.player.hook;
        owner.moveToward(owner.x + owner.vx * dt, owner.patrolTargetY, dt, 0.7);
        owner.wander(dt);
        if (owner.distanceToBait(bait) < owner.noticeRadius) {
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
        if (dist < owner.noticeRadius * 0.65) {
          owner.fsm.setState('APPROACH');
        } else if (dist > owner.noticeRadius * 1.2) {
          owner.fsm.setState('SWIM');
        }
      }
    });

    this.fsm.addState('APPROACH', {
      update: (owner, dt, context) => {
        const bait = context.player.hook;
        owner.seek(bait.x, bait.y, dt, 1.7);
        const dist = owner.distanceToBait(bait);
        if (dist < owner.biteRadius) {
          owner.fsm.setState('BITE');
        } else if (dist > owner.noticeRadius * 1.35) {
          owner.fsm.setState('SWIM');
        }
      }
    });

    this.fsm.addState('BITE', {
      enter: owner => {
        owner.biteTimer = 0.55 + Math.random() * 0.45;
        owner.game.audio.play('bite');
      },
      update: (owner, dt, context) => {
        owner.biteTimer -= dt;
        owner.seek(context.player.hook.x, context.player.hook.y, dt, 2.1);
        if (owner.biteTimer <= 0) {
          owner.fsm.setState('HOOKED');
          window.dispatchEvent(new CustomEvent('fishHooked', { detail: { fish: owner } }));
        }
      }
    });

    this.fsm.addState('HOOKED', {
      enter: owner => {
        owner.caught = true;
        owner.escapeTimer = 1.8 + Math.random() * 1.4;
      },
      update: (owner, dt, context) => {
        const hook = context.player.hook;
        owner.x += (hook.x - owner.x) * Math.min(1, dt * 5.5);
        owner.y += (hook.y - owner.y) * Math.min(1, dt * 5.5);
        owner.escapeTimer -= dt;
        if (owner.escapeTimer <= 0) {
          owner.fsm.setState('ESCAPE_ATTEMPT');
        }
      }
    });

    this.fsm.addState('ESCAPE_ATTEMPT', {
      enter: owner => {
        owner.caught = false;
        const angle = Math.random() * Math.PI * 2;
        owner.vx = Math.cos(angle) * 260 * owner.escapeStrength;
        owner.vy = Math.sin(angle) * 220 * owner.escapeStrength;
      },
      update: (owner, dt, context) => {
        owner.x += owner.vx * dt;
        owner.y += owner.vy * dt;
        owner.vx *= 0.975;
        owner.vy *= 0.975;
        const dist = owner.distanceToBait(context.player.hook);
        if (dist > 190) {
          owner.fsm.setState('SWIM');
        }
      }
    });
  }

  choosePatrolTarget() {
    this.patrolTargetY = this.game.waterTop + 100 + Math.random() * (this.game.waterHeight - 200);
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
    this.vx += (dx / length) * speedFactor * 25;
    this.vy += (dy / length) * speedFactor * 25;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.dir = Math.sign(this.vx) || this.dir;
  }

  wander(dt) {
    this.x += this.vx * dt;
    this.y += Math.sin((performance.now() * 0.001) + this.variant) * dt * 10 + this.vy * dt;
    this.dir = Math.sign(this.vx) || this.dir;
  }

  update(dt, context) {
    this.fsm.update(dt, context);

    if (this.x < -160) {
      this.x = this.game.worldWidth + 80;
    }
    if (this.x > this.game.worldWidth + 160) {
      this.x = -80;
    }
    const minY = this.game.waterTop + 80;
    const maxY = this.game.waterTop + this.game.waterHeight - 70;
    if (this.y < minY || this.y > maxY) {
      this.vy *= -1;
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir < 0 ? -1 : 1, 1);

    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.sprite, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.ellipse(0, this.height * 0.15, this.width * 0.54, this.height * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.fsm.currentState === 'BITE' || this.fsm.currentState === 'HOOKED') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -this.height * 0.55, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

window.Fish = Fish;
