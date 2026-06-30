import Phaser from 'phaser';
import { levels, getTotalLevels } from '../levels';
import { hasLives, saveLastLevel, loadCoins } from '../utils/save';

const ELEMENT_COLORS = [0xff6b35, 0x3a9bff, 0x8b6b3a, 0x44cc44];
const ELEMENT_GLOWS = [0xff8844, 0x66bbff, 0xaa8855, 0x66ee66];

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const s = Math.min(w, h) / 540;

    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.add.image(w / 2, h / 2, 'background').setDepth(-2).setDisplaySize(w, h);

    const overlay = this.add.graphics().setDepth(-1);
    overlay.fillStyle(0x000000, 0.45);
    overlay.fillRect(0, 0, w, h);

    const vignette = this.add.graphics().setDepth(-0.5);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.6, 0.6);
    vignette.fillRect(0, 0, w, h);

    const title = this.add.text(w / 2, 36 * s, 'SELECT LEVEL', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(26 * s)}px`,
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    const subtitle = this.add.text(w / 2, 58 * s, 'Tap a level to play', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(12 * s)}px`,
      color: '#a78bfa',
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(1);

    const total = getTotalLevels();
    const nodeR = Math.min(34 * s, Math.max(28, w * 0.055));
    const pathStartY = 100 * s;
    const pathEndY = h - 80 * s;
    const pathH = pathEndY - pathStartY;
    const centerX = w / 2;
    const amplitude = w * 0.32;

    const pathPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < total; i++) {
      const t = total > 1 ? i / (total - 1) : 0.5;
      const y = pathStartY + t * pathH;
      const x = centerX + Math.sin(t * Math.PI * 2.5) * amplitude;
      pathPoints.push({ x, y });
    }

    this.drawPath(pathPoints, s, w, h);
    this.drawNodes(pathPoints, total, s, nodeR, w, h);

    const backBtn = this.add.text(18 * s, h - 30 * s, '\u2190 BACK', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(15 * s)}px`,
      color: '#8b7aaa',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(2).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => this.tweens.add({ targets: backBtn, color: { value: '#ffd700' }, duration: 150 }));
    backBtn.on('pointerout', () => this.tweens.add({ targets: backBtn, color: { value: '#8b7aaa' }, duration: 150 }));
    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });

    const totalCoins = loadCoins();
    if (totalCoins > 0) {
      const coinPanelW = 150 * s;
      const coinPanelH = 42 * s;
      const coinPanelX = w - coinPanelW - 15 * s;
      const coinPanelY = h - coinPanelH - 15 * s;

      const coinPanel = this.add.graphics().setDepth(2);
      this.drawSmallWoodPanel(coinPanel, coinPanelX, coinPanelY, coinPanelW, coinPanelH, 18 * s);

      const coinIcon = this.add.text(coinPanelX + 22 * s, coinPanelY + coinPanelH / 2, '\u{1FA99}', {
        fontSize: `${Math.round(20 * s)}px`,
      }).setOrigin(0.5).setDepth(3).setPadding(0, 4, 0, 4);

      const coinsText = this.add.text(coinPanelX + 50 * s, coinPanelY + coinPanelH / 2, String(totalCoins), {
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.round(16 * s)}px`,
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(3);
    }

    this.scale.on('resize', () => {
      this.scene.restart();
    });
  }

  private drawPath(points: { x: number; y: number }[], s: number, w: number, h: number) {
    const pathGfx = this.add.graphics().setDepth(0);

    pathGfx.lineStyle(6 * s, 0x1a1018, 0.6);
    pathGfx.beginPath();
    points.forEach((p, i) => i === 0 ? pathGfx.moveTo(p.x, p.y) : pathGfx.lineTo(p.x, p.y));
    pathGfx.strokePath();

    pathGfx.lineStyle(4 * s, 0x3d2817, 0.4);
    pathGfx.beginPath();
    points.forEach((p, i) => i === 0 ? pathGfx.moveTo(p.x, p.y) : pathGfx.lineTo(p.x, p.y));
    pathGfx.strokePath();

    pathGfx.lineStyle(2 * s, 0x8b6914, 0.3);
    pathGfx.beginPath();
    points.forEach((p, i) => i === 0 ? pathGfx.moveTo(p.x, p.y) : pathGfx.lineTo(p.x, p.y));
    pathGfx.strokePath();

    const dotsGfx = this.add.graphics().setDepth(0.5);
    dotsGfx.fillStyle(0x5c3a1e, 0.25);
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i], p2 = points[i + 1];
      const steps = 8;
      for (let step = 1; step < steps; step++) {
        const t = step / steps;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        dotsGfx.fillCircle(x, y, 1.5 * s);
      }
    }
  }

  private drawNodes(points: { x: number; y: number }[], total: number, s: number, nodeR: number, w: number, h: number) {
    for (let i = 0; i < total; i++) {
      const { x, y } = points[i];
      const level = levels[i];
      const starsCount = this.getStarsForLevel(level.id);
      const unlocked = i === 0 || this.getStarsForLevel(levels[i - 1].id) > 0;

      const nodeContainer = this.add.container(x, y).setDepth(1);
      const nodeGfx = this.add.graphics();
      nodeContainer.add(nodeGfx);

      const elementIdx = level.id % 4;
      const elementColor = ELEMENT_COLORS[elementIdx];
      const elementGlow = ELEMENT_GLOWS[elementIdx];

      if (unlocked) {
        const shadow = this.add.graphics().setDepth(0);
        shadow.fillStyle(0x0a0815, 0.5);
        shadow.fillCircle(0, 4 * s, nodeR + 4 * s);
        nodeContainer.addAt(shadow, 0);

        nodeGfx.fillStyle(0x1a1018, 0.9);
        nodeGfx.fillCircle(0, 0, nodeR + 6 * s);
        nodeGfx.fillStyle(0x2d1a3a, 1);
        nodeGfx.fillCircle(0, 0, nodeR);
        nodeGfx.lineStyle(3 * s, elementColor, 0.8);
        nodeGfx.strokeCircle(0, 0, nodeR + 2 * s);
        nodeGfx.lineStyle(1.5 * s, 0xffd700, 0.6);
        nodeGfx.strokeCircle(0, 0, nodeR - 3 * s);

        const glow = this.add.graphics().setDepth(-0.2);
        glow.fillStyle(elementGlow, 0.12);
        glow.fillCircle(0, 0, nodeR + 18 * s);
        nodeContainer.addAt(glow, 0);

        const pulse = this.add.graphics().setDepth(-0.3);
        pulse.lineStyle(2 * s, elementColor, 0.3);
        pulse.strokeCircle(0, 0, nodeR + 8 * s);
        nodeContainer.addAt(pulse, 0);
        this.tweens.add({
          targets: pulse,
          scale: { from: 1, to: 1.4 },
          alpha: { from: 0.6, to: 0 },
          duration: 2000,
          repeat: -1,
          ease: 'Quad.easeOut',
        });
      } else {
        nodeGfx.fillStyle(0x0a0815, 0.7);
        nodeGfx.fillCircle(0, 0, nodeR);
        nodeGfx.lineStyle(2 * s, 0x2a1a3a, 0.5);
        nodeGfx.strokeCircle(0, 0, nodeR);

        const lock = this.add.text(0, -nodeR - 10 * s, '\u{1F512}', {
          fontSize: `${Math.round(18 * s)}px`,
        }).setOrigin(0.5).setDepth(2);
        nodeContainer.add(lock);
      }

      const numText = this.add.text(0, -3 * s, String(level.id), {
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.round(nodeR * 0.7)}px`,
        color: unlocked ? '#ffd700' : '#2a1a3a',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(2);
      nodeContainer.add(numText);

      const nameText = this.add.text(0, nodeR + 8 * s, level.name, {
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.round(10 * s)}px`,
        color: unlocked ? '#c4b5fd' : '#1a0a1a',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(2);
      nodeContainer.add(nameText);

      if (starsCount > 0) {
        let starsStr = '';
        for (let st = 0; st < 3; st++) {
          starsStr += st < starsCount ? '\u2605' : '\u2606';
        }
        const starsText = this.add.text(0, nodeR + 26 * s, starsStr, {
          fontFamily: 'Georgia, serif',
          fontSize: `${Math.round(12 * s)}px`,
          color: '#fbbf24',
        }).setOrigin(0.5).setDepth(2);
        nodeContainer.add(starsText);
      }

      if (unlocked) {
        const hitArea = nodeR * 2.2;
        const btnZone = this.add.zone(0, 0, hitArea, hitArea)
          .setInteractive({ useHandCursor: true })
          .setDepth(3);
        nodeContainer.add(btnZone);

        btnZone.on('pointerover', () => {
          nodeGfx.clear();
          nodeGfx.fillStyle(0x1a1018, 0.9);
          nodeGfx.fillCircle(0, 0, nodeR + 6 * s);
          nodeGfx.fillStyle(0x3d254a, 1);
          nodeGfx.fillCircle(0, 0, nodeR);
          nodeGfx.lineStyle(3.5 * s, elementColor, 1);
          nodeGfx.strokeCircle(0, 0, nodeR + 2 * s);
          nodeGfx.lineStyle(2 * s, 0xffd700, 0.9);
          nodeGfx.strokeCircle(0, 0, nodeR - 3 * s);
          this.tweens.add({ targets: nodeContainer, scaleX: 1.08, scaleY: 1.08, duration: 150, ease: 'Back.easeOut' });
        });

        btnZone.on('pointerout', () => {
          nodeGfx.clear();
          nodeGfx.fillStyle(0x1a1018, 0.9);
          nodeGfx.fillCircle(0, 0, nodeR + 6 * s);
          nodeGfx.fillStyle(0x2d1a3a, 1);
          nodeGfx.fillCircle(0, 0, nodeR);
          nodeGfx.lineStyle(3 * s, elementColor, 0.8);
          nodeGfx.strokeCircle(0, 0, nodeR + 2 * s);
          nodeGfx.lineStyle(1.5 * s, 0xffd700, 0.6);
          nodeGfx.strokeCircle(0, 0, nodeR - 3 * s);
          this.tweens.add({ targets: nodeContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Quad.easeOut' });
        });

        btnZone.on('pointerdown', () => {
          if (!hasLives()) {
            this.scene.start('MenuScene');
            return;
          }
          saveLastLevel(level.id);
          this.cameras.main.fadeOut(250, 0, 0, 0);
          this.time.delayedCall(250, () => {
            this.scene.start('GameScene', { levelId: level.id });
          });
        });
      }
    }
  }

  private drawSmallWoodPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number) {
    g.fillStyle(0x1a1018, 0.8);
    g.fillRoundedRect(x + 3, y + 3, w, h, r);
    g.fillStyle(0x3d2817, 0.9);
    g.fillRoundedRect(x, y, w, h, r);
    g.lineStyle(2, 0x8b6914, 0.6);
    g.strokeRoundedRect(x, y, w, h, r);
  }

  private getStarsForLevel(levelId: number): number {
    try {
      const data = localStorage.getItem(`level_${levelId}_stars`);
      return data ? parseInt(data, 10) : 0;
    } catch {
      return 0;
    }
  }
}