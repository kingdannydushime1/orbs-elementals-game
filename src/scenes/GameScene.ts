import Phaser from 'phaser';
import { sound } from '../utils/sound';
import { LevelDef, levels, getLevel } from '../levels';
import { deductLife, addCoins, COINS_PER_WIN, hasLives } from '../utils/save';

const ELEMENT_COLORS: Record<number, number> = {
  0: 0xff5500, 1: 0x3399ff, 2: 0x996633, 3: 0x33cc33,
};

interface Orb {
  type: number;
  row: number;
  col: number;
  sprite: Phaser.GameObjects.Sprite | null;
  iceLayers: number;
  iceSprite: Phaser.GameObjects.Graphics | null;
}

interface ObjectiveState {
  type: 'score' | 'orbs_matched';
  target: number;
  current: number;
  element?: number;
}

export class GameScene extends Phaser.Scene {
  private grid: (Orb | null)[][] = [];
  private score = 0;
  private timeLeft = 60;
  private comboCount = 0;
  private isProcessing = false;
  private selected: { row: number; col: number } | null = null;
  private selGraphic!: Phaser.GameObjects.Graphics;
  private dragStart: { row: number; col: number; x: number; y: number } | null = null;
  private dragEnd: { x: number; y: number } | null = null;

  private scoreText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerTextShadow!: Phaser.GameObjects.Text;
  private mapBtn!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private targetTitle!: Phaser.GameObjects.Text;
  private levelsBtnWood!: Phaser.GameObjects.Image;
  private levelsBtnBorder!: Phaser.GameObjects.Graphics;
  private levelsBtnZone!: Phaser.GameObjects.Zone;
  private objectivesTexts: Phaser.GameObjects.Text[] = [];
  private objectiveIcons: Phaser.GameObjects.Image[] = [];
  private objPanel!: Phaser.GameObjects.GameObject;
  private comboTimer = 0;
  private showComboText = false;

  private cell = 56;
  private gap = 4;
  private gridW = 0;
  private offX = 0;
  private offY = 0;
  private gridLines: Phaser.GameObjects.Graphics | null = null;
  private camW = 540;
  private camH = 960;
  private sf = 1;
  private bgObjects: Phaser.GameObjects.GameObject[] = [];
  private gridBg!: Phaser.GameObjects.Graphics;

  private levelDef!: LevelDef;
  private rows = 8;
  private cols = 8;
  private objectives: ObjectiveState[] = [];
  private levelComplete = false;

  private crates: Map<string, { hits: number; graphic: Phaser.GameObjects.Graphics }> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  private cellX(col: number) { return this.offX + col * (this.cell + this.gap) + this.cell / 2; }
  private cellY(row: number) { return this.offY + row * (this.cell + this.gap) + this.cell / 2; }

  init(data: { levelId?: number }) {
    const levelId = data?.levelId || 1;
    const def = getLevel(levelId) || levels[0];
    this.levelDef = def;
    this.rows = def.rows;
    this.cols = def.cols;
    this.timeLeft = def.time;
    this.score = 0;
    this.comboCount = 0;
    this.isProcessing = false;
    this.selected = null;
    this.comboTimer = 0;
    this.showComboText = false;
    this.levelComplete = false;
    this.grid = [];
    this.objectives = [];
    this.crates.clear();
    this.objectivesTexts = [];
  }

  create() {
    this.bakeOrbTextures();
    this.selGraphic = this.add.graphics().setDepth(5);

    this.initObjectives();
    this.recalcLayout();
    this.scale.on('resize', (gameSize: any) => {
      this.handleResize(gameSize.width, gameSize.height);
    });

    this.drawBackground();
    this.initGrid();
    this.drawBoard();
    this.createUI();
    this.handleResize(this.cameras.main.width, this.cameras.main.height);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDragStart(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onDragMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onSwipeEnd(p));

    if (!deductLife()) {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    }
  }

  private initObjectives() {
    this.objectives = this.levelDef.objectives.map(o => ({
      type: o.type,
      target: o.target,
      current: 0,
      element: o.element,
    }));
  }

  private recalcLayout() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.camW = w;
    this.camH = h;
    this.sf = Math.min(w, h) / 540;
    const s = this.sf;
    const numObj = this.objectives?.length ?? 0;

    const minOffY = 110 * s + 44 * s * numObj + 52 * s;

