import { ChiptuneAudio } from './audio';
import { STAGES } from './stages';
import type { Stage } from './stages';
import { buildScenery, drawScene } from './scenery';
import type { Scenery } from './scenery';
import { ENEMY_STATS, drawEnemySprite, drawPlayerSprite } from './sprites';
import type { EnemyKind } from './sprites';

export { STAGES };

export type Control = 'left' | 'right' | 'jump' | 'shoot';
export type GameStatus = 'start' | 'playing' | 'paused' | 'transition' | 'gameover' | 'victory';

export interface GameSnapshot {
  status: GameStatus;
  score: number;
  health: number;
  maxHealth: number;
  level: number;
  progress: number;
  bossActive: boolean;
  bossHealth: number;
  bossMaxHealth: number;
  combo: number;
  elapsed: number;
  enemiesLeft: number;
  sandevCharge: number;
  sandevActive: boolean;
  levelCode: string | null;
}

export interface RunResult {
  score: number;
  level: number;
  victory: boolean;
}

interface Player {
  x: number; y: number; vx: number; vy: number; facing: 1 | -1;
  health: number; invulnerable: number; grounded: boolean; recoil: number; attack: number; steps: number;
}

interface Enemy {
  x: number; y: number; kind: EnemyKind; hp: number; maxHp: number;
  speed: number; shootTimer: number; phase: number; facing: 1 | -1;
  flash: number; dead: boolean; recoil: number; moving: boolean; state: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number; life: number;
  friendly: boolean; radius: number; homing: number; color: string;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number;
  maxLife: number; size: number; color: string; gravity: number;
}

interface Pickup { x: number; y: number; kind: 'credits' | 'med'; phase: number; }
interface FloatingText { x: number; y: number; value: string; color: string; life: number; }

const WIDTH = 384;
const MAX_HEALTH = 6;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const approach = (value: number, target: number, amount: number) => value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

const LEVEL_ENEMIES: EnemyKind[][] = [
  ['punk', 'scav', 'drone', 'punk', 'scav', 'drone', 'scav', 'punk'],
  ['punk', 'drone', 'hound', 'punk', 'drone', 'hound', 'scav', 'punk'],
  ['scav', 'hound', 'drone', 'scav', 'hound', 'drone', 'punk', 'hound'],
  ['guard', 'sentry', 'drone', 'guard', 'sentry', 'drone', 'brute', 'guard'],
  ['punk', 'scav', 'hound', 'punk', 'scav', 'hound', 'drone', 'scav'],
  ['guard', 'netrunner', 'elite', 'sentry', 'guard', 'elite', 'netrunner', 'sentry'],
  ['guard', 'sentry', 'elite', 'guard', 'sentry', 'elite', 'brute', 'sentry'],
  ['scav', 'hound', 'sentry', 'scav', 'hound', 'sentry', 'brute', 'hound'],
  ['guard', 'brute', 'elite', 'sentry', 'guard', 'brute', 'elite', 'sentry'],
  ['netrunner', 'elite', 'brute', 'elite', 'netrunner', 'brute', 'elite', 'sentry'],
];

// Vertical offset that lines muzzle flashes up with the weapon each sprite actually holds.
const MUZZLE_OFFSET: Record<EnemyKind, number> = {
  punk: 7, scav: 0, drone: 0, hound: 0, sentry: -8,
  brute: 8, guard: 8, netrunner: 7, elite: 0, boss: 0,
};
const BOSS_MUZZLE = [6, 6, 0, 8, 0, 8, 6, 0, 6, 10];

