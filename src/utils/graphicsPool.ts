import Phaser from 'phaser';

const POOL_SIZE = 40;

const pools = new Map<Phaser.Scene, Phaser.GameObjects.Graphics[]>();

function getPool(scene: Phaser.Scene): Phaser.GameObjects.Graphics[] {
  let pool = pools.get(scene);
  if (!pool) {
    pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const g = scene.add.graphics().setActive(false).setVisible(false);
      pool.push(g);
    }
    pools.set(scene, pool);
    scene.events.once('shutdown', () => {
      pools.delete(scene);
    });
  }
  return pool;
}

export function acquireGraphics(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const pool = getPool(scene);
  for (const g of pool) {
    if (!g.active) {
      g.setActive(true).setVisible(true).setScale(1).setAlpha(1).clear();
      return g;
    }
  }
  const g = scene.add.graphics();
  pool.push(g);
  return g;
}

export function releaseGraphics(g: Phaser.GameObjects.Graphics) {
  g.clear();
  g.setActive(false).setVisible(false).setScale(1).setAlpha(1);
}
