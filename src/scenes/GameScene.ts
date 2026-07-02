import Phaser from 'phaser';
import { sound } from '../utils/sound';
import { LevelDef, levels, getLevel } from '../levels';
import { deductLife, addCoins, COINS_PER_WIN, hasLives, loadCoins, loadLives, MAX_LIVES, saveLives, saveLastLevel, loadLastLevel, spendCoins } from '../utils/save';
import { burstParticles } from '../utils/effects';
import { showBuyLivesModal as showBuyLivesModalFn } from '../utils/modal';
import { BoosterType, getBoosterCount, useBooster, addBooster, getBoosterPrice, getBoosterName } from '../utils/boosters';

const ELEMENT_COLORS: Record<number, number> = {
  0: 0xff5500, 1: 0x3399ff, 2: 0x996633, 3: 0x33cc33, 4: 0xaa44ff,
  5: 0x88ddff, 6: 0xccdd88,
};

const enum SpecialType {
  None = 0,
  StripedH = 1,
  StripedV = 2,
  Bomb = 3,
  ColorBomb = 4,
}

interface Orb {
  type: number;
  special: SpecialType;
  row: number;
  col: number;
  sprite: Phaser.GameObjects.Sprite | null;
  iceLayers: number;
  iceSprite: Phaser.GameObjects.Graphics | null;
  specialOverlay: Phaser.GameObjects.Graphics | null;
  specialText: Phaser.GameObjects.Text | null;
}

interface ObjectiveState {
  type: 'score' | 'orbs_matched' | 'destroy_ice' | 'destroy_crates' | 'collect_ingredient' | 'clear_jelly';
  target: number;
  current: number;
  element?: number;
  cleared?: Set<string>;
}

export class GameScene extends Phaser.Scene {
  private grid: (Orb | null)[][] = [];
  private score = 0;
  private timeLeft = 60;
  private movesLeft = 0;
  private isMovesMode = false;
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
  private movesText!: Phaser.GameObjects.Text;
  private mapBtn!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private targetTitle!: Phaser.GameObjects.Text;
  private levelsBtnWood!: Phaser.GameObjects.Image;
  private levelsBtnBorder!: Phaser.GameObjects.Graphics;
  private levelsBtnZone!: Phaser.GameObjects.Zone;
  private heartsText!: Phaser.GameObjects.Text;
  private hudCoinsText!: Phaser.GameObjects.Text;
  private objectivesTexts: Phaser.GameObjects.Text[] = [];
  private objectiveIcons: Phaser.GameObjects.Image[] = [];
  private objPanel!: Phaser.GameObjects.GameObject;
  private pauseBtn!: Phaser.GameObjects.Text;
  private paused = false;
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
  private aliveCrates: Set<string> = new Set();
  private resizeHandler: ((gameSize: any) => void) | null = null;