function enemySlots(worldLength: number) {
  return [300, 480, 690, 900, 1110, 1310, 1520, worldLength - 430];
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: ChiptuneAudio;
  private onChange: (snapshot: GameSnapshot) => void;
  private onEnd: (result: RunResult) => void;
  private frame = 0;
  private lastFrame = 0;
  private height = 620;
  private ground = 565;
  private stage: Stage = STAGES[0];
  private scenery: Scenery;
  private worldLength: number = STAGES[0].length;
  private level = 0;
  private status: GameStatus = 'start';
  private score = 0;
  private elapsed = 0;
  private sceneTime = 0;
  private camera = 0;
  private uiClock = 0;
  private fireCooldown = 0;
  private jumpBuffer = 0;
  private coyoteTime = 0;
  private combo = 0;
  private comboTimer = 0;
  private transitionTimer = 0;
  private hitStop = 0;
  private shake = 0;
  private flash = 0;
  private sandevCharge = 0;
  private sandevTimer = 0;
  private levelCode: string | null = null;
  private controls: Record<Control, boolean> = { left: false, right: false, jump: false, shoot: false };
  private player: Player = { x: 76, y: 565, vx: 0, vy: 0, facing: 1, health: MAX_HEALTH, invulnerable: 0, grounded: true, recoil: 0, attack: 0, steps: 0 };
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private pickups: Pickup[] = [];
  private floatingTexts: FloatingText[] = [];

  constructor(canvas: HTMLCanvasElement, audio: ChiptuneAudio, onChange: (snapshot: GameSnapshot) => void, onEnd: (result: RunResult) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas is not supported by this browser.');
    this.ctx = ctx;
    this.audio = audio;
    this.onChange = onChange;
    this.onEnd = onEnd;
    this.resize();
    this.scenery = buildScenery(0, STAGES[0].length, STAGES[0]);
    this.setupLevel(0);
    this.emit();
    this.frame = requestAnimationFrame(this.tick);
  }

  resize() {
    const oldGround = this.ground;
    const rect = this.canvas.getBoundingClientRect();
    this.height = clamp(Math.round(WIDTH * (rect.height / Math.max(rect.width, 1))), 470, 900);
    this.ground = this.height - 56;
    this.canvas.width = WIDTH;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
    const delta = this.ground - oldGround;
    this.player.y += delta;
    for (const enemy of this.enemies) enemy.y += delta;
    for (const pickup of this.pickups) pickup.y += delta;
  }

  private setupLevel(index: number) {
    this.level = index;
    this.stage = STAGES[index];
    this.worldLength = this.stage.length;
    this.scenery = buildScenery(index, this.worldLength, this.stage);
    this.camera = 0;
    this.player.x = 76;
    this.player.y = this.ground;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.facing = 1;
    this.player.grounded = true;
    this.player.invulnerable = 0;
    this.player.attack = 0;
    this.bullets = [];
    this.particles = [];
    this.pickups = [];
    this.floatingTexts = [];
    this.fireCooldown = 0;
    this.jumpBuffer = 0;
    this.combo = 0;
    this.comboTimer = 0;

    const slots = enemySlots(this.worldLength);
    this.enemies = LEVEL_ENEMIES[index].map((kind, i) => {
      const stat = ENEMY_STATS[kind];
      return {
        x: slots[i], y: this.ground - stat.hover, kind, hp: stat.hp, maxHp: stat.hp,
        speed: stat.speed, shootTimer: 0.8 + (i % 3) * 0.5, phase: i * 1.7,
        facing: -1 as const, flash: 0, dead: false, recoil: 0, moving: false, state: 0,
      };
    });

    const bossHealth = 14 + index * 5;
    this.enemies.push({
      x: this.worldLength - 165, y: this.ground, kind: 'boss', hp: bossHealth, maxHp: bossHealth,
      speed: 40 + index * 2, shootTimer: 1.1, phase: 0, facing: -1, flash: 0, dead: false,
      recoil: 0, moving: false, state: 0,
    });
    this.audio.setLevel(index);
  }

  private snapshot(): GameSnapshot {
    const boss = this.enemies.find((enemy) => enemy.kind === 'boss');
    return {
      status: this.status, score: this.score, health: this.player.health, maxHealth: MAX_HEALTH,
      level: this.level, progress: clamp((this.player.x - 76) / (this.worldLength - 250), 0, 1),
      bossActive: this.player.x > this.worldLength - 580 && !boss?.dead,
      bossHealth: boss?.hp ?? 0, bossMaxHealth: boss?.maxHp ?? 1,
      combo: this.combo, elapsed: this.elapsed, enemiesLeft: this.enemies.filter((e) => !e.dead && e.kind !== 'boss').length,
      sandevCharge: Math.round(this.sandevCharge), sandevActive: this.sandevTimer > 0, levelCode: this.levelCode,
    };
  }

  private emit() { this.onChange(this.snapshot()); }

  start(level = 0) {
    this.score = 0;
    this.elapsed = 0;
    this.player.health = MAX_HEALTH;
    this.sandevCharge = 0;
    this.sandevTimer = 0;
    this.levelCode = null;
    this.controls = { left: false, right: false, jump: false, shoot: false };
    const clamped = clamp(Math.floor(level), 0, STAGES.length - 1);
    this.setupLevel(clamped);
    this.status = 'playing';
    this.audio.start(clamped);
    this.audio.sound('start');
    this.emit();
  }

  toMenu() {
    this.status = 'start';
    this.controls = { left: false, right: false, jump: false, shoot: false };
    this.levelCode = null;
    this.audio.stop();
    this.emit();
  }

  activateSandevistan() {
    if (this.status !== 'playing' || this.sandevCharge < 100 || this.sandevTimer > 0) return;
    this.sandevCharge = 0;
    this.sandevTimer = 2.2;
    this.shake = Math.max(this.shake, 9);
    this.flash = 0.25;
    this.sparks(this.player.x, this.player.y - 28, ['#7afbf1', '#d8fffb', '#ffffff'], 30, 230);
    this.audio.sound('sand');
    this.emit();
  }

  pause() {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.controls = { left: false, right: false, jump: false, shoot: false };
    this.audio.pause();
    this.emit();
  }

  resume() {
    if (this.status !== 'paused') return;
    this.status = 'playing';
    this.audio.resume();
    this.emit();
  }

  setControl(control: Control, pressed: boolean) {
    if (this.status !== 'playing') return;
    if (control === 'jump' && pressed && !this.controls.jump) this.jumpBuffer = 0.13;
    if (control === 'shoot' && pressed && !this.controls.shoot) this.fireCooldown = 0;
    this.controls[control] = pressed;
  }

  private tick = (time: number) => {
    if (!this.lastFrame) this.lastFrame = time;
    const dt = Math.min((time - this.lastFrame) / 1000, 0.033);
    this.lastFrame = time;
    this.update(dt);
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    this.sandevTimer = Math.max(0, this.sandevTimer - dt);
    const slow = this.status === 'playing' && this.sandevTimer > 0 ? 0.24 : 1;
    this.sceneTime += dt * slow;
    this.shake = Math.max(0, this.shake - dt * 20);
    this.flash = Math.max(0, this.flash - dt * 2.8);
    this.player.attack = Math.max(0, this.player.attack - dt * 6);
    this.updateParticles(dt * slow);

    if (this.status === 'transition') {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        if (this.level === STAGES.length - 1) {
          this.score += 1500;
          this.finish(true);
        } else {
          this.player.health = Math.min(MAX_HEALTH, this.player.health + 2);
          this.setupLevel(this.level + 1);
          this.status = 'playing';
          this.emit();
        }
      }
      return;
    }
    if (this.status !== 'playing') return;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    this.elapsed += dt;
    this.uiClock += dt;
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.recoil = Math.max(0, this.player.recoil - dt * 8);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;

    const direction = Number(this.controls.right) - Number(this.controls.left);
    const boost = this.sandevTimer > 0 ? 1.4 : 1;
    this.player.vx = approach(this.player.vx, direction * 228 * boost, (direction ? 1650 : 2100) * boost * dt);
    if (direction) this.player.facing = direction as 1 | -1;
    this.player.x = clamp(this.player.x + this.player.vx * dt, 19, this.worldLength - 22);
    this.player.steps += Math.abs(this.player.vx) * dt * 0.055;

    if (this.player.grounded) this.coyoteTime = 0.105;
    else this.coyoteTime = Math.max(0, this.coyoteTime - dt);
    if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
      this.player.vy = -485;
      this.player.grounded = false;
      this.coyoteTime = 0;
      this.jumpBuffer = 0;
      this.audio.sound('jump');
      this.sparks(this.player.x, this.ground - 2, ['#80f3ee', '#d8e3eb'], 7, 105);
    }
    if (!this.controls.jump && this.player.vy < -175) this.player.vy += 1450 * dt;
    this.player.vy += 1260 * dt;
    this.player.y += this.player.vy * dt;
    if (this.player.y >= this.ground) {
      if (!this.player.grounded && this.player.vy > 250) this.sparks(this.player.x, this.ground, ['#698092', '#a5dadd'], 5, 65);
      this.player.y = this.ground;
      this.player.vy = 0;
      this.player.grounded = true;
    }
    if (this.controls.shoot && this.fireCooldown <= 0) this.fire();
    if (this.sandevTimer > 0) {
      this.particles.push({
        x: this.player.x - this.player.facing * 8, y: this.player.y - 24 - Math.random() * 16,
        vx: -this.player.facing * 30, vy: 0, life: 0.22, maxLife: 0.22, size: 2,
        color: Math.random() > 0.5 ? '#7afbf1' : '#d8fffb', gravity: 0,
      });
    }

    // Sandevistan: the world crawls while the hunter moves at full speed.
    const wdt = this.sandevTimer > 0 ? dt * 0.24 : dt;
    this.updateEnemies(wdt);
    this.updateBullets(wdt);
    this.updatePickups(dt);
    this.camera += (clamp(this.player.x - WIDTH * 0.31, 0, this.worldLength - WIDTH) - this.camera) * Math.min(1, dt * 8);
    if (this.uiClock > 0.09) {
      this.uiClock = 0;
      this.emit();
    }
  }

  private fire() {
    const p = this.player;
    this.fireCooldown = 0.15;
    p.recoil = 1;
    p.attack = 1;
    // Bullets expire fast so the fight happens up close, not across the street.
    const charged = this.sandevTimer > 0;
    this.bullets.push({
      x: p.x + p.facing * 26, y: p.y - 25, vx: p.facing * (charged ? 820 : 680), vy: 0,
      life: 0.26, friendly: true, radius: charged ? 5 : 4, homing: 0, color: charged ? '#d8fffb' : '#7afbf1',
    });
    this.sparks(p.x + p.facing * 28, p.y - 25, charged ? ['#d8fffb', '#7afbf1'] : ['#fff9aa', '#79fff4'], charged ? 8 : 5, 100);
    this.shake = Math.max(this.shake, 1.2);
    this.audio.sound('shoot');
  }

  private updateEnemies(dt: number) {
    const bossZone = this.worldLength - 600;
    for (const enemy of this.enemies) {
      if (enemy.dead || Math.abs(enemy.x - this.player.x) > 520) continue;
      const stat = ENEMY_STATS[enemy.kind];
      enemy.flash = Math.max(0, enemy.flash - dt * 5);
      enemy.recoil = Math.max(0, enemy.recoil - dt * 4);
      const dx = this.player.x - enemy.x;
      enemy.facing = dx >= 0 ? 1 : -1;
      enemy.moving = false;

      if (stat.hover > 0) {
        enemy.y = this.ground - stat.hover + Math.sin(this.sceneTime * 2.6 + enemy.phase) * 6;
      } else {
        enemy.y = this.ground;
      }

      const awake = enemy.kind !== 'boss' || this.player.x > bossZone;
      if (!awake) continue;

      if (enemy.kind === 'boss') {
        this.updateBoss(enemy, dx, dt);
      } else if (stat.melee) {
        // Chargers close the gap and lunge.
        const lunge = enemy.kind === 'hound' && Math.abs(dx) < 120 ? 1.45 : 1;
        const dash = enemy.kind === 'elite' && Math.sin(this.sceneTime * 2 + enemy.phase) > 0.55 ? 1.7 : 1;
        if (Math.abs(dx) > 26) {
          enemy.x += Math.sign(dx) * enemy.speed * lunge * dash * dt;
          enemy.moving = true;
          if (enemy.kind === 'hound' && Math.floor(this.sceneTime * 6 + enemy.phase) % 2 === 0) {
            this.particles.push({ x: enemy.x, y: this.ground, vx: -Math.sign(dx) * 20, vy: -30, life: 0.3, maxLife: 0.3, size: 2, color: '#59e6ef', gravity: 120 });
          }
        }
        if (enemy.kind === 'elite' && dash > 1) this.sparks(enemy.x - Math.sign(dx) * 12, this.ground - 30, ['#ff3f6e', '#ff8fae'], 2, 40);
      } else if (enemy.kind === 'netrunner') {
        // Netrunners blink away when cornered and keep their distance.
        if (Math.abs(dx) < 95 && enemy.state <= 0) {
          this.sparks(enemy.x, enemy.y - 30, ['#b388ff', '#e0c8ff'], 14, 150);
          enemy.x = clamp(enemy.x - Math.sign(dx) * 190, 60, this.worldLength - 60);
          this.sparks(enemy.x, this.ground - ENEMY_STATS.netrunner.hover - 30, ['#b388ff', '#ffffff'], 14, 150);
          enemy.state = 1.6;
        }
        enemy.state = Math.max(0, enemy.state - dt);
        if (Math.abs(dx) > 150) { enemy.x += Math.sign(dx) * enemy.speed * dt; enemy.moving = true; }
      } else if (enemy.kind === 'sentry') {
        // Turrets hold position and track.
      } else {
        const keepAway = enemy.kind === 'drone' ? 118 : 78;
        if (Math.abs(dx) > keepAway && Math.abs(dx) < 340) {
          enemy.x += Math.sign(dx) * enemy.speed * dt;
          enemy.moving = true;
        }
      }

      enemy.x = clamp(enemy.x, 24, this.worldLength - 24);
      if (enemy.kind === 'boss') enemy.x = clamp(enemy.x, this.worldLength - 380, this.worldLength - 70);

      enemy.shootTimer -= dt;
      if (enemy.shootTimer <= 0 && Math.abs(dx) < stat.range) {
        this.enemyFire(enemy);
        enemy.shootTimer = enemy.kind === 'boss' ? 1.0 : stat.fireRate * (0.85 + Math.random() * 0.3);
      }

      if (Math.abs(dx) < stat.hw + 10 && Math.abs(this.player.y - enemy.y) < stat.hh + 22) this.damagePlayer(enemy.x);
    }
  }

  private updateBoss(enemy: Enemy, dx: number, dt: number) {
    const arenaLeft = this.worldLength - 380;
    if (Math.abs(dx) > 128) {
      enemy.x += Math.sign(dx) * enemy.speed * dt;
      enemy.moving = true;
    }
    // Phase two: faster and more aggressive once wounded.
    if (enemy.hp < enemy.maxHp * 0.5) enemy.x += Math.sign(dx) * enemy.speed * 0.6 * dt;
    if (this.level === 2) {
      // The Director strafes in a slow patrol across his plaza.
      enemy.x += Math.sin(this.sceneTime * 0.8) * 34 * dt;
    }
    enemy.x = clamp(enemy.x, arenaLeft, this.worldLength - 70);
  }

  private enemyFire(enemy: Enemy) {
    const stat = ENEMY_STATS[enemy.kind];
    const muzzleDrop = enemy.kind === 'boss' ? BOSS_MUZZLE[this.level] : MUZZLE_OFFSET[enemy.kind];
    const originY = enemy.y - stat.cy + muzzleDrop;
    const color = enemy.kind === 'netrunner' ? '#c9a6ff' : this.stage.neon;
    const dx = this.player.x - enemy.x;
    const dy = (this.player.y - 30) - originY;
    const angle = Math.atan2(dy, dx);
    enemy.recoil = 1;
    const shoot = (a: number, speed: number, homing = 0, radius = 4) => {
      this.bullets.push({
        x: enemy.x + enemy.facing * (enemy.kind === 'boss' ? 26 : 16), y: originY,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 2.6,
        friendly: false, radius, homing, color,
      });
    };

    switch (enemy.kind) {
      case 'boss': {
        const speed = 250 + Math.min(40, this.level * 4);
        if (this.level === 9 && Math.floor(this.sceneTime * 0.8) % 4 === 3) {
          // Adam Smasher's cannon: full radial burst.
          for (let i = 0; i < 8; i++) shoot(i * Math.PI / 4, speed * 0.85, 0, 5);
          this.shake = Math.max(this.shake, 7);
        } else {
          const pattern = Math.floor(this.sceneTime * 0.8) % 3;
          if (pattern === 0) for (let i = -1; i <= 1; i++) shoot(angle + i * 0.22, speed);
          else if (pattern === 1) { shoot(angle, speed * 0.8, 0.9); shoot(angle - 0.3, speed); shoot(angle + 0.3, speed); }
          else for (let i = -2; i <= 2; i++) shoot(angle + i * 0.17, speed * 0.92, 0, 5);
          this.shake = Math.max(this.shake, 3);
        }
        break;
      }
      case 'sentry':
        for (let i = -1; i <= 1; i++) shoot(angle + i * 0.1, 292);
        break;
      case 'brute':
        for (let i = -2; i <= 2; i++) shoot(angle + i * 0.13, 225, 0, 4);
        break;
      case 'drone':
        shoot(angle + 0.1, 235);
        break;
      case 'netrunner':
        shoot(angle, 165, 1.4, 5);
        break;
      default:
        shoot(angle, 245);
    }
    this.sparks(enemy.x + enemy.facing * 15, originY, [color, '#ffffff'], 3, 58);
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (bullet.homing > 0 && !bullet.friendly) {
        const dx = this.player.x - bullet.x;
        const dy = (this.player.y - 30) - bullet.y;
        const target = Math.atan2(dy, dx);
        const current = Math.atan2(bullet.vy, bullet.vx);
        let diff = target - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const speed = Math.hypot(bullet.vx, bullet.vy);
        const next = current + clamp(diff, -bullet.homing * dt, bullet.homing * dt);
        bullet.vx = Math.cos(next) * speed;
        bullet.vy = Math.sin(next) * speed;
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x < 0 || bullet.x > this.worldLength || bullet.y < -40 || bullet.y > this.height + 40) {
        this.bullets.splice(i, 1);
        continue;
      }
      if (bullet.friendly) {
        let collided = false;
        for (const enemy of this.enemies) {
          if (enemy.dead) continue;
          const stat = ENEMY_STATS[enemy.kind];
          const cy = enemy.y - stat.cy;
          if (Math.abs(bullet.x - enemy.x) < stat.hw + bullet.radius && Math.abs(bullet.y - cy) < stat.hh + bullet.radius) {
            this.hitEnemy(enemy, bullet.x, bullet.y);
            collided = true;
            break;
          }
        }
        if (collided) this.bullets.splice(i, 1);
      } else if (Math.abs(bullet.x - this.player.x) < 12 + bullet.radius && Math.abs(bullet.y - (this.player.y - 30)) < 24 + bullet.radius) {
        this.bullets.splice(i, 1);
        this.damagePlayer(bullet.x);
      }
    }
  }

  private hitEnemy(enemy: Enemy, x: number, y: number) {
    enemy.hp -= this.sandevTimer > 0 ? 10 : 1;
    enemy.flash = 1;
    this.hitStop = enemy.kind === 'boss' ? 0.035 : 0.024;
    this.shake = Math.max(this.shake, enemy.kind === 'boss' ? 4 : 2.4);
    this.sparks(x, y, ['#fff6aa', this.stage.neon, '#ffffff'], enemy.kind === 'boss' ? 13 : 9, 175);
    this.audio.sound('hit');
    if (enemy.hp > 0) return;

    enemy.dead = true;
    const stat = ENEMY_STATS[enemy.kind];
    this.sandevCharge = Math.min(100, this.sandevCharge + (enemy.kind === 'boss' ? 100 : 25));
    this.shake = enemy.kind === 'boss' ? 15 : 5;
    this.flash = enemy.kind === 'boss' ? 0.58 : 0.17;
    this.sparks(enemy.x, enemy.y - stat.cy, ['#fff599', this.stage.neon, '#75f5ef', '#ffffff'], enemy.kind === 'boss' ? 60 : 24, enemy.kind === 'boss' ? 280 : 190);
    if (enemy.kind === 'boss') {
      this.score += 1000;
      this.floatingTexts.push({ x: enemy.x, y: enemy.y - 110, value: '+1000 TARGET DOWN', color: '#ffec70', life: 1.3 });
      this.audio.sound('boss');
      this.status = 'transition';
      this.transitionTimer = 2.3;
      this.levelCode = this.level < STAGES.length - 1 ? String(Math.floor(1000 + Math.random() * 9000)) : null;
      this.controls = { left: false, right: false, jump: false, shoot: false };
      this.emit();
    } else {
      this.combo = this.comboTimer > 0 ? Math.min(this.combo + 1, 4) : 1;
      this.comboTimer = 3.5;
      const points = stat.score * this.combo;
      this.score += points;
      this.floatingTexts.push({ x: enemy.x, y: enemy.y - stat.cy - 22, value: `+${points}${this.combo > 1 ? `  x${this.combo}` : ''}`, color: this.combo > 1 ? '#ffec70' : '#83fff1', life: 0.85 });
      this.pickups.push({ x: enemy.x, y: this.ground - 22, kind: this.player.health < MAX_HEALTH && Math.random() < 0.26 ? 'med' : 'credits', phase: Math.random() * 6 });
    }
    this.emit();
  }

  private damagePlayer(fromX: number) {
    if (this.player.invulnerable > 0 || this.status !== 'playing') return;
    this.player.health--;
    this.player.invulnerable = 1.2;
    this.player.vx = this.player.x < fromX ? -175 : 175;
    this.player.vy = -190;
    this.player.grounded = false;
    this.shake = 11;
    this.flash = 0.42;
    this.combo = 0;
    this.sparks(this.player.x, this.player.y - 30, ['#fff3ac', '#ff5e96', '#f7f7ff'], 20, 185);
    this.audio.sound('hurt');
    if (this.player.health <= 0) this.finish(false);
    else this.emit();
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      pickup.phase += dt * 4;
      if (Math.abs(pickup.x - this.player.x) < 24 && Math.abs(pickup.y - (this.player.y - 24)) < 44) {
        if (pickup.kind === 'med') {
          this.player.health = Math.min(MAX_HEALTH, this.player.health + 1);
          this.floatingTexts.push({ x: pickup.x, y: pickup.y - 15, value: '+1 HP', color: '#94ffb5', life: 0.8 });
        } else {
          this.score += 50;
          this.floatingTexts.push({ x: pickup.x, y: pickup.y - 15, value: '+50', color: '#ffe77d', life: 0.8 });
        }
        this.sparks(pickup.x, pickup.y, ['#ffffff', '#faff82', '#8dfcf0'], 9, 110);
        this.audio.sound('pickup');
        this.pickups.splice(i, 1);
        this.emit();
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
      if (particle.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].life -= dt;
      this.floatingTexts[i].y -= 31 * dt;
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  private sparks(x: number, y: number, colors: string[], count: number, force: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = force * (0.2 + Math.random() * 0.85);
      const life = 0.18 + Math.random() * 0.42;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 15, life, maxLife: life, size: Math.random() > 0.72 ? 4 : 2, color: colors[i % colors.length], gravity: 280 });
    }
    if (this.particles.length > 240) this.particles.splice(0, this.particles.length - 240);
  }

  private finish(victory: boolean) {
    this.status = victory ? 'victory' : 'gameover';
    this.audio.stop();
    this.emit();
    this.onEnd({ score: this.score, level: this.level, victory });
  }

  private render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, WIDTH, this.height);
    ctx.save();
    if (this.shake > 0.1 && this.status !== 'paused') ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake));

    drawScene({
      ctx, scenery: this.scenery, stage: this.stage, level: this.level,
      camera: this.camera, ground: this.ground, height: this.height, viewW: WIDTH, time: this.sceneTime,
    });

    this.drawPickups(ctx);
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.x - this.camera < -80 || enemy.x - this.camera > WIDTH + 80) continue;
      const stat = ENEMY_STATS[enemy.kind];
      ctx.save();
      ctx.translate(Math.round(enemy.x - this.camera), Math.round(enemy.y));
      ctx.fillStyle = 'rgba(5,8,18,.5)';
      ctx.fillRect(-stat.hw, this.ground - enemy.y - 2, stat.hw * 2, 3);
      drawEnemySprite({
        ctx, kind: enemy.kind, level: this.level, t: this.sceneTime, phase: enemy.phase,
        facing: enemy.facing, flash: enemy.flash, moving: enemy.moving, attack: enemy.recoil, hover: 0,
      });
      ctx.restore();
    }

    // Player shadow then body.
    ctx.save();
    ctx.translate(Math.round(this.player.x - this.camera), Math.round(this.player.y));
    ctx.fillStyle = 'rgba(5,8,18,.55)';
    ctx.fillRect(-14, this.ground - this.player.y - 2, 28, 3);
    if (!(this.player.invulnerable > 0 && Math.floor(this.sceneTime * 17) % 2 === 0)) {
      ctx.scale(this.player.facing, 1);
      drawPlayerSprite({
        ctx, t: this.sceneTime, facing: this.player.facing, steps: this.player.steps,
        grounded: this.player.grounded, vx: this.player.vx, recoil: this.player.recoil,
        hurt: this.player.invulnerable > 0, attack: this.player.attack, x: this.player.x, y: this.player.y,
      });
    }
    ctx.restore();

    this.drawBullets(ctx);
    this.drawParticles(ctx);
    this.drawWeather(ctx);
    if (this.sandevTimer > 0) {
      ctx.fillStyle = 'rgba(122,251,241,0.08)';
      ctx.fillRect(0, 0, WIDTH, this.height);
      const px_ = Math.round(this.player.x - this.camera);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#7afbf1';
      ctx.fillRect(px_ - 9, Math.round(this.player.y - 52), 3, 48);
      ctx.fillRect(px_ + 6, Math.round(this.player.y - 52), 3, 48);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 242, 210, ${this.flash * 0.28})`;
      ctx.fillRect(0, 0, WIDTH, this.height);
    }
  }

  private drawBullets(ctx: CanvasRenderingContext2D) {
    for (const bullet of this.bullets) {
      const x = bullet.x - this.camera;
      if (x < -15 || x > WIDTH + 15) continue;
      const trail = bullet.friendly ? 10 : bullet.homing > 0 ? 7 : 6;
      const back = bullet.vx > 0 ? trail : 0;
      ctx.fillStyle = `${bullet.color}55`;
      ctx.fillRect(Math.round(x - back), Math.round(bullet.y - 2), trail, 5);
      ctx.fillStyle = bullet.color;
      ctx.fillRect(Math.round(x - back * 0.5), Math.round(bullet.y - 1), trail * 0.6, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x), Math.round(bullet.y), 2, 1);
      if (bullet.homing > 0) {
        ctx.fillStyle = `${bullet.color}33`;
        ctx.fillRect(Math.round(x - 5), Math.round(bullet.y - 5), 10, 10);
      }
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D) {
    for (const pickup of this.pickups) {
      const x = pickup.x - this.camera;
      if (x < -20 || x > WIDTH + 20) continue;
      const y = pickup.y + Math.sin(pickup.phase) * 4;
      const color = pickup.kind === 'med' ? '#88f6a9' : '#ffe36f';
      ctx.fillStyle = `${color}33`;
      ctx.fillRect(Math.round(x - 8), Math.round(y - 8), 16, 16);
      ctx.fillStyle = '#111827';
      ctx.fillRect(Math.round(x - 5), Math.round(y - 5), 10, 10);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x - 3), Math.round(y - 3), 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x - 1), Math.round(y - 5), 2, 10);
      if (pickup.kind === 'med') ctx.fillRect(Math.round(x - 5), Math.round(y - 1), 10, 2);
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const particle of this.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x - this.camera), Math.round(particle.y), particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px monospace';
    for (const text of this.floatingTexts) {
      ctx.globalAlpha = clamp(text.life * 1.7, 0, 1);
      ctx.fillStyle = '#0a1020';
      ctx.fillText(text.value, Math.round(text.x - this.camera) + 1, Math.round(text.y) + 1);
      ctx.fillStyle = text.color;
      ctx.fillText(text.value, Math.round(text.x - this.camera), Math.round(text.y));
    }
    ctx.textAlign = 'start';
    ctx.globalAlpha = 1;
  }

  private drawWeather(ctx: CanvasRenderingContext2D) {
    const kind = this.stage.weather;
    const t = this.sceneTime;
    if (kind === 'rain') {
      ctx.strokeStyle = this.level === 8 ? 'rgba(217,227,200,.15)' : 'rgba(197,164,234,.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 38; i++) {
        const x = ((i * 97.7 - t * 95 - this.camera * 0.12) % (WIDTH + 50) + WIDTH + 50) % (WIDTH + 50) - 20;
        const y = ((i * 173.3 + t * 250) % (this.height + 40) + this.height + 40) % (this.height + 40) - 20;
        ctx.moveTo(Math.round(x), Math.round(y));
        ctx.lineTo(Math.round(x - 3), Math.round(y + (i % 3 === 0 ? 12 : 7)));
      }
      ctx.stroke();
    } else if (kind === 'petal') {
      for (let i = 0; i < 22; i++) {
        const x = ((i * 127.9 - t * 34 + Math.sin(t + i) * 22) % (WIDTH + 40) + WIDTH + 40) % (WIDTH + 40) - 20;
        const y = ((i * 191.3 + t * 46) % (this.height + 30) + this.height + 30) % (this.height + 30) - 15;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = i % 3 === 0 ? '#ffd1e4' : '#ff8ac2';
        ctx.fillRect(Math.round(x), Math.round(y), 3, 2);
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'mist' || kind === 'sand') {
      const sand = kind === 'sand';
      if (sand) {
        for (let i = 0; i < 34; i++) {
          const x = ((i * 83.3 + t * (130 + (i % 5) * 40)) % (WIDTH + 40) + WIDTH + 40) % (WIDTH + 40) - 20;
          const y = (i * 149.7 + t * 12) % (this.height - 20);
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = i % 2 ? '#ffd9a0' : '#e8b070';
          ctx.fillRect(Math.round(x), Math.round(y), 4, 1);
        }
        ctx.globalAlpha = 1;
      } else {
        for (let m = 0; m < 5; m++) {
          const mx = ((m * 130 - t * 22) % 640 + 640) % 640 - 120;
          ctx.globalAlpha = 0.06;
          ctx.fillStyle = '#bfeaf5';
          ctx.fillRect(Math.round(mx), Math.round(this.ground - 26 + Math.sin(t + m) * 5), 130, 26);
        }
        ctx.globalAlpha = 1;
      }
    } else if (kind === 'ember' || kind === 'spark') {
      const warm = kind === 'spark';
      for (let i = 0; i < 16; i++) {
        const x = ((i * 113.1 + Math.sin(t * 0.8 + i) * 30) % (WIDTH + 30) + WIDTH + 30) % (WIDTH + 30) - 15;
        const y = this.height - ((i * 167.9 + t * (warm ? 55 : 40)) % (this.height + 30));
        ctx.globalAlpha = 0.5 * (0.4 + (i % 3) * 0.3);
        ctx.fillStyle = warm ? (i % 2 ? '#ffd978' : '#ff9a4d') : (i % 2 ? '#ff5a5a' : '#ff2b3d');
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  destroy() {
    cancelAnimationFrame(this.frame);
  }
}
