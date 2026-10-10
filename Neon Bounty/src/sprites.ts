import { mix } from './scenery';

export type EnemyKind =
  | 'punk' | 'scav' | 'drone' | 'hound' | 'sentry'
  | 'brute' | 'guard' | 'netrunner' | 'elite' | 'boss';

export interface EnemyStat {
  hp: number;
  speed: number;
  cy: number;
  hw: number;
  hh: number;
  range: number;
  fireRate: number;
  melee: boolean;
  score: number;
  hover: number;
}

// Ranged enemies keep a distance so the player can never snipe from across the street.
export const ENEMY_STATS: Record<EnemyKind, EnemyStat> = {
  punk: { hp: 2, speed: 64, cy: 30, hw: 11, hh: 26, range: 190, fireRate: 1.8, melee: false, score: 100, hover: 0 },
  scav: { hp: 3, speed: 112, cy: 27, hw: 12, hh: 25, range: 0, fireRate: 0, melee: true, score: 120, hover: 0 },
  drone: { hp: 2, speed: 74, cy: 1, hw: 19, hh: 15, range: 195, fireRate: 1.5, melee: false, score: 110, hover: 40 },
  hound: { hp: 3, speed: 158, cy: 19, hw: 17, hh: 19, range: 0, fireRate: 0, melee: true, score: 140, hover: 0 },
  sentry: { hp: 5, speed: 0, cy: 24, hw: 20, hh: 22, range: 230, fireRate: 2.3, melee: false, score: 180, hover: 0 },
  brute: { hp: 6, speed: 34, cy: 35, hw: 20, hh: 34, range: 190, fireRate: 2.2, melee: false, score: 200, hover: 0 },
  guard: { hp: 4, speed: 58, cy: 30, hw: 12, hh: 29, range: 200, fireRate: 2.0, melee: false, score: 160, hover: 0 },
  netrunner: { hp: 3, speed: 46, cy: 29, hw: 13, hh: 33, range: 195, fireRate: 2.1, melee: false, score: 190, hover: 36 },
  elite: { hp: 5, speed: 138, cy: 31, hw: 13, hh: 30, range: 0, fireRate: 0, melee: true, score: 220, hover: 0 },
  boss: { hp: 1, speed: 44, cy: 56, hw: 32, hh: 62, range: 250, fireRate: 1.05, melee: false, score: 1000, hover: 0 },
};

