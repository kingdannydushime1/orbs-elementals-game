import Phaser from 'phaser';
import { buyLives, LIVES_COST } from './save';

export function showBuyLivesModal(scene: Phaser.Scene, w: number, h: number, s: number, onBuy: () => void) {
  const overlay = scene.add.graphics().setDepth(200);
  overlay.fillStyle(0x000000, 0.7);
  overlay.fillRect(0, 0, w, h);

  const panelW = Math.min(320 * s, w * 0.9);
  const panelH = 420 * s;
  const px = w / 2;
  const py = h / 2;
  const panely = py - panelH / 2;

  const panel = scene.add.image(px, py, 'wood_panel').setDepth(201);
  panel.setDisplaySize(panelW, panelH);

  const panelBorder = scene.add.graphics().setDepth(201);
  panelBorder.lineStyle(3 * s, 0xffd700, 0.6);
  panelBorder.strokeRoundedRect(px - panelW / 2, panely, panelW, panelH, 20 * s);

  const heartsText = scene.add.text(px, panely + 36 * s, '\u2764'.repeat(3), {
    fontSize: `${Math.round(44 * s)}px`, color: '#ff4d6d',
  }).setOrigin(0.5).setDepth(202);

  const livesText = scene.add.text(px, panely + 74 * s, '3 LIVES', {
    fontFamily: 'Georgia, serif', fontSize: `${Math.round(26 * s)}px`, color: '#fff8e7', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(202);

  const divider = scene.add.graphics().setDepth(202);
  divider.lineStyle(1 * s, 0x8b6914, 0.4);
  divider.lineBetween(px - panelW / 2 + 30 * s, panely + 104 * s, px + panelW / 2 - 30 * s, panely + 104 * s);

  const coinIcon = scene.add.text(px, panely + 130 * s, '\u{1FA99}', {
    fontSize: `${Math.round(22 * s)}px`,
  }).setOrigin(0.5).setDepth(202);

  const infoText = scene.add.text(px, panely + 158 * s, `Buy 3 lives (${LIVES_COST} coins)`, {
    fontFamily: 'Georgia, serif', fontSize: `${Math.round(15 * s)}px`, color: '#c4b5fd', fontStyle: 'italic',
  }).setOrigin(0.5).setDepth(202);

  const btnW = Math.min(240 * s, panelW - 40 * s);
  const btnH = 52 * s;
  const buyBtnY = panely + 188 * s;

  const buyPanelBg = scene.add.image(px, buyBtnY + btnH / 2, 'wood_panel').setDepth(202);
  buyPanelBg.setDisplaySize(btnW, btnH);

  const buyBorder = scene.add.graphics().setDepth(202);
  buyBorder.lineStyle(2.5 * s, 0x8b6914, 0.8);
  buyBorder.strokeRoundedRect(px - btnW / 2, buyBtnY, btnW, btnH, 14 * s);

  const buyText = scene.add.text(px, buyBtnY + btnH / 2, `BUY 3 LIVES (${LIVES_COST} \u{1FA99})`, {
    fontFamily: 'Georgia, serif', fontSize: `${Math.round(18 * s)}px`, color: '#ffd700', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(203);
  buyPanelBg.setInteractive({ useHandCursor: true });
  buyPanelBg.on('pointerover', () => {
    buyBorder.clear();
    buyBorder.lineStyle(3.5 * s, 0xffd700, 1);
    buyBorder.strokeRoundedRect(px - btnW / 2, buyBtnY, btnW, btnH, 14 * s);
    buyText.setColor('#ffffff');
  });
  buyPanelBg.on('pointerout', () => {
    buyBorder.clear();
    buyBorder.lineStyle(2.5 * s, 0x8b6914, 0.8);
    buyBorder.strokeRoundedRect(px - btnW / 2, buyBtnY, btnW, btnH, 14 * s);
    buyText.setColor('#ffd700');
  });
  buyPanelBg.on('pointerdown', () => {
    if (!buyLives()) return;
    overlay.destroy(); panel.destroy(); panelBorder.destroy();
    heartsText.destroy(); livesText.destroy(); divider.destroy();
    coinIcon.destroy(); infoText.destroy();
    buyPanelBg.destroy(); buyBorder.destroy(); buyText.destroy();
    cancelPanel.destroy(); cancelBorder.destroy(); cancelText.destroy();
    onBuy();
  });

  const cancelBtnW = Math.min(180 * s, panelW * 0.55);
  const cancelBtnH = 48 * s;
  const cancelBtnY = buyBtnY + btnH + 24 * s;

  const cancelPanel = scene.add.image(px, cancelBtnY + cancelBtnH / 2, 'wood_panel').setDepth(202);
  cancelPanel.setDisplaySize(cancelBtnW, cancelBtnH);

  const cancelBorder = scene.add.graphics().setDepth(202);
  cancelBorder.lineStyle(2.5 * s, 0x4a3a6a, 0.7);
  cancelBorder.strokeRoundedRect(px - cancelBtnW / 2, cancelBtnY, cancelBtnW, cancelBtnH, 14 * s);

  const cancelText = scene.add.text(px, cancelBtnY + cancelBtnH / 2, 'CLOSE', {
    fontFamily: 'Georgia, serif', fontSize: `${Math.round(20 * s)}px`, color: '#a78bfa', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(203);
  cancelPanel.setInteractive({ useHandCursor: true });
  cancelPanel.on('pointerover', () => {
    cancelBorder.clear();
    cancelBorder.lineStyle(3 * s, 0xa78bfa, 1);
    cancelBorder.strokeRoundedRect(px - cancelBtnW / 2, cancelBtnY, cancelBtnW, cancelBtnH, 14 * s);
    cancelText.setColor('#ffffff');
  });
  cancelPanel.on('pointerout', () => {
    cancelBorder.clear();
    cancelBorder.lineStyle(2.5 * s, 0x4a3a6a, 0.7);
    cancelBorder.strokeRoundedRect(px - cancelBtnW / 2, cancelBtnY, cancelBtnW, cancelBtnH, 14 * s);
    cancelText.setColor('#a78bfa');
  });
  cancelPanel.on('pointerdown', () => {
    overlay.destroy(); panel.destroy(); panelBorder.destroy();
    heartsText.destroy(); livesText.destroy(); divider.destroy();
    coinIcon.destroy(); infoText.destroy();
    buyPanelBg.destroy(); buyBorder.destroy(); buyText.destroy();
    cancelPanel.destroy(); cancelBorder.destroy(); cancelText.destroy();
  });
}
