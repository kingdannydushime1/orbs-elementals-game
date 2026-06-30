import Phaser from 'phaser';

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

    const playY = h * 0.53;

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

    makeBtn('PLAY', playY, 800, () => this.scene.start('GameScene', { levelId: 1 }));

    const levelsY = h * 0.69;

    makeBtn('LEVELS', levelsY, 1000, () => this.scene.start('LevelSelectScene'));

    const totalCoins = this.getTotalCoins();
    const coinPanelW = 180 * s;
    const coinPanelH = 48 * s;
    const coinPanelX = (w - coinPanelW) / 2;
    const coinPanelY = h * 0.80;

    const coinPanel = this.add.image(w / 2, coinPanelY + coinPanelH / 2, 'wood_panel').setDepth(0);
    coinPanel.setDisplaySize(coinPanelW, coinPanelH);

    const coinBorder = this.add.graphics().setDepth(0.5);
    coinBorder.lineStyle(2 * s, 0xffd700, 0.5);
    coinBorder.strokeRoundedRect(coinPanelX, coinPanelY, coinPanelW, coinPanelH, 16 * s);

    if (totalCoins > 0) {
      const coinIcon = this.add.text(coinPanelX + 24 * s, coinPanelY + coinPanelH / 2, '\u{1FA99}', {
        fontSize: `${Math.round(26 * s)}px`,
      }).setOrigin(0.5).setDepth(1).setScale(0).setPadding(0, 4, 0, 4);
      this.tweens.add({ targets: coinIcon, scaleX: 1, scaleY: 1, alpha: 1, duration: 500, delay: 1100, ease: 'Back.easeOut' });

      const coinsText = this.add.text(coinPanelX + 56 * s, coinPanelY + coinPanelH / 2, String(totalCoins), {
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.round(22 * s)}px`,
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(1).setAlpha(0);
      this.tweens.add({ targets: coinsText, alpha: 1, duration: 400, delay: 1300, ease: 'Quad.easeOut' });
    }

    const version = this.add.text(w - 12 * s, h - 12 * s, 'v1.0', {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.round(11 * s)}px`,
      color: '#4a3a6a',
    }).setOrigin(1, 1).setDepth(1);

    this.createFloatingOrbs(w, h, s);

    this.scale.on('resize', () => {
      this.scene.restart();
    });
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

  private getTotalCoins(): number {
    try {
      let total = 0;
      for (let i = 1; i <= 15; i++) {
        const stars = parseInt(localStorage.getItem(`level_${i}_stars`) || '0', 10);
        total += stars;
      }
      return total;
    } catch {
      return 0;
    }
  }
}
