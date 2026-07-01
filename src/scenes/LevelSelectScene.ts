import Phaser from 'phaser';
import { levels, getTotalLevels } from '../levels';
import { hasLives, saveLastLevel, loadCoins, buyLives, LIVES_COST, MAX_LIVES } from '../utils/save';

const ELEMENT_COLORS = [0xff6b35, 0x3a9bff, 0x8b6b3a, 0x44cc44];
const ELEMENT_GLOWS = [0xff8844, 0x66bbff, 0xaa8855, 0x66ee66];

export class LevelSelectScene extends Phaser.Scene {
  private pendingLevelId = 0;
  private resizeHandler: (() => void) | null = null;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const s = Math.min(w, h) / 540;

    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.events.on('shutdown', () => {
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
        this.resizeHandler = null;
      }
    });

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
    const nodeR = Math.min(28 * s, w * 0.045);
    const scrollTop = 82 * s;
    const scrollBot = h - 52 * s;
    const scrollH = scrollBot - scrollTop;
    const centerX = w / 2;
    const amplitude = w * 0.30;
    const stepY = Math.max(nodeR * 3.2, (h * 0.85) / (total > 1 ? total - 1 : 1));
    const contentH = (total - 1) * stepY + nodeR * 4;

    const pathPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < total; i++) {
      const t = total > 1 ? i / (total - 1) : 0.5;
      const y = nodeR * 2 + t * (contentH - nodeR * 4);
      const x = centerX + Math.sin(t * Math.PI * 2.5) * amplitude;
      pathPoints.push({ x, y });
    }

    const scrollContainer = this.add.container(0, 0).setDepth(1);
    scrollContainer.add(this.add.graphics());
    this.drawPath(pathPoints, s, scrollContainer);
    const nodesGfx = this.add.graphics();
    scrollContainer.add(nodesGfx);
    this.drawNodes(pathPoints, total, s, nodeR, nodesGfx, scrollContainer);

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, scrollTop, w, scrollH);
    scrollContainer.setMask(maskShape.createGeometryMask());

    const maxScroll = Math.max(0, contentH - scrollH + nodeR * 4);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < scrollTop || p.y > scrollBot) return;
      this.data.set('scrollStartY', p.y);
      this.data.set('contStartY', scrollContainer.y);
      this.data.set('dragging', false);
      this.data.set('dragDist', 0);
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const sd = this.data.get('scrollStartY');
      if (sd === undefined) return;
      const dy = p.y - sd;
      if (Math.abs(dy) > 5) this.data.set('dragging', true);
      this.data.set('dragDist', Math.abs(dy));
      scrollContainer.y = Phaser.Math.Clamp(this.data.get('contStartY') + dy, -maxScroll, 0);
    });

    this.input.on('pointerup', () => {
      this.data.set('scrollStartY', undefined);
    });

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

    if (this.resizeHandler) this.scale.off('resize', this.resizeHandler);
    this.resizeHandler = () => this.scene.restart();
    this.scale.on('resize', this.resizeHandler);
  }

  private drawPath(points: { x: number; y: number }[], s: number, container: Phaser.GameObjects.Container) {
    const pathGfx = container.getAt(0) as Phaser.GameObjects.Graphics;
    pathGfx.clear();

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

    const dotsGfx = container.getAt(0) as Phaser.GameObjects.Graphics;
    dotsGfx.fillStyle(0x5c3a1e, 0.25);
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i], p2 = points[i + 1];
      const steps = 6;
      for (let step = 1; step < steps; step++) {
        const t = step / steps;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        dotsGfx.fillCircle(x, y, 1.5 * s);
      }
    }
  }

  private drawNodes(points: { x: number; y: number }[], total: number, s: number, nodeR: number, nodeGfx: Phaser.GameObjects.Graphics, scrollContainer: Phaser.GameObjects.Container) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    for (let i = 0; i < total; i++) {
      const { x, y } = points[i];
      const level = levels[i];
      const starsCount = this.getStarsForLevel(level.id);
      const unlocked = i === 0 || this.getStarsForLevel(levels[i - 1].id) > 0;

      const nodeContainer = this.add.container(x, y).setDepth(0);
      scrollContainer.add(nodeContainer);

      const elementIdx = level.id % 4;
      const elementColor = ELEMENT_COLORS[elementIdx];
      const elementGlow = ELEMENT_GLOWS[elementIdx];

      if (unlocked) {
        nodeGfx.fillStyle(0x1a1018, 0.9);
        nodeGfx.fillCircle(x, y, nodeR + 4 * s);
        nodeGfx.fillStyle(0x2d1a3a, 1);
        nodeGfx.fillCircle(x, y, nodeR);
        nodeGfx.lineStyle(2.5 * s, elementColor, 0.8);
        nodeGfx.strokeCircle(x, y, nodeR + 1 * s);
        nodeGfx.lineStyle(1 * s, 0xffd700, 0.5);
        nodeGfx.strokeCircle(x, y, nodeR - 2 * s);

        const glow = this.add.graphics().setDepth(-0.2);
        glow.fillStyle(elementGlow, 0.12);
        glow.fillCircle(0, 0, nodeR + 14 * s);
        nodeContainer.addAt(glow, 0);

        const pulse = this.add.graphics().setDepth(-0.3);
        pulse.lineStyle(1.5 * s, elementColor, 0.25);
        pulse.strokeCircle(0, 0, nodeR + 6 * s);
        nodeContainer.addAt(pulse, 0);
        this.tweens.add({
          targets: pulse,
          scale: { from: 1, to: 1.5 },
          alpha: { from: 0.5, to: 0 },
          duration: 2000,
          repeat: -1,
          ease: 'Quad.easeOut',
        });
      } else {
        nodeGfx.fillStyle(0x0a0815, 0.7);
        nodeGfx.fillCircle(x, y, nodeR);
        nodeGfx.lineStyle(1.5 * s, 0x2a1a3a, 0.5);
        nodeGfx.strokeCircle(x, y, nodeR);

        const lock = this.add.text(0, -nodeR - 8 * s, '\u{1F512}', {
          fontSize: `${Math.round(16 * s)}px`,
        }).setOrigin(0.5).setDepth(2);
        nodeContainer.add(lock);
      }

      const numText = this.add.text(0, -2 * s, String(level.id), {
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.round(nodeR * 0.75)}px`,
        color: unlocked ? '#ffd700' : '#2a1a3a',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(2);
      nodeContainer.add(numText);

      if (starsCount > 0) {
        let starsStr = '';
        for (let st = 0; st < 3; st++) {
          starsStr += st < starsCount ? '\u2605' : '\u2606';
        }
        const starsText = this.add.text(0, nodeR + 8 * s, starsStr, {
          fontFamily: 'Georgia, serif',
          fontSize: `${Math.round(10 * s)}px`,
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
          for (let j = 0; j < total; j++) {
            const p = points[j];
            const lv = levels[j];
            const ulck = j === 0 || this.getStarsForLevel(levels[j - 1].id) > 0;
            const eIdx = lv.id % 4;
            const eCol = ELEMENT_COLORS[eIdx];
            const ua = ulck ? 1 : 0.7;
            if (ulck) {
              nodeGfx.fillStyle(0x1a1018, 0.9);
              nodeGfx.fillCircle(p.x, p.y, nodeR + 4 * s);
              nodeGfx.fillStyle(j === i ? 0x3d254a : 0x2d1a3a, ua);
              nodeGfx.fillCircle(p.x, p.y, nodeR);
              nodeGfx.lineStyle(j === i ? 3 * s : 2.5 * s, j === i ? elementColor : eCol, j === i ? 1 : 0.8);
              nodeGfx.strokeCircle(p.x, p.y, nodeR + 1 * s);
              nodeGfx.lineStyle(j === i ? 1.5 * s : 1 * s, 0xffd700, j === i ? 0.9 : 0.5);
              nodeGfx.strokeCircle(p.x, p.y, nodeR - 2 * s);
            } else {
              nodeGfx.fillStyle(0x0a0815, 0.7);
              nodeGfx.fillCircle(p.x, p.y, nodeR);
              nodeGfx.lineStyle(1.5 * s, 0x2a1a3a, 0.5);
              nodeGfx.strokeCircle(p.x, p.y, nodeR);
            }
          }
          this.tweens.add({ targets: nodeContainer, scaleX: 1.08, scaleY: 1.08, duration: 150, ease: 'Back.easeOut' });
        });

        btnZone.on('pointerout', () => {
          nodeGfx.clear();
          for (let j = 0; j < total; j++) {
            const p = points[j];
            const lv = levels[j];
            const ulck = j === 0 || this.getStarsForLevel(levels[j - 1].id) > 0;
            const eIdx = lv.id % 4;
            const eCol = ELEMENT_COLORS[eIdx];
            const ua = ulck ? 1 : 0.7;
            if (ulck) {
              nodeGfx.fillStyle(0x1a1018, 0.9);
              nodeGfx.fillCircle(p.x, p.y, nodeR + 4 * s);
              nodeGfx.fillStyle(0x2d1a3a, ua);
              nodeGfx.fillCircle(p.x, p.y, nodeR);
              nodeGfx.lineStyle(2.5 * s, eCol, 0.8);
              nodeGfx.strokeCircle(p.x, p.y, nodeR + 1 * s);
              nodeGfx.lineStyle(1 * s, 0xffd700, 0.5);
              nodeGfx.strokeCircle(p.x, p.y, nodeR - 2 * s);
            } else {
              nodeGfx.fillStyle(0x0a0815, 0.7);
              nodeGfx.fillCircle(p.x, p.y, nodeR);
              nodeGfx.lineStyle(1.5 * s, 0x2a1a3a, 0.5);
              nodeGfx.strokeCircle(p.x, p.y, nodeR);
            }
          }
          this.tweens.add({ targets: nodeContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Quad.easeOut' });
        });

        btnZone.on('pointerup', () => {
          if (this.data.get('dragging') || (this.data.get('dragDist') || 0) > 8) return;
          if (!hasLives()) {
            this.pendingLevelId = level.id;
            this.showBuyLivesModal(w, h, s);
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

  private showBuyLivesModal(w: number, h: number, s: number) {
    const overlay = this.add.graphics().setDepth(100);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);

    const panelW = Math.min(300 * s, w * 0.85);
    const panelH = 350 * s;
    const px = w / 2;
    const py = h / 2;

    const panel = this.add.image(px, py, 'wood_panel').setDepth(101);
    panel.setDisplaySize(panelW, panelH);
    const border = this.add.graphics().setDepth(101);
    border.lineStyle(3 * s, 0xffd700, 0.7);
    border.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 20 * s);

    const heartsStr = '\u2764'.repeat(3);
    const title = this.add.text(px, py - 108 * s, heartsStr, {
      fontSize: `${Math.round(44 * s)}px`,
      color: '#ff4d6d',
    }).setOrigin(0.5).setDepth(102);

    const label = this.add.text(px, py - 70 * s, '3 LIVES', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(26 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    const divY = py - 44 * s;
    const divider = this.add.graphics().setDepth(102);
    divider.lineStyle(1 * s, 0x8b6914, 0.4);
    divider.lineBetween(px - panelW / 2 + 30 * s, divY, px + panelW / 2 - 30 * s, divY);

    const coinIcon = this.add.text(px, py - 20 * s, '\u{1FA99}', {
      fontSize: `${Math.round(22 * s)}px`,
    }).setOrigin(0.5).setDepth(102);

    const infoText = this.add.text(px, py + 6 * s, `Buy 3 lives (${LIVES_COST} coins)`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(15 * s)}px`, color: '#c4b5fd', fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(102);

    const btnW = Math.min(220 * s, panelW - 50 * s);
    const btnH = 52 * s;

    const buyBtnX = px - btnW / 2;
    const buyBtnY = py + 34 * s;

    const buyPanel = this.add.image(px, buyBtnY + btnH / 2, 'wood_panel').setDepth(102);
    buyPanel.setDisplaySize(btnW, btnH);
    const buyBorder = this.add.graphics().setDepth(102);
    buyBorder.lineStyle(2 * s, 0x8b6914, 0.7);
    buyBorder.strokeRoundedRect(buyBtnX, buyBtnY, btnW, btnH, 14 * s);

    const buyText = this.add.text(px, buyBtnY + btnH / 2, `BUY 3 LIVES (${LIVES_COST} \u{1FA99})`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(16 * s)}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103).setInteractive({ useHandCursor: true });
    buyText.on('pointerover', () => {
      buyBorder.clear();
      buyBorder.lineStyle(3 * s, 0xffd700, 1);
      buyBorder.strokeRoundedRect(buyBtnX, buyBtnY, btnW, btnH, 14 * s);
      buyText.setColor('#ffffff');
    });
    buyText.on('pointerout', () => {
      buyBorder.clear();
      buyBorder.lineStyle(2 * s, 0x8b6914, 0.7);
      buyBorder.strokeRoundedRect(buyBtnX, buyBtnY, btnW, btnH, 14 * s);
      buyText.setColor('#ffd700');
    });
    buyText.on('pointerdown', () => {
      if (!buyLives()) return;
      overlay.destroy(); panel.destroy(); border.destroy();
      title.destroy(); label.destroy(); divider.destroy();
      coinIcon.destroy(); infoText.destroy();
      buyPanel.destroy(); buyBorder.destroy(); buyText.destroy();

      const lid = this.pendingLevelId;
      saveLastLevel(lid);
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(250, () => {
        this.scene.start('GameScene', { levelId: lid });
      });
    });

    const cancelBtnW = Math.min(130 * s, panelW * 0.45);
    const cancelBtnH = 38 * s;
    const cancelBtnX = px - cancelBtnW / 2;
    const cancelBtnY = buyBtnY + btnH + 16 * s;

    const cancelPanel = this.add.image(px, cancelBtnY + cancelBtnH / 2, 'wood_panel').setDepth(102);
    cancelPanel.setDisplaySize(cancelBtnW, cancelBtnH);
    const cancelBorder = this.add.graphics().setDepth(102);
    cancelBorder.lineStyle(1.5 * s, 0x4a3a6a, 0.5);
    cancelBorder.strokeRoundedRect(cancelBtnX, cancelBtnY, cancelBtnW, cancelBtnH, 10 * s);

    const cancelText = this.add.text(px, cancelBtnY + cancelBtnH / 2, 'CANCEL', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(14 * s)}px`, color: '#a78bfa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103).setInteractive({ useHandCursor: true });
    cancelText.on('pointerover', () => {
      cancelBorder.clear();
      cancelBorder.lineStyle(2 * s, 0xa78bfa, 0.8);
      cancelBorder.strokeRoundedRect(cancelBtnX, cancelBtnY, cancelBtnW, cancelBtnH, 10 * s);
      cancelText.setColor('#ffffff');
    });
    cancelText.on('pointerout', () => {
      cancelBorder.clear();
      cancelBorder.lineStyle(1.5 * s, 0x4a3a6a, 0.5);
      cancelBorder.strokeRoundedRect(cancelBtnX, cancelBtnY, cancelBtnW, cancelBtnH, 10 * s);
      cancelText.setColor('#a78bfa');
    });
    cancelText.on('pointerdown', () => {
      overlay.destroy(); panel.destroy(); border.destroy();
      title.destroy(); label.destroy(); divider.destroy();
      coinIcon.destroy(); infoText.destroy();
      buyPanel.destroy(); buyBorder.destroy(); buyText.destroy();
      cancelPanel.destroy(); cancelBorder.destroy(); cancelText.destroy();
    });
  }
}