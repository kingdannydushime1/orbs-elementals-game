import Phaser from 'phaser';
import { loadCoins, loadLives, buyLives, hasLives, MAX_LIVES, LIVES_COST, loadLastLevel } from '../utils/save';

export class MenuScene extends Phaser.Scene {
  private bgImage: Phaser.GameObjects.Image | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const s = Math.min(w, h) / 540;

    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.bgImage = this.add.image(w / 2, h / 2, 'background').setDepth(-2).setDisplaySize(w, h);

    const overlay = this.add.graphics().setDepth(-1);
    overlay.fillStyle(0x000000, 0.35);
    overlay.fillRect(0, 0, w, h);

    const vignette = this.add.graphics().setDepth(-0.5);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.6, 0.6);
    vignette.fillRect(0, 0, w, h);

    const titleY = h * 0.22;

    const titlePanelW = Math.min(480 * s, w * 0.9);
    const titlePanelH = 170 * s;
    const titlePanel = this.add.image(w / 2, titleY, 'wood_panel').setDepth(0);
    titlePanel.setDisplaySize(titlePanelW, titlePanelH);

    const titleBorder = this.add.graphics().setDepth(0.5);
    titleBorder.lineStyle(3 * s, 0xffd700, 0.8);
    titleBorder.strokeRoundedRect(w / 2 - titlePanelW / 2, titleY - titlePanelH / 2, titlePanelW, titlePanelH, 20 * s);

    const titleShadow = this.add.text(w / 2 + 4 * s, titleY + 4 * s, 'ORBS\nELEMENTALS', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(72 * s)}px`,
      color: '#0d0815',
      align: 'center',
      lineSpacing: 8,
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(1);

    const title = this.add.text(w / 2, titleY, 'ORBS\nELEMENTALS', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(72 * s)}px`,
      color: '#fff8e7',
      align: 'center',
      lineSpacing: 8,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    this.tweens.add({
      targets: title,
      scaleX: { from: 0.8, to: 1 },
      scaleY: { from: 0.8, to: 1 },
      duration: 1200,
      ease: 'Elastic.easeOut',
    });

    const subtitle = this.add.text(w / 2, titleY + 100 * s, 'Match the elements. Master the magic.', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(16 * s)}px`,
      color: '#d4b8ff',
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(1).setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0, to: 1 },
      duration: 800,
      delay: 600,
      ease: 'Quad.easeOut',
    });

    const btnW = Math.min(340 * s, w * 0.75);
    const btnH = 80 * s;
    const btnPad = 20 * s;

    const makeBtn = (label: string, cy: number, delay: number, cb: () => void) => {
      const panel = this.add.image(w / 2, cy, 'wood_panel').setDepth(0);
      panel.setDisplaySize(btnW + btnPad, btnH + btnPad);

      const border = this.add.graphics().setDepth(0.5);
      border.lineStyle(3 * s, 0xffd700, 0.7);
      border.strokeRoundedRect(w / 2 - (btnW + btnPad) / 2, cy - (btnH + btnPad) / 2, btnW + btnPad, btnH + btnPad, 28 * s);

      const shine = this.add.graphics().setDepth(0.3);
      shine.fillStyle(0xffffff, 0.06);
      shine.fillRoundedRect(w / 2 - btnW / 2, cy - btnH / 2 + 4 * s, btnW, btnH * 0.45, 18 * s);

      const text = this.add.text(w / 2, cy, label, {
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.round(34 * s)}px`,
        color: '#fff8e7',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(1).setAlpha(0);

      this.tweens.add({
        targets: text,
        alpha: 1,
        duration: 500,
        delay,
        ease: 'Quad.easeOut',
      });

      const zone = this.add.zone(w / 2, cy, btnW + btnPad, btnH + btnPad)
        .setInteractive({ useHandCursor: true })
        .setDepth(3);

      zone.on('pointerover', () => {
        border.clear();
        border.lineStyle(4 * s, 0xffd700, 1);
        border.strokeRoundedRect(w / 2 - (btnW + btnPad) / 2, cy - (btnH + btnPad) / 2, btnW + btnPad, btnH + btnPad, 28 * s);
        text.setColor('#ffffff');
        text.setFontSize(`${Math.round(38 * s)}px`);
      });

      zone.on('pointerout', () => {
        border.clear();
        border.lineStyle(3 * s, 0xffd700, 0.7);
        border.strokeRoundedRect(w / 2 - (btnW + btnPad) / 2, cy - (btnH + btnPad) / 2, btnW + btnPad, btnH + btnPad, 28 * s);
        text.setColor('#fff8e7');
        text.setFontSize(`${Math.round(34 * s)}px`);
      });

      zone.on('pointerdown', () => {
        this.cameras.main.fadeOut(350, 0, 0, 0);
        this.time.delayedCall(350, cb);
      });
    };

    makeBtn('PLAY', h * 0.53, 800, () => {
      if (!hasLives()) {
        this.showBuyLivesModal(w, h, s);
        return;
      }
      const levelId = loadLastLevel();
      this.scene.start('GameScene', { levelId });
    });
    makeBtn('LEVELS', h * 0.69, 1000, () => this.scene.start('LevelSelectScene'));

    this.createStatusPanel(w, h, s);
    this.createFloatingOrbs(w, h, s);

    this.scale.on('resize', () => {
      this.scene.restart();
    });
  }

  private showBuyLivesModal(w: number, h: number, s: number) {
    this.cameras.main.resetFX();

    const overlay = this.add.graphics().setDepth(100);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);

    const panelW = Math.min(300 * s, w * 0.85);
    const panelH = 290 * s;
    const px = w / 2;
    const py = h / 2;

    const panel = this.add.image(px, py, 'wood_panel').setDepth(101);
    panel.setDisplaySize(panelW, panelH);
    const border = this.add.graphics().setDepth(101);
    border.lineStyle(3 * s, 0xffd700, 0.7);
    border.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 20 * s);

    const heartsStr = '\u2764'.repeat(3);
    const title = this.add.text(px, py - 80 * s, heartsStr, {
      fontSize: `${Math.round(44 * s)}px`,
      color: '#ff4d6d',
    }).setOrigin(0.5).setDepth(102);

    const label = this.add.text(px, py - 42 * s, '3 LIVES', {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(26 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    const divY = py - 16 * s;
    const divider = this.add.graphics().setDepth(102);
    divider.lineStyle(1 * s, 0x8b6914, 0.4);
    divider.lineBetween(px - panelW / 2 + 30 * s, divY, px + panelW / 2 - 30 * s, divY);

    const coinIcon = this.add.text(px, py + 4 * s, '\u{1FA99}', {
      fontSize: `${Math.round(22 * s)}px`,
    }).setOrigin(0.5).setDepth(102);

    const infoText = this.add.text(px, py + 28 * s, `Buy 3 lives (${LIVES_COST} coins)`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(15 * s)}px`, color: '#c4b5fd', fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(102);

    const btnW = Math.min(220 * s, panelW - 50 * s);
    const btnH = 52 * s;

    const buyBtnX = px - btnW / 2;
    const buyBtnY = py + 54 * s;

    const buyPanel = this.add.image(px, buyBtnY + btnH / 2, 'wood_panel').setDepth(102);
    buyPanel.setDisplaySize(btnW, btnH);
    const buyBorder = this.add.graphics().setDepth(102);
    buyBorder.lineStyle(2 * s, 0x8b6914, 0.7);
    buyBorder.strokeRoundedRect(buyBtnX, buyBtnY, btnW, btnH, 14 * s);

    const buyText = this.add.text(px, buyBtnY + btnH / 2, `BUY 3 LIVES (${LIVES_COST} \u{1FA99})`, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(16 * s)}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103);

    const buyZone = this.add.zone(px, buyBtnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true }).setDepth(104);
    buyZone.on('pointerover', () => {
      buyBorder.clear();
      buyBorder.lineStyle(3 * s, 0xffd700, 1);
      buyBorder.strokeRoundedRect(buyBtnX, buyBtnY, btnW, btnH, 14 * s);
      buyText.setColor('#ffffff');
    });
    buyZone.on('pointerout', () => {
      buyBorder.clear();
      buyBorder.lineStyle(2 * s, 0x8b6914, 0.7);
      buyBorder.strokeRoundedRect(buyBtnX, buyBtnY, btnW, btnH, 14 * s);
      buyText.setColor('#ffd700');
    });
    buyZone.on('pointerdown', () => {
      if (buyLives()) {
        overlay.destroy();
        panel.destroy();
        border.destroy();
        title.destroy();
        label.destroy();
        divider.destroy();
        coinIcon.destroy();
        infoText.destroy();
        buyPanel.destroy();
        buyBorder.destroy();
        buyText.destroy();
        buyZone.destroy();
        this.scene.restart();
      }
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
    }).setOrigin(0.5).setDepth(103);

    const cancelZone = this.add.zone(px, cancelBtnY + cancelBtnH / 2, cancelBtnW, cancelBtnH)
      .setInteractive({ useHandCursor: true }).setDepth(104);
    cancelZone.on('pointerover', () => {
      cancelBorder.clear();
      cancelBorder.lineStyle(2 * s, 0xa78bfa, 0.8);
      cancelBorder.strokeRoundedRect(cancelBtnX, cancelBtnY, cancelBtnW, cancelBtnH, 10 * s);
      cancelText.setColor('#ffffff');
    });
    cancelZone.on('pointerout', () => {
      cancelBorder.clear();
      cancelBorder.lineStyle(1.5 * s, 0x4a3a6a, 0.5);
      cancelBorder.strokeRoundedRect(cancelBtnX, cancelBtnY, cancelBtnW, cancelBtnH, 10 * s);
      cancelText.setColor('#a78bfa');
    });
    cancelZone.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      border.destroy();
      title.destroy();
      label.destroy();
      divider.destroy();
      coinIcon.destroy();
      infoText.destroy();
      buyPanel.destroy();
      buyBorder.destroy();
      buyText.destroy();
      buyZone.destroy();
      cancelPanel.destroy();
      cancelBorder.destroy();
      cancelText.destroy();
      cancelZone.destroy();
    });
  }

  private createStatusPanel(w: number, h: number, s: number) {
    const lives = loadLives();
    const coins = loadCoins();

    const panelW = 260 * s;
    const panelH = 60 * s;
    const panelX = (w - panelW) / 2;
    const panelY = h * 0.80;

    const panel = this.add.image(w / 2, panelY + panelH / 2, 'wood_panel').setDepth(0);
    panel.setDisplaySize(panelW, panelH);

    const border = this.add.graphics().setDepth(0.5);
    border.lineStyle(2 * s, 0xffd700, 0.5);
    border.strokeRoundedRect(panelX, panelY, panelW, panelH, 16 * s);

    const heartStr = '\u2764'.repeat(lives) + '\u2661'.repeat(Math.max(0, MAX_LIVES - lives));
    const heartText = this.add.text(panelX + 16 * s, panelY + panelH / 2, heartStr, {
      fontSize: `${Math.round(22 * s)}px`,
    }).setOrigin(0, 0.5).setDepth(1);
    const heartColor = lives === 0 ? '#ef4444' : '#ff4d6d';

    const heartColored = this.add.text(panelX + 16 * s, panelY + panelH / 2, '\u2764'.repeat(lives), {
      fontSize: `${Math.round(22 * s)}px`,
      color: heartColor,
    }).setOrigin(0, 0.5).setDepth(1);

    const coinIcon = this.add.text(panelX + panelW - 60 * s, panelY + panelH / 2, '\u{1FA99}', {
      fontSize: `${Math.round(22 * s)}px`,
    }).setOrigin(0, 0.5).setDepth(1).setPadding(0, 4, 0, 4);

    const coinText = this.add.text(panelX + panelW - 34 * s, panelY + panelH / 2, String(coins), {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(20 * s)}px`, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(1);

    if (lives === 0) {
      const cw = Math.min(220 * s, w * 0.6);
      const ch = 50 * s;
      const cx = (w - cw) / 2;
      const cy = panelY + panelH + 16 * s;

      const buyPanel = this.add.image(w / 2, cy + ch / 2, 'wood_panel').setDepth(0);
      buyPanel.setDisplaySize(cw, ch);

      const buyBorder = this.add.graphics().setDepth(0.5);
      buyBorder.lineStyle(2 * s, 0x8b6914, 0.6);
      buyBorder.strokeRoundedRect(cx, cy, cw, ch, 12 * s);

      const buyText = this.add.text(w / 2, cy + ch / 2, `BUY 3 LIVES (${LIVES_COST} \u{1FA99})`, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(16 * s)}px`, color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(1);

      const buyZone = this.add.zone(w / 2, cy + ch / 2, cw, ch)
        .setInteractive({ useHandCursor: true }).setDepth(3);
      buyZone.on('pointerover', () => {
        buyBorder.clear();
        buyBorder.lineStyle(3 * s, 0xffd700, 1);
        buyBorder.strokeRoundedRect(cx, cy, cw, ch, 12 * s);
        buyText.setColor('#ffffff');
      });
      buyZone.on('pointerout', () => {
        buyBorder.clear();
        buyBorder.lineStyle(2 * s, 0x8b6914, 0.6);
        buyBorder.strokeRoundedRect(cx, cy, cw, ch, 12 * s);
        buyText.setColor('#ffd700');
      });
      buyZone.on('pointerdown', () => {
        if (buyLives()) {
          this.scene.restart();
        }
      });
    }
  }

  private createFloatingOrbs(w: number, h: number, s: number) {
    const orbKeys = ['orb_0', 'orb_1', 'orb_2', 'orb_3'];
    for (let i = 0; i < 8; i++) {
      const key = orbKeys[i % 4];
      if (!this.textures.exists(key)) continue;
      const orb = this.add.image(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        key
      ).setDepth(-0.6).setAlpha(0).setScale(0.5);

      orb.setDisplaySize(Phaser.Math.Between(24, 60) * s, Phaser.Math.Between(24, 60) * s);

      this.tweens.add({
        targets: orb,
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.08, 0.15) },
        y: orb.y - Phaser.Math.Between(40, 100) * s,
        x: orb.x + Phaser.Math.Between(-40, 40) * s,
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        delay: i * 600,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