    const maxCellFromW = Math.floor(w * 0.85 / this.rows);
    const maxCellFromH = Math.floor((h - minOffY) * 0.95 / this.rows);
    this.cell = Math.min(maxCellFromW, maxCellFromH);
    this.cell = Math.max(this.cell, 16);
    this.gap = Math.max(2, Math.floor(this.cell * 0.07));
    this.gridW = this.cols * this.cell + (this.cols - 1) * this.gap;
    this.offX = (w - this.gridW) / 2;
    this.offY = Math.max(minOffY, (h - this.gridW) / 2);
  }

  private handleResize(w: number, h: number) {
    this.recalcLayout();
    const s = this.sf;
    const pad = 20 * s;

    this.bgObjects.forEach(o => o.destroy());
    this.bgObjects = [];

    this.drawProceduralBg();
    if (this.gridBg) { this.gridBg.clear(); this.gridBg.fillStyle(0x000000, 0.55); this.gridBg.fillRoundedRect(this.offX - this.gap, this.offY - this.gap, this.gridW + this.gap * 2, this.gridW + this.gap * 2, 8); }
    this.drawGridBgEffects();
    if (this.gridLines) { this.gridLines.destroy(); this.drawGridLines(); }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const orb = this.grid[r]?.[c];
        if (orb?.sprite) {
          orb.sprite.setPosition(this.cellX(c), this.cellY(r));
          orb.sprite.setScale(this.cell / 128);
        }
      }
    }

    this.redrawIceOverlays();
    this.redrawCrates();

    const padT = 12 * s, padSide = 12 * s;
    const panelX = padSide;
    const panelY = padT;
    const panelW = w - padSide * 2;
    const panelH = this.offY - padT;

    this.objPanel?.destroy();

    if (this.textures.exists('wood_panel')) {
      const panel = this.add.image(w / 2, panelY + panelH / 2, 'wood_panel').setDepth(2);
      panel.setDisplaySize(panelW, panelH);
      this.objPanel = panel;
    }
    const panelBorder = this.add.graphics().setDepth(2.1);
    panelBorder.lineStyle(2 * s, 0x8b6914, 0.7);
    panelBorder.strokeRoundedRect(panelX, panelY, panelW, panelH, 14 * s);

    const row1y = panelY + 30 * s;
    const row2y = panelY + 62 * s;
    const row3y = panelY + 90 * s;

    if (this.coinIcon) {
      this.coinIcon.setPosition(panelX + 10 * s, row1y);
      this.coinIcon.setFontSize(`${Math.round(32 * s)}px`);
    }
    this.scoreText?.setPosition(panelX + 52 * s, row1y);
    this.scoreText?.setFontSize(`${Math.round(30 * s)}px`);
    this.scoreText?.setOrigin(0, 0.5);

    this.timerText?.setPosition(panelX + panelW - 12 * s, row1y);
    this.timerText?.setFontSize(`${Math.round(30 * s)}px`);
    this.timerTextShadow?.setPosition(panelX + panelW - 10 * s, row1y + 2 * s);
    this.timerTextShadow?.setFontSize(`${Math.round(30 * s)}px`);

    this.muteBtn?.setPosition(panelX + panelW - 12 * s - 90 * s - 20 * s, row2y);
    this.muteBtn?.setFontSize(`${Math.round(28 * s)}px`);

    this.levelsBtnWood?.setPosition(panelX + panelW - 12 * s - 45 * s, row2y + 15 * s);
    this.levelsBtnWood?.setDisplaySize(90 * s, 30 * s);
    {
      const bx = panelX + panelW - 12 * s - 90 * s, by = row2y;
      this.levelsBtnBorder?.clear();
      this.levelsBtnBorder?.lineStyle(2 * s, 0x8b6914, 0.7);
      this.levelsBtnBorder?.strokeRoundedRect(bx, by, 90 * s, 30 * s, 8 * s);
    }
    this.mapBtn?.setPosition(panelX + panelW - 12 * s - 45 * s, row2y + 15 * s);
    this.mapBtn?.setFontSize(`${Math.round(17 * s)}px`);
    this.levelsBtnZone?.setPosition(panelX + panelW - 12 * s - 45 * s, row2y + 15 * s);

    this.objectivesTexts.forEach((t, i) => {
      const oy = row3y + (44 * s) * (i + 1);
      t.setPosition(panelX + 80 * s, oy);
      t.setFontSize(`${Math.round(17 * s)}px`);
      t.setOrigin(0, 0);
    });
    this.objectiveIcons.forEach((icon, i) => {
      const oy = row3y + (44 * s) * (i + 1) + 6 * s;
      const obj = this.objectives[i];
      if (obj?.type === 'score') {
        (icon as unknown as Phaser.GameObjects.Text).setPosition(panelX + 54 * s, oy);
        (icon as unknown as Phaser.GameObjects.Text).setFontSize(`${Math.round(24 * s)}px`);
      } else {
        icon.setPosition(panelX + 56 * s, oy);
        icon.setDisplaySize(30 * s, 30 * s);
      }
    });

    this.targetTitle?.setPosition(panelX + 12 * s, row3y);
    this.targetTitle?.setFontSize(`${Math.round(14 * s)}px`);

    this.selected = null;
  }

  private createUI() {
    const s = this.sf;
    const w = this.camW, h = this.camH;

    const padT = 12 * s, padSide = 12 * s;
    const panelX = padSide;
    const panelY = padT;
    const panelW = w - padSide * 2;
    const panelH = this.offY - padT;

    if (this.textures.exists('wood_panel')) {
      const panel = this.add.image(w / 2, panelY + panelH / 2, 'wood_panel').setDepth(2);
      panel.setDisplaySize(panelW, panelH);
      this.objPanel = panel;
    }
    const panelBorder = this.add.graphics().setDepth(2.1);
    panelBorder.lineStyle(2 * s, 0x8b6914, 0.7);
    panelBorder.strokeRoundedRect(panelX, panelY, panelW, panelH, 14 * s);

    const row1y = panelY + 30 * s;
    const row2y = panelY + 62 * s;
    const row3y = panelY + 90 * s;

    this.coinIcon = this.add.text(panelX + 10 * s, row1y, '\u{1FA99}', {
      fontSize: `${Math.round(32 * s)}px`,
    }).setOrigin(0, 0.5).setDepth(3).setPadding(0, 4, 0, 4);
    this.scoreText = this.add.text(panelX + 52 * s, row1y, '0', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(30 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(3);

    this.timerText = this.add.text(panelX + panelW - 12 * s, row1y, String(Math.ceil(this.timeLeft)), {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(30 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(3);
    this.timerTextShadow = this.add.text(panelX + panelW - 10 * s, row1y + 2 * s, String(Math.ceil(this.timeLeft)), {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(30 * s)}px`, color: '#0d0815', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(2).setAlpha(0.4);

    this.muteBtn = this.add.text(panelX + panelW - 12 * s - 90 * s - 20 * s, row2y, sound.muted ? '\u{1F507}' : '\u{1F50A}', {
      fontSize: `${Math.round(28 * s)}px`,
    }).setOrigin(1, 0).setDepth(3).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      const muted = sound.toggleMute();
      this.muteBtn.setText(muted ? '\u{1F507}' : '\u{1F50A}');
    });

    {
      const levelsBtnW = 90 * s, levelsBtnH = 30 * s;
      const bx = panelX + panelW - 12 * s - levelsBtnW, by = row2y;
      this.levelsBtnWood = this.add.image(bx + levelsBtnW / 2, by + levelsBtnH / 2, 'wood_panel').setDepth(3);
      this.levelsBtnWood.setDisplaySize(levelsBtnW, levelsBtnH);
      this.levelsBtnBorder = this.add.graphics().setDepth(3.1);
      this.levelsBtnBorder.lineStyle(2 * s, 0x8b6914, 0.7);
      this.levelsBtnBorder.strokeRoundedRect(bx, by, levelsBtnW, levelsBtnH, 8 * s);
      this.mapBtn = this.add.text(bx + levelsBtnW / 2, by + levelsBtnH / 2, 'LEVELS', {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(17 * s)}px`, color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(3.2);
      this.levelsBtnZone = this.add.zone(bx + levelsBtnW / 2, by + levelsBtnH / 2, levelsBtnW, levelsBtnH)
        .setInteractive({ useHandCursor: true }).setDepth(3.3);
      this.levelsBtnZone.on('pointerover', () => {
        this.levelsBtnBorder?.clear();
        this.levelsBtnBorder?.lineStyle(3 * s, 0xffd700, 1);
        this.levelsBtnBorder?.strokeRoundedRect(bx, by, levelsBtnW, levelsBtnH, 8 * s);
      });
      this.levelsBtnZone.on('pointerout', () => {
        this.levelsBtnBorder?.clear();
        this.levelsBtnBorder?.lineStyle(2 * s, 0x8b6914, 0.7);
        this.levelsBtnBorder?.strokeRoundedRect(bx, by, levelsBtnW, levelsBtnH, 8 * s);
      });
      this.levelsBtnZone.on('pointerdown', () => this.scene.start('LevelSelectScene'));
    }

    this.targetTitle = this.add.text(panelX + 12 * s, row3y, 'TARGET', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(14 * s)}px`, color: '#ffd700', fontStyle: 'bold',
    }).setDepth(3);

    this.objectivesTexts.forEach(t => t.destroy());
    this.objectivesTexts = [];
    this.objectiveIcons.forEach(i => i.destroy());
    this.objectiveIcons = [];
    const objKeys = ['orb_0', 'orb_1', 'orb_2', 'orb_3'];
    this.objectives.forEach((obj, i) => {
      const oy = row3y + (44 * s) * (i + 1);
      const iconY = oy + 6 * s;
      if (obj.type === 'score') {
        const icon = this.add.text(panelX + 54 * s, iconY, '\u{1FA99}', {
          fontSize: `${Math.round(24 * s)}px`,
        }).setOrigin(0.5).setDepth(3).setPadding(0, 4, 0, 4);
        this.objectiveIcons.push(icon as unknown as Phaser.GameObjects.Image);
      } else if (obj.element !== undefined) {
        const icon = this.add.image(panelX + 56 * s, iconY, objKeys[obj.element]).setDepth(3);
        icon.setDisplaySize(30 * s, 30 * s);
        this.objectiveIcons.push(icon);
      }
      const txt = this.add.text(panelX + 80 * s, oy, this.objectiveLabel(obj), {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(17 * s)}px`, color: '#e8d8ff', fontStyle: 'bold',
      }).setDepth(3);
      this.objectivesTexts.push(txt);
    });
  }

  private objectiveLabel(obj: ObjectiveState): string {
    if (obj.type === 'score') return `Coins: ${obj.current} / ${obj.target}`;
    const elName = obj.element !== undefined ? ['Fire', 'Water', 'Earth', 'Leaf'][obj.element] : '';
    return `${elName}: ${obj.current} / ${obj.target}`;
  }

  private updateObjectiveDisplay() {
    this.objectivesTexts.forEach((t, i) => {
      t.setText(this.objectiveLabel(this.objectives[i]));
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 16.667, 3);

    if (!this.isProcessing && !this.levelComplete) {
      this.timeLeft -= dt * 0.016;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.gameOver(false);
      }
      this.timerText.setText(String(Math.ceil(this.timeLeft)));
      if (this.timeLeft < 10) this.timerText.setColor('#ef4444');
    }

    if (this.showComboText) {
      this.comboTimer -= dt * 0.016;
      if (this.comboTimer <= 0) this.showComboText = false;
    }

    this.selGraphic.clear();
    if (this.selected && this.grid[this.selected.row]?.[this.selected.col]) {
      const x = this.cellX(this.selected.col);
      const y = this.cellY(this.selected.row);
      this.selGraphic.lineStyle(2, 0xffffff, 0.6);
      this.selGraphic.strokeRoundedRect(x - this.cell / 2, y - this.cell / 2, this.cell, this.cell, 6);
    }
  }

  private bakeOrbTextures() {
    const keys = ['fire_orb', 'water_orb', 'rock_orb', 'leaf_orb'];
    for (let i = 0; i < 4; i++) {
      const size = 128;
      const canvas = this.textures.createCanvas(`orb_${i}`, size, size);
      if (!canvas) continue;
      const ctx = canvas.getContext();
      const cx = size / 2, cy = size / 2, r = size / 2 - 10;
      const color = ELEMENT_COLORS[i];
      const colorStr = '#' + color.toString(16).padStart(6, '0');

      ctx.shadowBlur = 0;

      ctx.save();
      const hg = ctx.createRadialGradient(cx, cy, r - 20, cx, cy, r + 15);
      hg.addColorStop(0, `${colorStr}00`);
      hg.addColorStop(0.4, `${colorStr}55`);
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(cx, cy, r + 15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.save();
      const sg = ctx.createRadialGradient(cx - 6, cy - 6, 4, cx, cy, r);
      sg.addColorStop(0, '#3a2f5a'); sg.addColorStop(0.5, '#151030'); sg.addColorStop(1, '#080410');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.clip();
      const img = this.textures.get(keys[i]).getSourceImage() as HTMLImageElement;
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.clip();
      const vg = ctx.createRadialGradient(cx - 8, cy - 8, r * 0.3, cx, cy, r - 2);
      vg.addColorStop(0, 'rgba(255,255,255,0.15)');
      vg.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      vg.addColorStop(0.8, 'rgba(0,0,0,0.5)');
      vg.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = vg; ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.clip();
      const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.8);
      ig.addColorStop(0, `${colorStr}ee`); ig.addColorStop(0.4, `${colorStr}66`);
      ig.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = ig; ctx.fill();
      ctx.restore();

      ctx.save();
      const blg = ctx.createRadialGradient(cx + 8, cy + r - 20, 3, cx + 8, cy + r - 12, r * 0.6);
      blg.addColorStop(0, `${colorStr}ee`); blg.addColorStop(0.5, `${colorStr}44`);
      blg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = blg;
      ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.shadowBlur = 12; ctx.shadowColor = `${colorStr}88`;
      ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      ctx.strokeStyle = `${colorStr}99`; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.28, cy - r * 0.32, r * 0.25, r * 0.12, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.38, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
      ctx.restore();

      canvas.refresh();
    }
  }

  private drawBackground() {
    this.drawProceduralBg();
    this.gridBg = this.add.graphics().setDepth(-0.8);
    this.gridBg.fillStyle(0x000000, 0.55);
    this.gridBg.fillRoundedRect(this.offX - this.gap, this.offY - this.gap, this.gridW + this.gap * 2, this.gridW + this.gap * 2, 8);
    this.drawGridBgEffects();
    this.drawGridLines();
  }

  private drawProceduralBg() {
    const w = this.camW, h = this.camH;

    const bg = this.add.image(w / 2, h / 2, 'background').setDepth(-1).setDisplaySize(w, h);
    this.bgObjects.push(bg);
  }

  private drawGridBgEffects() {
    const s = this.sf;

    const fire = this.add.particles(0, 0, 'particle_fire_ember', {
      x: { min: this.offX, max: this.offX + this.gridW },
      y: { min: this.offY, max: this.offY + this.gridW },
      speedY: { min: -15, max: -50 },
      speedX: { min: -12, max: 12 },
      scale: { start: 1.2 * s, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: { min: 1500, max: 3000 },
      frequency: 80,
      quantity: 1,
      tint: [0xff6600, 0xff4400, 0xff8800, 0xcc3300],
      blendMode: 'ADD',
    }).setDepth(-0.6);
    this.bgObjects.push(fire);

    const emberUp = this.add.particles(0, 0, 'particle_fire_0', {
      x: { min: this.offX, max: this.offX + this.gridW },
      y: { min: this.offY, max: this.offY + this.gridW },
      speedY: { min: -20, max: -60 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.6 * s, end: 0 },
      alpha: { start: 0.35, end: 0 },
      lifespan: { min: 600, max: 1200 },
      frequency: 150,
      quantity: 1,
      tint: [0xffdd44, 0xff8800, 0xff4400],
      blendMode: 'ADD',
    }).setDepth(-0.6);
    this.bgObjects.push(emberUp);

    const water = this.add.particles(0, 0, 'particle_water_bubble', {
      x: { min: this.offX, max: this.offX + this.gridW },
      y: { min: this.offY, max: this.offY + this.gridW },
      speedY: { min: -10, max: -30 },
      speedX: { min: -6, max: 6 },
      scale: { start: 0.5 * s, end: 1.0 * s },
      alpha: { start: 0.4, end: 0 },
      lifespan: { min: 2000, max: 4000 },
      frequency: 150,
      quantity: 1,
      tint: [0x66ccff, 0x3399ff, 0x88ddff, 0xffffff],
      blendMode: 'ADD',
    }).setDepth(-0.6);
    this.bgObjects.push(water);

    const ripple = this.add.particles(0, 0, 'particle_water_drop', {
      x: { min: this.offX, max: this.offX + this.gridW },
      y: { min: this.offY, max: this.offY + this.gridW },
      speedY: { min: -5, max: -15 },
      speedX: { min: -3, max: 3 },
      scale: { start: 0.3 * s, end: 0 },
      alpha: { start: 0.25, end: 0 },
      lifespan: { min: 1000, max: 2000 },
      frequency: 250,
      quantity: 1,
      tint: [0xaae8ff, 0xccf0ff],
      blendMode: 'ADD',
    }).setDepth(-0.6);
    this.bgObjects.push(ripple);
  }

  private drawGridLines() {
    this.gridLines = this.add.graphics().setDepth(-0.5);
    this.gridLines.lineStyle(1, 0x2a1f4a, 0.15);
    for (let r = 0; r <= this.rows; r++) {
      const y = this.offY + r * (this.cell + this.gap) - this.gap / 2;
      this.gridLines.lineBetween(this.offX, y, this.offX + this.gridW, y);
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = this.offX + c * (this.cell + this.gap) - this.gap / 2;
      this.gridLines.lineBetween(x, this.offY, x, this.offY + this.gridW);
    }
  }

  private isCrate(row: number, col: number): boolean {
    return this.crates.has(`${row},${col}`);
  }

  private initGrid() {
    this.grid = [];
    const crateSet = new Set<string>();
    for (const cd of this.levelDef.crates) {
      const key = `${cd.row},${cd.col}`;
      crateSet.add(key);
    }

    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        if (crateSet.has(`${r},${c}`)) {
          this.grid[r][c] = null;
          continue;
        }
        let type: number;
        do { type = Phaser.Math.Between(0, this.levelDef.orbTypes - 1); }
        while (this.wouldMatch(r, c, type));
        this.grid[r][c] = { type, row: r, col: c, sprite: null, iceLayers: 0, iceSprite: null };
      }
    }
  }

  private wouldMatch(row: number, col: number, type: number): boolean {
    if (col >= 2 && this.grid[row]?.[col - 1]?.type === type && this.grid[row]?.[col - 2]?.type === type) return true;
    if (row >= 2 && this.grid[row - 1]?.[col]?.type === type && this.grid[row - 2]?.[col]?.type === type) return true;
    return false;
  }

  private drawBoard() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const orb = this.grid[r][c];
        if (orb) {
          const s = this.add.sprite(this.cellX(c), this.cellY(r), `orb_${orb.type}`).setDepth(1);
          s.setScale(this.cell / 128);
          orb.sprite = s;

          const iceDef = this.levelDef.ice.find(i => i.row === r && i.col === c);
          if (iceDef) {
            orb.iceLayers = iceDef.layers || 1;
            this.drawIceOverlay(orb);
          }
        }
      }
    }

    for (const cd of this.levelDef.crates) {
      this.createCrate(cd.row, cd.col, cd.hits || 1);
    }
  }

  private drawIceOverlay(orb: Orb) {
    const g = this.add.graphics().setDepth(2);
    const x = this.cellX(orb.col);
    const y = this.cellY(orb.row);
    const r = this.cell / 2 - 4;
    const intensity = orb.iceLayers === 2 ? 0.5 : 0.3;

    g.fillStyle(0xb4dcff, intensity);
    g.fillCircle(x, y, r);

    const icicleCount = orb.iceLayers === 2 ? 8 : 4;
    g.fillStyle(0xc8ebff, intensity + 0.15);
    for (let i = 0; i < icicleCount; i++) {
      const angle = (i / icicleCount) * Math.PI * 2;
      const ix = x + Math.cos(angle) * (r - 4);
      const iy = y + Math.sin(angle) * (r - 4);
      g.fillTriangle(ix - 2, iy - 2, ix, iy + 3, ix + 2, iy - 2);
    }

    orb.iceSprite = g;
  }

  private createCrate(row: number, col: number, hits: number) {
    const g = this.add.graphics().setDepth(2);
    const x = this.cellX(col);
    const y = this.cellY(row);
    const s = this.cell / 2 - 6;

    g.fillStyle(0x3a2a1a, 1);
    g.fillRoundedRect(x - s, y - s, s * 2, s * 2, 6);

    g.lineStyle(2, 0x6a5a4a, 1);
    g.strokeRoundedRect(x - s, y - s, s * 2, s * 2, 6);

    g.lineStyle(1.5, 0x4a3a2a, 1);
    g.lineBetween(x - s + 3, y, x + s - 3, y);
    g.lineBetween(x, y - s + 3, x, y + s - 3);

    if (hits > 1) {
      g.fillStyle(0xff6432, 0.3);
      g.fillRoundedRect(x - s + 3, y - s + 3, s * 2 - 6, s * 2 - 6, 4);
    }

    this.crates.set(`${row},${col}`, { hits, graphic: g });
  }

  private redrawIceOverlays() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const orb = this.grid[r]?.[c];
        if (orb?.iceSprite) {
          orb.iceSprite.destroy();
          orb.iceSprite = null;
        }
        if (orb && orb.iceLayers > 0) {
          this.drawIceOverlay(orb);
        }
      }
    }
  }

  private redrawCrates() {
    const entries = Array.from(this.crates.entries());
    for (const [, crate] of entries) {
      crate.graphic.destroy();
    }
    this.crates.clear();
    for (const cd of this.levelDef.crates) {
      const key = `${cd.row},${cd.col}`;
      if (this.crates.has(key)) continue;
      this.createCrate(cd.row, cd.col, cd.hits || 1);
    }
  }

  private onDragStart(pointer: Phaser.Input.Pointer) {
    if (this.isProcessing || this.levelComplete) return;
    const { col, row } = this.cellAt(pointer.x, pointer.y);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    if (this.isCrate(row, col) || !this.grid[row][col]) return;
    this.dragStart = { row, col, x: pointer.x, y: pointer.y };
    this.dragEnd = null;
    this.selected = { row, col };
  }

  private onDragMove(pointer: Phaser.Input.Pointer) {
    if (!this.dragStart) return;
    this.dragEnd = { x: pointer.x, y: pointer.y };
  }

  private onSwipeEnd(pointer: Phaser.Input.Pointer) {
    if (!this.dragStart) return;
    const start = this.dragStart;
    this.dragStart = null;
    const end = this.dragEnd || pointer;
    this.dragEnd = null;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) {
      const { col, row } = this.cellAt(pointer.x, pointer.y);
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
      if (this.isCrate(row, col) || !this.grid[row][col]) return;

      if (start.row === row && start.col === col) {
        this.selected = this.selected ? null : { row, col };
        return;
      }
      if (this.isAdjacent(start, { row, col })) {
        if (this.isCrate(row, col) || this.isCrate(start.row, start.col)) { this.selected = null; return; }
        this.selected = null;
        sound.playSwap();
        this.attemptSwap(start.row, start.col, row, col);
        return;
      }
      this.selected = { row, col };
      return;
    }

    let dr = 0, dc = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      dc = dx > 0 ? 1 : -1;
    } else {
      dr = dy > 0 ? 1 : -1;
    }

    const tr = start.row + dr;
    const tc = start.col + dc;
    if (tr < 0 || tr >= this.rows || tc < 0 || tc >= this.cols) {
      this.selected = null;
      return;
    }
    if (this.isCrate(tr, tc) || !this.grid[tr][tc]) {
      this.selected = null;
      return;
    }

    this.selected = null;
    sound.playSwap();
    this.attemptSwap(start.row, start.col, tr, tc);
  }

  private cellAt(x: number, y: number) {
    const col = Math.floor((x - this.offX) / (this.cell + this.gap));
    const row = Math.floor((y - this.offY) / (this.cell + this.gap));
    return { row, col };
  }

  private isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  }

  private async attemptSwap(r1: number, c1: number, r2: number, c2: number) {
    this.isProcessing = true;
    this.swapInGrid(r1, c1, r2, c2);
    await this.animateSwap(r1, c1, r2, c2);

    const matches = this.findMatches();
    if (matches.length > 0) {
      this.comboCount = 0;
      await this.processMatches(matches);
    } else {
      sound.playDenied();
      this.swapInGrid(r1, c1, r2, c2);
      await this.animateSwap(r1, c1, r2, c2);
    }

    if (!this.hasValidMoves()) await this.shuffleBoard();
    this.isProcessing = false;
  }

  private swapInGrid(r1: number, c1: number, r2: number, c2: number) {
    const a = this.grid[r1][c1];
    const b = this.grid[r2][c2];
    if (a) { a.row = r2; a.col = c2; }
    if (b) { b.row = r1; b.col = c1; }
    this.grid[r1][c1] = b;
    this.grid[r2][c2] = a;
  }

  private animateSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    return new Promise<void>(resolve => {
      const a = this.grid[r1][c1]?.sprite;
      const b = this.grid[r2][c2]?.sprite;
      let done = 0;
      const check = () => { done++; if (done >= 2) resolve(); };

      if (a) this.tweens.add({ targets: a, x: this.cellX(c1), y: this.cellY(r1), duration: 180, ease: 'Quad.easeInOut', onComplete: () => check() });
      else check();
      if (b) this.tweens.add({ targets: b, x: this.cellX(c2), y: this.cellY(r2), duration: 180, ease: 'Quad.easeInOut', onComplete: () => check() });
      else check();
    });
  }

  private findMatches(): { row: number; col: number }[] {
    const set = new Set<string>();

    for (let r = 0; r < this.rows; r++) {
      let len = 1, type = -1;
      for (let c = 0; c < this.cols; c++) {
        const orb = this.grid[r]?.[c];
        const t = orb?.type;
        if (t !== undefined && t === type) { len++; }
        else {
          if (len >= 3) { for (let i = 1; i <= len; i++) set.add(`${r},${c - i}`); }
          len = 1; type = t !== undefined ? t : -1;
        }
      }
      if (len >= 3) { for (let i = 1; i <= len; i++) set.add(`${r},${this.cols - i}`); }
    }

    for (let c = 0; c < this.cols; c++) {
      let len = 1, type = -1;
      for (let r = 0; r < this.rows; r++) {
        const orb = this.grid[r]?.[c];
        const t = orb?.type;
        if (t !== undefined && t === type) { len++; }
        else {
          if (len >= 3) { for (let i = 1; i <= len; i++) set.add(`${r - i},${c}`); }
          len = 1; type = t !== undefined ? t : -1;
        }
      }
      if (len >= 3) { for (let i = 1; i <= len; i++) set.add(`${this.rows - i},${c}`); }
    }

    return Array.from(set).map(k => { const [r, c] = k.split(',').map(Number); return { row: r, col: c }; });
  }

  private async processMatches(matches: { row: number; col: number }[]) {
    this.comboCount++;
    const mult = this.comboCount;

    matches.forEach(cell => {
      const orb = this.grid[cell.row]?.[cell.col];
      if (orb) {
        this.score += 10 * mult;
        const obj = this.objectives.find(o => o.type === 'score');
        if (obj) obj.current = this.score;

        const matchObj = this.objectives.find(o => o.type === 'orbs_matched' && o.element === orb.type);
        if (matchObj) matchObj.current++;
      }
    });
    if (matches.length >= 4) this.score += 50 * mult;
    if (matches.length >= 5) this.score += 100 * mult;
    this.scoreText.setText(String(this.score));
    this.updateObjectiveDisplay();

    if (mult > 1) this.showCombo();

    const crateHits = new Set<string>();
    for (const cell of matches) {
      const neighbors = [
        { row: cell.row - 1, col: cell.col },
        { row: cell.row + 1, col: cell.col },
        { row: cell.row, col: cell.col - 1 },
        { row: cell.row, col: cell.col + 1 },
      ];
      for (const n of neighbors) {
        if (n.row >= 0 && n.row < this.rows && n.col >= 0 && n.col < this.cols) {
          const key = `${n.row},${n.col}`;
          if (this.crates.has(key)) crateHits.add(key);
        }
      }
    }

    for (const key of crateHits) {
      const crate = this.crates.get(key)!;
      crate.hits--;
      if (crate.hits <= 0) {
        this.removeCrate(key);
      }
    }

    const pops: Promise<void>[] = [];
    matches.forEach(cell => {
      const orb = this.grid[cell.row]?.[cell.col];
      if (!orb || !orb.sprite) return;
      sound.playMatch(orb.type, this.comboCount);
      const x = this.cellX(cell.col);
      const y = this.cellY(cell.row);
      this.burstParticles(x, y, orb.type);

      if (orb.iceLayers > 0) {
        orb.iceLayers--;
        if (orb.iceLayers <= 0) {
          if (orb.iceSprite) { orb.iceSprite.destroy(); orb.iceSprite = null; }
        }
      }

      pops.push(new Promise<void>(resolve => {
        this.tweens.add({
          targets: orb.sprite, scaleX: 0, scaleY: 0, alpha: 0, duration: 250, ease: 'Back.easeIn',
          onComplete: () => { orb.sprite!.destroy(); this.grid[cell.row][cell.col] = null; resolve(); },
        });
      }));
    });

    await Promise.all(pops);
    await this.applyGravity();
    await this.fillEmpty();

    if (this.checkWin()) return;

    const nextMatches = this.findMatches();
    if (nextMatches.length > 0 && !this.levelComplete) await this.processMatches(nextMatches);
  }

  private removeCrate(key: string) {
    const crate = this.crates.get(key);
    if (!crate) return;
    crate.graphic.destroy();
    this.crates.delete(key);
  }

  private checkWin(): boolean {
    for (const obj of this.objectives) {
      if (obj.current < obj.target) return false;
    }
    if (!this.levelComplete) {
      this.levelComplete = true;
      this.time.delayedCall(500, () => this.gameOver(true));
    }
    return true;
  }

  private applyGravity(): Promise<void> {
    const falls: Promise<void>[] = [];
    for (let c = 0; c < this.cols; c++) {
      let writeRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.isCrate(r, c)) {
          writeRow = r - 1;
          continue;
        }
        if (this.grid[r][c] !== null) {
          if (r !== writeRow) {
            const orb = this.grid[r][c]!;
            orb.row = writeRow;
            this.grid[writeRow][c] = orb;
            this.grid[r][c] = null;
            falls.push(new Promise<void>(resolve => {
              this.tweens.add({ targets: orb.sprite, y: this.cellY(writeRow), duration: 120 + (writeRow - r) * 20, ease: 'Bounce.easeOut', onComplete: () => resolve() });
            }));
          }
          writeRow--;
        }
      }
    }
    return Promise.all(falls).then(() => {});
  }

  private fillEmpty(): Promise<void> {
    const falls: Promise<void>[] = [];
    for (let c = 0; c < this.cols; c++) {
      let emptyCount = 0;
      for (let r = 0; r < this.rows; r++) { if (this.grid[r][c] === null && !this.isCrate(r, c)) emptyCount++; }

      for (let r = 0; r < this.rows; r++) {
        if (this.isCrate(r, c)) continue;
        if (this.grid[r][c] === null) {
          const maxType = this.levelDef.orbTypes;
          let type = Phaser.Math.Between(0, maxType - 1);
          if (r >= 2 && this.grid[r - 1]?.[c]?.type === type && this.grid[r - 2]?.[c]?.type === type) {
            type = (type + 1) % maxType;
            if (r >= 2 && this.grid[r - 1]?.[c]?.type === type && this.grid[r - 2]?.[c]?.type === type) type = (type + 1) % maxType;
          }
          if (c >= 2 && this.grid[r]?.[c - 1]?.type === type && this.grid[r]?.[c - 2]?.type === type) type = (type + 1) % maxType;

          const startY = this.cellY(r) - emptyCount * (this.cell + this.gap);
          const s = this.add.sprite(this.cellX(c), startY, `orb_${type}`).setDepth(1);
          s.setScale(this.cell / 128);
          this.grid[r][c] = { type, row: r, col: c, sprite: s, iceLayers: 0, iceSprite: null };
          emptyCount--;

          falls.push(new Promise<void>(resolve => {
            this.tweens.add({ targets: s, y: this.cellY(r), duration: 180 + (this.rows - r) * 15, ease: 'Bounce.easeOut', delay: (this.rows - r) * 10, onComplete: () => resolve() });
          }));
        }
      }
    }
    return Promise.all(falls).then(() => {});
  }

  private hasValidMoves(): boolean {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.isCrate(r, c)) continue;
        if (c + 1 < this.cols && !this.isCrate(r, c + 1)) {
          this.swapInGrid(r, c, r, c + 1);
          if (this.findMatches().length > 0) { this.swapInGrid(r, c, r, c + 1); return true; }
          this.swapInGrid(r, c, r, c + 1);
        }
        if (r + 1 < this.rows && !this.isCrate(r + 1, c)) {
          this.swapInGrid(r, c, r + 1, c);
          if (this.findMatches().length > 0) { this.swapInGrid(r, c, r + 1, c); return true; }
          this.swapInGrid(r, c, r + 1, c);
        }
      }
    }
    return false;
  }

  private async shuffleBoard(): Promise<void> {
    const types: number[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.isCrate(r, c)) continue;
        const orb = this.grid[r][c]; if (orb) types.push(orb.type);
      }
    }

    let attempts = 0;
    do {
      Phaser.Utils.Array.Shuffle(types);
      let idx = 0;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.isCrate(r, c)) continue;
          if (this.grid[r][c]) this.grid[r][c]!.type = types[idx++];
        }
      }
      attempts++;
    } while (this.findMatches().length > 0 && attempts < 30);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.isCrate(r, c)) continue;
        const orb = this.grid[r][c];
        if (orb?.sprite) orb.sprite.setTexture(`orb_${orb.type}`);
      }
    }

    const flash = this.add.graphics().setDepth(15);
    flash.fillStyle(0xffffff, 0.8);
    flash.fillRect(0, 0, this.camW, this.camH);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

    if (!this.hasValidMoves()) await this.shuffleBoard();
  }

  private countStars(score: number): number {
    const [one, two, three] = this.levelDef.starScore;
    if (score >= three && this.allObjectivesMet()) return 3;
    if (score >= two && this.allObjectivesMet()) return 2;
    if (score >= one && this.allObjectivesMet()) return 1;
    return 0;
  }

  private allObjectivesMet(): boolean {
    return this.objectives.every(o => o.current >= o.target);
  }

  private gameOver(won: boolean) {
    this.isProcessing = true;
    const w = this.camW, h = this.camH;
    const s = this.sf;

    const overlay = this.add.graphics().setDepth(50);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);

    const panelW = Math.min(won ? 500 * s : 440 * s, w * 0.9);
    const panelH = won ? 600 * s : 380 * s;
    const panelX = w / 2;
    const panelY = h / 2;
    const panelR = 20 * s;

    const panel = this.add.graphics().setDepth(50);
    this.drawWoodPanelGfx(panel, panelX, panelY, panelW, panelH, panelR);

    let yOff = panelY - panelH / 2;

    const titleText = won ? 'LEVEL COMPLETE!' : 'GAME OVER';
    const titleColor = won ? '#4ade80' : '#f87171';
    const title = this.add.text(panelX, yOff + (won ? 42 : 36) * s, titleText, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(38 * s)}px`, color: titleColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 400, delay: 100, ease: 'Back.easeOut' });

    if (won) {
      const stars = this.countStars(this.score);
      this.saveStars(stars);
      addCoins(COINS_PER_WIN);

      const starStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
      const starText = this.add.text(panelX, yOff + 86 * s, starStr, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(46 * s)}px`, color: '#fbbf24',
      }).setOrigin(0.5).setDepth(51).setAlpha(0);
      this.tweens.add({ targets: starText, alpha: 1, scaleX: { from: 2, to: 1 }, scaleY: { from: 2, to: 1 }, duration: 600, delay: 300, ease: 'Elastic.easeOut' });

      const levelLabel = this.add.text(panelX, yOff + 118 * s, `Level ${this.levelDef.id}`, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(18 * s)}px`, color: '#c4b5fd', fontStyle: 'italic',
      }).setOrigin(0.5).setDepth(51).setAlpha(0);
      this.tweens.add({ targets: levelLabel, alpha: 1, duration: 400, delay: 350, ease: 'Quad.easeOut' });
    }

    const scoreLabelY = yOff + (won ? 152 : 86) * s;
    const scoreLabel = this.add.text(panelX, scoreLabelY, 'COINS EARNED', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(15 * s)}px`, color: '#a78bfa', fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(51).setAlpha(0);
    this.tweens.add({ targets: scoreLabel, alpha: 1, duration: 400, delay: won ? 400 : 200, ease: 'Quad.easeOut' });

    const coinCenterY = scoreLabelY + (won ? 38 : 30) * s;
    const coinIconGO = this.add.text(panelX - 58 * s, coinCenterY, '\u{1FA99}', {
      fontSize: `${Math.round(40 * s)}px`,
    }).setOrigin(0.5).setDepth(51).setAlpha(0).setPadding(0, 4, 0, 4);
    this.tweens.add({ targets: coinIconGO, alpha: 1, duration: 400, delay: won ? 450 : 250, ease: 'Quad.easeOut' });

    const scoreVal = this.add.text(panelX + 52 * s, coinCenterY, String(this.score), {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(54 * s)}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(51).setAlpha(0);
    this.tweens.add({ targets: scoreVal, alpha: 1, duration: 400, delay: won ? 500 : 300, ease: 'Quad.easeOut' });

    const btnW = Math.min(260 * s, panelW - 40 * s);
    const btnH = 60 * s;
    const btnX = panelX - btnW / 2;
    let btnY = yOff + (won ? 244 : 154) * s;

    const makeWoodBtn = (label: string, bx: number, by: number, depth: number, alpha0: boolean) => {
      const wood = this.add.image(panelX, by + btnH / 2, 'wood_panel').setDepth(depth);
      wood.setDisplaySize(btnW, btnH);
      const border = this.add.graphics().setDepth(depth + 0.1);
      border.lineStyle(2 * s, 0x8b6914, 0.6);
      border.strokeRoundedRect(bx, by, btnW, btnH, 12 * s);
      const txt = this.add.text(panelX, by + btnH / 2, label, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(18 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(depth + 0.2);
      const zone = this.add.zone(panelX, by + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true }).setDepth(depth + 0.3);
      zone.on('pointerover', () => { border.clear(); border.lineStyle(3 * s, 0xffd700, 1); border.strokeRoundedRect(bx, by, btnW, btnH, 12 * s); });
      zone.on('pointerout', () => { border.clear(); border.lineStyle(2 * s, 0x8b6914, 0.6); border.strokeRoundedRect(bx, by, btnW, btnH, 12 * s); });
      if (alpha0) { wood.setAlpha(0); border.setAlpha(0); txt.setAlpha(0); }
      return { wood, border, txt, zone };
    };

    if (won) {
      const hasNext = !!getLevel(this.levelDef.id + 1);
      const nextLabel = hasNext ? 'NEXT LEVEL' : 'YOU WIN!';
      const next = makeWoodBtn(nextLabel, btnX, btnY, 51, true);
      this.tweens.add({ targets: [next.wood, next.border, next.txt], alpha: 1, duration: 400, delay: 700, ease: 'Quad.easeOut' });
      if (hasNext) {
        next.zone.on('pointerdown', () => this.scene.start('GameScene', { levelId: this.levelDef.id + 1 }));
      } else {
        next.zone.on('pointerdown', () => this.scene.start('LevelSelectScene'));
      }
      btnY += btnH + 14 * s;
    }

    const replay = makeWoodBtn('RETRY', btnX, btnY, 51, true);
    this.tweens.add({ targets: [replay.wood, replay.border, replay.txt], alpha: 1, duration: 400, delay: won ? 850 : 500, ease: 'Quad.easeOut' });
    replay.zone.on('pointerdown', () => this.scene.start('GameScene', { levelId: this.levelDef.id }));

    btnY += btnH + 14 * s;
    const menu = makeWoodBtn('MENU', btnX, btnY, 51, true);
    this.tweens.add({ targets: [menu.wood, menu.border, menu.txt], alpha: 1, duration: 400, delay: won ? 1000 : 650, ease: 'Quad.easeOut' });
    menu.zone.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });
  }

  private drawWoodPanelGfx(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, r: number) {
    const x = cx - w / 2, y = cy - h / 2;
    g.fillStyle(0x0a0815, 0.9);
    g.fillRoundedRect(x + 4, y + 4, w, h, r);
    g.fillStyle(0x2d1a3a, 0.95);
    g.fillRoundedRect(x, y, w, h, r);
    g.fillStyle(0x3d2550, 0.3);
    g.fillRoundedRect(x + 4, y + 4, w - 8, h * 0.35, r - 2);
    g.lineStyle(2.5, 0x8b6914, 0.7);
    g.strokeRoundedRect(x, y, w, h, r);
    g.fillStyle(0x5c3a1e, 0.2);
    g.fillRoundedRect(x + 6, y + 6, w - 12, h * 0.45, r - 3);
  }

  private drawButtonGfx(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, s: number, hover: boolean, secondary: boolean = false) {
    g.clear();
    const baseColor = secondary ? (hover ? 0x5c3a6a : 0x4a3a5a) : (hover ? 0x9b59ff : 0x7c3aed);
    const borderColor = secondary ? (hover ? 0x8b5cf6 : 0x6b4c7a) : (hover ? 0xd6bbfc : 0xa78bfa);
    const shadowColor = 0x1a0a2e;

    g.fillStyle(shadowColor, 0.5);
    g.fillRoundedRect(x + 3, y + 3, w, h, 26 * s);
    g.fillStyle(baseColor, 1);
    g.fillRoundedRect(x, y, w, h, 26 * s);
    g.lineStyle(2, borderColor, 0.8);
    g.strokeRoundedRect(x, y, w, h, 26 * s);
    g.fillStyle(0xffffff, hover ? 0.08 : 0);
    g.fillRoundedRect(x + 6, y + 6, w - 12, h * 0.4, 20 * s);
  }

  private saveStars(stars: number) {
    try {
      const key = `level_${this.levelDef.id}_stars`;
      const prev = parseInt(localStorage.getItem(key) || '0', 10);
      if (stars > prev) {
        localStorage.setItem(key, String(stars));
      }
    } catch { }
  }

  // ---- Effects ----

  private burstParticles(x: number, y: number, type: number) {
    if (type === 0) {
      const w = this.camW, h = this.camH;
      const s = this.sf;
      this.cameras.main.shake(300, 0.022);

      const flashWhite = this.add.graphics().setDepth(50);
      flashWhite.fillStyle(0xffffff, 0.3); flashWhite.fillRect(0, 0, w, h);
      this.tweens.add({ targets: flashWhite, alpha: 0, duration: 120, ease: 'Quad.easeOut', onComplete: () => flashWhite.destroy() });

      const flashOrange = this.add.graphics().setDepth(49);
      flashOrange.fillStyle(0xff6600, 0.25); flashOrange.fillRect(0, 0, w, h);
      this.tweens.add({ targets: flashOrange, alpha: 0, duration: 300, ease: 'Quad.easeOut', delay: 40, onComplete: () => flashOrange.destroy() });

      const coreFlash = this.add.graphics().setDepth(12);
      coreFlash.fillStyle(0xffffff, 0.9); coreFlash.fillCircle(x, y, 6);
      this.tweens.add({ targets: coreFlash, scaleX: 8, scaleY: 8, alpha: 0, duration: 250, ease: 'Quad.easeOut', onComplete: () => coreFlash.destroy() });

      const shockwave1 = this.add.graphics().setDepth(12);
      shockwave1.lineStyle(4, 0xff8800, 0.8); shockwave1.strokeCircle(x, y, 4);
      this.tweens.add({ targets: shockwave1, scaleX: 18, scaleY: 18, alpha: 0, duration: 400, ease: 'Cubic.easeOut', onComplete: () => shockwave1.destroy() });

      const shockwave2 = this.add.graphics().setDepth(12);
      shockwave2.lineStyle(2.5, 0xffcc00, 0.5); shockwave2.strokeCircle(x, y, 4);
      this.tweens.add({ targets: shockwave2, scaleX: 30, scaleY: 30, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => shockwave2.destroy() });

      const shockwave3 = this.add.graphics().setDepth(11);
      shockwave3.lineStyle(1, 0xff3300, 0.25); shockwave3.strokeCircle(x, y, 4);
      this.tweens.add({ targets: shockwave3, scaleX: 45, scaleY: 45, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => shockwave3.destroy() });

      const coreFlame = this.add.particles(x, y, 'particle_fire_0', {
        speedY: { min: -200, max: -500 }, speedX: { min: -60, max: 60 },
        scale: { start: 2.0 * s, end: 0.2 * s },
        alpha: { start: 1, end: 0 }, rotate: { min: -90, max: 90 },
        angle: { min: 220, max: 320 }, lifespan: { min: 300, max: 700 },
        quantity: 20, tint: [0xffffff, 0xffffcc, 0xffdd66],
        blendMode: 'ADD', emitting: false,
      }).setDepth(10);
      coreFlame.explode();

      const mainFlame = this.add.particles(x, y, 'particle_fire_1', {
        speedY: { min: -100, max: -380 }, speedX: { min: -120, max: 120 },
        scale: { start: 2.2 * s, end: 0.1 * s },
        alpha: { start: 1, end: 0 }, rotate: { min: -180, max: 180 },
        angle: { min: 180, max: 360 }, lifespan: { min: 400, max: 1000 },
        quantity: 28, tint: [0xffdd44, 0xff8800, 0xff4400, 0xcc2200],
        blendMode: 'ADD', emitting: false,
      }).setDepth(10);
      mainFlame.explode();

      const outerFlame = this.add.particles(x, y, 'particle_fire_2', {
        speedY: { min: -60, max: -250 }, speedX: { min: -160, max: 160 },
        scale: { start: 1.8 * s, end: 0 },
        alpha: { start: 0.7, end: 0 }, rotate: { min: -360, max: 360 },
        angle: { min: 160, max: 380 }, lifespan: { min: 500, max: 1200 },
        quantity: 22, tint: [0xff4400, 0xcc2200, 0x881100, 0x440400],
        blendMode: 'ADD', emitting: false,
      }).setDepth(9);
      outerFlame.explode();

      const embers = this.add.particles(x, y, 'particle_fire_ember', {
        speed: { min: 150, max: 450 }, angle: { min: 180, max: 360 },
        gravityY: 120, scale: { start: 1.8 * s, end: 0 },
        alpha: { start: 1, end: 0 }, lifespan: { min: 700, max: 2200 },
        quantity: 22, tint: [0xffdd44, 0xff8800, 0xff4400, 0xcc2200],
        blendMode: 'ADD', emitting: false,
      }).setDepth(11);
      embers.explode();

      const smoke = this.add.particles(x, y, 'particle_fire_smoke', {
        speedY: { min: -20, max: -100 }, speedX: { min: -30, max: 30 },
        scale: { start: 1.5 * s, end: 3.0 * s },
        alpha: { start: 0.4, end: 0 }, lifespan: { min: 1500, max: 3500 },
        quantity: 10, emitting: false,
      }).setDepth(8);
      smoke.explode();

      this.time.delayedCall(3800, () => { coreFlame.destroy(); mainFlame.destroy(); outerFlame.destroy(); embers.destroy(); smoke.destroy(); });

      const gg = this.add.graphics().setDepth(10);
      gg.fillStyle(0xff4400, 0.3); gg.fillCircle(x, y, 18);
      gg.fillStyle(0xff8800, 0.18); gg.fillCircle(x, y, 30);
      gg.fillStyle(0xffcc00, 0.08); gg.fillCircle(x, y, 44);
      gg.fillStyle(0xff6600, 0.04); gg.fillCircle(x, y, 60);
      this.tweens.add({ targets: gg, alpha: 0, duration: 1000, delay: 150, ease: 'Quad.easeIn', onComplete: () => gg.destroy() });
      return;
    }

    if (type === 1) {
      const w = this.camW, h = this.camH;
      const s = this.sf;

      const flash = this.add.graphics().setDepth(50);
      flash.fillStyle(0x88ddff, 0.15); flash.fillRect(0, 0, w, h);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

      const core = this.add.graphics().setDepth(12);
      core.fillStyle(0xccf0ff, 0.8); core.fillCircle(x, y, 6);
      this.tweens.add({ targets: core, scaleX: 8, scaleY: 8, alpha: 0, duration: 250, ease: 'Quad.easeOut', onComplete: () => core.destroy() });

      const ring1 = this.add.graphics().setDepth(12);
      ring1.lineStyle(3, 0x88ddff, 0.7); ring1.strokeCircle(x, y, 4);
      this.tweens.add({ targets: ring1, scaleX: 16, scaleY: 16, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => ring1.destroy() });

      const ring2 = this.add.graphics().setDepth(12);
      ring2.lineStyle(2, 0xaae8ff, 0.45); ring2.strokeCircle(x, y, 4);
      this.tweens.add({ targets: ring2, scaleX: 28, scaleY: 28, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => ring2.destroy() });

      const ring3 = this.add.graphics().setDepth(11);
      ring3.lineStyle(1, 0xccf0ff, 0.2); ring3.strokeCircle(x, y, 4);
      this.tweens.add({ targets: ring3, scaleX: 42, scaleY: 42, alpha: 0, duration: 950, ease: 'Sine.easeOut', onComplete: () => ring3.destroy() });

      const crown = this.add.particles(x, y, 'particle_water_drop', {
        speedY: { min: -350, max: -120 }, speedX: { min: -180, max: 180 },
        gravityY: 500, scale: { start: 1.3 * s, end: 0.3 * s },
        alpha: { start: 1, end: 0.4 }, rotate: { min: -180, max: 180 },
        angle: { min: 0, max: 360 }, lifespan: { min: 500, max: 1200 },
        quantity: 28, tint: [0xffffff, 0xccf0ff, 0x99ddff],
        emitting: false,
      }).setDepth(10);
      crown.explode();

      const streams = this.add.particles(x, y, 'particle_water_drop', {
        speedY: { min: -500, max: -200 }, speedX: { min: -100, max: 100 },
        gravityY: 700, scale: { start: 1.0 * s, end: 0.2 * s },
        alpha: { start: 0.8, end: 0.2 }, rotate: { min: -90, max: 90 },
        angle: { min: 0, max: 360 }, lifespan: { min: 400, max: 900 },
        quantity: 18, tint: [0xffffff, 0xccf0ff, 0x88ddff],
        emitting: false,
      }).setDepth(10);
      streams.explode();

      const mist = this.add.particles(x, y, 'particle_water_splash', {
        speed: { min: 30, max: 160 }, angle: { min: 0, max: 360 },
        gravityY: 60, scale: { start: 2.5 * s, end: 0.5 * s },
        alpha: { start: 0.3, end: 0 }, lifespan: { min: 800, max: 2000 },
        quantity: 16, tint: [0xccf0ff, 0xaae8ff],
        blendMode: 'ADD', emitting: false,
      }).setDepth(9);
      mist.explode();

      this.time.delayedCall(2200, () => { crown.destroy(); streams.destroy(); mist.destroy(); });

      const bubbles = this.add.particles(x, y, 'particle_water_bubble', {
        speedY: { min: -30, max: -100 }, speedX: { min: -30, max: 30 },
        scale: { start: 0.6 * s, end: 1.2 * s }, alpha: { start: 0.5, end: 0 },
        lifespan: { min: 1500, max: 3000 }, quantity: 10,
        tint: [0xffffff, 0xccf0ff, 0x99ddff],
        blendMode: 'ADD', emitting: false,
      }).setDepth(11);
      bubbles.explode();
      this.time.delayedCall(3200, () => bubbles.destroy());

      const pool = this.add.graphics().setDepth(10);
      pool.fillStyle(0x3399ff, 0.2); pool.fillEllipse(x, y, 60, 30);
      pool.fillStyle(0x66ccff, 0.1); pool.fillEllipse(x, y, 90, 45);
      pool.fillStyle(0x88ddff, 0.05); pool.fillEllipse(x, y, 120, 60);
      this.tweens.add({ targets: pool, alpha: 0, duration: 1100, delay: 250, ease: 'Quad.easeIn', onComplete: () => pool.destroy() });
      return;
    }

    if (type === 3) {
      const w = this.camW, h = this.camH;
      const s = this.sf;
      const sf = this.add.graphics().setDepth(50);
      sf.fillStyle(0x44cc44, 0.12); sf.fillRect(0, 0, w, h);
      this.tweens.add({ targets: sf, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => sf.destroy() });

      const flash = this.add.graphics().setDepth(12);
      flash.fillStyle(0x88ff88, 0.6); flash.fillCircle(x, y, 8);
      this.tweens.add({ targets: flash, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

      const ring = this.add.graphics().setDepth(12);
      ring.lineStyle(3, 0x66dd66, 0.7); ring.strokeCircle(x, y, 4);
      this.tweens.add({ targets: ring, scaleX: 18, scaleY: 18, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });

      const leaves = this.add.particles(x, y, 'particle_leaf', {
        speedY: { min: -300, max: -80 }, speedX: { min: -180, max: 180 },
        gravityY: 250, scale: { start: 1.5 * s, end: 0.4 * s },
        alpha: { start: 1, end: 0.3 }, rotate: { min: -180, max: 180 },
        angle: { min: 0, max: 360 }, lifespan: { min: 800, max: 2000 },
        quantity: 22, tint: [0x88dd44, 0x44aa22, 0x66cc33, 0xaaee55],
        emitting: false,
      }).setDepth(10);
      leaves.explode();

      const petals = this.add.particles(x, y, 'particle_leaf', {
        speedY: { min: -100, max: -30 }, speedX: { min: -80, max: 80 },
        gravityY: 80, scale: { start: 0.8 * s, end: 0.2 * s },
        alpha: { start: 0.7, end: 0 }, rotate: { min: -90, max: 90 },
        lifespan: { min: 1200, max: 3000 }, quantity: 12,
        tint: [0x66cc33, 0x88dd44, 0x55bb22],
        emitting: false,
      }).setDepth(10);
      petals.explode();

      const spores = this.add.particles(x, y, 'particle_spark', {
        speed: { min: 40, max: 200 }, angle: { min: 0, max: 360 },
        gravityY: -30, scale: { start: 1.0 * s, end: 0 },
        alpha: { start: 0.6, end: 0 }, lifespan: { min: 1000, max: 2200 },
        quantity: 18, tint: [0x88ff88, 0x66ff44, 0xccff88, 0x44dd22],
        blendMode: 'ADD', emitting: false,
      }).setDepth(11);
      spores.explode();

      this.time.delayedCall(3200, () => { leaves.destroy(); petals.destroy(); spores.destroy(); });

      const pool = this.add.graphics().setDepth(10);
      pool.fillStyle(0x44cc44, 0.2); pool.fillCircle(x, y, 20);
      pool.fillStyle(0x66dd44, 0.1); pool.fillCircle(x, y, 32);
      pool.fillStyle(0x88ee55, 0.05); pool.fillCircle(x, y, 44);
      this.tweens.add({ targets: pool, alpha: 0, duration: 1200, delay: 200, ease: 'Quad.easeIn', onComplete: () => pool.destroy() });
      return;
    }

    if (type === 2) {
      const w = this.camW, h = this.camH;
      const s = this.sf;
      this.cameras.main.shake(200, 0.012);

      const sf = this.add.graphics().setDepth(50);
      sf.fillStyle(0x664422, 0.2); sf.fillRect(0, 0, w, h);
      this.tweens.add({ targets: sf, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => sf.destroy() });

      const ring = this.add.graphics().setDepth(12);
      ring.lineStyle(4, 0x886644, 0.7); ring.strokeCircle(x, y, 4);
      this.tweens.add({ targets: ring, scaleX: 16, scaleY: 16, alpha: 0, duration: 500, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });

      const rocks = this.add.particles(x, y, 'particle_rock_0', {
        speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 },
        gravityY: 500, scale: { start: 1.8 * s, end: 0.3 * s },
        alpha: { start: 1, end: 0.5 }, rotate: { min: -360, max: 360 },
        lifespan: { min: 600, max: 1500 }, quantity: 16,
        tint: [0x8a7a6a, 0x6a5a4a, 0x5a4a3a, 0x9a8a7a],
        emitting: false,
      }).setDepth(10);
      rocks.explode();

      const gravel = this.add.particles(x, y, 'particle_rock_1', {
        speed: { min: 150, max: 500 }, angle: { min: 0, max: 360 },
        gravityY: 600, scale: { start: 1.4 * s, end: 0.2 * s },
        alpha: { start: 1, end: 0.3 }, rotate: { min: -540, max: 540 },
        lifespan: { min: 400, max: 1000 }, quantity: 20,
        tint: [0x7a6a5a, 0x5a4a3a, 0x6a5a4a],
        emitting: false,
      }).setDepth(10);
      gravel.explode();

      const dust = this.add.particles(x, y, 'particle_rock_dust', {
        speed: { min: 30, max: 180 }, angle: { min: 0, max: 360 },
        gravityY: 100, scale: { start: 2.0 * s, end: 0 },
        alpha: { start: 0.5, end: 0 }, lifespan: { min: 800, max: 2200 },
        quantity: 18, blendMode: 'ADD', emitting: false,
      }).setDepth(11);
      dust.explode();

      const chips = this.add.particles(x, y, 'particle_rock_2', {
        speed: { min: 60, max: 250 }, angle: { min: 0, max: 360 },
        gravityY: 350, scale: { start: 1.0 * s, end: 0.1 * s },
        alpha: { start: 0.8, end: 0 }, rotate: { min: -720, max: 720 },
        lifespan: { min: 500, max: 1200 }, quantity: 10,
        tint: [0x9a8a7a, 0x6a5a4a, 0x8a7a6a],
        emitting: false,
      }).setDepth(10);
      chips.explode();

      this.time.delayedCall(2500, () => { rocks.destroy(); gravel.destroy(); dust.destroy(); chips.destroy(); });

      const crater = this.add.graphics().setDepth(10);
      crater.fillStyle(0x664422, 0.25); crater.fillCircle(x, y, 18);
      crater.fillStyle(0x553311, 0.12); crater.fillCircle(x, y, 30);
      this.tweens.add({ targets: crater, alpha: 0, duration: 1000, delay: 200, ease: 'Quad.easeIn', onComplete: () => crater.destroy() });
      return;
    }
  }

  private showCombo() {
    const x = this.camW / 2;
    const y = this.offY + this.gridW / 2;
    const s = this.sf;
    const text = this.add.text(x, y, `${this.comboCount}x COMBO!`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(36 * s)}px`, color: '#fbbf24',
      stroke: '#7c3aed', strokeThickness: Math.round(3 * s),
    }).setOrigin(0.5).setDepth(20).setScale(0);

    this.tweens.add({
      targets: text, scaleX: 1.2, scaleY: 1.2, alpha: 1, duration: 300, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: text, scaleX: 0, scaleY: 0, alpha: 0, duration: 400, ease: 'Back.easeIn', delay: 500, onComplete: () => text.destroy() });
      },
    });
  }
}