const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const a = (hex: string, alpha: number) => {
  const p = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${alpha})`;
};

interface Palette {
  skin: string; jacket: string; jacketDark: string; pants: string; pantsDark: string;
  boots: string; hair: string; accent: string; metal: string;
}

/* ----------------------------- HUMANOID CORE ----------------------------- */

function drawLeg(ctx: CanvasRenderingContext2D, x: number, hipY: number, thigh: number, shin: number, boot: number, w: number, p: Palette, lift: number) {
  px(ctx, x, hipY, w, thigh, p.pants);
  px(ctx, x + w - 2, hipY, 2, thigh, p.pantsDark);
  const sy = hipY + thigh;
  px(ctx, x + (lift > 0 ? 1 : 0), sy, w - (lift > 0 ? 1 : 0), shin - lift, p.pantsDark);
  px(ctx, x, sy + shin - lift - 1, w, 2, a('#000000', 0.25));
  px(ctx, x - 2, sy + shin - lift, w + 5, boot, p.boots);
  px(ctx, x - 2, sy + shin - lift, w + 5, 2, mix(p.boots, '#ffffff', 0.3));
}

function drawArm(ctx: CanvasRenderingContext2D, x: number, shoulderY: number, upper: number, fore: number, w: number, p: Palette, sleeve: string, swingX: number) {
  px(ctx, x, shoulderY, w, upper, sleeve);
  px(ctx, x, shoulderY, w, 2, mix(sleeve, '#ffffff', 0.22));
  px(ctx, x + swingX, shoulderY + upper, w, fore, mix(sleeve, '#000000', 0.18));
  px(ctx, x + swingX, shoulderY + upper + fore, w, Math.max(3, w), p.skin);
}

function drawHumanoid(
  ctx: CanvasRenderingContext2D, H: number, build: 'slim' | 'normal' | 'heavy',
  swing: number, p: Palette, opts: { hunch?: number; coat?: boolean } = {},
) {
  const headH = Math.max(7, Math.round(H * 0.145));
  const headW = Math.round(headH * 0.9);
  const shoulderY = -(H - headH - 2);
  const hipY = -Math.round(H * 0.46);
  const torsoW = Math.round(H * (build === 'heavy' ? 0.33 : build === 'slim' ? 0.21 : 0.26));
  const bootH = Math.max(4, Math.round(H * 0.07));
  const legSpan = -hipY;
  const shin = Math.round(legSpan * 0.42);
  const thigh = legSpan - shin - bootH;
  const legW = Math.max(4, Math.round(torsoW * 0.34));
  const armW = Math.max(3, Math.round(torsoW * 0.28));
  const upperArm = Math.round((hipY - shoulderY) * 0.66);
  const stride = swing * Math.max(2, H * 0.07);
  const hunch = opts.hunch ?? 0;

  // Legs: back leg behind the front, opposite stride.
  drawLeg(ctx, -legW - 1 - stride, hipY, thigh, shin, bootH, legW, p, Math.max(0, -swing) * 2);
  drawLeg(ctx, 1 + stride, hipY, thigh, shin, bootH, legW, p, Math.max(0, swing) * 2);

  // Torso.
  px(ctx, -torsoW / 2, shoulderY + hunch, torsoW, hipY - shoulderY - hunch, p.jacket);
  px(ctx, -torsoW / 2, shoulderY + hunch, 2, hipY - shoulderY - hunch, mix(p.jacket, '#ffffff', 0.22));
  px(ctx, torsoW / 2 - 3, shoulderY + hunch, 3, hipY - shoulderY - hunch, p.jacketDark);
  px(ctx, -torsoW / 2 - 2, hipY - 3, torsoW + 4, 4, mix(p.boots, '#ffffff', 0.12));
  if (opts.coat) {
    const sway = -swing * 2;
    px(ctx, -torsoW / 2 - 3, shoulderY + hunch + 6, 6, -shoulderY - 12 + sway, mix(p.jacket, '#000000', 0.22));
    px(ctx, torsoW / 2 - 2, shoulderY + hunch + 6, 6, -shoulderY - 14 - sway, mix(p.jacket, '#000000', 0.28));
  }

  // Arms.
  drawArm(ctx, -torsoW / 2 - armW - 1, shoulderY + hunch + 2, upperArm, Math.round(upperArm * 0.8), armW, p, p.jacketDark, -stride);
  drawArm(ctx, torsoW / 2 - 1, shoulderY + hunch + 2, upperArm, Math.round(upperArm * 0.8), armW, p, p.jacket, stride);

  // Neck and head.
  px(ctx, -2, shoulderY + hunch - 3, 5, 5, mix(p.skin, '#000000', 0.2));
  px(ctx, -headW / 2 + hunch, shoulderY + hunch - headH - 2, headW, headH, p.skin);
  px(ctx, -headW / 2 + hunch, shoulderY + hunch - headH - 2, headW, 2, mix(p.skin, '#ffffff', 0.18));
  px(ctx, -headW / 2 + hunch + 1, shoulderY + hunch - 4, headW - 2, 2, mix(p.skin, '#000000', 0.28));

  return { headH, headW, shoulderY, hipY, torsoW, armW, hunch, upperArm };
}

function muzzle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, power: number) {
  if (power <= 0.05) return;
  const size = 3 + power * 4;
  px(ctx, x - 2, y - 1, size + 3, 3, a(color, 0.55 * power));
  px(ctx, x, y - 2, size, 5, mix(color, '#ffffff', 0.4));
  px(ctx, x + 1, y - 1, 2, 3, '#ffffff');
}

/* ------------------------------- WEAPONS --------------------------------- */

function pistol(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string, recoil: number) {
  px(ctx, x - 2, y - 1, 11 - recoil, 4, '#1b2230');
  px(ctx, x + 8 - recoil, y, 5, 3, '#39485c');
  px(ctx, x + 12 - recoil, y, 2, 3, accent);
  px(ctx, x - 1, y + 3, 4, 5, '#141a26');
}

function rifle(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string, recoil: number, length = 20) {
  px(ctx, x, y, length - recoil, 4, '#1b2230');
  px(ctx, x + 3, y + 4, 5, 5, '#141a26');
  px(ctx, x + length - 3 - recoil, y, 4, 3, accent);
  px(ctx, x + 6, y - 3, 8, 3, '#2b3546');
}

function shotgun(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string, recoil: number) {
  px(ctx, x, y - 1, 22 - recoil, 6, '#242c3a');
  px(ctx, x + 4, y + 5, 6, 6, '#161d29');
  px(ctx, x + 18 - recoil, y - 1, 5, 6, accent);
  px(ctx, x + 2, y - 3, 12, 3, '#39485c');
}

function pipeWeapon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y, 26, 3, '#7b8494');
  px(ctx, x + 4, y - 3, 5, 4, '#5c6572');
  px(ctx, x + 20, y - 1, 6, 5, '#98a2b1');
}

function mantisBlades(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string) {
  for (let b = 0; b < 2; b++) {
    px(ctx, x + b * 4, y, 3, 22, mix(accent, '#ffffff', 0.35));
    px(ctx, x + b * 4, y + 20, 2, 5, '#ffffff');
  }
  px(ctx, x - 2, y - 4, 12, 5, '#2a3346');
}

/* --------------------------- ENEMY SPRITE DRAW --------------------------- */

export interface SpriteOptions {
  ctx: CanvasRenderingContext2D;
  kind: EnemyKind;
  level: number;
  t: number;
  phase: number;
  facing: 1 | -1;
  flash: number;
  moving: boolean;
  attack: number;
  hover: number;
}

export function drawEnemySprite(o: SpriteOptions) {
  const { ctx, kind, level, t, phase, facing, flash } = o;
  ctx.save();
  const hoverOffset = o.hover ? Math.sin(t * 2.6 + phase) * 5 : 0;
  ctx.translate(0, Math.round(hoverOffset));
  ctx.scale(facing, 1);
  const swing = o.moving ? Math.sin(t * 9 + phase) : Math.sin(t * 1.7 + phase) * 0.12;
  const recoil = o.attack > 0.1 ? o.attack * 4 : 0;
  const stageAccent = level === 0 ? '#ff57ad' : level === 1 ? '#5ce8ef' : '#ff6a63';
  const bright = flash > 0;

  const white = (color: string) => (bright ? '#fff9dc' : color);

  switch (kind) {
    case 'punk': {
      const p: Palette = {
        skin: '#c98f74', jacket: '#3a2f52', jacketDark: '#261e3a', pants: '#2a2b3d',
        pantsDark: '#1c1d2b', boots: '#191b28', hair: '#f2f0e4', accent: stageAccent, metal: '#59627a',
      };
      const g = drawHumanoid(ctx, 56, 'normal', swing, p);
      // Mohawk and ear implant.
      px(ctx, -3 + g.hunch, g.shoulderY + g.hunch - g.headH - 7, 5, 6, p.hair);
      px(ctx, -1 + g.hunch, g.shoulderY + g.hunch - g.headH - 11, 3, 5, mix(p.hair, stageAccent, 0.5));
      px(ctx, -g.headW / 2 + g.hunch, g.shoulderY + g.hunch - g.headH, 4, 4, p.hair);
      px(ctx, g.headW / 2 - 4 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, 4, 3, bright ? '#ffffff' : stageAccent);
      // Spiked jacket shoulders.
      px(ctx, -g.torsoW / 2 - 3, g.shoulderY + g.hunch - 2, 6, 5, p.jacketDark);
      px(ctx, g.torsoW / 2 - 3, g.shoulderY + g.hunch - 2, 7, 5, p.jacketDark);
      for (let s = 0; s < 3; s++) px(ctx, -g.torsoW / 2 - 2 + s * (g.torsoW - 2), g.shoulderY + g.hunch - 5, 3, 4, p.metal);
      pistol(ctx, g.torsoW / 2 + 3, g.shoulderY + g.hunch + g.upperArm + 10, stageAccent, recoil);
      muzzle(ctx, g.torsoW / 2 + 18 - recoil, g.shoulderY + g.hunch + g.upperArm + 11, '#ffe27a', o.attack);
      break;
    }
    case 'scav': {
      const p: Palette = {
        skin: '#a3765f', jacket: '#4a4030', jacketDark: '#332c22', pants: '#3b3a33',
        pantsDark: '#282720', boots: '#22201c', hair: '#2a2118', accent: stageAccent, metal: '#6d7585',
      };
      const g = drawHumanoid(ctx, 54, 'normal', swing, p, { hunch: 4 });
      // Hood pulled over goggles, breathing mask, salvaged plates.
      px(ctx, -g.headW / 2 - 2 + g.hunch, g.shoulderY + g.hunch - g.headH - 3, g.headW + 3, 7, p.jacket);
      px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 1, g.headW - 2, 3, bright ? '#ffffff' : '#9fe870');
      px(ctx, g.headW / 2 - 5 + g.hunch, g.shoulderY + g.hunch - g.headH + 4, 5, 4, '#5c6660');
      px(ctx, -g.torsoW / 2 - 1, g.shoulderY + g.hunch + 8, 5, 12, p.metal);
      px(ctx, g.torsoW / 2 - 4, g.shoulderY + g.hunch + 12, 6, 9, p.metal);
      pipeWeapon(ctx, g.torsoW / 2 + 2, g.shoulderY + g.hunch + g.upperArm + 12);
      break;
    }
    case 'hound': {
      const body = '#2c3a44';
      px(ctx, -22, -30, 42, 15, white(body));
      px(ctx, -22, -30, 42, 3, white('#40525e'));
      px(ctx, -20, -18, 38, 3, white('#1d2830'));
      // Head with sensor jaw.
      px(ctx, 12, -38, 16, 13, white('#33434f'));
      px(ctx, 16, -35, 9, 4, bright ? '#ffffff' : '#ff4d4d');
      px(ctx, 14, -28, 14, 3, white('#1d2830'));
      for (let th = 0; th < 3; th++) px(ctx, 18 + th * 4, -25, 2, 3, '#c9d4dd');
      // Legs with piston joints.
      const legSwing = Math.sin(t * 14 + phase) * 5;
      for (let l = 0; l < 4; l++) {
        const lx = -18 + l * 11;
        const off = l % 2 === 0 ? legSwing : -legSwing;
        px(ctx, lx + off, -15, 4, 15, white('#26333c'));
        px(ctx, lx + off - 1, -1, 6, 3, '#141c22');
        px(ctx, lx + off, -9, 4, 2, '#59e6ef');
      }
      // Tail antenna and spine lights.
      px(ctx, -30, -34, 8, 3, white('#33434f'));
      px(ctx, -34, -37, 4, 3, bright ? '#ffffff' : stageAccent);
      for (let s = 0; s < 4; s++) px(ctx, -16 + s * 9, -33, 3, 2, bright ? '#ffffff' : a(stageAccent, 0.8));
      break;
    }
    case 'drone': {
      const shell = level === 1 ? '#1e4d5a' : '#4a2c46';
      const rotor = Math.sin(t * 40 + phase) * 3;
      px(ctx, -16, -10, 32, 14, white(shell));
      px(ctx, -16, -10, 32, 3, white(mix(shell, '#ffffff', 0.3)));
      px(ctx, -12, -14, 24, 5, white('#2f3f4d'));
      px(ctx, -8, -6, 16, 9, bright ? '#ffffff' : '#141e28');
      px(ctx, -5, -4, 10, 5, bright ? '#ffffff' : stageAccent);
      px(ctx, -22, -3 + rotor, 8, 3, a('#9ff3f5', 0.55));
      px(ctx, 14, -3 - rotor, 8, 3, a('#9ff3f5', 0.55));
      px(ctx, -24, -2, 4, 6, white('#59666f'));
      px(ctx, 20, -2, 4, 6, white('#59666f'));
      px(ctx, -9, 4, 3, 7, '#3a6671');
      px(ctx, 6, 4, 3, 7, '#3a6671');
      px(ctx, -18, 11, 36, 2, a(stageAccent, 0.3));
      px(ctx, 4, -14, 6, 3, bright ? '#ffffff' : '#ff5f5f');
      break;
    }
    case 'sentry': {
      const armor = '#24404b';
      // Tracked base.
      px(ctx, -22, -12, 44, 12, white('#1a313a'));
      px(ctx, -22, -12, 44, 3, white('#2b4d59'));
      for (let tr = 0; tr < 6; tr++) px(ctx, -19 + ((tr * 8 + (o.moving ? (t * 20) % 8 : 0)) % 40), -8, 3, 5, '#0f2129');
      // Torso on a swivel.
      px(ctx, -14, -40, 28, 28, white(armor));
      px(ctx, -14, -40, 28, 4, white(mix(armor, '#ffffff', 0.28)));
      px(ctx, -8, -34, 16, 12, bright ? '#ffffff' : '#101c24');
      px(ctx, -5, -31, 10, 6, bright ? '#ffffff' : stageAccent);
      // Twin barrels and shoulder lamp.
      px(ctx, 8, -34 - recoil, 20, 4, '#1b2a33');
      px(ctx, 8, -28 - recoil, 20, 4, '#1b2a33');
      px(ctx, 24 - recoil, -34, 3, 4, stageAccent);
      px(ctx, 24 - recoil, -28, 3, 4, stageAccent);
      muzzle(ctx, 30 - recoil, -32, '#ffd27a', o.attack);
      px(ctx, -18, -44, 10, 6, white(mix(armor, '#ffffff', 0.2)));
      px(ctx, -16, -42, 4, 3, bright ? '#ffffff' : '#ffe27a');
      // Warning stripes on the skirt.
      for (let s = 0; s < 5; s++) px(ctx, -20 + s * 9, -16, 5, 3, s % 2 ? 'rgba(255,210,74,.6)' : 'rgba(16,24,32,.8)');
      break;
    }
    case 'brute': {
      const p: Palette = {
        skin: '#b17a5e', jacket: '#3d5563', jacketDark: '#283a45', pants: '#2f3b45',
        pantsDark: '#202933', boots: '#1a222b', hair: '#1e1a18', accent: '#a2eaf0', metal: '#67788a',
      };
      const g = drawHumanoid(ctx, 70, 'heavy', swing, p);
      // Heavy plate carrier, pauldrons, visored helmet.
      px(ctx, -g.torsoW / 2, g.shoulderY + g.hunch + 4, g.torsoW, 16, white('#4a6675'));
      px(ctx, -g.torsoW / 2, g.shoulderY + g.hunch + 4, g.torsoW, 3, white('#7fa2b1'));
      px(ctx, -g.torsoW / 2 - 5, g.shoulderY + g.hunch - 2, 10, 8, white('#4a6675'));
      px(ctx, g.torsoW / 2 - 5, g.shoulderY + g.hunch - 2, 10, 8, white('#4a6675'));
      px(ctx, -g.headW / 2 - 2 + g.hunch, g.shoulderY + g.hunch - g.headH - 4, g.headW + 4, g.headH + 2, white('#3d5563'));
      px(ctx, -g.headW / 2 + g.hunch, g.shoulderY + g.hunch - g.headH + 1, g.headW - 2, 4, bright ? '#ffffff' : '#ff5f5f');
      px(ctx, g.headW / 2 - 6 + g.hunch, g.shoulderY + g.hunch - g.headH - 7, 3, 4, '#67788a');
      shotgun(ctx, g.torsoW / 2 + 4, g.shoulderY + g.hunch + g.upperArm + 12, '#ffd27a', recoil);
      muzzle(ctx, g.torsoW / 2 + 28 - recoil, g.shoulderY + g.hunch + g.upperArm + 14, '#ffd27a', o.attack);
      break;
    }
    case 'guard': {
      const p: Palette = {
        skin: '#c08a6c', jacket: '#c3c9cf', jacketDark: '#8f979f', pants: '#2c3340',
        pantsDark: '#1d222c', boots: '#171d27', hair: '#22201f', accent: '#ff6964', metal: '#7d8896',
      };
      const g = drawHumanoid(ctx, 60, 'normal', swing, p);
      // Helmet with visor and corpo crest.
      px(ctx, -g.headW / 2 - 2 + g.hunch, g.shoulderY + g.hunch - g.headH - 4, g.headW + 4, g.headH + 3, white('#d3d9de'));
      px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 1, g.headW, 4, bright ? '#ffffff' : '#ff6964');
      px(ctx, -2 + g.hunch, g.shoulderY + g.hunch - g.headH - 7, 4, 4, '#ffcf7c');
      // Riot shield held forward.
      px(ctx, g.torsoW / 2 + 5, g.shoulderY + g.hunch + 4, 5, 34, white('#aeb8c2'));
      px(ctx, g.torsoW / 2 + 5, g.shoulderY + g.hunch + 4, 5, 3, '#ff6964');
      px(ctx, g.torsoW / 2 + 5, g.shoulderY + g.hunch + 34, 5, 3, '#ff6964');
      px(ctx, g.torsoW / 2 + 10, g.shoulderY + g.hunch + 8, 3, 26, a('#9fd8ff', 0.35));
      rifle(ctx, g.torsoW / 2 + 8, g.shoulderY + g.hunch + g.upperArm + 12, '#ffd27a', recoil, 22);
      muzzle(ctx, g.torsoW / 2 + 32 - recoil, g.shoulderY + g.hunch + g.upperArm + 13, '#ffd27a', o.attack);
      break;
    }
    case 'netrunner': {
      const p: Palette = {
        skin: '#9d7f8f', jacket: '#241c3a', jacketDark: '#171029', pants: '#1d1830',
        pantsDark: '#130f22', boots: '#0f0c1c', hair: '#2a2140', accent: '#b388ff', metal: '#5b6a8a',
      };
      const g = drawHumanoid(ctx, 58, 'slim', swing * 0.4, p, { coat: true });
      // Hood, glowing mask, ICE cables trailing to the floor.
      px(ctx, -g.headW / 2 - 2 + g.hunch, g.shoulderY + g.hunch - g.headH - 4, g.headW + 3, 8, white('#241c3a'));
      px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 2, g.headW - 1, 5, bright ? '#ffffff' : '#b388ff');
      px(ctx, -g.headW / 2 - 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 6, g.headW + 1, 3, '#2a2140');
      px(ctx, -g.torsoW / 2 - 6, g.shoulderY + g.hunch + 6, 4, 40, a('#b388ff', 0.45));
      px(ctx, -g.torsoW / 2 - 8, g.shoulderY + g.hunch + 44, 8, 3, a('#b388ff', 0.3));
      for (let c = 0; c < 3; c++) px(ctx, g.torsoW / 2 + 2 + c * 3, g.shoulderY + g.hunch + 10 + c * 6, 2, 12, a('#e0c8ff', 0.4));
      // Hands crackling with data.
      px(ctx, g.torsoW / 2, g.shoulderY + g.hunch + g.upperArm + 12, 5, 5, bright ? '#ffffff' : '#e0c8ff');
      px(ctx, g.torsoW / 2 - 2, g.shoulderY + g.hunch + g.upperArm + 10, 9, 2, a('#b388ff', 0.6));
      if (o.attack > 0.2) muzzle(ctx, g.torsoW / 2 + 8, g.shoulderY + g.hunch + g.upperArm + 12, '#d8b4ff', o.attack);
      // Floating rune ring.
      const spin = t * 2 + phase;
      for (let r = 0; r < 4; r++) {
        const rx = Math.cos(spin + r * 1.57) * 13;
        const ry = Math.sin(spin + r * 1.57) * 5;
        px(ctx, rx - 2, g.shoulderY + g.hunch - 6 + ry, 4, 4, bright ? '#ffffff' : a('#b388ff', 0.75));
      }
      break;
    }
    case 'elite': {
      const p: Palette = {
        skin: '#d7b39a', jacket: '#1c1b2c', jacketDark: '#121120', pants: '#191826',
        pantsDark: '#0f0e18', boots: '#0b0a12', hair: '#e8e4dc', accent: '#ff3f6e', metal: '#8b93a8',
      };
      const g = drawHumanoid(ctx, 62, 'slim', swing, p, { coat: true });
      // Cyberpsycho mask with jaw vents and glowing seams.
      px(ctx, -g.headW / 2 - 1 + g.hunch, g.shoulderY + g.hunch - g.headH - 3, g.headW + 2, g.headH + 1, white('#22203a'));
      px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 1, g.headW - 2, 4, bright ? '#ffffff' : '#ff3f6e');
      for (let v = 0; v < 4; v++) px(ctx, -3 + v * 3 + g.hunch, g.shoulderY + g.hunch - 5, 2, 3, '#3c3757');
      px(ctx, -g.headW / 2 + g.hunch, g.shoulderY + g.hunch - g.headH - 6, g.headW, 4, p.hair);
      // Body seams and back vents.
      for (let s = 0; s < 3; s++) px(ctx, -g.torsoW / 2 + 2, g.shoulderY + g.hunch + 8 + s * 8, g.torsoW - 4, 2, a('#ff3f6e', 0.55));
      px(ctx, -g.torsoW / 2 - 8, g.shoulderY + g.hunch + 4, 5, 16, white('#2a2846'));
      mantisBlades(ctx, g.torsoW / 2 + 1, g.shoulderY + g.hunch + g.upperArm + 8, '#ff8fae');
      mantisBlades(ctx, -g.torsoW / 2 - 8, g.shoulderY + g.hunch + g.upperArm + 10, '#ff8fae');
      break;
    }
    case 'boss':
      drawBoss(ctx, level, t, phase, swing, bright, o.attack, recoil);
      break;
  }
  ctx.restore();
}

/* ------------------------------ BOSS ART --------------------------------- */

interface BossDraw {
  (ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, recoil: number): void;
}

const BOSS_DRAWS: BossDraw[] = [
  dexterDeshawn, joyToye, mantisPsycho, arasakaEnforcer, placide,
  corpoPsycho, saburoArasaka, nash, kurtHansen, adamSmasher,
];

function drawBoss(
  ctx: CanvasRenderingContext2D, level: number, t: number, phase: number,
  swing: number, bright: boolean, attack: number, recoil: number,
) {
  (BOSS_DRAWS[level] ?? BOSS_DRAWS[9])(ctx, t, phase, swing, bright, attack, recoil);
}

/** 1. Dexter Deshawn — Kabuki muscle: heavy build, dark suit, flat top, twin pistols. */
function dexterDeshawn(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, recoil: number) {
  void phase;
  void t;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#9c6b4e', jacket: '#262a33', jacketDark: '#1a1d24', pants: '#1e2129',
    pantsDark: '#14161d', boots: '#101218', hair: '#17181d', accent: '#59e6ef', metal: '#7d8794',
  };
  const g = drawHumanoid(ctx, 112, 'heavy', swing, p);
  // White dress shirt sliver and long black tie.
  px(ctx, -4, g.shoulderY + g.hunch + 6, 8, -g.shoulderY - 18, '#d8dde4');
  px(ctx, -3, g.shoulderY + g.hunch + 8, 5, 34, '#10131a');
  px(ctx, -4, g.shoulderY + g.hunch + 8, 7, 3, '#10131a');
  // Gold pocket square and lapel pins.
  px(ctx, 8, g.shoulderY + g.hunch + 12, 4, 4, '#ffd978');
  px(ctx, -g.torsoW / 2 + 2, g.shoulderY + g.hunch + 12, 4, 4, '#ffd978');
  // Flat top hair and thin scar.
  px(ctx, -g.headW / 2 - 2 + g.hunch, g.shoulderY + g.hunch - g.headH - 6, g.headW + 3, 7, W('#17181d'));
  px(ctx, -g.headW / 2 - 2 + g.hunch, g.shoulderY + g.hunch - g.headH - 6, g.headW + 3, 2, W('#2a2c33'));
  px(ctx, -g.headW / 2 + 2 + g.hunch, g.shoulderY + g.hunch - g.headH + 4, 2, 8, W('#7c5240'));
  // Squared jaw and stern brow.
  px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - 6, g.headW - 2, 2, W('#5c3d2e'));
  // Twin pistols: one raised when firing.
  pistol(ctx, -g.torsoW / 2 - g.armW - 4, g.shoulderY + g.hunch + g.upperArm + 14, '#59e6ef', 0);
  pistol(ctx, g.torsoW / 2 + 4, g.shoulderY + g.hunch + g.upperArm + 8 - attack * 4, '#59e6ef', recoil);
  muzzle(ctx, g.torsoW / 2 + 20 - recoil, g.shoulderY + g.hunch + g.upperArm + 9 - attack * 4, '#9ff4ef', attack);
}

/** 2. Joy Toye — the smile that owns Jig Jig: red jacket, bob with pink streak, glowing grin. */
function joyToye(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, recoil: number) {
  void phase;
  void t;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#e8c4a4', jacket: '#e0243f', jacketDark: '#9c1830', pants: '#1c1522',
    pantsDark: '#130e19', boots: '#a81830', hair: '#191220', accent: '#ff8ac2', metal: '#8d919c',
  };
  const g = drawHumanoid(ctx, 100, 'slim', swing, p, { coat: true });
  // Open jacket over black top; high collar.
  px(ctx, -3, g.shoulderY + g.hunch + 5, 7, -g.shoulderY - 22, W('#241a2c'));
  px(ctx, -g.torsoW / 2 - 1, g.shoulderY + g.hunch, 5, 9, W('#9c1830'));
  px(ctx, g.torsoW / 2 - 4, g.shoulderY + g.hunch, 5, 9, W('#9c1830'));
  // Red heels and thigh-high boots.
  px(ctx, -g.torsoW / 2 - 2, -22, g.torsoW + 4, 2, W('#ff5c72'));
  // Bob hair with pink streak, bangs, and side locks.
  px(ctx, -g.headW / 2 - 3 + g.hunch, g.shoulderY + g.hunch - g.headH - 5, g.headW + 4, 7, W('#191220'));
  px(ctx, -g.headW / 2 - 3 + g.hunch, g.shoulderY + g.hunch - g.headH + 2, 5, 12, W('#191220'));
  px(ctx, g.headW / 2 - 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 2, 5, 12, W('#ff8ac2'));
  px(ctx, 1 + g.hunch, g.shoulderY + g.hunch - g.headH - 5, 5, 9, W('#ff8ac2'));
  // Glowing smile — the signature.
  px(ctx, -g.headW / 2 + 3 + g.hunch, g.shoulderY + g.hunch - 5, g.headW - 4, 3, bright ? '#ffffff' : W('#ff9ac2'));
  px(ctx, -g.headW / 2 + 3 + g.hunch, g.shoulderY + g.hunch - 5, g.headW - 4, 1, 'rgba(255,220,240,.9)');
  // Long eyelashes.
  px(ctx, -g.headW / 2 + 2 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, g.headW - 3, 2, W('#191220'));
  // Pistol raised with a flourish.
  pistol(ctx, g.torsoW / 2 + 5, g.shoulderY + g.hunch + g.upperArm + 6 - attack * 5, '#ff8ac2', recoil);
  muzzle(ctx, g.torsoW / 2 + 21 - recoil, g.shoulderY + g.hunch + g.upperArm + 7 - attack * 5, '#ff9ac2', attack);
  // Heart-shaped earring.
  px(ctx, -g.headW / 2 - 4 + g.hunch, g.shoulderY + g.hunch - g.headH + 8, 3, 3, W('#ff5c72'));
}

/** 3. Mantis Cyberpsycho — gray chrome skin, red seams, oversized mantis blades. */
function mantisPsycho(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, _recoil: number) {
  void t;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#8f909c', jacket: '#2b2836', jacketDark: '#1d1b27', pants: '#232030',
    pantsDark: '#171522', boots: '#100f18', hair: '#4a4a55', accent: '#ff3f6e', metal: '#8d919c',
  };
  const g = drawHumanoid(ctx, 108, 'heavy', swing, p, { hunch: 3 });
  // Torn shirt and glowing cyberseams.
  px(ctx, -g.torsoW / 2, g.shoulderY + g.hunch + 5, g.torsoW, 4, W('#413d52'));
  for (let s = 0; s < 3; s++) px(ctx, -g.torsoW / 2 + 3, g.shoulderY + g.hunch + 12 + s * 9, g.torsoW - 6, 2, bright ? '#ffffff' : W('#ff3f6e'));
  // Matted hair and wide jaw with fangs.
  for (let h = 0; h < 5; h++) px(ctx, -g.headW / 2 - 2 + h * 4 + g.hunch, g.shoulderY + g.hunch - g.headH - 6 - (h % 2) * 3, 3, 8, W('#4a4a55'));
  px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 2, g.headW - 2, 3, bright ? '#ffffff' : W('#ff3f6e'));
  px(ctx, -g.headW / 2 + 2 + g.hunch, g.shoulderY + g.hunch - 6, g.headW - 3, 2, W('#6f707c'));
  for (let f = 0; f < 4; f++) px(ctx, -g.headW / 2 + 3 + f * 4 + g.hunch, g.shoulderY + g.hunch - 4, 2, 3, W('#e8e8f0'));
  // Twin oversized mantis blades, scissored when it lunges.
  const scissor = attack > 0.1 ? attack * 6 : Math.sin(t * 3 + phase) * 3;
  const blade = (x: number, y: number, len: number, tilt: number) => {
    px(ctx, x, y, 5, len, W('#9fb6c9'));
    for (let b = 0; b < 4; b++) px(ctx, x + 5, y + 4 + b * (len / 4), 2, 6, W('#cfdcec'));
    px(ctx, x - 3, y - 5, 11, 7, W('#3d3a4e'));
    px(ctx, x - 3, y - 5, 11, 2, W('#ff3f6e'));
    void tilt;
  };
  blade(g.torsoW / 2 - 2 + scissor, g.shoulderY + g.hunch + 6, 34 + scissor, 0);
  blade(-g.torsoW / 2 - 6 - scissor, g.shoulderY + g.hunch + 8, 30 + scissor, 0);
  // Cracked shoulder pauldron.
  px(ctx, -g.torsoW / 2 - 6, g.shoulderY + g.hunch - 3, 12, 9, W('#413d52'));
  px(ctx, -g.torsoW / 2 - 4, g.shoulderY + g.hunch - 1, 3, 4, W('#171522'));
}

/** 4. Arasaka Enforcer — white armor, gold sun crest, red visor, heavy rifle. */
function arasakaEnforcer(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, recoil: number) {
  void t;
  void phase;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#8d95a3', jacket: '#dde2e8', jacketDark: '#aeb6c2', pants: '#23262e',
    pantsDark: '#181a20', boots: '#14161c', hair: '#1a1c22', accent: '#ffd978', metal: '#7d8794',
  };
  const g = drawHumanoid(ctx, 112, 'heavy', swing, p);
  // Full faceplate helmet with a red visor and gold trim.
  px(ctx, -g.headW / 2 - 3 + g.hunch, g.shoulderY + g.hunch - g.headH - 5, g.headW + 5, g.headH + 3, W('#cfd5dd'));
  px(ctx, -g.headW / 2 - 3 + g.hunch, g.shoulderY + g.hunch - g.headH - 5, g.headW + 5, 2, W('#ffd978'));
  px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 2, g.headW - 1, 5, bright ? '#ffffff' : W('#ff2b3d'));
  px(ctx, -g.headW / 2 + g.hunch, g.shoulderY + g.hunch - 4, g.headW, 3, W('#8d95a3'));
  // Gold sun crest on the chest.
  ctx.fillStyle = bright ? '#ffffff' : '#ffd978';
  ctx.beginPath();
  ctx.arc(0, g.shoulderY + g.hunch + 14, 7, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, -9, g.shoulderY + g.hunch + 12, 18, 4, W('#2a2d34'));
  // Pauldron rings and armor vents.
  px(ctx, -g.torsoW / 2 - 7, g.shoulderY + g.hunch - 3, 13, 10, W('#cfd5dd'));
  px(ctx, g.torsoW / 2 - 6, g.shoulderY + g.hunch - 3, 13, 10, W('#cfd5dd'));
  px(ctx, -g.torsoW / 2 - 6, g.shoulderY + g.hunch - 2, 11, 3, W('#ffd978'));
  px(ctx, g.torsoW / 2 - 5, g.shoulderY + g.hunch - 2, 11, 3, W('#ffd978'));
  for (let v = 0; v < 3; v++) px(ctx, -g.torsoW / 2 + 4, g.shoulderY + g.hunch + 26 + v * 6, g.torsoW - 8, 3, W('#aeb6c2'));
  // Heavy assault rifle.
  rifle(ctx, g.torsoW / 2 + 4, g.shoulderY + g.hunch + g.upperArm + 12 - recoil * 0.4, '#ffd978', recoil, 26);
  muzzle(ctx, g.torsoW / 2 + 32 - recoil, g.shoulderY + g.hunch + g.upperArm + 13, '#ffe9a8', attack);
}

/** 5. Placide — Pacifica's voodoo lord: tattered hood, pale mask, green eyes, thick chain. */
function placide(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, recoil: number) {
  void attack;
  void recoil;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#c9ccc9', jacket: '#b7bbb7', jacketDark: '#838783', pants: '#4a4f47',
    pantsDark: '#33372f', boots: '#2a2d27', hair: '#6b706b', accent: '#9dff4d', metal: '#5b606a',
  };
  const g = drawHumanoid(ctx, 114, 'heavy', swing, p, { hunch: 5, coat: true });
  // Tattered hood.
  px(ctx, -g.headW / 2 - 5 + g.hunch, g.shoulderY + g.hunch - g.headH - 7, g.headW + 10, 9, W('#838783'));
  px(ctx, -g.headW / 2 - 6 + g.hunch, g.shoulderY + g.hunch - g.headH + 2, 6, 14, W('#838783'));
  px(ctx, g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 2, 6, 14, W('#838783'));
  // Pale voodoo mask with hollow eyes and stitched mouth.
  px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 1, g.headW - 2, g.headH - 2, W('#e4e7e4'));
  px(ctx, -g.headW / 2 + 3 + g.hunch, g.shoulderY + g.hunch - g.headH + 4, 5, 7, '#0c140c');
  px(ctx, g.headW / 2 - 8 + g.hunch, g.shoulderY + g.hunch - g.headH + 4, 5, 7, '#0c140c');
  px(ctx, -g.headW / 2 + 4 + g.hunch, g.shoulderY + g.hunch - g.headH + 5, 2, 3, bright ? '#ffffff' : W('#9dff4d'));
  px(ctx, g.headW / 2 - 7 + g.hunch, g.shoulderY + g.hunch - g.headH + 5, 2, 3, bright ? '#ffffff' : W('#9dff4d'));
  px(ctx, -3 + g.hunch, g.shoulderY + g.hunch - 6, 5, 4, '#0c140c');
  for (let s = 0; s < 4; s++) px(ctx, -g.headW / 2 + 3 + s * 5 + g.hunch, g.shoulderY + g.hunch - 3, 3, 2, '#0c140c');
  // Thick beaded chain.
  for (let c = 0; c < 7; c++) {
    px(ctx, -g.torsoW / 2 + 3 + c * 5, g.shoulderY + g.hunch + 10 + Math.abs(c - 3) * 2, 4, 4, c % 2 ? W('#5b606a') : W('#9dff4d'));
  }
  // Tattered robe edge.
  for (let k = 0; k < 5; k++) px(ctx, -g.torsoW / 2 - 3 + k * 7, g.hipY - 2 + (k % 2) * 3, 5, 8, W('#838783'));
  // Cane of bone.
  px(ctx, g.torsoW / 2 + 4, g.shoulderY + g.hunch + 10, 4, -g.shoulderY - 26, W('#d8dede'));
  px(ctx, g.torsoW / 2 + 2, g.shoulderY + g.hunch + 6, 8, 6, W('#e4e7e4'));
  // Hanging charm that swings.
  const sw = Math.sin(t * 2 + phase) * 5;
  px(ctx, -g.torsoW / 2 - 4 + sw, g.hipY - 6, 1, 8, W('#5b606a'));
  px(ctx, -g.torsoW / 2 - 8 + sw, g.hipY + 2, 9, 9, W('#9dff4d'));
}

/** 6. Corpo Cyberpsycho — shredded white armor, red seams, wild hair, chrome gun arm. */
function corpoPsycho(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, recoil: number) {
  void t;
  void phase;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#b8b3ad', jacket: '#cfd4da', jacketDark: '#9aa1ab', pants: '#2a2d34',
    pantsDark: '#1d2026', boots: '#181a20', hair: '#17151a', accent: '#ff3f4d', metal: '#c9ccd6',
  };
  const g = drawHumanoid(ctx, 108, 'heavy', swing, p, { hunch: 3 });
  // Shredded armor: torn plates and glowing red cracks.
  for (let s = 0; s < 4; s++) px(ctx, -g.torsoW / 2 + 2 + s * 9, g.shoulderY + g.hunch + 8 + s * 4, 6, 12, W('#e8ecf0'));
  for (let s = 0; s < 3; s++) px(ctx, -g.torsoW / 2 + 5, g.shoulderY + g.hunch + 12 + s * 10, g.torsoW - 8, 2, bright ? '#ffffff' : W('#ff3f4d'));
  px(ctx, g.torsoW / 2 - 8, g.shoulderY + g.hunch + 6, 10, 16, W('#9aa1ab'));
  // Wild black hair and glowing eyes.
  for (let h = 0; h < 6; h++) px(ctx, -g.headW / 2 - 4 + h * 4 + g.hunch, g.shoulderY + g.hunch - g.headH - 7 - (h % 2) * 4, 3, 9, W('#17151a'));
  px(ctx, -g.headW / 2 + 2 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, 4, 3, bright ? '#ffffff' : W('#ff3f4d'));
  px(ctx, g.headW / 2 - 6 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, 4, 3, bright ? '#ffffff' : W('#ff3f4d'));
  // Chrome gun arm with a heavy sidearm.
  px(ctx, g.torsoW / 2 - 1, g.shoulderY + g.hunch + 4, 11, 24, W('#b9bec9'));
  px(ctx, g.torsoW / 2 + 2, g.shoulderY + g.hunch + 6, 3, 18, bright ? '#ffffff' : W('#ff3f4d'));
  px(ctx, g.torsoW / 2 - 1, g.shoulderY + g.hunch + 26, 12, 12, W('#c9ccd6'));
  px(ctx, g.torsoW / 2 + 8, g.shoulderY + g.hunch + 30 - recoil * 0.4, 18, 5, W('#2a2d34'));
  px(ctx, g.torsoW / 2 + 24 - recoil * 0.4, g.shoulderY + g.hunch + 30, 4, 5, W('#ff3f4d'));
  muzzle(ctx, g.torsoW / 2 + 28 - recoil * 0.4, g.shoulderY + g.hunch + 32, '#ff8a94', attack);
  // Gold tie hanging out of the shredded shirt.
  px(ctx, 2, g.shoulderY + g.hunch + 14, 5, 14, W('#d9b256'));
}

/** 7. Saburo Arasaka — the young heir: white suit, red tie, big afro, calm aim. */
function saburoArasaka(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, recoil: number) {
  void t;
  void phase;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#e8c9a4', jacket: '#e8e4da', jacketDark: '#b8b2a4', pants: '#26222c',
    pantsDark: '#1a1720', boots: '#14121a', hair: '#141216', accent: '#ff1f3d', metal: '#c9ccd6',
  };
  const g = drawHumanoid(ctx, 106, 'slim', swing, p, { coat: true });
  // Red tie and lapel crest pin.
  px(ctx, -3, g.shoulderY + g.hunch + 8, 6, 30, W('#c01830'));
  px(ctx, -4, g.shoulderY + g.hunch + 8, 8, 3, W('#8f1024'));
  ctx.fillStyle = bright ? '#ffffff' : '#ff1f3d';
  ctx.beginPath();
  ctx.arc(g.torsoW / 2 - 5, g.shoulderY + g.hunch + 14, 3, 0, Math.PI * 2);
  ctx.fill();
  // The afro: wide, dark, textured.
  px(ctx, -g.headW / 2 - 7 + g.hunch, g.shoulderY + g.hunch - g.headH - 10, g.headW + 14, g.headH + 10, W('#141216'));
  for (let h = 0; h < 6; h++) px(ctx, -g.headW / 2 - 5 + h * 4 + g.hunch, g.shoulderY + g.hunch - g.headH - 8, 3, 4, W('#2c2830'));
  // Pale face, thin lips, calm eyes.
  px(ctx, -g.headW / 2 + 2 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, g.headW - 4, g.headH - 3, W('#e8c9a4'));
  px(ctx, -g.headW / 2 + 3 + g.hunch, g.shoulderY + g.hunch - g.headH + 5, 4, 2, W('#141216'));
  px(ctx, g.headW / 2 - 7 + g.hunch, g.shoulderY + g.hunch - g.headH + 5, 4, 2, W('#141216'));
  px(ctx, -2 + g.hunch, g.shoulderY + g.hunch - 5, 7, 2, W('#8f5a4a'));
  // Two-finger salute pistol, raised as he fires.
  pistol(ctx, g.torsoW / 2 + 4, g.shoulderY + g.hunch + g.upperArm + 4 - attack * 6, '#ff1f3d', recoil);
  muzzle(ctx, g.torsoW / 2 + 20 - recoil, g.shoulderY + g.hunch + g.upperArm + 5 - attack * 6, '#ff8a94', attack);
}

/** 8. Nash — the Badlands mutant: patchwork hide, bandage wrap, chrome arm, huge grin. */
function nash(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, _recoil: number) {
  void attack;
  void _recoil;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#a3785a', jacket: '#6b4a2c', jacketDark: '#4a331f', pants: '#4a3d2a',
    pantsDark: '#332a1d', boots: '#2a2218', hair: '#3c2a1c', accent: '#ffd166', metal: '#b9bec9',
  };
  const g = drawHumanoid(ctx, 118, 'heavy', swing, p, { hunch: 6 });
  // Patchwork hide with stitched panels.
  for (let s = 0; s < 5; s++) px(ctx, -g.torsoW / 2 + 3 + s * 10, g.shoulderY + g.hunch + 6 + (s % 2) * 6, 8, 14, s % 2 ? W('#7d5a38') : W('#5c3f26'));
  for (let s = 0; s < 4; s++) px(ctx, -g.torsoW / 2 + 6 + s * 12, g.shoulderY + g.hunch + 4 + (s % 2) * 5, 2, 3, W('#3c2a1c'));
  // Bandage head wrap and one small eye.
  px(ctx, -g.headW / 2 - 3 + g.hunch, g.shoulderY + g.hunch - g.headH - 3, g.headW + 6, 9, W('#d8cfc0'));
  px(ctx, -g.headW / 2 - 3 + g.hunch, g.shoulderY + g.hunch - g.headH - 3, g.headW + 6, 2, W('#b9b0a0'));
  px(ctx, g.headW / 2 - 8 + g.hunch, g.shoulderY + g.hunch - g.headH + 5, 5, 3, bright ? '#ffffff' : W('#ffd166'));
  // The grin: dark jaw full of square teeth.
  px(ctx, -g.headW / 2 + 2 + g.hunch, g.shoulderY + g.hunch - 6, g.headW - 4, 6, W('#241a12'));
  for (let th = 0; th < 5; th++) px(ctx, -g.headW / 2 + 3 + th * 4 + g.hunch, g.shoulderY + g.hunch - 5, 3, 4, W('#e8e2d4'));
  // One flesh arm, one huge chrome arm with a wrench.
  px(ctx, g.torsoW / 2 - 1, g.shoulderY + g.hunch + 4, 12, 26, W('#b9bec9'));
  px(ctx, g.torsoW / 2 + 2, g.shoulderY + g.hunch + 6, 3, 20, W('#8a92a0'));
  px(ctx, g.torsoW / 2 - 2, g.shoulderY + g.hunch + 28, 15, 14, W('#c9ccd6'));
  px(ctx, g.torsoW / 2 + 8, g.shoulderY + g.hunch + 30, 18, 8, W('#7d8794'));
  px(ctx, g.torsoW / 2 + 22, g.shoulderY + g.hunch + 26, 7, 16, W('#9aa2b0'));
  // Scrap chain across the shoulders.
  for (let c = 0; c < 6; c++) px(ctx, -g.torsoW / 2 + 4 + c * 7, g.shoulderY + g.hunch + 8 + Math.abs(c - 2.5) * 2, 4, 4, W('#5b606a'));
  // Steam venting from the chrome shoulder.
  const puff = (t * 10 + phase) % 3 < 1 ? 1 : 0;
  if (puff) px(ctx, g.torsoW / 2 + 10, g.shoulderY + g.hunch - 8, 6, 6, a('#d8e8f0', 0.4));
}

/** 9. Kurt Hansen — Arasaka's chief engineer: wiry, white lab coat, red glasses. */
function kurtHansen(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, _recoil: number) {
  void t;
  void phase;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#cfa98a', jacket: '#2a2430', jacketDark: '#1c1822', pants: '#221e28',
    pantsDark: '#17141c', boots: '#12101a', hair: '#8d8d95', accent: '#ff3f4d', metal: '#c9ccd6',
  };
  const g = drawHumanoid(ctx, 110, 'slim', swing, p);
  // Long white lab coat over the dark suit.
  px(ctx, -g.torsoW / 2 - 4, g.shoulderY + g.hunch + 1, g.torsoW + 8, -g.shoulderY - 12, W('#e8e6e0'));
  px(ctx, -2, g.shoulderY + g.hunch + 4, 4, -g.shoulderY - 16, W('#cfcdc6'));
  px(ctx, -g.torsoW / 2 - 4, g.hipY - 4, 8, 24 + swing * 2, W('#e8e6e0'));
  px(ctx, g.torsoW / 2 - 4, g.hipY - 4, 8, 24 - swing * 2, W('#dcdad3'));
  px(ctx, -g.torsoW / 2 - 2, g.shoulderY + g.hunch + 14, 5, 8, W('#2a2430'));
  // Slicked gray hair, gaunt face, red glasses.
  px(ctx, -g.headW / 2 - 1 + g.hunch, g.shoulderY + g.hunch - g.headH - 4, g.headW + 2, 5, W('#8d8d95'));
  px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 1, g.headW - 2, 1, W('#8d8d95'));
  px(ctx, -g.headW / 2 + 2 + g.hunch, g.shoulderY + g.hunch - g.headH + 4, 4, 4, W('#f0f2f5'));
  px(ctx, g.headW / 2 - 6 + g.hunch, g.shoulderY + g.hunch - g.headH + 4, 4, 4, W('#f0f2f5'));
  px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 5, g.headW - 2, 2, bright ? '#ffffff' : W('#ff3f4d'));
  px(ctx, -1 + g.hunch, g.shoulderY + g.hunch - 5, 6, 2, W('#8a5f4a'));
  // Clipboard arm and a scanner wand.
  px(ctx, -g.torsoW / 2 - g.armW - 3, g.shoulderY + g.hunch + g.upperArm + 10, 12, 15, W('#e8e6e0'));
  px(ctx, -g.torsoW / 2 - g.armW - 1, g.shoulderY + g.hunch + g.upperArm + 13, 8, 9, W('#2a2430'));
  px(ctx, g.torsoW / 2 + 4, g.shoulderY + g.hunch + g.upperArm + 10, 4, 14, W('#b9bec9'));
  px(ctx, g.torsoW / 2 + 2, g.shoulderY + g.hunch + g.upperArm + 22 - attack * 2, 8, 4, bright ? '#ffffff' : W('#ff3f4d'));
  muzzle(ctx, g.torsoW / 2 + 10, g.shoulderY + g.hunch + g.upperArm + 24 - attack * 2, '#ff8a94', attack);
}

/** 10. Adam Smasher — the full-body cyborg: gunmetal armor, cannon arm, white streak. */
function adamSmasher(ctx: CanvasRenderingContext2D, t: number, phase: number, swing: number, bright: boolean, attack: number, recoil: number) {
  void t;
  const W = (c: string) => (bright ? '#fff9dc' : c);
  const p: Palette = {
    skin: '#3d4450', jacket: '#2b3038', jacketDark: '#1e2228', pants: '#242830',
    pantsDark: '#171a20', boots: '#12151a', hair: '#14161a', accent: '#ff2b3d', metal: '#7d8794',
  };
  const g = drawHumanoid(ctx, 122, 'heavy', swing, p);
  // Gunmetal plate torso with red power core.
  for (let s = 0; s < 4; s++) px(ctx, -g.torsoW / 2, g.shoulderY + g.hunch + 5 + s * 9, g.torsoW, 6, s % 2 ? W('#3d4450') : W('#2b3038'));
  px(ctx, -6, g.shoulderY + g.hunch + 12, 12, 12, W('#1e2228'));
  px(ctx, -4, g.shoulderY + g.hunch + 14, 8, 8, bright ? '#ffffff' : W('#ff2b3d'));
  px(ctx, -2, g.shoulderY + g.hunch + 16, 4, 4, W('#ff8a94'));
  // Massive chrome pauldrons.
  px(ctx, -g.torsoW / 2 - 10, g.shoulderY + g.hunch - 5, 17, 13, W('#7d8794'));
  px(ctx, -g.torsoW / 2 - 10, g.shoulderY + g.hunch - 5, 17, 3, W('#9aa2b0'));
  px(ctx, g.torsoW / 2 - 7, g.shoulderY + g.hunch - 5, 17, 13, W('#7d8794'));
  px(ctx, g.torsoW / 2 - 7, g.shoulderY + g.hunch - 5, 17, 3, W('#9aa2b0'));
  // Faceplate with twin red optics and a single white hair streak.
  px(ctx, -g.headW / 2 - 3 + g.hunch, g.shoulderY + g.hunch - g.headH - 5, g.headW + 5, g.headH + 3, W('#2b3038'));
  px(ctx, -g.headW / 2 + 2 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, 5, 4, bright ? '#ffffff' : W('#ff2b3d'));
  px(ctx, g.headW / 2 - 7 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, 5, 4, bright ? '#ffffff' : W('#ff2b3d'));
  px(ctx, -g.headW / 2 + g.hunch, g.shoulderY + g.hunch - 3, g.headW, 3, W('#1e2228'));
  px(ctx, g.headW / 2 - 10 + g.hunch, g.shoulderY + g.hunch - g.headH - 5, 4, 8, W('#e8e6e0'));
  // The cannon arm.
  px(ctx, g.torsoW / 2 - 1, g.shoulderY + g.hunch + 4, 14, 28, W('#3d4450'));
  px(ctx, g.torsoW / 2 + 2, g.shoulderY + g.hunch + 8, 4, 20, bright ? '#ffffff' : W('#ff2b3d'));
  px(ctx, g.torsoW / 2 - 3, g.shoulderY + g.hunch + 30, 20, 16, W('#4a5260'));
  const barrel = 30 - recoil;
  px(ctx, g.torsoW / 2 + 12, g.shoulderY + g.hunch + 33, barrel, 10, W('#2b3038'));
  px(ctx, g.torsoW / 2 + 12, g.shoulderY + g.hunch + 33, barrel, 3, W('#1e2228'));
  px(ctx, g.torsoW / 2 + 10 + barrel, g.shoulderY + g.hunch + 31, 6, 14, W('#7d8794'));
  px(ctx, g.torsoW / 2 + 12 + barrel, g.shoulderY + g.hunch + 36, 4, 4, bright ? '#ffffff' : W('#ff2b3d'));
  muzzle(ctx, g.torsoW / 2 + 18 + barrel, g.shoulderY + g.hunch + 38, '#ff8a94', attack);
  // Exhaust vents.
  const vent = Math.floor(t * 8 + phase) % 2 === 0;
  if (vent) px(ctx, -g.torsoW / 2 - 12, g.shoulderY + g.hunch + 20, 5, 5, a('#8a92a0', 0.5));
}

/* ------------------------------- PLAYER ---------------------------------- */

export interface PlayerSpriteOptions {
  ctx: CanvasRenderingContext2D;
  t: number;
  facing: 1 | -1;
  steps: number;
  grounded: boolean;
  vx: number;
  recoil: number;
  hurt: boolean;
  attack: number;
  x: number;
  y: number;
}

export function drawPlayerSprite(o: PlayerSpriteOptions) {
  const { ctx, t, steps, grounded, vx, recoil } = o;
  const swing = grounded && Math.abs(vx) > 20 ? Math.sin(steps) : grounded ? Math.sin(t * 2) * 0.1 : 0.35;
  const p: Palette = {
    skin: '#d9a679', jacket: '#252c3d', jacketDark: '#171c29', pants: '#1b2130',
    pantsDark: '#12161f', boots: '#141a26', hair: '#241d18', accent: '#59e6ef', metal: '#59627a',
  };
  const g = drawHumanoid(ctx, 58, 'normal', swing, p);
  const charged = o.attack > 0.4;

  // Short-cropped dark hair with a shaved fade and a small cyber implant.
  px(ctx, -g.headW / 2 - 1 + g.hunch, g.shoulderY + g.hunch - g.headH - 4, g.headW + 2, 4, p.hair);
  px(ctx, -g.headW / 2 - 2 + g.hunch, g.shoulderY + g.hunch - g.headH, 3, 8, mix(p.hair, '#000000', 0.3));
  px(ctx, g.headW / 2 - 3 + g.hunch, g.shoulderY + g.hunch - g.headH, 3, 8, mix(p.hair, '#000000', 0.3));
  px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 1, 2, 3, a('#59e6ef', 0.7));
  // Thin tactical visor across the eyes.
  px(ctx, -g.headW / 2 + 1 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, g.headW - 1, 3, o.hurt ? '#ff6a8a' : a('#59e6ef', 0.75));
  px(ctx, g.headW / 2 - 4 + g.hunch, g.shoulderY + g.hunch - g.headH + 3, 2, 2, '#eafcff');

  // Tactical jacket: shoulder plates, chest rig, cyan seam lines, hem strap.
  px(ctx, -g.torsoW / 2 - 3, g.shoulderY + g.hunch - 1, 8, 5, p.jacketDark);
  px(ctx, g.torsoW / 2 - 5, g.shoulderY + g.hunch - 1, 8, 5, p.jacketDark);
  px(ctx, -g.torsoW / 2 + 2, g.shoulderY + g.hunch + 5, 6, 16, p.jacketDark);
  px(ctx, -g.torsoW / 2 + 2, g.shoulderY + g.hunch + 7, 6, 3, a('#59e6ef', 0.6));
  px(ctx, -g.torsoW / 2 + 2, g.shoulderY + g.hunch + 14, 6, 2, a('#59e6ef', 0.4));
  px(ctx, -g.torsoW / 2 - 1, g.hipY - 9, g.torsoW + 2, 3, a('#59e6ef', 0.4));
  px(ctx, g.torsoW / 2 - 5, g.hipY - 9, 5, 4, '#39404f');
  // Small rig pack on the back.
  px(ctx, -g.torsoW / 2 - 7, g.shoulderY + g.hunch + 6, 6, 14, p.jacketDark);
  px(ctx, -g.torsoW / 2 - 7, g.shoulderY + g.hunch + 8, 6, 2, a('#59e6ef', 0.5));

  // Right leg cyber strut: a chrome knee plate.
  px(ctx, 2, g.hipY + 8, 5, 6, p.metal);

  // Chrome cyber forearm holding the gun.
  const foreY = g.shoulderY + g.hunch + 2 + g.upperArm;
  px(ctx, g.torsoW / 2 - 1, foreY, g.armW, 11, p.metal);
  px(ctx, g.torsoW / 2, foreY + 2, g.armW - 1, 2, o.hurt ? '#ff6a8a' : a('#59e6ef', 0.7));
  px(ctx, g.torsoW / 2 - 1, foreY + 11, g.armW, 4, p.skin);

  // The gun: a chunky mag-pistol with a glowing rail cell.
  const gunY = foreY + 6 - recoil * 0.5;
  const gunX = g.torsoW / 2 + g.armW - 4 - recoil * 3;
  px(ctx, gunX, gunY, 16, 7, '#1b2230');
  px(ctx, gunX + 3, gunY + 7, 6, 7, '#141a26');
  px(ctx, gunX + 1, gunY + 1, 5, 2, '#2a3346');
  px(ctx, gunX + 16, gunY + 1, 12, 3, '#2a3346');
  px(ctx, gunX + 16, gunY + 5, 10, 2, '#1b2230');
  px(ctx, gunX + 26, gunY + 1, 4, 5, p.metal);
  px(ctx, gunX + 6, gunY + 1, 4, 5, charged ? '#eafcff' : a('#59e6ef', 0.95));
  px(ctx, gunX + 4, gunY - 4, 8, 3, '#2a3346');
  px(ctx, gunX + 10, gunY - 3, 2, 2, a('#59e6ef', 0.9));
  muzzle(ctx, gunX + 30, gunY + 3, charged ? '#d8fffb' : '#7afbf1', o.attack);
  // Support hand under the barrel.
  px(ctx, -g.torsoW / 2 - g.armW - 2, g.shoulderY + g.hunch + g.upperArm + 10, g.armW + 2, g.armW + 2, p.jacketDark);
}
