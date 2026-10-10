import type { Stage } from './stages';

export interface Scenery {
  far: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  near: HTMLCanvasElement;
  farW: number;
  midW: number;
  nearW: number;
}

const STRIP_H = 520;
const STRIP_GROUND = 486;

const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

const rnd = (n: number, salt = 0) => {
  const value = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}
const rgba = (hex: string, alpha: number) => {
  const p = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${alpha})`;
};

function makeLayer(width: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.ceil(width));
  canvas.height = STRIP_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported by this browser.');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function signBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, glow: string) {
  px(ctx, x, y, w, h, '#0d1020');
  px(ctx, x, y, w, 2, color);
  px(ctx, x, y + h - 2, w, 2, color);
  px(ctx, x, y, 2, h, color);
  px(ctx, x + w - 2, y, 2, h, color);
  for (let g = 0; g < 3; g++) px(ctx, x - 1, y + 3 + g * 5, w + 2, 1, rgba(glow, 0.14));
}

function bigText(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, color: string) {
  ctx.font = `bold ${size}px monospace`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

/* ------------------------------- FAR LAYER ------------------------------- */

function skylineFar(ctx: CanvasRenderingContext2D, width: number, stage: Stage, level: number) {
  let x = -20;
  let i = 0;
  const tall = level === 3 ? 1.55 : level === 5 ? 1.15 : level === 4 ? 0.8 : 1;
  while (x < width) {
    const bw = 38 + rnd(i, 1) * 66;
    const bh = (120 + rnd(i, 2) * 190) * tall;
    const top = STRIP_GROUND - 46 - bh;
    px(ctx, x, top, bw, bh + 46, stage.far);
    px(ctx, x, top, 2, bh + 46, mix(stage.far, '#ffffff', 0.13));
    px(ctx, x + bw - 3, top + 6, 3, bh + 40, mix(stage.far, '#000000', 0.3));
    for (let wy = top + 14; wy < STRIP_GROUND - 60; wy += 14) {
      for (let wx = x + 6; wx < x + bw - 6; wx += 11) {
        if (rnd(wx + wy, i) > 0.44) px(ctx, wx, wy, 3, 5, rnd(wx, wy) > 0.78 ? rgba(stage.accent, 0.26) : rgba(stage.neon, 0.16));
      }
    }
    if (level === 1) {
      // Red light district: dense billboards and antenna clutter.
      if (i % 2 === 0) {
        px(ctx, x + 6, top - 26, bw - 12, 20, mix(stage.far, stage.neon, 0.25));
        px(ctx, x + 10, top - 22, bw - 20, 3, rgba('#ffffff', 0.3));
      }
      px(ctx, x + bw / 2, top - 14 - rnd(i, 8) * 10, 2, 14, mix(stage.far, '#ffffff', 0.2));
    } else if (level === 2) {
      if (i % 4 === 1) {
        // Pagoda silhouette.
        const cx = x + bw / 2;
        px(ctx, cx - 10, top - 26, 20, 26, mix(stage.far, stage.neon, 0.15));
        px(ctx, cx - 16, top - 30, 32, 5, mix(stage.far, stage.neon, 0.3));
        px(ctx, cx - 7, top - 40, 14, 10, mix(stage.far, stage.neon, 0.15));
        px(ctx, cx - 11, top - 44, 22, 4, mix(stage.far, stage.neon, 0.3));
        px(ctx, cx - 1, top - 52, 2, 8, mix(stage.far, '#ffffff', 0.3));
      }
    } else if (level === 3) {
      px(ctx, x + bw / 2 - 2, top - 24 - rnd(i, 9) * 30, 4, 30, mix(stage.far, '#ffffff', 0.16));
      px(ctx, x + bw / 2 - 6, top - 26 - rnd(i, 9) * 30, 12, 3, rgba(stage.neon, 0.4));
    } else if (level === 4) {
      // Rusted, sagging Pacifica rooftops.
      px(ctx, x + 4, top - 8, bw - 8, 8, mix(stage.far, '#000000', 0.18));
      if (i % 3 === 0) px(ctx, x + bw - 10, top - 22, 4, 22, mix(stage.far, '#ffffff', 0.1));
      if (i % 4 === 2) px(ctx, x + 6, top - 4, 10, 10, rgba(stage.neon, 0.12));
    } else if (level === 5) {
      px(ctx, x + 4, top, bw - 8, 3, rgba('#ffffff', 0.18));
      if (i % 3 === 0) px(ctx, x + bw / 2 - 8, top - 16, 16, 16, rgba(stage.accent, 0.2));
    } else if (level === 7) {
      // Broken Badlands skyline in the haze.
      if (i % 3 === 1) px(ctx, x + 8, top - 12, bw - 16, 12, mix(stage.far, '#000000', 0.25));
    } else if (level === 8) {
      // Dogtown: ruined towers behind the berm wall.
      px(ctx, x + 6, top - 10, bw - 12, 10, mix(stage.far, '#000000', 0.2));
      if (i % 3 === 0) px(ctx, x + bw / 2 - 1, top - 26, 3, 26, mix(stage.far, '#ffffff', 0.12));
    }
    x += bw + 4 + rnd(i, 3) * 12;
    i++;
  }
}

function mesaFar(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  // Layered sandstone mesas and dunes under a hazy sun.
  const bands = [
    { y: STRIP_GROUND - 150, color: mix(stage.far, stage.bottom, 0.5) },
    { y: STRIP_GROUND - 96, color: mix(stage.far, '#000000', 0.15) },
  ];
  bands.forEach((band, bi) => {
    let x = -40 + bi * 60;
    let i = 0;
    while (x < width) {
      const w = 160 + rnd(i, bi) * 220;
      const h = 40 + rnd(i, bi + 5) * 70;
      px(ctx, x, band.y - h, w, h + 60, band.color);
      px(ctx, x, band.y - h, w, 5, mix(band.color, '#ffffff', 0.18));
      px(ctx, x + w * 0.3, band.y - h, w * 0.4, h, mix(band.color, '#000000', 0.08));
      x += w - 30;
      i++;
    }
  });
  // Distant turbine silhouettes.
  for (let t = 0; t < width / 190; t++) {
    const tx = 80 + t * 190 + rnd(t, 9) * 40;
    px(ctx, tx, STRIP_GROUND - 130, 3, 60, mix(stage.far, '#000000', 0.3));
    px(ctx, tx - 8, STRIP_GROUND - 132, 19, 3, mix(stage.far, '#000000', 0.3));
  }
}

function interiorFar(ctx: CanvasRenderingContext2D, width: number, stage: Stage, kind: 'office' | 'arasaka' | 'bar') {
  const wall = stage.far;
  px(ctx, 0, 0, width, 60, mix(wall, '#000000', 0.35));
  // Distant glass wall with the city glowing beyond.
  for (let wy = 90; wy < STRIP_GROUND - 60; wy += 16) {
    for (let wx = 8; wx < width - 8; wx += 14) {
      if (rnd(wx + wy, 4) > 0.5) {
        const warm = rnd(wx, wy) > 0.6;
        px(ctx, wx, wy, 4, 6, kind === 'bar' ? rgba('#ffb469', 0.3) : warm ? rgba('#ffcf89', 0.22) : rgba(stage.neon, 0.18));
      }
    }
  }
  // Structural pillars.
  for (let x = 0; x < width; x += 150) {
    px(ctx, x, 40, 22, STRIP_GROUND - 40, mix(wall, '#000000', 0.25));
    px(ctx, x + 2, 40, 4, STRIP_GROUND - 40, mix(wall, '#ffffff', 0.08));
    px(ctx, x + 8, 60, 2, 8, kind === 'arasaka' ? rgba('#ff2b3d', 0.5) : rgba(stage.neon, 0.4));
  }
  if (kind === 'arasaka') {
    for (let x = 75; x < width; x += 150) px(ctx, x, 46, 3, STRIP_GROUND - 46, rgba('#ff1f3d', 0.35));
  }
  if (kind === 'bar') {
    px(ctx, 0, 120, width, 3, rgba('#ffd978', 0.12));
    for (let x = 30; x < width; x += 90) px(ctx, x, 56, 3, 50, rgba('#ffb469', 0.2));
  }
  px(ctx, 0, STRIP_GROUND - 40, width, 40, mix(wall, '#000000', 0.3));
}

/* ------------------------------- MID LAYER ------------------------------- */

function officeMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  // Ceiling cable tray and hanging cables.
  px(ctx, 0, 66, width, 8, stage.trim);
  for (let x = 0; x < width; x += 34) px(ctx, x + 8, 74, 6, 10 + (x % 3) * 6, rgba(stage.neon, 0.2));
  let x = 0;
  let i = 0;
  while (x < width) {
    // Concrete columns.
    px(ctx, x, 40, 26, STRIP_GROUND - 74, mix(stage.middle, '#000000', 0.12));
    px(ctx, x + 3, 44, 4, STRIP_GROUND - 80, rgba(stage.neon, 0.25));
    x += 200;
    i++;
    // Office pods between the columns.
    const podX = x + 30;
    px(ctx, podX, STRIP_GROUND - 150, 120, 116, mix(stage.middle, '#000000', 0.2));
    px(ctx, podX + 4, STRIP_GROUND - 146, 112, 78, rgba('#9fd8ff', 0.07));
    px(ctx, podX + 4, STRIP_GROUND - 146, 112, 3, rgba('#9fd8ff', 0.2));
    for (let m = 0; m < 3; m++) px(ctx, podX + 12 + m * 36, STRIP_GROUND - 142, 2, 74, rgba('#9fd8ff', 0.12));
    for (let w = 0; w < 4; w++) {
      px(ctx, podX + 10 + w * 27, STRIP_GROUND - 62, 20, 8, w % 2 ? rgba('#ffcf89', 0.35) : rgba('#25384a', 0.6));
    }
    if (i % 2 === 0) {
      signBlock(ctx, podX + 34, STRIP_GROUND - 210, 52, 34, stage.neon, stage.neon);
      bigText(ctx, podX + 42, STRIP_GROUND - 202, 'H10', 18, stage.neon);
    }
    // Potted office plant.
    px(ctx, podX + 96, STRIP_GROUND - 44, 16, 14, stage.trim);
    for (let f = 0; f < 4; f++) px(ctx, podX + 98 + f * 4, STRIP_GROUND - 66 - (f % 2) * 6, 3, 24 + (f % 2) * 6, '#3a6b4f');
    x += 140;
  }
  bigText(ctx, width * 0.42, 150, 'KABUKI GROUP', 30, rgba(stage.accent, 0.2));
}

function jiggigMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  let x = 0;
  let i = 0;
  while (x < width) {
    const bw = 84 + rnd(i, 1) * 70;
    const top = STRIP_GROUND - 210 - rnd(i, 2) * 130;
    px(ctx, x, top, bw, STRIP_GROUND - top, stage.middle);
    for (let wy = top + 20; wy < STRIP_GROUND - 40; wy += 24) {
      for (let wx = x + 10; wx < x + bw - 12; wx += 22) {
        px(ctx, wx, wy, 10, 12, rnd(wx + wy, i) > 0.5 ? rgba('#ffd1e4', 0.3) : rgba('#5c1030', 0.5));
      }
    }
    // Dense neon strips.
    for (let s = 0; s < 3; s++) px(ctx, x + 8 + s * 10, top + 10, bw - 16, 3, s % 2 ? rgba(stage.neon, 0.5) : rgba(stage.accent, 0.4));
    if (i % 2 === 0) {
      signBlock(ctx, x + 12, top + 52, 28, 60, stage.neon, stage.neon);
      for (let k = 0; k < 5; k++) px(ctx, x + 17, top + 60 + k * 10, 18, 4, rgba('#ffffff', 0.4));
    }
    // String of love bulbs.
    for (let b = 0; b < Math.floor(bw / 14); b++) px(ctx, x + 6 + b * 14, top + 96, 5, 6, b % 2 ? '#ff8ac2' : '#ffd1e4');
    px(ctx, x - 4, top + 100, bw + 8, 2, 'rgba(20,6,16,.8)');
    x += bw + 16;
    i++;
  }
  loveHotel(ctx, 260, stage);
  loveHotel(ctx, 980, stage);
  loveHotel(ctx, 1700, stage);
}

function loveHotel(ctx: CanvasRenderingContext2D, x: number, stage: Stage) {
  const y = STRIP_GROUND - 300;
  px(ctx, x, y, 130, 268, '#3a1230');
  px(ctx, x, y, 130, 6, stage.trim);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      px(ctx, x + 14 + c * 22, y + 40 + r * 40, 14, 20, (r + c) % 2 ? 'rgba(255,138,194,.42)' : 'rgba(90,16,58,.55)');
      px(ctx, x + 14 + c * 22, y + 40 + r * 40, 14, 3, 'rgba(255,220,240,.35)');
    }
  }
  // LOVE HOTEL stacked sign with hearts.
  signBlock(ctx, x + 30, y - 66, 70, 62, stage.neon, stage.neon);
  bigText(ctx, x + 38, y - 58, 'LOVE', 18, stage.neon);
  bigText(ctx, x + 38, y - 36, 'HOTEL', 13, stage.accent);
  for (let h = 0; h < 3; h++) {
    const hx = x + 40 + h * 18;
    px(ctx, hx, y - 22, 4, 4, stage.neon);
    px(ctx, hx + 6, y - 22, 4, 4, stage.neon);
    px(ctx, hx + 1, y - 18, 8, 3, stage.neon);
    px(ctx, hx + 3, y - 15, 4, 3, stage.neon);
  }
  px(ctx, x + 8, y + 250, 114, 18, '#2a0c26');
  px(ctx, x + 12, y + 252, 106, 4, rgba(stage.accent, 0.5));
}

function japaMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  let x = 0;
  let i = 0;
  while (x < width) {
    const bw = 88 + rnd(i, 1) * 70;
    const top = STRIP_GROUND - 200 - rnd(i, 2) * 120;
    px(ctx, x, top, bw, STRIP_GROUND - top, stage.middle);
    for (let wy = top + 18; wy < STRIP_GROUND - 40; wy += 22) {
      for (let wx = x + 10; wx < x + bw - 12; wx += 20) {
        px(ctx, wx, wy, 10, 12, rnd(wx + wy, i) > 0.45 ? 'rgba(255,209,102,.28)' : 'rgba(60,20,50,.4)');
      }
    }
    if (i % 2 === 0) {
      signBlock(ctx, x + 14, top + 40, 30, 64, stage.neon, stage.neon);
      for (let k = 0; k < 5; k++) px(ctx, x + 19, top + 48 + k * 11, 20, 3, rgba('#ffffff', 0.42));
    } else {
      // Vertical kanji-style sign.
      px(ctx, x + bw - 30, top + 30, 20, 90, '#241530');
      px(ctx, x + bw - 30, top + 30, 20, 90, 'rgba(255,209,102,.14)');
      for (let k = 0; k < 4; k++) {
        px(ctx, x + bw - 26, top + 38 + k * 20, 12, 3, stage.accent);
        px(ctx, x + bw - 24, top + 36 + k * 20, 3, 10, stage.accent);
      }
    }
    x += bw + 18;
    i++;
  }
  torii(ctx, 200, stage, true);
  pagoda(ctx, 760, stage);
  torii(ctx, 1240, stage, false);
  ramenShop(ctx, 1500, stage);
  pagoda(ctx, 2050, stage);
}

function torii(ctx: CanvasRenderingContext2D, x: number, _stage: Stage, big: boolean) {
  const h = big ? 210 : 150;
  const y = STRIP_GROUND - h;
  const red = '#c22f35';
  const dark = '#801f24';
  px(ctx, x, y + 24, 14, h - 24, red);
  px(ctx, x + (big ? 120 : 84), y + 24, 14, h - 24, red);
  px(ctx, x - 14, y, big ? 160 : 118, 10, dark);
  px(ctx, x - 22, y - 10, big ? 176 : 134, 12, red);
  px(ctx, x - 22, y - 10, big ? 176 : 134, 4, dark);
  px(ctx, x - 14, y + 12, big ? 160 : 118, 6, red);
  px(ctx, x + (big ? 58 : 41), y + 12, 6, 14, dark);
}

function pagoda(ctx: CanvasRenderingContext2D, x: number, _stage: Stage) {
  const y = STRIP_GROUND - 260;
  px(ctx, x + 20, y + 90, 80, 170, '#33203c');
  px(ctx, x + 44, y + 140, 32, 30, 'rgba(255,209,102,.4)');
  for (let tier = 0; tier < 3; tier++) {
    const tw = 150 - tier * 34;
    const ty = y + 80 - tier * 48;
    px(ctx, x + (120 - tw) / 2, ty, tw, 10, '#c22f35');
    px(ctx, x + (120 - tw) / 2, ty, tw, 3, '#801f24');
    px(ctx, x + (120 - tw) / 2 - 8, ty + 8, tw + 16, 6, '#e8d9c2');
    px(ctx, x + 10 + tier * 10, ty + 14, 100 - tier * 20, 34 - tier * 6, '#3a2444');
  }
  px(ctx, x + 58, y - 46, 4, 16, '#801f24');
  px(ctx, x + 52, y - 52, 16, 6, '#c22f35');
}

function ramenShop(ctx: CanvasRenderingContext2D, x: number, stage: Stage) {
  const y = STRIP_GROUND - 148;
  px(ctx, x, y, 140, 116, '#2a1a30');
  px(ctx, x, y, 140, 4, stage.trim);
  px(ctx, x + 4, y + 10, 132, 60, '#160e20');
  for (let w = 0; w < 5; w++) px(ctx, x + 12 + w * 25, y + 16, 19, 48, 'rgba(255,190,90,.5)');
  signBlock(ctx, x + 40, y - 36, 60, 30, stage.accent, stage.neon);
  bigText(ctx, x + 46, y - 30, 'RAMEN', 15, stage.accent);
  for (let l = 0; l < 8; l++) {
    const lx = x + 2 + l * 17;
    px(ctx, lx, y + 84, 10, 12, l % 2 ? '#ff6d6d' : '#ffb86d');
    px(ctx, lx + 2, y + 86, 6, 8, 'rgba(255,243,200,.75)');
  }
  px(ctx, x - 4, y + 92, 148, 2, 'rgba(20,10,24,.9)');
}

function westbrookMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  let x = 0;
  let i = 0;
  while (x < width) {
    const bw = 90 + rnd(i, 1) * 80;
    const top = STRIP_GROUND - 330 - rnd(i, 2) * 120;
    px(ctx, x, top, bw, STRIP_GROUND - top, stage.middle);
    px(ctx, x + 4, top + 4, bw - 8, STRIP_GROUND - top - 8, rgba('#9fd8ff', 0.06));
    for (let m = 0; m < 5; m++) px(ctx, x + 14 + m * 19, top + 12, 2, STRIP_GROUND - top - 24, rgba(stage.accent, 0.16));
    px(ctx, x, top, bw, 4, stage.trim);
    px(ctx, x + bw / 2 - 1, top - 26, 3, 26, stage.trim);
    px(ctx, x + bw / 2 - 4, top - 30, 9, 4, rgba(stage.neon, 0.5));
    if (i % 2 === 0) {
      signBlock(ctx, x + 14, top + 46, 44, 30, stage.neon, stage.neon);
      bigText(ctx, x + 19, top + 54, i % 4 === 0 ? 'REVNT' : 'WSTBK', 12, stage.neon);
    }
    x += bw + 20;
    i++;
  }
  // Iconic skybridge between two towers.
  const bx = 900;
  px(ctx, bx, STRIP_GROUND - 400, 120, 400, mix(stage.middle, '#ffffff', 0.05));
  px(ctx, bx + 130, STRIP_GROUND - 340, 100, 340, mix(stage.middle, '#000000', 0.1));
  px(ctx, bx - 10, STRIP_GROUND - 220, 260, 16, stage.trim);
  px(ctx, bx - 10, STRIP_GROUND - 220, 260, 3, rgba(stage.neon, 0.5));
  for (let w = 0; w < 8; w++) px(ctx, bx + 6 + w * 28, STRIP_GROUND - 216, 20, 8, 'rgba(207,228,255,.4)');
  signBlock(ctx, bx + 40, STRIP_GROUND - 396, 60, 28, stage.accent, stage.neon);
  bigText(ctx, bx + 46, STRIP_GROUND - 390, 'WSTBRK', 13, stage.accent);
}

function pacificaMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  let x = 0;
  let i = 0;
  while (x < width) {
    const bw = 90 + rnd(i, 1) * 70;
    const top = STRIP_GROUND - 180 - rnd(i, 2) * 100;
    px(ctx, x, top, bw, STRIP_GROUND - top, stage.middle);
    px(ctx, x + 8, top + 14, bw - 16, STRIP_GROUND - top - 40, rgba(stage.neon, 0.04));
    for (let wy = top + 24; wy < STRIP_GROUND - 40; wy += 26) {
      for (let wx = x + 12; wx < x + bw - 12; wx += 24) {
        px(ctx, wx, wy, 10, 12, rnd(wx + wy, i) > 0.7 ? 'rgba(157,255,77,.2)' : 'rgba(8,14,8,.6)');
      }
    }
    // Rust stains and patched plating.
    px(ctx, x + 10, top + 6, 6, 60, mix(stage.middle, '#000000', 0.3));
    px(ctx, x + bw - 18, top + 40, 8, 90, mix(stage.middle, '#000000', 0.22));
    if (i % 2 === 0) {
      px(ctx, x + 14, top + 40, 30, 22, mix(stage.middle, stage.neon, 0.2));
      bigText(ctx, x + 18, top + 44, 'V', 16, stage.neon);
    }
    x += bw + 18;
    i++;
  }
  // The Voodoo Boys' wall: big stencil, mask, and V.
  const vx = 560;
  px(ctx, vx, STRIP_GROUND - 220, 300, 188, mix(stage.middle, '#000000', 0.25));
  bigText(ctx, vx + 26, STRIP_GROUND - 200, 'VOODOO', 26, rgba(stage.neon, 0.75));
  bigText(ctx, vx + 26, STRIP_GROUND - 168, 'BOYS', 26, rgba(stage.neon, 0.45));
  // Theatrical mask.
  px(ctx, vx + 200, STRIP_GROUND - 190, 60, 78, '#d8dede');
  px(ctx, vx + 200, STRIP_GROUND - 190, 60, 12, '#b9c2c2');
  px(ctx, vx + 212, STRIP_GROUND - 166, 14, 20, '#0c140c');
  px(ctx, vx + 234, STRIP_GROUND - 166, 14, 20, '#0c140c');
  px(ctx, vx + 215, STRIP_GROUND - 163, 6, 8, rgba('#9dff4d', 0.9));
  px(ctx, vx + 237, STRIP_GROUND - 163, 6, 8, rgba('#9dff4d', 0.9));
  px(ctx, vx + 224, STRIP_GROUND - 138, 12, 10, '#0c140c');
  for (let t = 0; t < 5; t++) px(ctx, vx + 206 + t * 10, STRIP_GROUND - 128, 4, 6, '#0c140c');
  // Big V stencil.
  px(ctx, vx + 60, STRIP_GROUND - 120, 12, 60, rgba(stage.neon, 0.6));
  px(ctx, vx + 96, STRIP_GROUND - 120, 12, 60, rgba(stage.neon, 0.6));
  for (let s = 0; s < 8; s++) {
    px(ctx, vx + 72 + s * 3.5, STRIP_GROUND - 60 + s * 7, 8, 7, rgba(stage.neon, 0.6));
  }
  // Hanging curse dolls.
  for (let d = 0; d < 5; d++) {
    const dx = vx + 20 + d * 30;
    px(ctx, dx, STRIP_GROUND - 40, 1, 8, 'rgba(216,222,222,.7)');
    px(ctx, dx - 4, STRIP_GROUND - 32, 9, 12, '#d8dede');
    px(ctx, dx - 2, STRIP_GROUND - 36, 5, 5, '#d8dede');
    px(ctx, dx - 2, STRIP_GROUND - 30, 3, 3, 'rgba(157,255,77,.8)');
  }
}

function plazaMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  let x = 0;
  let i = 0;
  while (x < width) {
    const bw = 110 + rnd(i, 1) * 70;
    const top = STRIP_GROUND - 260 - rnd(i, 2) * 120;
    px(ctx, x, top, bw, STRIP_GROUND - top, stage.middle);
    px(ctx, x + 6, top + 8, bw - 12, STRIP_GROUND - top - 16, rgba('#ffffff', 0.05));
    for (let m = 0; m < 5; m++) px(ctx, x + 16 + m * 22, top + 14, 2, STRIP_GROUND - top - 28, rgba(stage.accent, 0.14));
    px(ctx, x, top, bw, 5, stage.accent);
    px(ctx, x + 6, top + 8, bw - 12, 2, rgba(stage.neon, 0.35));
    if (i % 2 === 0) {
      signBlock(ctx, x + 20, top + 40, 46, 28, stage.accent, stage.neon);
      bigText(ctx, x + 26, top + 47, i % 4 === 0 ? 'LUXE' : 'SUITE', 12, stage.accent);
    }
    x += bw + 26;
    i++;
  }
  // The plaza centerpiece: fountains, hedges, a gilded statue.
  const fx = 700;
  px(ctx, fx, STRIP_GROUND - 40, 90, 40, '#3a4252');
  px(ctx, fx + 4, STRIP_GROUND - 38, 82, 10, 'rgba(159,216,255,.35)');
  px(ctx, fx + 38, STRIP_GROUND - 84, 8, 46, '#4a5262');
  px(ctx, fx + 24, STRIP_GROUND - 96, 36, 14, '#4a5262');
  px(ctx, fx + 28, STRIP_GROUND - 94, 28, 4, 'rgba(159,216,255,.5)');
  px(ctx, fx - 10, STRIP_GROUND - 20, 110, 6, 'rgba(255,217,120,.18)');
  // Hedges and gold statue.
  for (let h = 0; h < 3; h++) {
    const hx = fx + 160 + h * 150;
    px(ctx, hx, STRIP_GROUND - 46, 60, 46, '#2c4636');
    px(ctx, hx + 6, STRIP_GROUND - 54, 48, 10, '#35573f');
    px(ctx, hx, STRIP_GROUND - 4, 60, 4, 'rgba(0,0,0,.35)');
  }
  const sx = fx + 420;
  px(ctx, sx, STRIP_GROUND - 60, 60, 60, stage.trim);
  px(ctx, sx, STRIP_GROUND - 66, 60, 8, stage.accent);
  px(ctx, sx + 20, STRIP_GROUND - 130, 20, 66, '#d9b256');
  px(ctx, sx + 14, STRIP_GROUND - 142, 32, 14, '#d9b256');
  px(ctx, sx + 22, STRIP_GROUND - 152, 16, 10, '#e8c76e');
  px(ctx, sx + 40, STRIP_GROUND - 122, 16, 6, '#d9b256');
  // Red carpet run.
  px(ctx, 0, STRIP_GROUND - 26, width, 26, rgba('#8f2735', 0.55));
  px(ctx, 0, STRIP_GROUND - 26, width, 3, rgba('#ffd978', 0.35));
  signBlock(ctx, fx + 100, STRIP_GROUND - 300, 120, 34, stage.accent, stage.neon);
  bigText(ctx, fx + 112, STRIP_GROUND - 292, 'CORPO PLAZA', 14, stage.accent);
}

function arasakaMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  // Black paneled walls with red light channels.
  for (let x = 0; x < width; x += 120) {
    px(ctx, x, 30, 112, STRIP_GROUND - 30, stage.middle);
    px(ctx, x, 30, 3, STRIP_GROUND - 30, stage.trim);
    px(ctx, x + 56, 40, 2, STRIP_GROUND - 44, rgba('#ff1f3d', 0.3));
    px(ctx, x + 4, STRIP_GROUND - 60, 104, 3, rgba('#ff1f3d', 0.25));
  }
  let x = 60;
  let i = 0;
  while (x < width) {
    // Black security booths.
    px(ctx, x, STRIP_GROUND - 130, 70, 98, mix(stage.middle, '#000000', 0.3));
    px(ctx, x + 8, STRIP_GROUND - 118, 54, 44, 'rgba(255,31,61,.16)');
    px(ctx, x + 8, STRIP_GROUND - 118, 54, 4, 'rgba(255,31,61,.5)');
    px(ctx, x + 30, STRIP_GROUND - 70, 10, 30, 'rgba(255,122,122,.3)');
    x += 300;
    i++;
    // The rising sun crest.
    const cx = x + 90;
    const cy = STRIP_GROUND - 250;
    ctx.fillStyle = rgba('#ff1f3d', 0.85);
    ctx.beginPath();
    ctx.arc(cx, cy, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba('#ff7a7a', 0.5);
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, cx - 44, cy - 2, 88, 5, mix(stage.middle, '#000000', 0.4));
    bigText(ctx, cx - 34, cy + 62, 'ARASAKA', 15, rgba('#ff5a5a', 0.6));
    // Kanji-style strokes (honour).
    const kx = x + 190;
    for (let s = 0; s < 4; s++) px(ctx, kx, STRIP_GROUND - 290 + s * 22, 26, 4, rgba('#ffe9e9', 0.4));
    px(ctx, kx + 3, STRIP_GROUND - 288, 4, 80, rgba('#ffe9e9', 0.4));
    px(ctx, kx + 19, STRIP_GROUND - 288, 4, 80, rgba('#ffe9e9', 0.4));
    x += 320;
    i++;
  }
}

function badlandsMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  // Distant solar farm rows.
  for (let row = 0; row < 3; row++) {
    const y = STRIP_GROUND - 120 - row * 44;
    const scale = 0.55 + row * 0.25;
    for (let a = -1; a < width / (90 * scale) + 1; a++) {
      const ax = a * 90 * scale + row * 22;
      px(ctx, ax, y, 64 * scale, 5, mix(stage.middle, '#000000', 0.2));
      for (let p = 0; p < 4; p++) {
        px(ctx, ax + 2 + p * 15 * scale, y - 20 * scale, 12 * scale, 18 * scale, mix('#1d3a5c', stage.middle, 0.35));
        px(ctx, ax + 2 + p * 15 * scale, y - 20 * scale, 12 * scale, 3, rgba('#9fd8ff', 0.4));
        px(ctx, ax + 5 + p * 15 * scale, y - 2, 3, 4, '#3a3f4a');
      }
    }
  }
  // Wind turbines.
  for (let t = 0; t < 4; t++) {
    const tx = 260 + t * 460;
    px(ctx, tx, STRIP_GROUND - 260, 7, 230, '#b8bcc4');
    px(ctx, tx - 2, STRIP_GROUND - 260, 11, 8, '#d8dce2');
    px(ctx, tx + 2, STRIP_GROUND - 300, 3, 40, '#b8bcc4');
    px(ctx, tx - 8, STRIP_GROUND - 302, 23, 4, 'rgba(255,209,102,.4)');
  }
  // Wrecked convoy.
  const wx = 1240;
  px(ctx, wx, STRIP_GROUND - 46, 120, 34, '#5c4632');
  px(ctx, wx + 8, STRIP_GROUND - 64, 60, 20, '#4a3828');
  px(ctx, wx + 14, STRIP_GROUND - 60, 44, 10, 'rgba(255,209,102,.3)');
  px(ctx, wx + 10, STRIP_GROUND - 12, 18, 18, '#2a2a30');
  px(ctx, wx + 86, STRIP_GROUND - 12, 18, 18, '#2a2a30');
  px(ctx, wx + 19, STRIP_GROUND - 5, 5, 5, '#5c5c64');
  px(ctx, wx + 95, STRIP_GROUND - 5, 5, 5, '#5c5c64');
  px(ctx, wx + 40, STRIP_GROUND - 78, 4, 14, '#3a3226');
}

function dogtownMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  let x = 0;
  let i = 0;
  while (x < width) {
    const bw = 100 + rnd(i, 1) * 80;
    const top = STRIP_GROUND - 220 - rnd(i, 2) * 90;
    px(ctx, x, top, bw, STRIP_GROUND - top, stage.middle);
    // Camo patches.
    for (let c = 0; c < 6; c++) {
      px(ctx, x + rnd(c + i, 3) * (bw - 24), top + 20 + rnd(c + i, 4) * (STRIP_GROUND - top - 80), 26, 14, c % 2 ? 'rgba(90,99,83,.5)' : 'rgba(30,36,30,.5)');
    }
    px(ctx, x, top, bw, 4, stage.trim);
    x += bw + 22;
    i++;
  }
  // Watchtowers.
  for (let t = 0; t < 4; t++) {
    const tx = 220 + t * 520;
    px(ctx, tx, STRIP_GROUND - 210, 12, 178, '#3c4238');
    px(ctx, tx + 40, STRIP_GROUND - 210, 12, 178, '#3c4238');
    for (let l = 0; l < 7; l++) px(ctx, tx + l * 7, STRIP_GROUND - 190 + l * 26, 5, 3, '#4a5244');
    px(ctx, tx - 8, STRIP_GROUND - 246, 74, 38, '#4a5244');
    px(ctx, tx - 8, STRIP_GROUND - 252, 74, 8, '#3c4238');
    px(ctx, tx + 8, STRIP_GROUND - 240, 42, 20, 'rgba(255,176,77,.28)');
    px(ctx, tx + 56, STRIP_GROUND - 262, 6, 12, '#5a6353');
    px(ctx, tx + 52, STRIP_GROUND - 268, 14, 6, 'rgba(255,214,140,.7)');
  }
  // Sandbag wall line.
  for (let s = 0; s < width / 40; s++) {
    const sx = s * 40;
    px(ctx, sx, STRIP_GROUND - 66, 36, 34, '#4a4f40');
    px(ctx, sx + 14, STRIP_GROUND - 74, 30, 10, '#565c4a');
    px(ctx, sx + 4, STRIP_GROUND - 74 + (s % 2) * 3, 28, 9, '#565c4a');
    px(ctx, sx + 18, STRIP_GROUND - 82, 26, 8, '#4a4f40');
  }
  // Barbed wire posts on top.
  for (let p = 0; p < width / 130; p++) {
    const pxp = p * 130 + 20;
    px(ctx, pxp, STRIP_GROUND - 100, 4, 26, '#2c3028');
    px(ctx, pxp - 10, STRIP_GROUND - 100, 24, 3, '#2c3028');
    px(ctx, pxp + 4, STRIP_GROUND - 104, 6, 6, '#6b7264');
  }
  bigText(ctx, width * 0.3, STRIP_GROUND - 160, 'DOGTOWN', 30, rgba(stage.accent, 0.35));
}

function embersMid(ctx: CanvasRenderingContext2D, width: number, stage: Stage) {
  // Back bar wall with backlit bottles.
  px(ctx, 0, 60, width, 300, mix(stage.middle, '#000000', 0.2));
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = 130 + shelf * 74;
    px(ctx, 0, sy + 34, width, 6, mix(stage.trim, '#000000', 0.2));
    px(ctx, 0, sy + 30, width, 3, rgba('#ffd978', 0.25));
    for (let b = 0; b < width / 26; b++) {
      const bx = 10 + b * 26 + (b % 3) * 4;
      const tall = 20 + rnd(b, shelf) * 12;
      const colors = ['#ffd978', '#7fe0d8', '#ff9a4d', '#d978ff', '#9fd8ff'];
      const bc = colors[(b + shelf) % colors.length];
      px(ctx, bx, sy + 34 - tall, 10, tall, rgba(bc, 0.55));
      px(ctx, bx + 3, sy + 34 - tall - 5, 4, 6, rgba(bc, 0.4));
      px(ctx, bx + 2, sy + 40 - tall, 2, 8, rgba('#ffffff', 0.5));
    }
  }
  // Big EMBERS neon sign.
  signBlock(ctx, width * 0.4, 92, 150, 44, stage.neon, stage.neon);
  bigText(ctx, width * 0.4 + 18, 102, 'EMBERS', 24, stage.neon);
  signBlock(ctx, width * 0.4 + 40, 140, 70, 22, stage.accent, stage.neon);
  bigText(ctx, width * 0.4 + 52, 144, 'HANAKO', 12, stage.accent);
  // Chandeliers.
  for (let c = 0; c < width / 240; c++) {
    const cx = 120 + c * 240;
    px(ctx, cx, 40, 3, 34, '#6e5a2e');
    px(ctx, cx - 26, 74, 55, 8, '#6e5a2e');
    for (let s = 0; s < 5; s++) {
      px(ctx, cx - 22 + s * 11, 66, 5, 6, '#ffe9b8');
      px(ctx, cx - 22 + s * 11, 82, 5, 8, rgba('#ffd978', 0.8));
    }
  }
  // City windows behind the bar.
  for (let wy = 380; wy < STRIP_GROUND - 40; wy += 18) {
    for (let wx = 12; wx < width; wx += 20) {
      if (rnd(wx + wy, 8) > 0.55) px(ctx, wx, wy, 5, 7, 'rgba(255,180,105,.25)');
    }
  }
}

/* ------------------------------- NEAR LAYER ------------------------------ */

function officeNear(ctx: CanvasRenderingContext2D, width: number, stage: Stage, worldLength: number) {
  for (let x = 30; x < width - 200; x += 170) {
    const i = Math.floor(x / 170);
    px(ctx, x, STRIP_GROUND - 62, 60, 40, '#232d3e');
    px(ctx, x + 4, STRIP_GROUND - 58, 52, 12, 'rgba(159,216,255,.25)');
    px(ctx, x + 4, STRIP_GROUND - 44, 52, 3, stage.trim);
    px(ctx, x + 46, STRIP_GROUND - 72, 16, 12, '#1a2230');
    px(ctx, x + 48, STRIP_GROUND - 70, 12, 8, 'rgba(89,230,239,.4)');
    if (i % 3 === 1) {
      px(ctx, x + 96, STRIP_GROUND - 78, 38, 56, '#141c2b');
      px(ctx, x + 96, STRIP_GROUND - 82, 38, 5, stage.neon);
      px(ctx, x + 100, STRIP_GROUND - 72, 22, 40, 'rgba(89,230,239,.3)');
      px(ctx, x + 124, STRIP_GROUND - 66, 7, 22, '#0d1420');
    }
    if (i % 3 === 2) {
      px(ctx, x + 100, STRIP_GROUND - 40, 14, 18, '#8f2735');
      px(ctx, x + 103, STRIP_GROUND - 46, 8, 7, '#c9ccd6');
      px(ctx, x + 105, STRIP_GROUND - 52, 4, 6, '#8f2735');
    }
    px(ctx, x + 6, STRIP_GROUND - 4, 50, 3, 'rgba(0,0,0,.4)');
  }
  bossGate(ctx, worldLength, stage, 'lift');
}

function streetNear(ctx: CanvasRenderingContext2D, width: number, stage: Stage, worldLength: number, variant: number) {
  for (let x = 20; x < width - 220; x += 165) {
    const i = Math.floor(x / 165);
    if (variant === 1) {
      // Jig Jig: stalls, pink lanterns, tubes.
      px(ctx, x + 8, STRIP_GROUND - 76, 5, 76, '#2a1424');
      px(ctx, x + 86, STRIP_GROUND - 76, 5, 76, '#2a1424');
      px(ctx, x, STRIP_GROUND - 90, 100, 8, i % 2 ? stage.neon : '#ff8ac2');
      for (let s = 0; s < 6; s++) px(ctx, x + s * 16, STRIP_GROUND - 90, 8, 8, s % 2 ? '#1d0d1c' : i % 2 ? stage.neon : '#ff8ac2');
      px(ctx, x + 10, STRIP_GROUND - 54, 78, 30, '#190d1c');
      px(ctx, x + 14, STRIP_GROUND - 50, 70, 3, rgba(stage.accent, 0.4));
      px(ctx, x + 60, STRIP_GROUND - 108, 10, 12, '#ff8ac2');
      px(ctx, x + 62, STRIP_GROUND - 106, 6, 8, 'rgba(255,220,240,.8)');
    } else if (variant === 2) {
      // Japan Town: lantern poles and a small shrine.
      px(ctx, x, STRIP_GROUND - 104, 4, 104, '#3a1f26');
      px(ctx, x - 12, STRIP_GROUND - 108, 28, 5, '#3a1f26');
      px(ctx, x - 12, STRIP_GROUND - 120, 11, 13, '#ff4d6d');
      px(ctx, x - 10, STRIP_GROUND - 118, 7, 9, 'rgba(255,220,150,.85)');
      px(ctx, x + 5, STRIP_GROUND - 116, 9, 9, 'rgba(255,209,102,.8)');
      if (i % 2 === 0) {
        px(ctx, x + 60, STRIP_GROUND - 46, 40, 46, '#c22f35');
        px(ctx, x + 56, STRIP_GROUND - 52, 48, 6, '#801f24');
        px(ctx, x + 52, STRIP_GROUND - 58, 56, 6, '#c22f35');
        px(ctx, x + 66, STRIP_GROUND - 36, 14, 20, 'rgba(255,209,102,.5)');
        px(ctx, x + 70, STRIP_GROUND - 56, 6, 8, '#ffd166');
      }
    } else if (variant === 4) {
      // Pacifica: barrels, junk, chain fence, and a leaning coconut palm.
      px(ctx, x, STRIP_GROUND - 34, 26, 34, '#2c4a20');
      px(ctx, x, STRIP_GROUND - 34, 26, 5, '#3a5f2c');
      px(ctx, x + 4, STRIP_GROUND - 24, 18, 12, rgba('#9dff4d', 0.35));
      for (let b = 0; b < 4; b++) {
        const bx = x + 44 + b * 11;
        px(ctx, bx, STRIP_GROUND - 10 - (b % 2) * 6, 12, 10 + (b % 2) * 6, b % 2 ? '#232a30' : '#2c333a');
      }
      px(ctx, x + 120, STRIP_GROUND - 66, 4, 66, '#20462c');
      px(ctx, x + 120, STRIP_GROUND - 70, 42, 3, '#2a5c34');
      for (let d = 0; d < 3; d++) px(ctx, x + 126 + d * 14, STRIP_GROUND - 66, 1, 64, rgba('#9dff4d', 0.12));
      palm(ctx, x + 100, STRIP_GROUND, i % 2 ? -1 : 1);
    } else if (variant === 7) {
      // Dogtown: sandbags, crates, cones.
      for (let s = 0; s < 4; s++) {
        px(ctx, x + s * 12, STRIP_GROUND - 18, 22, 18, '#4a4f40');
        px(ctx, x + 6 + s * 12, STRIP_GROUND - 32, 22, 14, '#565c4a');
      }
      px(ctx, x + 90, STRIP_GROUND - 30, 30, 30, '#3c4238');
      px(ctx, x + 90, STRIP_GROUND - 30, 30, 4, '#5a6353');
      px(ctx, x + 96, STRIP_GROUND - 24, 18, 12, rgba('#ffb04d', 0.3));
      px(ctx, x + 140, STRIP_GROUND - 30, 10, 30, '#c2452a');
      px(ctx, x + 136, STRIP_GROUND - 34, 18, 6, '#e8d9c2');
    }
    px(ctx, x, STRIP_GROUND - 4, 130, 3, 'rgba(0,0,0,.35)');
  }
  bossGate(ctx, worldLength, stage, variant === 8 ? 'military' : 'street');
}

function westbrookNear(ctx: CanvasRenderingContext2D, width: number, stage: Stage, worldLength: number) {
  for (let x = 26; x < width - 220; x += 180) {
    const i = Math.floor(x / 180);
    px(ctx, x, STRIP_GROUND - 40, 54, 40, '#2a3a4e');
    px(ctx, x + 4, STRIP_GROUND - 36, 46, 20, 'rgba(159,216,255,.2)');
    px(ctx, x + 8, STRIP_GROUND - 52, 6, 12, '#3d5268');
    px(ctx, x + 40, STRIP_GROUND - 52, 6, 12, '#3d5268');
    px(ctx, x + 80, STRIP_GROUND - 30, 60, 2, 'rgba(207,228,255,.3)');
    for (let g = 0; g < 5; g++) px(ctx, x + 82 + g * 12, STRIP_GROUND - 30, 2, 28, 'rgba(99,199,255,.4)');
    if (i % 2 === 0) {
      px(ctx, x + 130, STRIP_GROUND - 34, 52, 34, '#33404f');
      for (let f = 0; f < 6; f++) px(ctx, x + 134 + f * 7, STRIP_GROUND - 58 - (f % 3) * 8, 5, 26 + (f % 3) * 8, '#2c5a46');
    }
  }
  bossGate(ctx, worldLength, stage, 'street');
}

function badlandsNear(ctx: CanvasRenderingContext2D, width: number, stage: Stage, worldLength: number) {
  for (let x = 30; x < width - 240; x += 175) {
    const i = Math.floor(x / 175);
    if (i % 3 === 0) {
      px(ctx, x, STRIP_GROUND - 46, 10, 46, '#3f6b34');
      px(ctx, x + 10, STRIP_GROUND - 34, 12, 34, '#3f6b34');
      px(ctx, x - 12, STRIP_GROUND - 52, 12, 52, '#3a6130');
      px(ctx, x + 2, STRIP_GROUND - 44, 3, 40, rgba('#8fbf6e', 0.4));
      px(ctx, x - 8, STRIP_GROUND - 50, 3, 48, rgba('#8fbf6e', 0.3));
    } else if (i % 3 === 1) {
      px(ctx, x, STRIP_GROUND - 34, 28, 34, '#6b4326');
      px(ctx, x, STRIP_GROUND - 34, 28, 5, '#8a5a32');
      px(ctx, x + 5, STRIP_GROUND - 22, 18, 12, rgba('#ffd166', 0.4));
      px(ctx, x + 44, STRIP_GROUND - 30, 40, 30, '#4a3a2a');
      px(ctx, x + 50, STRIP_GROUND - 44, 22, 16, '#3a2e22');
    } else {
      px(ctx, x, STRIP_GROUND - 52, 4, 52, '#6b5a40');
      px(ctx, x + 90, STRIP_GROUND - 52, 4, 52, '#6b5a40');
      px(ctx, x - 6, STRIP_GROUND - 50, 104, 3, 'rgba(216,220,226,.5)');
      px(ctx, x - 6, STRIP_GROUND - 34, 104, 3, 'rgba(216,220,226,.35)');
      px(ctx, x + 6, STRIP_GROUND - 52, 8, 8, '#8a7a58');
      px(ctx, x + 78, STRIP_GROUND - 52, 8, 8, '#8a7a58');
    }
  }
  bossGate(ctx, worldLength, stage, 'waste');
}

function plazaNear(ctx: CanvasRenderingContext2D, width: number, stage: Stage, worldLength: number) {
  for (let x = 30; x < width - 220; x += 190) {
    const i = Math.floor(x / 190);
    px(ctx, x, STRIP_GROUND - 32, 52, 32, '#3a4252');
    px(ctx, x + 3, STRIP_GROUND - 29, 46, 6, '#4d5566');
    px(ctx, x, STRIP_GROUND - 36, 52, 5, stage.accent);
    for (let f = 0; f < 6; f++) px(ctx, x + 6 + f * 7, STRIP_GROUND - 60 - (f % 3) * 8, 5, 26 + (f % 3) * 8, f % 2 ? '#2c5a46' : '#356b52');
    px(ctx, x + 90, STRIP_GROUND - 46, 12, 46, '#2b2530');
    px(ctx, x + 92, STRIP_GROUND - 44, 3, 42, stage.accent);
    px(ctx, x + 86, STRIP_GROUND - 52, 20, 7, '#3b3238');
    px(ctx, x + 130, STRIP_GROUND - 60, 7, 60, '#4a3c33');
    px(ctx, x + 127, STRIP_GROUND - 66, 13, 7, stage.accent);
    if (i % 2 === 0) {
      px(ctx, x + 150, STRIP_GROUND - 22, 74, 22, '#2f2a38');
      px(ctx, x + 153, STRIP_GROUND - 20, 68, 8, 'rgba(159,216,255,.3)');
      px(ctx, x + 180, STRIP_GROUND - 58, 5, 34, '#3d3644');
      px(ctx, x + 172, STRIP_GROUND - 64, 21, 7, stage.accent);
    }
  }
  bossGate(ctx, worldLength, stage, 'gold');
}

function arasakaNear(ctx: CanvasRenderingContext2D, width: number, stage: Stage, worldLength: number) {
  for (let x = 34; x < width - 220; x += 175) {
    const i = Math.floor(x / 175);
    px(ctx, x, STRIP_GROUND - 40, 54, 40, mix(stage.middle, '#000000', 0.35));
    px(ctx, x, STRIP_GROUND - 44, 54, 5, 'rgba(255,31,61,.5)');
    px(ctx, x + 20, STRIP_GROUND - 60, 14, 16, mix(stage.middle, '#000000', 0.25));
    px(ctx, x + 24, STRIP_GROUND - 56, 6, 5, 'rgba(255,122,122,.8)');
    if (i % 2 === 0) {
      px(ctx, x + 90, STRIP_GROUND - 70, 8, 70, '#1a0d12');
      px(ctx, x + 78, STRIP_GROUND - 74, 32, 6, 'rgba(255,31,61,.4)');
      px(ctx, x + 82, STRIP_GROUND - 40, 24, 3, 'rgba(255,31,61,.3)');
    }
    px(ctx, x + 140, STRIP_GROUND - 56, 4, 56, '#1a0d12');
    px(ctx, x + 128, STRIP_GROUND - 60, 28, 5, 'rgba(255,31,61,.45)');
  }
  bossGate(ctx, worldLength, stage, 'arasaka');
}

function embersNear(ctx: CanvasRenderingContext2D, width: number, stage: Stage, worldLength: number) {
  for (let x = 30; x < width - 240; x += 200) {
    const i = Math.floor(x / 200);
    // Bar counter segment.
    px(ctx, x, STRIP_GROUND - 58, 90, 58, '#3a2415');
    px(ctx, x, STRIP_GROUND - 62, 90, 6, '#5c3a1e');
    px(ctx, x + 4, STRIP_GROUND - 58, 82, 3, rgba('#ffd978', 0.4));
    px(ctx, x + 10, STRIP_GROUND - 50, 30, 20, 'rgba(255,180,105,.25)');
    px(ctx, x + 52, STRIP_GROUND - 50, 30, 20, 'rgba(127,224,216,.22)');
    // Stools.
    for (let s = 0; s < 2; s++) {
      const sx = x + 106 + s * 34;
      px(ctx, sx, STRIP_GROUND - 34, 22, 6, '#6e3a1e');
      px(ctx, sx + 8, STRIP_GROUND - 28, 6, 28, '#2c1c10');
      px(ctx, sx + 4, STRIP_GROUND - 4, 14, 4, '#2c1c10');
    }
    if (i % 2 === 0) {
      px(ctx, x + 150, STRIP_GROUND - 44, 40, 44, '#2e1a0e');
      for (let f = 0; f < 5; f++) px(ctx, x + 154 + f * 7, STRIP_GROUND - 70 - (f % 3) * 8, 5, 28 + (f % 3) * 8, f % 2 ? '#3a6b4f' : '#467a5a');
      signBlock(ctx, x + 152, STRIP_GROUND - 108, 36, 20, '#7fe0d8', '#7fe0d8');
      bigText(ctx, x + 157, STRIP_GROUND - 104, 'OPEN', 11, '#7fe0d8');
    }
  }
  bossGate(ctx, worldLength, stage, 'vip');
}

function palm(ctx: CanvasRenderingContext2D, x: number, gy: number, lean: number) {
  for (let k = 0; k < 5; k++) px(ctx, x + k * 2 * lean, gy - 10 - k * 15, 9, 15, k % 2 ? '#5a4630' : '#4c3a26');
  const tx = x + 10 * lean;
  const ty = gy - 84;
  for (let f = 0; f < 6; f++) {
    const fx = tx - 26 + f * 9;
    px(ctx, fx, ty - 4 + Math.abs(f - 2.5) * 4, 12, 4, f % 2 ? '#3a6b34' : '#2f5a2c');
    px(ctx, fx + 2, ty + 3 + Math.abs(f - 2.5) * 5, 8, 3, f % 2 ? '#2f5a2c' : '#3a6b34');
  }
  px(ctx, tx - 5, ty + 4, 11, 6, '#2f5a2c');
  for (let c = 0; c < 3; c++) px(ctx, tx - 5 + c * 5, ty + 9, 4, 4, '#3c2a1c');
  px(ctx, x - 6, gy - 3, 22, 3, 'rgba(0,0,0,.35)');
}

function bossGate(ctx: CanvasRenderingContext2D, worldLength: number, stage: Stage, kind: 'lift' | 'street' | 'gold' | 'arasaka' | 'waste' | 'military' | 'vip') {
  const x = (worldLength - 100) * 0.9;
  const gy = STRIP_GROUND;
  if (kind === 'lift') {
    px(ctx, x - 16, gy - 108, 60, 108, '#141b28');
    px(ctx, x - 10, gy - 100, 22, 96, mix('#59e6ef', '#141b28', 0.6));
    px(ctx, x + 14, gy - 100, 22, 96, mix('#59e6ef', '#141b28', 0.6));
    px(ctx, x - 16, gy - 114, 60, 8, stage.neon);
    px(ctx, x - 10, gy - 40, 48, 4, 'rgba(255,255,255,.3)');
    bigText(ctx, x - 6, gy - 134, 'H10', 14, stage.neon);
  } else if (kind === 'arasaka') {
    px(ctx, x - 18, gy - 112, 64, 112, '#1a0d12');
    px(ctx, x - 10, gy - 100, 22, 96, 'rgba(255,31,61,.3)');
    px(ctx, x + 14, gy - 100, 22, 96, 'rgba(255,31,61,.3)');
    px(ctx, x - 18, gy - 118, 64, 8, '#ff1f3d');
    px(ctx, x - 14, gy - 118, 56, 2, 'rgba(255,122,122,.6)');
    bigText(ctx, x - 22, gy - 142, '9F', 14, '#ff5a5a');
  } else if (kind === 'gold') {
    px(ctx, x - 18, gy - 106, 64, 106, '#2b3245');
    px(ctx, x - 10, gy - 96, 22, 90, 'rgba(255,217,120,.35)');
    px(ctx, x + 14, gy - 96, 22, 90, 'rgba(255,217,120,.35)');
    px(ctx, x - 18, gy - 112, 64, 8, '#ffd978');
    bigText(ctx, x - 30, gy - 136, 'SUITE 9', 12, '#ffd978');
  } else if (kind === 'waste') {
    px(ctx, x - 16, gy - 70, 60, 70, '#4a3a28');
    px(ctx, x - 8, gy - 60, 44, 58, '#2a1f14');
    px(ctx, x - 16, gy - 76, 60, 8, '#6b5a40');
    for (let h = 0; h < 4; h++) px(ctx, x - 12 + h * 16, gy - 72, 10, 4, 'rgba(255,209,102,.5)');
  } else if (kind === 'military') {
    px(ctx, x - 20, gy - 96, 68, 96, '#3c4238');
    px(ctx, x - 12, gy - 86, 52, 82, '#23271f');
    px(ctx, x - 20, gy - 102, 68, 8, '#5a6353');
    for (let s = 0; s < 6; s++) px(ctx, x - 16 + s * 12, gy - 100, 8, 4, s % 2 ? 'rgba(255,176,77,.6)' : 'rgba(30,34,28,.8)');
    bigText(ctx, x - 26, gy - 128, 'BUNKER 9', 12, 'rgba(217,227,200,.7)');
  } else if (kind === 'vip') {
    px(ctx, x - 14, gy - 104, 52, 104, '#2e1a0e');
    px(ctx, x - 8, gy - 96, 40, 92, 'rgba(255,154,77,.28)');
    px(ctx, x - 14, gy - 110, 52, 8, '#ff9a4d');
    px(ctx, x - 10, gy - 50, 44, 4, 'rgba(255,217,120,.5)');
    bigText(ctx, x - 16, gy - 134, 'VIP', 14, '#ff9a4d');
  } else {
    px(ctx, x - 14, gy - 100, 56, 100, mix(stage.middle, '#000000', 0.3));
    px(ctx, x - 8, gy - 90, 20, 88, rgba(stage.neon, 0.3));
    px(ctx, x + 12, gy - 90, 20, 88, rgba(stage.neon, 0.3));
    px(ctx, x - 14, gy - 106, 56, 8, stage.neon);
  }
}

/* -------------------------------- BUILDING ------------------------------- */

export function buildScenery(level: number, worldLength: number, stage: Stage): Scenery {
  const farW = worldLength * 0.24 + 384 + 120;
  const midW = worldLength * 0.56 + 384 + 120;
  const nearW = worldLength * 0.9 + 384 + 120;

  const far = makeLayer(farW);
  if (level === 7) mesaFar(far.ctx, farW, stage);
  else if (level === 0) interiorFar(far.ctx, farW, stage, 'office');
  else if (level === 6) interiorFar(far.ctx, farW, stage, 'arasaka');
  else if (level === 9) interiorFar(far.ctx, farW, stage, 'bar');
  else skylineFar(far.ctx, farW, stage, level);

  const mid = makeLayer(midW);
  switch (level) {
    case 0: officeMid(mid.ctx, midW, stage); break;
    case 1: jiggigMid(mid.ctx, midW, stage); break;
    case 2: japaMid(mid.ctx, midW, stage); break;
    case 3: westbrookMid(mid.ctx, midW, stage); break;
    case 4: pacificaMid(mid.ctx, midW, stage); break;
    case 5: plazaMid(mid.ctx, midW, stage); break;
    case 6: arasakaMid(mid.ctx, midW, stage); break;
    case 7: badlandsMid(mid.ctx, midW, stage); break;
    case 8: dogtownMid(mid.ctx, midW, stage); break;
    default: embersMid(mid.ctx, midW, stage); break;
  }

  const near = makeLayer(nearW);
  switch (level) {
    case 0: officeNear(near.ctx, nearW, stage, worldLength); break;
    case 1: streetNear(near.ctx, nearW, stage, worldLength, 1); break;
    case 2: streetNear(near.ctx, nearW, stage, worldLength, 2); break;
    case 3: westbrookNear(near.ctx, nearW, stage, worldLength); break;
    case 4: streetNear(near.ctx, nearW, stage, worldLength, 4); break;
    case 5: plazaNear(near.ctx, nearW, stage, worldLength); break;
    case 6: arasakaNear(near.ctx, nearW, stage, worldLength); break;
    case 7: badlandsNear(near.ctx, nearW, stage, worldLength); break;
    case 8: streetNear(near.ctx, nearW, stage, worldLength, 7); break;
    case 9: embersNear(near.ctx, nearW, stage, worldLength); break;
  }

  return { far: far.canvas, mid: mid.canvas, near: near.canvas, farW, midW, nearW };
}

/* ------------------------------- RENDERING ------------------------------- */

export interface SceneParams {
  ctx: CanvasRenderingContext2D;
  scenery: Scenery;
  stage: Stage;
  level: number;
  camera: number;
  ground: number;
  height: number;
  viewW: number;
  time: number;
}

function slice(dest: CanvasRenderingContext2D, source: HTMLCanvasElement, parallax: number, params: SceneParams, yOffset = 0) {
  const sx = ((params.camera * parallax) % source.width + source.width) % source.width;
  const dy = params.ground - STRIP_GROUND + yOffset;
  const h = source.height;
  if (sx + params.viewW <= source.width) {
    dest.drawImage(source, Math.round(sx), 0, params.viewW, h, 0, Math.round(dy), params.viewW, h);
  } else {
    const first = source.width - sx;
    dest.drawImage(source, Math.round(sx), 0, first, h, 0, Math.round(dy), first, h);
    dest.drawImage(source, 0, 0, params.viewW - first, h, first, Math.round(dy), params.viewW - first, h);
  }
}

export function drawScene(params: SceneParams) {
  const { ctx, stage, level, ground, height, viewW, time, camera } = params;
  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, stage.top);
  sky.addColorStop(0.6, mix(stage.top, stage.bottom, 0.55));
  sky.addColorStop(1, stage.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, height);

  drawSkyBodies(params);
  slice(ctx, params.scenery.far, 0.24, params);
  drawFarAnimation(params);
  slice(ctx, params.scenery.mid, 0.56, params);
  drawMidAnimation(params);
  slice(ctx, params.scenery.near, 0.9, params);
  drawGroundLayer(ctx, stage, level, camera, ground, height, viewW, time);
}

function drawSkyBodies(params: SceneParams) {
  const { ctx, stage, level, ground } = params;
  if (level === 7) {
    // Hazy sun low over the Badlands.
    const ox = 300;
    const oy = Math.max(80, ground - 330);
    const glow = ctx.createRadialGradient(ox, oy, 10, ox, oy, 130);
    glow.addColorStop(0, 'rgba(255,196,110,.35)');
    glow.addColorStop(1, 'rgba(255,196,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(ox - 130, oy - 130, 260, 260);
    px(ctx, ox - 26, oy - 26, 52, 52, '#e8a25a');
    px(ctx, ox - 20, oy - 27, 40, 3, 'rgba(255,240,200,.5)');
    for (let i = 0; i < 4; i++) px(ctx, ox - 24, oy + 10 + i * 5, 48, 2, stage.bottom);
    return;
  }
  const orbX = 288;
  const orbY = Math.max(96, ground - 400);
  const glow = ctx.createRadialGradient(orbX, orbY, 6, orbX, orbY, 118);
  glow.addColorStop(0, rgba(stage.neon, 0.16));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(orbX - 118, orbY - 118, 236, 236);
  px(ctx, orbX - 22, orbY - 22, 44, 44, mix(stage.far, stage.neon, 0.4));
  px(ctx, orbX - 17, orbY - 23, 34, 3, mix(stage.far, stage.neon, 0.6));
  for (let i = 0; i < 4; i++) px(ctx, orbX - 20, orbY + 8 + i * 5, 40, 2, stage.bottom);
  if (level !== 4 && level !== 7) {
    const starCount = level === 5 || level === 6 ? 14 : 30;
    for (let i = 0; i < starCount; i++) {
      const sx = (rnd(i, level + 50) * 620) % 384;
      const sy = 36 + rnd(i, 63) * Math.max(40, ground - 320);
      px(ctx, sx, sy, i % 7 === 0 ? 2 : 1, 1, i % 3 === 0 ? 'rgba(178,246,255,.55)' : 'rgba(244,206,236,.38)');
    }
  }
}

function drawFarAnimation(params: SceneParams) {
  const { ctx, level, time, camera, ground } = params;
  if (level === 3) {
    // Blimp over Westbrook.
    const ax = ((time * 24 - camera * 0.2) % 800 + 800) % 800 - 220;
    px(ctx, ax, 110, 96, 22, '#33404f');
    px(ctx, ax + 10, 104, 72, 10, '#43505f');
    px(ctx, ax + 12, 106, 68, 3, 'rgba(99,199,255,.6)');
    px(ctx, ax + 100, 118, 14, 6, '#33404f');
    for (let l = 0; l < 5; l++) px(ctx, ax + 16 + l * 17, 130, 4, 3, Math.sin(time * 4 + l) > 0 ? '#63c7ff' : '#1d2c3a');
  }
  if (level === 7) {
    // Drifting dust banks.
    for (let d = 0; d < 4; d++) {
      const dx = ((d * 260 - time * 14 - camera * 0.1) % 900 + 900) % 900 - 150;
      ctx.globalAlpha = 0.08;
      px(ctx, dx, ground - 120 + d * 24, 190, 26, '#ffd9a0');
      ctx.globalAlpha = 1;
    }
  }
}

function drawMidAnimation(params: SceneParams) {
  const { ctx, level, time, camera, ground } = params;
  if (level === 0) {
    // Steam vents under the office floor.
    for (let s = 0; s < 3; s++) {
      const sxp = 240 + s * 520 - camera * 0.56;
      if (sxp < -40 || sxp > 420) continue;
      for (let p = 0; p < 6; p++) {
        const drift = ((time * 14 + p * 13 + s * 40) % 90) / 90;
        ctx.globalAlpha = 0.16 * (1 - drift);
        px(ctx, sxp + Math.sin(time + p) * 7, ground - 44 - drift * 60, 7, 7, '#cfd9e8');
      }
      ctx.globalAlpha = 1;
    }
  } else if (level === 2) {
    // Glowing lantern string across Japan Town.
    for (let l = 0; l < 26; l++) {
      const lx = l * 90 - (camera * 0.56 % 90);
      const ly = ground - 200 + Math.sin((l * 90 + camera * 0.56) * 0.01) * 10;
      px(ctx, lx, ly, 9, 10, l % 2 ? 'rgba(255,77,109,.85)' : 'rgba(255,209,102,.8)');
      px(ctx, lx + 2, ly + 2, 5, 6, 'rgba(255,240,200,.8)');
    }
  } else if (level === 4) {
    // Voodoo dolls swaying on the wall.
    for (let d = 0; d < 5; d++) {
      const dx = 580 + d * 30 - camera * 0.56;
      if (dx < -20 || dx > 400) continue;
      const sw = Math.sin(time * 2 + d) * 4;
      px(ctx, dx + sw, ground - 30, 9, 12, 'rgba(216,222,222,.75)');
      px(ctx, dx + sw + 2, ground - 34, 5, 5, 'rgba(216,222,222,.75)');
    }
    // The half-collapsed Pacifica ferris wheel, still slowly turning.
    const fx = 1450 - camera * 0.56;
    if (fx > -170 && fx < 550) {
      const cy = ground - 196;
      const r = 80;
      ctx.save();
      ctx.translate(fx, cy);
      ctx.strokeStyle = 'rgba(120,150,90,.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-54, ground - cy);
      ctx.moveTo(0, 0);
      ctx.lineTo(54, ground - cy);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(157,255,77,.45)';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      for (let s = 0; s < 8; s++) {
        const a2 = time * 0.4 + (s * Math.PI) / 4;
        const sx = Math.cos(a2) * r;
        const sy = Math.sin(a2) * r;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(157,255,77,.28)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.fillStyle = s % 3 === 0 ? 'rgba(255,138,109,.85)' : s % 3 === 1 ? 'rgba(157,255,77,.85)' : 'rgba(255,209,102,.85)';
        ctx.fillRect(Math.round(sx) - 6, Math.round(sy) - 4, 12, 11);
        ctx.fillStyle = 'rgba(10,16,10,.7)';
        ctx.fillRect(Math.round(sx) - 4, Math.round(sy) - 2, 8, 4);
      }
      px(ctx, -6, -6, 12, 12, '#3a4a2c');
      px(ctx, -2, -r - 8, 4, 4, Math.sin(time * 6) > 0 ? 'rgba(255,138,109,.9)' : 'rgba(255,138,109,.3)');
      ctx.restore();
    }
  } else if (level === 5) {
    // Fountain spray.
    for (let f = 0; f < 3; f++) {
      const fx = 740 + f * 40 - camera * 0.56;
      if (fx < -20 || fx > 400) continue;
      for (let p = 0; p < 8; p++) {
        const t2 = (time * 1.4 + p / 8) % 1;
        ctx.globalAlpha = 0.5 * (1 - t2);
        px(ctx, fx + Math.sin(p * 2.4 + time * 3) * 14 * t2, ground - 96 - t2 * 46, 3, 3, '#cfe4ff');
      }
      ctx.globalAlpha = 1;
    }
  } else if (level === 6) {
    // Pulsing red light channels.
    const pulse = 0.3 + Math.sin(time * 3) * 0.2;
    for (let x = -20; x < 420; x += 120) px(ctx, x + 56, ground - 300, 2, 180, rgba('#ff1f3d', pulse));
  } else if (level === 7) {
    // Spinning turbine blades at the farm.
    for (let t = 0; t < 4; t++) {
      const tx = 260 + t * 460 - camera * 0.56;
      if (tx < -40 || tx > 420) continue;
      const ty = ground - 260;
      const spin = time * 2.2;
      for (let b = 0; b < 3; b++) {
        const a = spin + b * 2.09;
        ctx.save();
        ctx.translate(tx + 3, ty);
        ctx.rotate(a);
        ctx.fillStyle = 'rgba(216,220,226,.75)';
        ctx.fillRect(0, -2, 34, 4);
        ctx.restore();
      }
    }
  } else if (level === 8) {
    // Sweeping floodlights from the watchtowers.
    for (let s = 0; s < 4; s++) {
      const bx = 280 + s * 520 - camera * 0.56;
      if (bx < -160 || bx > 560) continue;
      const angle = Math.sin(time * 0.5 + s) * 0.55;
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.translate(bx, ground - 262);
      ctx.rotate(angle + 0.4);
      ctx.fillStyle = '#ffe2a8';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-90, 320);
      ctx.lineTo(90, 320);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (level === 9) {
    // Candle flicker under the chandeliers.
    for (let c = 0; c < 6; c++) {
      const cx = 120 + c * 240 - camera * 0.56;
      if (cx < -60 || cx > 440) continue;
      const fl = Math.sin(time * 11 + c * 2) * 0.15;
      ctx.globalAlpha = 0.5 + fl;
      px(ctx, cx - 26, ground - 404, 55, 3, 'rgba(255,217,120,.5)');
      ctx.globalAlpha = 1;
    }
  }
}

function drawGroundLayer(
  ctx: CanvasRenderingContext2D, stage: Stage, level: number,
  camera: number, ground: number, height: number, viewW: number, time: number,
) {
  const sand = level === 7;
  const carpet = level === 9;
  const marble = level === 3 || level === 5;
  const walkColor = sand ? '#8a5a30' : carpet ? '#2a0f10' : marble ? '#2e3548' : '#141927';
  px(ctx, 0, ground - 24, viewW, 24, walkColor);
  px(ctx, 0, ground - 25, viewW, 2, rgba(stage.accent, 0.25));
  px(ctx, 0, ground, viewW, Math.max(0, height - ground), sand ? '#6b431f' : carpet ? '#200c0d' : '#0a101c');
  px(ctx, 0, ground + 4, viewW, 2, sand ? '#c9954f' : stage.neon);
  px(ctx, 0, ground + 6, viewW, 2, sand ? '#8a5a30' : carpet ? '#5c2a14' : '#233747');

  const shift = camera % 52;
  for (let i = -1; i < 10; i++) {
    const x = i * 52 - shift;
    if (sand) {
      px(ctx, x + 8, ground + 16, 34, 3, 'rgba(255,224,170,.12)');
      px(ctx, x + 12, ground + 34, 26, 2, 'rgba(255,224,170,.08)');
    } else if (marble) {
      px(ctx, x, ground - 22, 50, 2, rgba(stage.accent, 0.16));
      px(ctx, x + 6, ground + 12, 42, 2, rgba(stage.accent, 0.14));
      px(ctx, x + 24, ground - 21, 2, 22, rgba(stage.accent, 0.12));
    } else if (carpet) {
      px(ctx, x + 4, ground + 10, 44, 3, 'rgba(255,217,120,.16)');
      px(ctx, x + 14, ground + 26, 24, 2, 'rgba(255,154,77,.1)');
      px(ctx, x, ground - 22, 52, 2, 'rgba(143,39,53,.6)');
      px(ctx, x, ground - 22, 52, 1, 'rgba(255,217,120,.25)');
    } else {
      px(ctx, x, ground + 14, 1, 40, '#263142');
      px(ctx, x + 7, ground + 34, 26, 2, 'rgba(105,152,169,.2)');
      px(ctx, x + 16, ground + 11, 22, 2, rgba(stage.neon, 0.18));
    }
  }
  // Puddles / sand ripples with neon reflections.
  for (let p = 0; p < 6; p++) {
    const pxp = ((p * 190 - camera) % 1140 + 1140) % 1140 - 100;
    if (pxp < -80 || pxp > 460) continue;
    const w = 40 + (p % 3) * 20;
    if (sand) {
      px(ctx, pxp, ground - 3, w, 3, 'rgba(255,224,170,.14)');
    } else {
      px(ctx, pxp, ground - 3, w, 4, sand ? 'transparent' : 'rgba(10,14,26,.85)');
      px(ctx, pxp + 3, ground - 2, w - 6, 2, rgba(stage.neon, 0.22 + Math.sin(time * 2 + p) * 0.05));
    }
  }
  if (level === 8) {
    // Hazard stripes crossing the dogtown street.
    for (let h = 0; h < 8; h++) {
      const hx = ((h * 250 - camera) % 2000 + 2000) % 2000 - 120;
      if (hx < -60 || hx > 440) continue;
      for (let c = 0; c < 4; c++) px(ctx, hx + c * 12, ground - 22, 8, 3, c % 2 ? 'rgba(255,176,77,.5)' : 'rgba(20,24,20,.7)');
    }
  }
  if (level === 9) {
    // Gold inlay pattern on the carpet.
    for (let g = 0; g < 5; g++) {
      const gx = ((g * 260 - camera) % 1300 + 1300) % 1300 - 130;
      if (gx < -80 || gx > 460) continue;
      px(ctx, gx, ground + 14, 70, 2, 'rgba(255,217,120,.2)');
      px(ctx, gx + 30, ground + 10, 8, 10, 'rgba(255,217,120,.12)');
    }
  }
  void viewW;
}