  private boosters: { type: BoosterType; btn: Phaser.GameObjects.Text; countText: Phaser.GameObjects.Text }[] = [];
  private activeBooster: BoosterType | null = null;
  private levelText!: Phaser.GameObjects.Text;
  private holesSet = new Set<string>();
  private portals: { from: string; to: string }[] = [];
  private portalGfx: Phaser.GameObjects.Graphics[] = [];
  private jellySet = new Set<string>();
  private jellyCleared = new Set<string>();

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
    this.isMovesMode = 'moves' in def && (def as any).moves > 0;
    this.movesLeft = this.isMovesMode ? (def as any).moves : 0;
    this.timeLeft = this.isMovesMode ? 9999 : def.time;
    this.score = 0;
    this.comboCount = 0;
    this.isProcessing = false;
    this.paused = false;
    this.selected = null;
    this.comboTimer = 0;
    this.showComboText = false;
    this.levelComplete = false;
    this.grid = [];
    this.objectives = [];
    this.crates.clear();
    this.aliveCrates.clear();
    this.objectivesTexts = [];
    this.objectiveIcons = [];
    this.holesSet.clear();
    this.portals = [];
    this.portalGfx.forEach(g => g.destroy());
    this.portalGfx = [];
    this.jellySet.clear();
    this.jellyCleared.clear();
    this.boosters = [];
    this.activeBooster = null;
  }

  create() {
    this.selGraphic = this.add.graphics().setDepth(5);

    this.events.on('shutdown', () => {
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
        this.resizeHandler = null;
      }
    });

    this.initObjectives();
    this.recalcLayout();
    if (this.resizeHandler) this.scale.off('resize', this.resizeHandler);
    this.resizeHandler = (gameSize: any) => this.handleResize(gameSize.width, gameSize.height);
    this.scale.on('resize', this.resizeHandler);

    this.drawBackground();
    this.initGrid();
    this.applyStartSpecials();
    this.drawBoard();
    this.createUI();
    this.handleResize(this.cameras.main.width, this.cameras.main.height);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDragStart(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onDragMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onSwipeEnd(p));
  }

  private initObjectives() {
    this.objectives = this.levelDef.objectives.map(o => {
      const base = {
        target: o.target,
        current: 0,
        element: o.element,
      };
      if (o.type === 'destroy_ice') return { ...base, type: 'destroy_ice' as const };
      if (o.type === 'destroy_crates') return { ...base, type: 'destroy_crates' as const };
      if (o.type === 'orbs_matched') return { ...base, type: 'orbs_matched' as const };
      if (o.type === 'collect_ingredient') return { ...base, type: 'collect_ingredient' as const };
      if (o.type === 'clear_jelly') return { ...base, type: 'clear_jelly' as const, cleared: new Set<string>() };
      return { ...base, type: 'score' as const };
    });
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

    if (this.isMovesMode) {
      this.movesText?.setPosition(panelX + panelW - 12 * s, row1y);
      this.movesText?.setFontSize(`${Math.round(24 * s)}px`);
    } else {
      this.timerText?.setPosition(panelX + panelW - 12 * s, row1y);
      this.timerText?.setFontSize(`${Math.round(30 * s)}px`);
      this.timerTextShadow?.setPosition(panelX + panelW - 10 * s, row1y + 2 * s);
      this.timerTextShadow?.setFontSize(`${Math.round(30 * s)}px`);
    }

    this.muteBtn?.setPosition(panelX + panelW - 12 * s - 90 * s - 20 * s, row2y);
    this.muteBtn?.setFontSize(`${Math.round(28 * s)}px`);

    this.pauseBtn?.setPosition(panelX + panelW - 12 * s - 90 * s - 62 * s, row2y);
    this.pauseBtn?.setFontSize(`${Math.round(28 * s)}px`);

    this.levelText?.setPosition(panelX + 10 * s, this.offY - 22 * s);
    this.levelText?.setFontSize(`${Math.round(16 * s)}px`);
    this.heartsText?.setPosition(panelX + 10 * s, row2y);
    this.heartsText?.setFontSize(`${Math.round(22 * s)}px`);

    this.hudCoinsText?.setPosition(panelX + panelW - 12 * s - 90 * s - 20 * s - 80 * s, row2y);
    this.hudCoinsText?.setFontSize(`${Math.round(20 * s)}px`);

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
      } else if (obj?.type === 'destroy_ice' || obj?.type === 'destroy_crates') {
        // graphics objects don't need repositioning - they get redrawn via redrawIceOverlays/redrawCrates
      } else if (obj?.element !== undefined) {
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

    this.levelText = this.add.text(panelX + 10 * s, this.offY - 22 * s, `Level ${this.levelDef.id}`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(16 * s)}px`, color: '#c4b5fd', fontStyle: 'italic',
    }).setOrigin(0, 0).setDepth(3);

    if (this.isMovesMode) {
      this.movesText = this.add.text(panelX + panelW - 12 * s, row1y, `Moves: ${this.movesLeft}`, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(24 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
      }).setOrigin(1, 0.5).setDepth(3);
    } else {
      this.timerText = this.add.text(panelX + panelW - 12 * s, row1y, String(Math.ceil(this.timeLeft)), {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(30 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
      }).setOrigin(1, 0.5).setDepth(3);
      this.timerTextShadow = this.add.text(panelX + panelW - 10 * s, row1y + 2 * s, String(Math.ceil(this.timeLeft)), {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(30 * s)}px`, color: '#0d0815', fontStyle: 'bold',
      }).setOrigin(1, 0.5).setDepth(2).setAlpha(0.4);
    }

    this.muteBtn = this.add.text(panelX + panelW - 12 * s - 90 * s - 20 * s, row2y, sound.muted ? '\u{1F507}' : '\u{1F50A}', {
      fontSize: `${Math.round(28 * s)}px`,
    }).setOrigin(1, 0).setDepth(3).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      const muted = sound.toggleMute();
      this.muteBtn.setText(muted ? '\u{1F507}' : '\u{1F50A}');
    });

    this.pauseBtn = this.add.text(panelX + panelW - 12 * s - 90 * s - 62 * s, row2y, '\u23F8', {
      fontSize: `${Math.round(28 * s)}px`,
    }).setOrigin(1, 0).setDepth(3).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => {
      if (this.paused) return;
      this.paused = true;
      this.showPauseModal();
    });

    const lives = loadLives();
    this.heartsText = this.add.text(panelX + 10 * s, row2y, '\u2764'.repeat(lives) + '\u2661'.repeat(Math.max(0, MAX_LIVES - lives)), {
      fontSize: `${Math.round(22 * s)}px`,
    }).setOrigin(0, 0).setDepth(3);

    const coins = loadCoins();
    this.hudCoinsText = this.add.text(panelX + panelW - 12 * s - 90 * s - 20 * s - 80 * s, row2y, `\u{1FA99} ${coins}`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(20 * s)}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(3);

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
    const objKeys = ['orb_0', 'orb_1', 'orb_2', 'orb_3', 'orb_4', 'orb_5', 'orb_6'];
    this.objectives.forEach((obj, i) => {
      const oy = row3y + (44 * s) * (i + 1);
      const iconY = oy + 6 * s;
      if (obj.type === 'score') {
        const icon = this.add.text(panelX + 54 * s, iconY, '\u{1FA99}', {
          fontSize: `${Math.round(24 * s)}px`,
        }).setOrigin(0.5).setDepth(3).setPadding(0, 4, 0, 4);
        this.objectiveIcons.push(icon as unknown as Phaser.GameObjects.Image);
      } else if (obj.type === 'destroy_ice') {
        const icon = this.add.graphics().setDepth(3);
        icon.fillStyle(0xb4dcff, 0.8);
        icon.fillCircle(panelX + 54 * s, iconY, 14 * s);
        icon.lineStyle(2 * s, 0xffffff, 0.8);
        icon.strokeCircle(panelX + 54 * s, iconY, 14 * s);
        this.objectiveIcons.push(icon as unknown as Phaser.GameObjects.Image);
      } else if (obj.type === 'destroy_crates') {
        const icon = this.add.graphics().setDepth(3);
        const hs = 14 * s;
        icon.fillStyle(0x6a5a4a, 1);
        icon.fillRoundedRect(panelX + 54 * s - hs, iconY - hs, hs * 2, hs * 2, 4 * s);
        icon.lineStyle(2 * s, 0x8b6914, 0.8);
        icon.strokeRoundedRect(panelX + 54 * s - hs, iconY - hs, hs * 2, hs * 2, 4 * s);
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

    this.createBoosterButtons(s, w, h);
  }

  private createBoosterButtons(s: number, w: number, h: number) {
    const boosterY = h - 52 * s;
    const boosterTypes: BoosterType[] = ['hammer', 'swap', 'extra_moves', 'shuffle'];
    const emojis: Record<BoosterType, string> = {
      hammer: '\u{1F528}', swap: '\u{1F504}', extra_moves: '\u23F0', shuffle: '\u{1F500}',
    };
    const spacing = Math.min(100 * s, (w - 12 * s) / boosterTypes.length);
    const startX = (w - spacing * (boosterTypes.length - 1)) / 2;

    this.boosters = [];
    boosterTypes.forEach((type, i) => {
      const bx = startX + i * spacing;
      const count = getBoosterCount(type);

      const btnBg = this.add.graphics().setDepth(2.5);
      btnBg.fillStyle(0x1a1018, 0.7);
      btnBg.fillRoundedRect(bx - 28 * s, boosterY - 26 * s, 56 * s, 56 * s, 12 * s);
      btnBg.lineStyle(2 * s, 0x8b6914, 0.5);
      btnBg.strokeRoundedRect(bx - 28 * s, boosterY - 26 * s, 56 * s, 56 * s, 12 * s);

      const btn = this.add.text(bx, boosterY - 2 * s, emojis[type], {
        fontSize: `${Math.round(42 * s)}px`,
      }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });

      const countBg = this.add.graphics().setDepth(3);
      countBg.fillStyle(0x2d1a3a, 0.9);
      countBg.fillCircle(bx + 22 * s, boosterY - 22 * s, 12 * s);
      countBg.lineStyle(1.5 * s, 0xffd700, 0.6);
      countBg.strokeCircle(bx + 22 * s, boosterY - 22 * s, 12 * s);

      const countText = this.add.text(bx + 22 * s, boosterY - 22 * s, String(count), {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(15 * s)}px`, color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(4);

      this.boosters.push({ type, btn, countText });

      btn.on('pointerdown', () => {
        if (this.isProcessing || this.levelComplete) return;
        if (getBoosterCount(type) <= 0) {
          this.showBoosterShop(type);
          return;
        }
        this.activateBooster(type);
      });

      this.input.on('gameobjectover', (p: any, go: any) => {
        if (go === btn) {
          btnBg.clear();
          btnBg.fillStyle(0x3d2550, 0.8);
          btnBg.fillRoundedRect(bx - 28 * s, boosterY - 26 * s, 56 * s, 56 * s, 12 * s);
          btnBg.lineStyle(2.5 * s, 0xffd700, 0.7);
          btnBg.strokeRoundedRect(bx - 28 * s, boosterY - 26 * s, 56 * s, 56 * s, 12 * s);
        }
      });

      this.input.on('gameobjectout', (p: any, go: any) => {
        if (go === btn) {
          btnBg.clear();
          btnBg.fillStyle(0x1a1018, 0.7);
          btnBg.fillRoundedRect(bx - 28 * s, boosterY - 26 * s, 56 * s, 56 * s, 12 * s);
          btnBg.lineStyle(2 * s, 0x8b6914, 0.5);
          btnBg.strokeRoundedRect(bx - 28 * s, boosterY - 26 * s, 56 * s, 56 * s, 12 * s);
        }
      });
    });
  }

  private activateBooster(type: BoosterType) {
    if (!useBooster(type)) return;
    this.updateBoosterCounts();

    switch (type) {
      case 'hammer':
        this.activeBooster = 'hammer';
        break;
      case 'swap':
        this.activeBooster = 'swap';
        break;
      case 'extra_moves':
        if (this.isMovesMode) {
          this.movesLeft += 5;
          if (this.movesText) this.movesText.setText(`Moves: ${this.movesLeft}`);
        } else {
          this.timeLeft += 15;
        }
        this.activeBooster = null;
        break;
      case 'shuffle':
        this.shuffleBoardSoft();
        this.activeBooster = null;
        break;
    }
  }

  private updateBoosterCounts() {
    for (const b of this.boosters) {
      b.countText.setText(String(getBoosterCount(b.type)));
    }
  }

  private async shuffleBoardSoft() {
    const types: number[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.isCrate(r, c) || this.holesSet.has(`${r},${c}`)) continue;
        const orb = this.grid[r][c]; if (orb) types.push(orb.type);
      }
    }
    let attempts = 0;
    do {
      Phaser.Utils.Array.Shuffle(types);
      let idx = 0;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.isCrate(r, c) || this.holesSet.has(`${r},${c}`)) continue;
          if (this.grid[r][c]) this.grid[r][c]!.type = types[idx++];
        }
      }
      attempts++;
    } while (this.findMatches().length > 0 && attempts < 30);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const orb = this.grid[r][c];
        if (orb && orb.sprite) orb.sprite.setTexture(`orb_${orb.type}`);
      }
    }
    const flash = this.add.graphics().setDepth(15);
    flash.fillStyle(0xffffff, 0.8);
    flash.fillRect(0, 0, this.camW, this.camH);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
  }

  private showBoosterShop(type: BoosterType) {
    const w = this.camW, h = this.camH, s = this.sf;
    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);

    const panelW = Math.min(300 * s, w * 0.85);
    const panelH = 320 * s;
    const px = w / 2, py = h / 2;

    const panel = this.add.graphics().setDepth(201);
    const r = 16 * s;
    panel.fillStyle(0x1a1018, 0.95);
    panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, r);
    panel.lineStyle(2 * s, 0xffd700, 0.6);
    panel.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, r);

    const title = this.add.text(px, py - 110 * s, `${getBoosterName(type)} x1`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(24 * s)}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    const price = getBoosterPrice(type);
    const priceText = this.add.text(px, py - 60 * s, `${price} \u{1FA99} each`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(18 * s)}px`, color: '#c4b5fd',
    }).setOrigin(0.5).setDepth(202);

    const coins = loadCoins();
    const canBuy = coins >= price;

    const buyBtn = this.add.text(px, py + 10 * s, canBuy ? `BUY (${'\u{1FA99}'} ${price})` : 'NOT ENOUGH COINS', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(18 * s)}px`, color: canBuy ? '#4ade80' : '#f87171', fontStyle: 'bold',
      backgroundColor: '#2d1a3a', padding: { x: 20 * s, y: 12 * s },
    }).setOrigin(0.5).setDepth(202);

    const buyZone = this.add.zone(px, py + 10 * s, 220 * s, 52 * s).setInteractive({ useHandCursor: canBuy }).setDepth(203);

    if (canBuy) {
      buyZone.on('pointerdown', () => {
        spendCoins(price);
        addBooster(type, 1);
        this.updateBoosterCounts();
        overlay.destroy(); panel.destroy(); title.destroy(); priceText.destroy(); buyBtn.destroy(); buyZone.destroy(); closeBtn.destroy(); closeZone.destroy();
      });
    }

    const closeBtn = this.add.text(px, py + 80 * s, 'CLOSE', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(18 * s)}px`, color: '#a78bfa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    const closeZone = this.add.zone(px, py + 80 * s, 180 * s, 48 * s).setInteractive({ useHandCursor: true }).setDepth(203);
    closeZone.on('pointerdown', () => {
      overlay.destroy(); panel.destroy(); title.destroy(); priceText.destroy(); buyBtn.destroy(); buyZone.destroy(); closeBtn.destroy(); closeZone.destroy();
    });
  }

  private objectiveLabel(obj: ObjectiveState): string {
    if (obj.type === 'score') return `Coins: ${obj.current} / ${obj.target}`;
    if (obj.type === 'destroy_ice') return `Ice: ${obj.current} / ${obj.target}`;
    if (obj.type === 'destroy_crates') return `Crates: ${obj.current} / ${obj.target}`;
    if (obj.type === 'collect_ingredient') return `Ingredient: ${obj.current} / ${obj.target}`;
    if (obj.type === 'clear_jelly') return `Jelly: ${obj.current} / ${obj.target}`;
    const elName = obj.element !== undefined ? ['Fire', 'Water', 'Earth', 'Leaf', 'Lightning', 'Ice', 'Wind'][obj.element] : '';
    return `${elName}: ${obj.current} / ${obj.target}`;
  }

  private updateObjectiveDisplay() {
    this.objectivesTexts.forEach((t, i) => {
      t.setText(this.objectiveLabel(this.objectives[i]));
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50);

    if (this.paused) return;

    if (!this.isProcessing && !this.levelComplete) {
      if (this.isMovesMode) {
      } else {
        this.timeLeft -= dt / 1000;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.gameOver(false);
        }
        this.timerText.setText(String(Math.ceil(this.timeLeft)));
        if (this.timeLeft < 10) this.timerText.setColor('#ef4444');
      }
    }

    if (this.showComboText) {
      this.comboTimer -= dt / 1000;
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

    const glow = this.add.particles(0, 0, 'particle_fire_ember', {
      x: { min: this.offX, max: this.offX + this.gridW },
      y: { min: this.offY, max: this.offY + this.gridW },
      speedY: { min: -10, max: -30 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.6 * s, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: { min: 2000, max: 4000 },
      frequency: 400,
      quantity: 1,
      tint: [0xff6600, 0x3399ff, 0x66ee66, 0xaa44ff],
      blendMode: 'ADD',
    }).setDepth(-0.6);
    this.bgObjects.push(glow);

    const spark = this.add.particles(0, 0, 'particle_fire_0', {
      x: { min: this.offX, max: this.offX + this.gridW },
      y: { min: this.offY, max: this.offY + this.gridW },
      speedY: { min: -15, max: -40 },
      speedX: { min: -5, max: 5 },
      scale: { start: 0.4 * s, end: 0 },
      alpha: { start: 0.2, end: 0 },
      lifespan: { min: 800, max: 1500 },
      frequency: 500,
      quantity: 1,
      tint: [0xffdd44, 0xff8800, 0x88ddff, 0xccdd88],
      blendMode: 'ADD',
    }).setDepth(-0.6);
    this.bgObjects.push(spark);
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

    this.holesSet.clear();
    for (const h of this.levelDef.holes) this.holesSet.add(`${h.row},${h.col}`);

    this.jellySet.clear();
    this.jellyCleared.clear();
    for (const j of this.levelDef.jelly) this.jellySet.add(`${j.row},${j.col}`);

    this.portals = this.levelDef.portals.map(p => ({
      from: `${p.from.row},${p.from.col}`,
      to: `${p.to.row},${p.to.col}`,
    }));

    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        if (crateSet.has(`${r},${c}`) || this.holesSet.has(`${r},${c}`)) {
          this.grid[r][c] = null;
          continue;
        }
        let type: number;
        do { type = Phaser.Math.Between(0, this.levelDef.orbTypes - 1); }
        while (this.wouldMatch(r, c, type));
        this.grid[r][c] = { type, special: SpecialType.None, row: r, col: c, sprite: null, iceLayers: 0, iceSprite: null, specialOverlay: null, specialText: null };
      }
    }
  }

  private wouldMatch(row: number, col: number, type: number): boolean {
    if (col >= 2 && this.grid[row]?.[col - 1]?.type === type && this.grid[row]?.[col - 2]?.type === type) return true;
    if (row >= 2 && this.grid[row - 1]?.[col]?.type === type && this.grid[row - 2]?.[col]?.type === type) return true;
    return false;
  }

  private applyStartSpecials() {
    if (!this.levelDef.startSpecials) return;
    for (const sp of this.levelDef.startSpecials) {
      const orb = this.grid[sp.row]?.[sp.col];
      if (!orb) continue;
      const map: Record<string, SpecialType> = {
        StripedH: SpecialType.StripedH, StripedV: SpecialType.StripedV,
        Bomb: SpecialType.Bomb, ColorBomb: SpecialType.ColorBomb,
      };
      orb.special = map[sp.type] ?? SpecialType.None;
      if (sp.element !== undefined) orb.type = sp.element;
    }
  }

  private drawBoard() {
    const entranceTweens: Promise<void>[] = [];
    const holeGfx = this.add.graphics().setDepth(0);
    holeGfx.fillStyle(0x0a0815, 0.9);
    for (const hk of this.holesSet) {
      const [r, c] = hk.split(',').map(Number);
      const hx = this.cellX(c) - this.cell / 2 + 2;
      const hy = this.cellY(r) - this.cell / 2 + 2;
      const hs = this.cell - 4;
      holeGfx.fillRoundedRect(hx, hy, hs, hs, 6);
    }

    const jellyGfx = this.add.graphics().setDepth(0.1);
    for (const jk of this.jellySet) {
      const [r, c] = jk.split(',').map(Number);
      const jx = this.cellX(c) - this.cell / 2 + 3;
      const jy = this.cellY(r) - this.cell / 2 + 3;
      const js = this.cell - 6;
      jellyGfx.fillStyle(0x88ddff, 0.25);
      jellyGfx.fillRoundedRect(jx, jy, js, js, 4);
      jellyGfx.lineStyle(1.5, 0xaae8ff, 0.4);
      jellyGfx.strokeRoundedRect(jx, jy, js, js, 4);
    }

    for (const pd of this.portals) {
      const [r1, c1] = pd.from.split(',').map(Number);
      const [r2, c2] = pd.to.split(',').map(Number);
      for (const [r, c] of [[r1, c1], [r2, c2]]) {
        const pg = this.add.graphics().setDepth(-0.2);
        const px = this.cellX(c);
        const py = this.cellY(r);
        pg.fillStyle(0xaa44ff, 0.2);
        pg.fillCircle(px, py, this.cell / 2 + 2);
        pg.lineStyle(2, 0xcc88ff, 0.6);
        pg.strokeCircle(px, py, this.cell / 2 + 2);
        this.portalGfx.push(pg);
        this.tweens.add({ targets: pg, alpha: { from: 0.6, to: 1 }, duration: 1000, yoyo: true, repeat: -1 });
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const orb = this.grid[r][c];
        if (orb) {
          const s = this.add.sprite(this.cellX(c), this.cellY(r) - 60 * this.sf, `orb_${orb.type}`).setDepth(1);
          s.setScale(this.cell / 128);
          s.setAlpha(0);
          orb.sprite = s;
          if (orb.special) this.drawOrbSpecialOverlay(orb);

          const iceDef = this.levelDef.ice.find(i => i.row === r && i.col === c);
          if (iceDef) {
            orb.iceLayers = iceDef.layers || 1;
            this.drawIceOverlay(orb);
          }

          const delay = (r * this.cols + c) * 18;
          entranceTweens.push(new Promise<void>(resolve => {
            this.tweens.add({
              targets: s, y: this.cellY(r), alpha: 1, duration: 350, delay,
              ease: 'Back.easeOut', onComplete: () => resolve(),
            });
          }));
        }
      }
    }

    for (const cd of this.levelDef.crates) {
      this.createCrate(cd.row, cd.col, cd.hits || 1);
    }

    this.isProcessing = true;
    Promise.all(entranceTweens).then(() => { this.isProcessing = false; });
  }

  private drawOrbSpecialOverlay(orb: Orb) {
    if (orb.special === SpecialType.None || !orb.sprite) return;
    const g = this.add.graphics().setDepth(2);
    const x = this.cellX(orb.col);
    const y = this.cellY(orb.row);
    const half = this.cell / 2 - 2;
    const col = ELEMENT_COLORS[orb.type];
    const colStr = '#' + col.toString(16).padStart(6, '0');

    if (orb.special === SpecialType.StripedH || orb.special === SpecialType.StripedV) {
      g.lineStyle(3, 0xffffff, 0.8);
      if (orb.special === SpecialType.StripedH) {
        g.lineBetween(x - half + 4, y, x + half - 4, y);
      } else {
        g.lineBetween(x, y - half + 4, x, y + half - 4);
      }
      g.lineStyle(2, 0xffffff, 0.4);
      if (orb.special === SpecialType.StripedH) {
        g.lineBetween(x - half + 2, y - 5, x + half - 2, y - 5);
        g.lineBetween(x - half + 2, y + 5, x + half - 2, y + 5);
      } else {
        g.lineBetween(x - 5, y - half + 2, x - 5, y + half - 2);
        g.lineBetween(x + 5, y - half + 2, x + 5, y + half - 2);
      }
      orb.specialOverlay = g;
    } else if (orb.special === SpecialType.Bomb) {
      g.fillStyle(0x000000, 0.5);
      g.fillCircle(x, y, half * 0.55);
      g.lineStyle(2, 0xff4400, 1);
      g.strokeCircle(x, y, half * 0.55);
      g.lineStyle(1.5, 0xff8800, 0.7);
      g.strokeCircle(x, y, half * 0.35);
      orb.specialText = this.add.text(x, y, '\u{1F4A5}', {
        fontSize: `${Math.round(half * 1.2)}px`,
      }).setOrigin(0.5).setDepth(2.1);
      orb.specialOverlay = g;
    } else if (orb.special === SpecialType.ColorBomb) {
      const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
      const seg = (Math.PI * 2) / colors.length;
      for (let i = 0; i < colors.length; i++) {
        const start = i * seg - Math.PI / 2;
        const end = (i + 1) * seg - Math.PI / 2;
        g.fillStyle(colors[i], 0.8);
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, half * 0.7, start, end);
        g.closePath();
        g.fill();
      }
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeCircle(x, y, half * 0.7);
      orb.specialText = this.add.text(x, y, '\u2605', {
        fontSize: `${Math.round(half * 1)}px`, color: '#ffffff',
      }).setOrigin(0.5).setDepth(2.1);
      orb.specialOverlay = g;
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
    this.aliveCrates.add(`${row},${col}`);
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
    const savedHits = new Map<string, number>();
    for (const [key, crate] of this.crates) {
      savedHits.set(key, crate.hits);
      crate.graphic.destroy();
    }
    this.crates.clear();
    for (const key of this.aliveCrates) {
      const [r, c] = key.split(',').map(Number);
      const hits = savedHits.get(key) ?? (this.levelDef.crates.find(cd => cd.row === r && cd.col === c)?.hits || 1);
      this.createCrate(r, c, hits);
    }
  }

  private onDragStart(pointer: Phaser.Input.Pointer) {
    if (this.paused || this.isProcessing || this.levelComplete) return;
    if (pointer.y > this.offY + this.gridW + 20 * this.sf) return;
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
    if (this.paused || !this.dragStart) return;
    const start = this.dragStart;
    this.dragStart = null;
    const end = this.dragEnd || pointer;
    this.dragEnd = null;

    if (this.activeBooster === 'hammer') {
      this.activeBooster = null;
      const { col, row } = this.cellAt(pointer.x, pointer.y);
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
      const orb = this.grid[row]?.[col];
      if (!orb || this.isCrate(row, col) || this.holesSet.has(`${row},${col}`)) return;
      this.destroySingleOrb(row, col);
      return;
    }

    if (this.activeBooster === 'swap') {
      this.activeBooster = null;
      const { col, row } = this.cellAt(pointer.x, pointer.y);
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
      if (start.row === row && start.col === col) return;
      if (this.isAdjacent(start, { row, col })) {
        if (this.isCrate(row, col) || this.isCrate(start.row, start.col) || !this.grid[row][col] || !this.grid[start.row][start.col]) return;
        this.selected = null;
        this.attemptSwap(start.row, start.col, row, col);
        return;
      }
      this.selected = null;
      return;
    }

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

    const orbA = this.grid[r1][c1];
    const orbB = this.grid[r2][c2];

    if (orbA && orbB && orbA.special !== SpecialType.None && orbB.special !== SpecialType.None) {
      if (this.isMovesMode) {
        this.movesLeft--;
        if (this.movesText) this.movesText.setText(`Moves: ${this.movesLeft}`);
      }
      this.swapInGrid(r1, c1, r2, c2);
      await this.animateSwap(r1, c1, r2, c2);

      const toDestroy = new Set<string>();
      const add = (r: number, c: number) => {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && !this.isCrate(r, c) && this.grid[r][c]) {
          toDestroy.add(`${r},${c}`);
        }
      };

      const s1 = orbA.special, s2 = orbB.special;
      const midR = (r1 + r2) >> 1;
      const midC = (c1 + c2) >> 1;

      if (s1 === SpecialType.ColorBomb || s2 === SpecialType.ColorBomb) {
        const other = s1 === SpecialType.ColorBomb ? orbB : orbA;
        if (other.special === SpecialType.StripedH) {
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const o = this.grid[r][c];
              if (o && o.type === other.type && !this.isCrate(r, c)) {
                toDestroy.add(`${r},${c}`);
                for (let cc = 0; cc < this.cols; cc++) add(r, cc);
              }
            }
          }
        } else if (other.special === SpecialType.StripedV) {
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const o = this.grid[r][c];
              if (o && o.type === other.type && !this.isCrate(r, c)) {
                toDestroy.add(`${r},${c}`);
                for (let rr = 0; rr < this.rows; rr++) add(rr, c);
              }
            }
          }
        } else {
          for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
              if (!this.isCrate(r, c) && this.grid[r][c]) add(r, c);
        }
      } else if (
        (s1 === SpecialType.StripedH && s2 === SpecialType.StripedV) ||
        (s1 === SpecialType.StripedV && s2 === SpecialType.StripedH)
      ) {
        for (let c = 0; c < this.cols; c++) add(midR, c);
        for (let r = 0; r < this.rows; r++) add(r, midC);
      } else if (s1 === SpecialType.StripedH && s2 === SpecialType.StripedH) {
        for (let dr = -1; dr <= 1; dr++) {
          const rr = midR + dr;
          if (rr >= 0 && rr < this.rows) for (let c = 0; c < this.cols; c++) add(rr, c);
        }
      } else if (s1 === SpecialType.StripedV && s2 === SpecialType.StripedV) {
        for (let dc = -1; dc <= 1; dc++) {
          const cc = midC + dc;
          if (cc >= 0 && cc < this.cols) for (let r = 0; r < this.rows; r++) add(r, cc);
        }
      } else if (
        (s1 === SpecialType.StripedH && s2 === SpecialType.Bomb) ||
        (s1 === SpecialType.Bomb && s2 === SpecialType.StripedH)
      ) {
        for (let c = 0; c < this.cols; c++) add(midR, c);
        for (let c = 0; c < this.cols; c++)
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++)
              add(midR + dr, c + dc);
      } else if (
        (s1 === SpecialType.StripedV && s2 === SpecialType.Bomb) ||
        (s1 === SpecialType.Bomb && s2 === SpecialType.StripedV)
      ) {
        for (let r = 0; r < this.rows; r++) add(r, midC);
        for (let r = 0; r < this.rows; r++)
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++)
              add(r + dr, midC + dc);
      } else if (s1 === SpecialType.Bomb && s2 === SpecialType.Bomb) {
        for (let dr = -2; dr <= 2; dr++)
          for (let dc = -2; dc <= 2; dc++)
            add(midR + dr, midC + dc);
      }

      this.comboCount = 0;
      const destroyArray = Array.from(toDestroy).map(k => {
        const [r, c] = k.split(',').map(Number);
        return { row: r, col: c };
      });
      await this.processMatches(destroyArray, true);
      if (this.isMovesMode && this.movesLeft <= 0 && !this.levelComplete) {
        this.gameOver(false);
        this.isProcessing = false;
        return;
      }
      if (!this.hasValidMoves()) await this.shuffleBoard();
      this.isProcessing = false;
      return;
    }

    if (orbA && orbA.special === SpecialType.ColorBomb || orbB && orbB.special === SpecialType.ColorBomb) {
      const cb = orbA?.special === SpecialType.ColorBomb ? orbA : orbB;
      const other = cb === orbA ? orbB : orbA;
      if (cb && other && other.special === SpecialType.None) {
        if (this.isMovesMode) {
          this.movesLeft--;
          if (this.movesText) this.movesText.setText(`Moves: ${this.movesLeft}`);
        }
        this.swapInGrid(r1, c1, r2, c2);
        await this.animateSwap(r1, c1, r2, c2);
        const targetType = other.type;
        const all: { row: number; col: number }[] = [];
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const orb = this.grid[r][c];
            if (orb && orb.type === targetType && !this.isCrate(r, c)) all.push({ row: r, col: c });
          }
        }
        this.comboCount = 0;
        await this.processMatches(all, true);
        if (this.isMovesMode && this.movesLeft <= 0 && !this.levelComplete) {
          this.gameOver(false);
          this.isProcessing = false;
          return;
        }
        if (!this.hasValidMoves()) await this.shuffleBoard();
        this.isProcessing = false;
        return;
      }
    }

    this.swapInGrid(r1, c1, r2, c2);
    await this.animateSwap(r1, c1, r2, c2);

    const matches = this.findMatches();
    if (matches.length > 0) {
      if (this.isMovesMode) {
        this.movesLeft--;
        if (this.movesText) this.movesText.setText(`Moves: ${this.movesLeft}`);
      }
      this.comboCount = 0;
      await this.processMatches(matches, false);
    } else {
      sound.playDenied();
      this.swapInGrid(r1, c1, r2, c2);
      await this.animateSwap(r1, c1, r2, c2);
    }

    if (this.isMovesMode && this.movesLeft <= 0 && !this.levelComplete) {
      this.gameOver(false);
      this.isProcessing = false;
      return;
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

  private hasAnyMatch(): boolean {
    for (let r = 0; r < this.rows; r++) {
      let len = 1, type = -1;
      for (let c = 0; c < this.cols; c++) {
        const orb = this.grid[r]?.[c];
        const t = orb?.type;
        if (t !== undefined && t === type) { if (++len >= 3) return true; }
        else { len = 1; type = t !== undefined ? t : -1; }
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let len = 1, type = -1;
      for (let r = 0; r < this.rows; r++) {
        const orb = this.grid[r]?.[c];
        const t = orb?.type;
        if (t !== undefined && t === type) { if (++len >= 3) return true; }
        else { len = 1; type = t !== undefined ? t : -1; }
      }
    }
    return false;
  }

  private findMatchGroups(): { cells: { row: number; col: number }[]; dir: 'h' | 'v'; len: number }[] {
    const groups: { cells: { row: number; col: number }[]; dir: 'h' | 'v'; len: number }[] = [];
    for (let r = 0; r < this.rows; r++) {
      let start = 0, len = 1;
      for (let c = 1; c <= this.cols; c++) {
        const orb = this.grid[r]?.[c];
        const prev = this.grid[r]?.[c - 1];
        if (orb && prev && orb.type === prev.type && orb.type !== undefined) { len++; }
        else {
          if (len >= 3) {
            const cells: { row: number; col: number }[] = [];
            for (let i = 0; i < len; i++) cells.push({ row: r, col: start + i });
            groups.push({ cells, dir: 'h', len });
          }
          start = c; len = 1;
        }
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let start = 0, len = 1;
      for (let r = 1; r <= this.rows; r++) {
        const orb = this.grid[r]?.[c];
        const prev = this.grid[r - 1]?.[c];
        if (orb && prev && orb.type === prev.type && orb.type !== undefined) { len++; }
        else {
          if (len >= 3) {
            const cells: { row: number; col: number }[] = [];
            for (let i = 0; i < len; i++) cells.push({ row: start + i, col: c });
            groups.push({ cells, dir: 'v', len });
          }
          start = r; len = 1;
        }
      }
    }
    return groups;
  }

  private async processMatches(matches: { row: number; col: number }[], fromColorBomb: boolean) {
    this.comboCount++;
    const mult = this.comboCount;

    const groups = fromColorBomb ? [] : this.findMatchGroups();
    const specialToCreate: { row: number; col: number; special: SpecialType; type: number }[] = [];

    if (!fromColorBomb) {
      for (const g of groups) {
        if (g.len >= 5) {
          const mid = g.cells[Math.floor(g.cells.length / 2)];
          const type = this.grid[mid.row]?.[mid.col]?.type;
          if (type !== undefined) specialToCreate.push({ row: mid.row, col: mid.col, special: SpecialType.ColorBomb, type });
        } else if (g.len >= 4) {
          const mid = g.cells[Math.floor(g.cells.length / 2)];
          const type = this.grid[mid.row]?.[mid.col]?.type;
          if (type !== undefined) specialToCreate.push({ row: mid.row, col: mid.col, special: g.dir === 'h' ? SpecialType.StripedH : SpecialType.StripedV, type });
        }
      }

      const cellCount = new Map<string, number>();
      for (const g of groups) {
        if (g.len >= 3) {
          for (const c of g.cells) {
            const key = `${c.row},${c.col}`;
            cellCount.set(key, (cellCount.get(key) || 0) + 1);
          }
        }
      }
      for (const [key, count] of cellCount) {
        if (count >= 2) {
          const [rStr, cStr] = key.split(',');
          const row = parseInt(rStr), col = parseInt(cStr);
          if (!specialToCreate.find(s => s.row === row && s.col === col)) {
            const type = this.grid[row]?.[col]?.type;
            if (type !== undefined) specialToCreate.push({ row, col, special: SpecialType.Bomb, type });
          }
        }
      }
    }

    const toDestroy = new Set<string>();
    const effectTriggers: { row: number; col: number; special: SpecialType }[] = [];

    for (const cell of matches) {
      toDestroy.add(`${cell.row},${cell.col}`);
      const orb = this.grid[cell.row]?.[cell.col];
      if (orb && orb.special !== SpecialType.None) {
        effectTriggers.push({ row: cell.row, col: cell.col, special: orb.special });
      }
    }

    let triggerIdx = 0;
    while (triggerIdx < effectTriggers.length) {
      const et = effectTriggers[triggerIdx];
      triggerIdx++;
      const extra = this.specialEffectCells(et);
      for (const ec of extra) {
        const key = `${ec.row},${ec.col}`;
        if (!toDestroy.has(key)) {
          toDestroy.add(key);
          const orb = this.grid[ec.row]?.[ec.col];
          if (orb && orb.special !== SpecialType.None) {
            effectTriggers.push({ row: ec.row, col: ec.col, special: orb.special });
          }
        }
      }
    }

    for (const sc of specialToCreate) {
      toDestroy.delete(`${sc.row},${sc.col}`);
    }

    for (const key of toDestroy) {
      const [rStr, cStr] = key.split(',');
      const row = parseInt(rStr), col = parseInt(cStr);
      const orb = this.grid[row]?.[col];
      if (orb) {
        this.score += 5 * mult;
        for (const obj of this.objectives) {
          if (obj.type === 'score') obj.current = this.score;
          if (obj.type === 'orbs_matched' && obj.element === orb.type) obj.current++;
          if (obj.type === 'destroy_ice' && orb.iceLayers > 0) obj.current++;
        }
      }
    }

    if (toDestroy.size >= 4) {
      this.score += 25 * mult;
      this.showScorePopup(this.camW / 2, this.offY + this.gridW / 2 - 30 * this.sf, 25 * mult, 0xfbbf24);
    }
    if (toDestroy.size >= 5) {
      this.score += 50 * mult;
      this.showScorePopup(this.camW / 2, this.offY + this.gridW / 2 - 50 * this.sf, 50 * mult, 0xff6b35);
    }
    this.scoreText.setText(String(this.score));
    this.updateObjectiveDisplay();
    if (mult > 1) this.showCombo();

    const crateHits = new Set<string>();
    for (const key of toDestroy) {
      const [rStr, cStr] = key.split(',');
      const r = parseInt(rStr), c = parseInt(cStr);
      for (const n of [{ row: r - 1, col: c }, { row: r + 1, col: c }, { row: r, col: c - 1 }, { row: r, col: c + 1 }]) {
        if (n.row >= 0 && n.row < this.rows && n.col >= 0 && n.col < this.cols) {
          const ck = `${n.row},${n.col}`;
          if (this.crates.has(ck)) crateHits.add(ck);
        }
      }
    }
    for (const key of crateHits) {
      const crate = this.crates.get(key)!;
      crate.hits--;
      if (crate.hits <= 0) {
        this.removeCrate(key);
        for (const obj of this.objectives) if (obj.type === 'destroy_crates') obj.current++;
        this.updateObjectiveDisplay();
      }
    }

    for (const key of toDestroy) {
      if (this.jellySet.has(key) && !this.jellyCleared.has(key)) {
        this.jellyCleared.add(key);
        for (const obj of this.objectives) {
          if (obj.type === 'clear_jelly') obj.current = this.jellyCleared.size;
        }
      }
    }

    const pops: Promise<void>[] = [];
    for (const key of toDestroy) {
      const [rStr, cStr] = key.split(',');
      const r = parseInt(rStr), c = parseInt(cStr);
      const orb = this.grid[r]?.[c];
      if (!orb || !orb.sprite) continue;
      sound.playMatch(orb.type, this.comboCount);
      burstParticles(this, this.cellX(c), this.cellY(r), orb.type, this.camW, this.camH, this.sf);
      if (orb.specialOverlay) { orb.specialOverlay.destroy(); orb.specialOverlay = null; }
      if (orb.specialText) { orb.specialText.destroy(); orb.specialText = null; }
      if (orb.iceLayers > 0) {
        orb.iceLayers--;
        if (orb.iceLayers <= 0) { if (orb.iceSprite) { orb.iceSprite.destroy(); orb.iceSprite = null; } }
      }
      pops.push(new Promise<void>(resolve => {
        this.tweens.add({
          targets: orb.sprite, scaleX: 0, scaleY: 0, alpha: 0, duration: 250, ease: 'Back.easeIn',
          onComplete: () => { orb.sprite!.destroy(); this.grid[r][c] = null; resolve(); },
        });
      }));
    }
    await Promise.all(pops);

    for (const sc of specialToCreate) {
      if (this.isCrate(sc.row, sc.col)) continue;
      const old = this.grid[sc.row][sc.col];
      if (old) {
        if (old.specialOverlay) { old.specialOverlay.destroy(); old.specialOverlay = null; }
        if (old.specialText) { old.specialText.destroy(); old.specialText = null; }
        if (old.sprite) old.sprite.destroy();
        this.grid[sc.row][sc.col] = null;
      }
      await this.createSpecialOrb(sc.row, sc.col, sc.special, sc.type);
    }

    await this.applyGravity();
    await this.fillEmpty();
    if (this.checkWin()) { this.updateObjectiveDisplay(); return; }

    const next = this.findMatches();
    if (next.length > 0 && !this.levelComplete) await this.processMatches(next, false);
  }

  private specialEffectCells(et: { row: number; col: number; special: SpecialType }): { row: number; col: number }[] {
    const out: { row: number; col: number }[] = [];
    if (et.special === SpecialType.StripedH) {
      for (let c = 0; c < this.cols; c++) if (!this.isCrate(et.row, c) && this.grid[et.row]?.[c]) out.push({ row: et.row, col: c });
    } else if (et.special === SpecialType.StripedV) {
      for (let r = 0; r < this.rows; r++) if (!this.isCrate(r, et.col) && this.grid[r]?.[et.col]) out.push({ row: r, col: et.col });
    } else if (et.special === SpecialType.Bomb) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = et.row + dr, cc = et.col + dc;
        if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols && !this.isCrate(rr, cc) && this.grid[rr]?.[cc]) out.push({ row: rr, col: cc });
      }
    }
    return out;
  }

  private async destroySingleOrb(row: number, col: number) {
    const orb = this.grid[row]?.[col];
    if (!orb || !orb.sprite) return;
    const key = `${row},${col}`;
    if (this.jellySet.has(key) && !this.jellyCleared.has(key)) {
      this.jellyCleared.add(key);
      for (const obj of this.objectives) {
        if (obj.type === 'clear_jelly') obj.current = this.jellyCleared.size;
      }
    }
    burstParticles(this, this.cellX(col), this.cellY(row), orb.type, this.camW, this.camH, this.sf);
    this.score += 5;
    this.scoreText.setText(String(this.score));
    if (orb.iceLayers > 0) {
      orb.iceLayers--;
      if (orb.iceLayers <= 0) { if (orb.iceSprite) { orb.iceSprite.destroy(); orb.iceSprite = null; } }
    }
    this.updateObjectiveDisplay();
    await new Promise<void>(resolve => {
      this.tweens.add({
        targets: orb.sprite, scaleX: 0, scaleY: 0, alpha: 0, duration: 200, ease: 'Back.easeIn',
        onComplete: () => { orb.sprite!.destroy(); this.grid[row][col] = null; resolve(); },
      });
    });
    await this.applyGravity();
    await this.fillEmpty();
    if (this.checkWin()) { this.updateObjectiveDisplay(); return; }
    const next = this.findMatches();
    if (next.length > 0 && !this.levelComplete) await this.processMatches(next, false);
  }

  private createSpecialOrb(row: number, col: number, special: SpecialType, type: number): Promise<void> {
    return new Promise<void>(resolve => {
      const s = this.add.sprite(this.cellX(col), this.cellY(row), `orb_${type}`).setDepth(1).setScale(0);
      const orb: Orb = { type, special, row, col, sprite: s, iceLayers: 0, iceSprite: null, specialOverlay: null, specialText: null };
      this.grid[row][col] = orb;
      this.drawOrbSpecialOverlay(orb);
      this.tweens.add({
        targets: s, scaleX: this.cell / 128, scaleY: this.cell / 128, duration: 300, ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private removeCrate(key: string) {
    const crate = this.crates.get(key);
    if (!crate) return;
    crate.graphic.destroy();
    this.crates.delete(key);
    this.aliveCrates.delete(key);
  }

  private checkWin(): boolean {
    if (this.levelComplete) return true;
    for (const obj of this.objectives) {
      if (obj.current < obj.target) return false;
    }
    this.levelComplete = true;
    this.time.delayedCall(500, () => this.gameOver(true));
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
          const candidates = Array.from({ length: maxType }, (_, i) => i);
          Phaser.Utils.Array.Shuffle(candidates);
          let type = candidates[0];
          for (const t of candidates) {
            const vMatch = r >= 2 && this.grid[r - 1]?.[c]?.type === t && this.grid[r - 2]?.[c]?.type === t;
            const hMatch = c >= 2 && this.grid[r]?.[c - 1]?.type === t && this.grid[r]?.[c - 2]?.type === t;
            if (!vMatch && !hMatch) { type = t; break; }
          }

          const startY = this.cellY(r) - emptyCount * (this.cell + this.gap);
          const s = this.add.sprite(this.cellX(c), startY, `orb_${type}`).setDepth(1);
          s.setScale(this.cell / 128);
          this.grid[r][c] = { type, special: SpecialType.None, row: r, col: c, sprite: s, iceLayers: 0, iceSprite: null, specialOverlay: null, specialText: null };
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
        if (this.isCrate(r, c) || !this.grid[r]?.[c]) continue;
        if (c + 1 < this.cols && !this.isCrate(r, c + 1) && this.grid[r]?.[c + 1]) {
          this.swapInGrid(r, c, r, c + 1);
          const ok = this.hasAnyMatch();
          this.swapInGrid(r, c, r, c + 1);
          if (ok) return true;
        }
        if (r + 1 < this.rows && !this.isCrate(r + 1, c) && this.grid[r + 1]?.[c]) {
          this.swapInGrid(r, c, r + 1, c);
          const ok = this.hasAnyMatch();
          this.swapInGrid(r, c, r + 1, c);
          if (ok) return true;
        }
      }
    }
    return false;
  }

  private async shuffleBoard(depth = 0): Promise<void> {
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
        if (orb) {
          if (orb.special !== SpecialType.None) {
            if (orb.specialOverlay) { orb.specialOverlay.destroy(); orb.specialOverlay = null; }
            if (orb.specialText) { orb.specialText.destroy(); orb.specialText = null; }
            orb.special = SpecialType.None;
          }
          if (orb.sprite) orb.sprite.setTexture(`orb_${orb.type}`);
        }
      }
    }

    const flash = this.add.graphics().setDepth(15);
    flash.fillStyle(0xffffff, 0.8);
    flash.fillRect(0, 0, this.camW, this.camH);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

    if (!this.hasValidMoves() && depth < 10) await this.shuffleBoard(depth + 1);
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
    if (this.isProcessing) return;
    this.isProcessing = true;
    const w = this.camW, h = this.camH;
    const s = this.sf;

    const goUI: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.graphics().setDepth(100);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);
    goUI.push(overlay);

    const panelW = Math.min(won ? 500 * s : 440 * s, w * 0.9);
    const panelH = won ? 600 * s : 440 * s;
    const panelX = w / 2;
    const panelY = h / 2;
    const panelR = 20 * s;

    const panel = this.add.graphics().setDepth(100);
    this.drawWoodPanelGfx(panel, panelX, panelY, panelW, panelH, panelR);
    goUI.push(panel);

    let yOff = panelY - panelH / 2;

    const titleText = won ? 'LEVEL COMPLETE!' : 'GAME OVER';
    const titleColor = won ? '#4ade80' : '#f87171';
    const title = this.add.text(panelX, yOff + (won ? 42 : 36) * s, titleText, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(38 * s)}px`, color: titleColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 400, delay: 100, ease: 'Back.easeOut' });
    goUI.push(title);

    if (won) {
      const stars = this.countStars(this.score);
      this.saveStars(stars);
      addCoins(COINS_PER_WIN);

      const starStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
      const starText = this.add.text(panelX, yOff + 86 * s, starStr, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(46 * s)}px`, color: '#fbbf24',
      }).setOrigin(0.5).setDepth(101).setAlpha(0);
      this.tweens.add({ targets: starText, alpha: 1, scaleX: { from: 2, to: 1 }, scaleY: { from: 2, to: 1 }, duration: 600, delay: 300, ease: 'Elastic.easeOut' });
      goUI.push(starText);

      const levelLabel = this.add.text(panelX, yOff + 118 * s, `Level ${this.levelDef.id}`, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(18 * s)}px`, color: '#c4b5fd', fontStyle: 'italic',
      }).setOrigin(0.5).setDepth(101).setAlpha(0);
      this.tweens.add({ targets: levelLabel, alpha: 1, duration: 400, delay: 350, ease: 'Quad.easeOut' });
      goUI.push(levelLabel);
    }

    const scoreLabelY = yOff + (won ? 152 : 86) * s;
    const scoreLabel = this.add.text(panelX, scoreLabelY, 'COINS EARNED', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(15 * s)}px`, color: '#a78bfa', fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(101).setAlpha(0);
    this.tweens.add({ targets: scoreLabel, alpha: 1, duration: 400, delay: won ? 400 : 200, ease: 'Quad.easeOut' });
    goUI.push(scoreLabel);

    const coinCenterY = scoreLabelY + (won ? 38 : 30) * s;
    const coinIconGO = this.add.text(panelX - 58 * s, coinCenterY, '\u{1FA99}', {
      fontSize: `${Math.round(40 * s)}px`,
    }).setOrigin(0.5).setDepth(101).setAlpha(0).setPadding(0, 4, 0, 4);
    this.tweens.add({ targets: coinIconGO, alpha: 1, duration: 400, delay: won ? 450 : 250, ease: 'Quad.easeOut' });
    goUI.push(coinIconGO);

    const scoreVal = this.add.text(panelX + 52 * s, coinCenterY, String(this.score), {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(54 * s)}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(101).setAlpha(0);
    this.tweens.add({ targets: scoreVal, alpha: 1, duration: 400, delay: won ? 500 : 300, ease: 'Quad.easeOut' });
    goUI.push(scoreVal);

    const btnW = Math.min(260 * s, panelW - 40 * s);
    const btnH = 60 * s;
    let btnY = yOff + (won ? 244 : 154) * s;

    const makeBtnInteractive = (label: string, by: number, delay: number, cb: () => void) => {
      const wood = this.add.image(panelX, by + btnH / 2, 'wood_panel').setDepth(101);
      wood.setDisplaySize(btnW, btnH);
      const border = this.add.graphics().setDepth(101);
      border.lineStyle(2 * s, 0x8b6914, 0.6);
      border.strokeRoundedRect(panelX - btnW / 2, by, btnW, btnH, 12 * s);
      const txt = this.add.text(panelX, by + btnH / 2, label, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(18 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(101).setAlpha(0);

      const group = [wood, border, txt];
      goUI.push(wood, border, txt);
      this.tweens.add({ targets: group, alpha: 1, duration: 400, delay, ease: 'Quad.easeOut' });

      wood.setInteractive({ useHandCursor: true });
      wood.on('pointerover', () => {
        border.clear();
        border.lineStyle(3 * s, 0xffd700, 1);
        border.strokeRoundedRect(panelX - btnW / 2, by, btnW, btnH, 12 * s);
        txt.setColor('#ffffff');
      });
      wood.on('pointerout', () => {
        border.clear();
        border.lineStyle(2 * s, 0x8b6914, 0.6);
        border.strokeRoundedRect(panelX - btnW / 2, by, btnW, btnH, 12 * s);
        txt.setColor('#fff8e7');
      });
      wood.on('pointerdown', cb);
    };

    const destroyGO = () => {
      for (const obj of goUI) obj.destroy();
      goUI.length = 0;
    };

    if (!won) deductLife();

    if (won) {
      const hasNext = !!getLevel(this.levelDef.id + 1);
      const nextLabel = hasNext ? 'NEXT LEVEL' : 'YOU WIN!';
      makeBtnInteractive(nextLabel, btnY, 700, () => {
        if (hasNext) { saveLastLevel(this.levelDef.id + 1); this.scene.start('GameScene', { levelId: this.levelDef.id + 1 }); }
        else this.scene.start('LevelSelectScene');
      });
      btnY += btnH + 14 * s;
    } else {
      makeBtnInteractive('EXTRA MOVES (+5) - 50\u{1FA99}', btnY, 400, () => {
        if (loadCoins() < 50) return;
        spendCoins(50);
        if (this.isMovesMode) {
          this.movesLeft += 5;
          if (this.movesText) this.movesText.setText(`Moves: ${this.movesLeft}`);
        } else {
          this.timeLeft += 15;
        }
        destroyGO();
        this.isProcessing = false;
      });
      btnY += btnH + 14 * s;
    }

    makeBtnInteractive('RETRY', btnY, won ? 850 : 500, () => {
      if (!hasLives()) { this.showBuyLivesModal(() => { this.scene.start('GameScene', { levelId: this.levelDef.id }); }); return; }
      this.scene.start('GameScene', { levelId: this.levelDef.id });
    });
    btnY += btnH + 14 * s;
    makeBtnInteractive('MENU', btnY, won ? 1000 : 650, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });
  }

  private showBuyLivesModal(onBuy: () => void) {
    showBuyLivesModalFn(this, this.camW, this.camH, this.sf, onBuy);
  }

  private showPauseModal() {
    const w = this.camW, h = this.camH;
    const s = this.sf;

    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);

    const panelW = Math.min(300 * s, w * 0.85);
    const panelH = 380 * s;
    const px = w / 2;
    const panely = h / 2 - panelH / 2;

    const panel = this.add.image(px, panely + panelH / 2, 'wood_panel').setDepth(201);
    panel.setDisplaySize(panelW, panelH);

    const panelBorder = this.add.graphics().setDepth(201);
    panelBorder.lineStyle(3 * s, 0xffd700, 0.6);
    panelBorder.strokeRoundedRect(px - panelW / 2, panely, panelW, panelH, 20 * s);

    const pausedTitle = this.add.text(px, panely + 40 * s, 'PAUSED', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(34 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    const btnW = Math.min(220 * s, panelW - 40 * s);
    const btnH = 48 * s;
    const btnLabels = ['RESUME', 'LEVEL SELECT', 'MENU'];
    const btnActions = [
      () => {
        destroyAll();
        this.paused = false;
      },
      () => {
        destroyAll();
        this.paused = false;
        this.scene.start('LevelSelectScene');
      },
      () => {
        destroyAll();
        this.paused = false;
        this.scene.start('MenuScene');
      },
    ];

    const destroyAll = () => {
      overlay.destroy(); panel.destroy(); panelBorder.destroy();
      pausedTitle.destroy();
      btnTexts.forEach(t => t.destroy());
      btnBorders.forEach(b => b.destroy());
      btnWoods.forEach(p => p.destroy());
    };

    const btnTexts: Phaser.GameObjects.Text[] = [];
    const btnBorders: Phaser.GameObjects.Graphics[] = [];
    const btnWoods: Phaser.GameObjects.Image[] = [];
    const startY = panely + 90 * s;

    btnLabels.forEach((label, i) => {
      const by = startY + i * (btnH + 16 * s);
      const wood = this.add.image(px, by + btnH / 2, 'wood_panel').setDepth(202);
      wood.setDisplaySize(btnW, btnH);
      btnWoods.push(wood);

      const border = this.add.graphics().setDepth(202);
      border.lineStyle(2 * s, 0x8b6914, 0.8);
      border.strokeRoundedRect(px - btnW / 2, by, btnW, btnH, 14 * s);
      btnBorders.push(border);

      const text = this.add.text(px, by + btnH / 2, label, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(17 * s)}px`, color: label === 'RESUME' ? '#4ade80' : '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(203);
      btnTexts.push(text);

      wood.setInteractive({ useHandCursor: true });
      wood.on('pointerover', () => {
        border.clear();
        border.lineStyle(3 * s, label === 'RESUME' ? 0x4ade80 : 0xffd700, 1);
        border.strokeRoundedRect(px - btnW / 2, by, btnW, btnH, 14 * s);
        text.setColor('#ffffff');
      });
      wood.on('pointerout', () => {
        border.clear();
        border.lineStyle(2.5 * s, 0x8b6914, 0.8);
        border.strokeRoundedRect(px - btnW / 2, by, btnW, btnH, 14 * s);
        text.setColor(label === 'RESUME' ? '#4ade80' : '#ffd700');
      });
      wood.on('pointerdown', btnActions[i]);
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

  private showCombo() {
    const x = this.camW / 2;
    const y = this.offY + this.gridW / 2;
    const s = this.sf;
    const text = this.add.text(x, y, `${this.comboCount}x COMBO!`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(36 * s)}px`, color: '#fbbf24',
      stroke: '#7c3aed', strokeThickness: Math.round(3 * s),
    }).setOrigin(0.5).setDepth(20).setScale(0);

    if (this.comboCount >= 3) {
      this.cameras.main.shake(100 + this.comboCount * 30, 0.003 * this.comboCount);
    }

    this.tweens.add({
      targets: text, scaleX: 1.2, scaleY: 1.2, alpha: 1, duration: 300, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: text, scaleX: 0, scaleY: 0, alpha: 0, duration: 400, ease: 'Back.easeIn', delay: 500, onComplete: () => text.destroy() });
      },
    });
  }

  private showScorePopup(x: number, y: number, amount: number, color: number) {
    const s = this.sf;
    const pop = this.add.text(x, y, `+${amount}`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(20 * s)}px`, color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontStyle: 'bold', stroke: '#000000', strokeThickness: Math.round(2 * s),
    }).setOrigin(0.5).setDepth(15);

    this.tweens.add({
      targets: pop, y: y - 40 * s, alpha: 0, duration: 800, ease: 'Quad.easeOut',
      onComplete: () => pop.destroy(),
    });
  }

  private flashWhite(duration: number) {
    const flash = this.add.graphics().setDepth(50);
    flash.fillStyle(0xffffff, 0.3);
    flash.fillRect(0, 0, this.camW, this.camH);
    this.tweens.add({ targets: flash, alpha: 0, duration, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
  }
}
