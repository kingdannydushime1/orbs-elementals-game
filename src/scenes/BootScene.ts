import Phaser from 'phaser';
import fireOrbUrl from '../assets/images/fire_orb_1782465314706.jpg';
import waterOrbUrl from '../assets/images/water_orb_1782465299667.jpg';
import rockOrbUrl from '../assets/images/rock_orb_1782465345845.jpg';
import leafOrbUrl from '../assets/images/leaf_orb_1782465330903.jpg';
import bgUrl from '../assets/images/background.jpg';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const s = Math.min(w, h) / 540;

    const barW = w * 0.6;
    const barH = 24 * s;
    const barX = (w - barW) / 2;
    const barY = h / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1230, 1);
    bg.fillRoundedRect(barX, barY, barW, barH, 12 * s);

    const fill = this.add.graphics();

    const title = this.add.text(w / 2, barY - 60 * s, 'ORBS ELEMENTALS', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(28 * s)}px`,
      color: '#c4b5fd',
    }).setOrigin(0.5);

    const subtitle = this.add.text(w / 2, barY - 30 * s, 'Loading...', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(12 * s)}px`,
      color: '#6b5b95',
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      fill.clear();
      fill.fillStyle(0x7c3aed, 1);
      fill.fillRoundedRect(barX + 2, barY + 2, (barW - 4) * v, barH - 4, 10 * s);
    });

    this.load.on('complete', () => {
      bg.destroy();
      fill.destroy();
      title.destroy();
      subtitle.destroy();
    });

    this.load.image('fire_orb', fireOrbUrl);
    this.load.image('water_orb', waterOrbUrl);
    this.load.image('rock_orb', rockOrbUrl);
    this.load.image('leaf_orb', leafOrbUrl);
    this.load.image('background', bgUrl);
  }

  create() {
    this.generateParticleTextures();
    this.makeWoodTexture();
    this.scene.start('MenuScene');
  }

  private generateParticleTextures() {
    this.makeFlameTex();
    this.makeWaterTex();
    this.makeLeafTex();
    this.makeRockTex();
    this.makeGlowTex('particle_water', 0x3399ff);
    this.makeGlowTex('particle_earth', 0x996633);
    this.makeGlowTex('particle_air', 0xccddff);
    this.makeGlowTex('particle_spark', 0xffffff);
    this.makeGlowTex('particle_glow', 0xffd700);
  }

  private makeWoodTexture() {
    const size = 128;
    const canvas = this.textures.createCanvas('wood_panel', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const base = '#4a2a14';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 40; i++) {
      const y = Math.random() * size;
      const alpha = Math.random() * 0.12 + 0.03;
      const w = Math.random() * 2 + 0.5;
      ctx.strokeStyle = `rgba(20, 10, 5, ${alpha})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      let x = -5;
      ctx.moveTo(-5, y);
      while (x < size + 5) {
        x += 8 + Math.random() * 12;
        const y2 = y + Math.sin(x * 0.015 + i) * 3 + (Math.random() - 0.5) * 3;
        ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, size, 8);
    ctx.fillRect(0, size - 6, size, 4);

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, size - 3, size, 3);

    const vig = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = vig;
    ctx.fillRect(-10, -10, size + 20, size + 20);

    canvas.refresh();
  }

  private makeFlameTex() {
    for (let s = 0; s < 3; s++) {
      const size = 20 + s * 8;
      const key = `particle_fire_${s}`;
      const canvas = this.textures.createCanvas(key, size, size);
      if (!canvas) continue;
      const ctx = canvas.getContext();
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2, cy = size / 2;

      const w = size * 0.35;
      const h = size * 0.5;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.bezierCurveTo(cx + w, cy - h * 0.4, cx + w * 0.8, cy + h * 0.2, cx + w * 0.3, cy + h);
      ctx.lineTo(cx - w * 0.3, cy + h);
      ctx.bezierCurveTo(cx - w * 0.8, cy + h * 0.2, cx - w, cy - h * 0.4, cx, cy - h);
      ctx.closePath();

      const grad = ctx.createLinearGradient(cx, cy - h, cx, cy + h);
      grad.addColorStop(0, 'rgba(255, 255, 230, 1)');
      grad.addColorStop(0.15, 'rgba(255, 240, 100, 1)');
      grad.addColorStop(0.35, 'rgba(255, 180, 30, 1)');
      grad.addColorStop(0.6, 'rgba(230, 80, 10, 0.9)');
      grad.addColorStop(0.85, 'rgba(160, 20, 0, 0.5)');
      grad.addColorStop(1, 'rgba(80, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      ctx.save();
      const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, h);
      glow.addColorStop(0, 'rgba(255, 200, 50, 0)');
      glow.addColorStop(0.3, 'rgba(255, 120, 0, 0.12)');
      glow.addColorStop(0.7, 'rgba(200, 40, 0, 0.06)');
      glow.addColorStop(1, 'rgba(100, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      canvas.refresh();
    }

    const eCanvas = this.textures.createCanvas('particle_fire_ember', 6, 6);
    if (!eCanvas) return;
    const ectx = eCanvas.getContext();
    const eg = ectx.createRadialGradient(3, 3, 0, 3, 3, 3);
    eg.addColorStop(0, 'rgba(255, 230, 180, 1)');
    eg.addColorStop(0.3, 'rgba(255, 180, 50, 1)');
    eg.addColorStop(0.7, 'rgba(200, 60, 0, 0.6)');
    eg.addColorStop(1, 'rgba(100, 0, 0, 0)');
    ectx.fillStyle = eg;
    ectx.fillRect(0, 0, 6, 6);
    eCanvas.refresh();

    const sCanvas = this.textures.createCanvas('particle_fire_smoke', 12, 12);
    if (!sCanvas) return;
    const sctx = sCanvas.getContext();
    const sg = sctx.createRadialGradient(6, 6, 0, 6, 6, 6);
    sg.addColorStop(0, 'rgba(80, 80, 80, 0.5)');
    sg.addColorStop(0.4, 'rgba(60, 60, 60, 0.35)');
    sg.addColorStop(0.7, 'rgba(40, 40, 40, 0.2)');
    sg.addColorStop(1, 'rgba(20, 20, 20, 0)');
    sctx.fillStyle = sg;
    sctx.beginPath(); sctx.arc(6, 6, 6, 0, Math.PI * 2); sctx.fill();
    sCanvas.refresh();
  }

  private makeWaterTex() {
    const dCanvas = this.textures.createCanvas('particle_water_drop', 16, 16);
    if (!dCanvas) return;
    const dctx = dCanvas.getContext();
    dctx.clearRect(0, 0, 16, 16);

    const dcx = 8, dcy = 8, dr = 6;
    dctx.save();
    dctx.beginPath();
    dctx.arc(dcx, dcy, dr, 0, Math.PI * 2);
    const dg = dctx.createRadialGradient(dcx - 2, dcy - 3, 1, dcx, dcy, dr);
    dg.addColorStop(0, 'rgba(220, 240, 255, 1)');
    dg.addColorStop(0.3, 'rgba(160, 215, 255, 0.95)');
    dg.addColorStop(0.7, 'rgba(70, 160, 240, 0.85)');
    dg.addColorStop(1, 'rgba(30, 80, 180, 0.7)');
    dctx.fillStyle = dg;
    dctx.fill();
    dctx.restore();

    dctx.save();
    dctx.beginPath();
    dctx.arc(dcx - 2.5, dcy - 3, 2, 0, Math.PI * 2);
    dctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    dctx.fill();
    dctx.restore();

    dctx.save();
    dctx.beginPath();
    dctx.arc(dcx + 2, dcy + 2, 1.2, 0, Math.PI * 2);
    dctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    dctx.fill();
    dctx.restore();

    dCanvas.refresh();

    const sCanvas = this.textures.createCanvas('particle_water_splash', 6, 6);
    if (!sCanvas) return;
    const sctx = sCanvas.getContext();
    sctx.clearRect(0, 0, 6, 6);
    const sg = sctx.createRadialGradient(3, 3, 0, 3, 3, 3);
    sg.addColorStop(0, 'rgba(220, 240, 255, 1)');
    sg.addColorStop(0.5, 'rgba(120, 200, 255, 0.8)');
    sg.addColorStop(1, 'rgba(50, 120, 220, 0)');
    sctx.fillStyle = sg;
    sctx.beginPath(); sctx.arc(3, 3, 3, 0, Math.PI * 2); sctx.fill();
    sCanvas.refresh();

    const bCanvas = this.textures.createCanvas('particle_water_bubble', 14, 14);
    if (!bCanvas) return;
    const bctx = bCanvas.getContext();
    bctx.clearRect(0, 0, 14, 14);
    const bcx = 7, bcy = 7;
    const bg = bctx.createRadialGradient(bcx, bcy, 0, bcx, bcy, 7);
    bg.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    bg.addColorStop(0.2, 'rgba(200, 235, 255, 0.3)');
    bg.addColorStop(0.6, 'rgba(100, 180, 255, 0.15)');
    bg.addColorStop(0.9, 'rgba(60, 130, 220, 0.4)');
    bg.addColorStop(1, 'rgba(40, 80, 180, 0)');
    bctx.fillStyle = bg;
    bctx.beginPath(); bctx.arc(bcx, bcy, 7, 0, Math.PI * 2); bctx.fill();
    bctx.save();
    bctx.beginPath(); bctx.arc(bcx - 2, bcy - 2.5, 2, 0, Math.PI * 2);
    bctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; bctx.fill();
    bctx.restore();
    bCanvas.refresh();
  }

  private makeLeafTex() {
    const lCanvas = this.textures.createCanvas('particle_leaf', 20, 24);
    if (!lCanvas) return;
    const lctx = lCanvas.getContext();
    lctx.clearRect(0, 0, 20, 24);
    const lcx = 10, lcy = 12;

    lctx.save();
    lctx.beginPath();
    lctx.moveTo(lcx, 0);
    lctx.bezierCurveTo(lcx + 10, 4, lcx + 8, 18, lcx, 24);
    lctx.bezierCurveTo(lcx - 8, 18, lcx - 10, 4, lcx, 0);
    lctx.closePath();
    const lg = lctx.createLinearGradient(0, 0, 20, 24);
    lg.addColorStop(0, '#88dd44');
    lg.addColorStop(0.4, '#44aa22');
    lg.addColorStop(0.7, '#228811');
    lg.addColorStop(1, '#115508');
    lctx.fillStyle = lg;
    lctx.fill();
    lctx.restore();

    lctx.save();
    lctx.beginPath();
    lctx.moveTo(lcx, 2);
    lctx.lineTo(lcx, 20);
    lctx.strokeStyle = 'rgba(20, 80, 10, 0.5)';
    lctx.lineWidth = 1;
    lctx.stroke();
    lctx.restore();

    lctx.save();
    lctx.beginPath();
    lctx.moveTo(lcx - 5, 6);
    lctx.lineTo(lcx - 2, 10);
    lctx.moveTo(lcx + 5, 6);
    lctx.lineTo(lcx + 2, 10);
    lctx.strokeStyle = 'rgba(20, 80, 10, 0.3)';
    lctx.lineWidth = 0.8;
    lctx.stroke();
    lctx.restore();

    lCanvas.refresh();
  }

  private makeRockTex() {
    for (let s = 0; s < 3; s++) {
      const size = 18 + s * 6;
      const key = `particle_rock_${s}`;
      const canvas = this.textures.createCanvas(key, size, size);
      if (!canvas) continue;
      const ctx = canvas.getContext();
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2, cy = size / 2;
      const r = size / 2 - 1;

      const pts = 6 + Phaser.Math.Between(0, 3);
      const angles: number[] = [];
      for (let i = 0; i < pts; i++) {
        angles.push((i / pts) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.15, 0.15));
      }
      angles.sort((a, b) => a - b);

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const rad = r * Phaser.Math.FloatBetween(0.6, 1);
        const px = cx + Math.cos(angles[i]) * rad;
        const py = cy + Math.sin(angles[i]) * rad;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();

      const rg = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, r);
      rg.addColorStop(0, '#8a7a6a');
      rg.addColorStop(0.3, '#6a5a4a');
      rg.addColorStop(0.6, '#4a3a2a');
      rg.addColorStop(1, '#2a1a10');
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 20, 10, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const rad = r * Phaser.Math.FloatBetween(0.6, 1);
        const px = cx + Math.cos(angles[i]) * rad;
        const py = cy + Math.sin(angles[i]) * rad;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 3, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180, 160, 140, 0.3)';
      ctx.fill();
      ctx.restore();

      canvas.refresh();
    }

    const dCanvas = this.textures.createCanvas('particle_rock_dust', 8, 8);
    if (!dCanvas) return;
    const dctx = dCanvas.getContext();
    const dg = dctx.createRadialGradient(4, 4, 0, 4, 4, 4);
    dg.addColorStop(0, 'rgba(160, 140, 120, 0.8)');
    dg.addColorStop(0.5, 'rgba(120, 100, 80, 0.4)');
    dg.addColorStop(1, 'rgba(80, 60, 40, 0)');
    dctx.fillStyle = dg;
    dctx.beginPath(); dctx.arc(4, 4, 4, 0, Math.PI * 2); dctx.fill();
    dCanvas.refresh();
  }

  private makeGlowTex(key: string, color: number) {
    const size = 16;
    const canvas = this.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.8)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }
}
