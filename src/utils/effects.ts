import Phaser from 'phaser';

let _burstCount = 0;
export function burstParticles(scene: Phaser.Scene, x: number, y: number, type: number, camW: number, camH: number, sf: number) {
  _burstCount++;
  if (_burstCount > 6) { _burstCount--; return; }
  scene.events.once('update', () => _burstCount--);
  if (type === 0) {
    const w = camW, h = camH, s = sf;
    scene.cameras.main.shake(300, 0.022);

    const flashWhite = scene.add.graphics().setDepth(50);
    flashWhite.fillStyle(0xffffff, 0.3); flashWhite.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: flashWhite, alpha: 0, duration: 120, ease: 'Quad.easeOut', onComplete: () => flashWhite.destroy() });

    const flashOrange = scene.add.graphics().setDepth(49);
    flashOrange.fillStyle(0xff6600, 0.25); flashOrange.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: flashOrange, alpha: 0, duration: 300, ease: 'Quad.easeOut', delay: 40, onComplete: () => flashOrange.destroy() });

    const coreFlash = scene.add.graphics().setDepth(12);
    coreFlash.fillStyle(0xffffff, 0.9); coreFlash.fillCircle(x, y, 6);
    scene.tweens.add({ targets: coreFlash, scaleX: 8, scaleY: 8, alpha: 0, duration: 250, ease: 'Quad.easeOut', onComplete: () => coreFlash.destroy() });

    const shockwave1 = scene.add.graphics().setDepth(12);
    shockwave1.lineStyle(4, 0xff8800, 0.8); shockwave1.strokeCircle(x, y, 4);
    scene.tweens.add({ targets: shockwave1, scaleX: 18, scaleY: 18, alpha: 0, duration: 400, ease: 'Cubic.easeOut', onComplete: () => shockwave1.destroy() });

    const shockwave2 = scene.add.graphics().setDepth(12);
    shockwave2.lineStyle(2.5, 0xffcc00, 0.5); shockwave2.strokeCircle(x, y, 4);
    scene.tweens.add({ targets: shockwave2, scaleX: 30, scaleY: 30, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => shockwave2.destroy() });

    const shockwave3 = scene.add.graphics().setDepth(11);
    shockwave3.lineStyle(1, 0xff3300, 0.25); shockwave3.strokeCircle(x, y, 4);
    scene.tweens.add({ targets: shockwave3, scaleX: 45, scaleY: 45, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => shockwave3.destroy() });

    const coreFlame = scene.add.particles(x, y, 'particle_fire_0', {
      speedY: { min: -200, max: -500 }, speedX: { min: -60, max: 60 },
      scale: { start: 2.0 * s, end: 0.2 * s },
      alpha: { start: 1, end: 0 }, rotate: { min: -90, max: 90 },
      angle: { min: 220, max: 320 }, lifespan: { min: 300, max: 700 },
      quantity: 20, tint: [0xffffff, 0xffffcc, 0xffdd66],
      blendMode: 'ADD', emitting: false,
    }).setDepth(10);
    coreFlame.explode();

    const mainFlame = scene.add.particles(x, y, 'particle_fire_1', {
      speedY: { min: -100, max: -380 }, speedX: { min: -120, max: 120 },
      scale: { start: 2.2 * s, end: 0.1 * s },
      alpha: { start: 1, end: 0 }, rotate: { min: -180, max: 180 },
      angle: { min: 180, max: 360 }, lifespan: { min: 400, max: 1000 },
      quantity: 28, tint: [0xffdd44, 0xff8800, 0xff4400, 0xcc2200],
      blendMode: 'ADD', emitting: false,
    }).setDepth(10);
    mainFlame.explode();

    const outerFlame = scene.add.particles(x, y, 'particle_fire_2', {
      speedY: { min: -60, max: -250 }, speedX: { min: -160, max: 160 },
      scale: { start: 1.8 * s, end: 0 },
      alpha: { start: 0.7, end: 0 }, rotate: { min: -360, max: 360 },
      angle: { min: 160, max: 380 }, lifespan: { min: 500, max: 1200 },
      quantity: 22, tint: [0xff4400, 0xcc2200, 0x881100, 0x440400],
      blendMode: 'ADD', emitting: false,
    }).setDepth(9);
    outerFlame.explode();

    const embers = scene.add.particles(x, y, 'particle_fire_ember', {
      speed: { min: 150, max: 450 }, angle: { min: 180, max: 360 },
      gravityY: 120, scale: { start: 1.8 * s, end: 0 },
      alpha: { start: 1, end: 0 }, lifespan: { min: 700, max: 2200 },
      quantity: 22, tint: [0xffdd44, 0xff8800, 0xff4400, 0xcc2200],
      blendMode: 'ADD', emitting: false,
    }).setDepth(11);
    embers.explode();

    const smoke = scene.add.particles(x, y, 'particle_fire_smoke', {
      speedY: { min: -20, max: -100 }, speedX: { min: -30, max: 30 },
      scale: { start: 1.5 * s, end: 3.0 * s },
      alpha: { start: 0.4, end: 0 }, lifespan: { min: 1500, max: 3500 },
      quantity: 10, emitting: false,
    }).setDepth(8);
    smoke.explode();

    scene.time.delayedCall(3800, () => { coreFlame.destroy(); mainFlame.destroy(); outerFlame.destroy(); embers.destroy(); smoke.destroy(); });

    const gg = scene.add.graphics().setDepth(10);
    gg.fillStyle(0xff4400, 0.3); gg.fillCircle(x, y, 18);
    gg.fillStyle(0xff8800, 0.18); gg.fillCircle(x, y, 30);
    gg.fillStyle(0xffcc00, 0.08); gg.fillCircle(x, y, 44);
    gg.fillStyle(0xff6600, 0.04); gg.fillCircle(x, y, 60);
    scene.tweens.add({ targets: gg, alpha: 0, duration: 1000, delay: 150, ease: 'Quad.easeIn', onComplete: () => gg.destroy() });
    return;
  }

  if (type === 1) {
    const w = camW, h = camH, s = sf;

    const flash = scene.add.graphics().setDepth(50);
    flash.fillStyle(0x88ddff, 0.15); flash.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

    const core = scene.add.graphics().setDepth(12);
    core.fillStyle(0xccf0ff, 0.8); core.fillCircle(x, y, 6);
    scene.tweens.add({ targets: core, scaleX: 8, scaleY: 8, alpha: 0, duration: 250, ease: 'Quad.easeOut', onComplete: () => core.destroy() });

    const ring1 = scene.add.graphics().setDepth(12);
    ring1.lineStyle(3, 0x88ddff, 0.7); ring1.strokeCircle(x, y, 4);
    scene.tweens.add({ targets: ring1, scaleX: 16, scaleY: 16, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => ring1.destroy() });

    const ring2 = scene.add.graphics().setDepth(12);
    ring2.lineStyle(2, 0xaae8ff, 0.45); ring2.strokeCircle(x, y, 4);
    scene.tweens.add({ targets: ring2, scaleX: 28, scaleY: 28, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => ring2.destroy() });

    const ring3 = scene.add.graphics().setDepth(11);
    ring3.lineStyle(1, 0xccf0ff, 0.2); ring3.strokeCircle(x, y, 4);
    scene.tweens.add({ targets: ring3, scaleX: 42, scaleY: 42, alpha: 0, duration: 950, ease: 'Sine.easeOut', onComplete: () => ring3.destroy() });

    const crown = scene.add.particles(x, y, 'particle_water_drop', {
      speedY: { min: -350, max: -120 }, speedX: { min: -180, max: 180 },
      gravityY: 500, scale: { start: 1.3 * s, end: 0.3 * s },
      alpha: { start: 1, end: 0.4 }, rotate: { min: -180, max: 180 },
      angle: { min: 0, max: 360 }, lifespan: { min: 500, max: 1200 },
      quantity: 28, tint: [0xffffff, 0xccf0ff, 0x99ddff],
      emitting: false,
    }).setDepth(10);
    crown.explode();

    const streams = scene.add.particles(x, y, 'particle_water_drop', {
      speedY: { min: -500, max: -200 }, speedX: { min: -100, max: 100 },
      gravityY: 700, scale: { start: 1.0 * s, end: 0.2 * s },
      alpha: { start: 0.8, end: 0.2 }, rotate: { min: -90, max: 90 },
      angle: { min: 0, max: 360 }, lifespan: { min: 400, max: 900 },
      quantity: 18, tint: [0xffffff, 0xccf0ff, 0x88ddff],
      emitting: false,
    }).setDepth(10);
    streams.explode();

    const mist = scene.add.particles(x, y, 'particle_water_splash', {
      speed: { min: 30, max: 160 }, angle: { min: 0, max: 360 },
      gravityY: 60, scale: { start: 2.5 * s, end: 0.5 * s },
      alpha: { start: 0.3, end: 0 }, lifespan: { min: 800, max: 2000 },
      quantity: 16, tint: [0xccf0ff, 0xaae8ff],
      blendMode: 'ADD', emitting: false,
    }).setDepth(9);
    mist.explode();

    scene.time.delayedCall(2200, () => { crown.destroy(); streams.destroy(); mist.destroy(); });

    const bubbles = scene.add.particles(x, y, 'particle_water_bubble', {
      speedY: { min: -30, max: -100 }, speedX: { min: -30, max: 30 },
      scale: { start: 0.6 * s, end: 1.2 * s }, alpha: { start: 0.5, end: 0 },
      lifespan: { min: 1500, max: 3000 }, quantity: 10,
      tint: [0xffffff, 0xccf0ff, 0x99ddff],
      blendMode: 'ADD', emitting: false,
    }).setDepth(11);
    bubbles.explode();
    scene.time.delayedCall(3200, () => bubbles.destroy());

    const pool = scene.add.graphics().setDepth(10);
    pool.fillStyle(0x3399ff, 0.2); pool.fillEllipse(x, y, 60, 30);
    pool.fillStyle(0x66ccff, 0.1); pool.fillEllipse(x, y, 90, 45);
    pool.fillStyle(0x88ddff, 0.05); pool.fillEllipse(x, y, 120, 60);
    scene.tweens.add({ targets: pool, alpha: 0, duration: 1100, delay: 250, ease: 'Quad.easeIn', onComplete: () => pool.destroy() });
    return;
  }

  if (type === 3) {
    const w = camW, h = camH, s = sf;
    const sf2 = scene.add.graphics().setDepth(50);
    sf2.fillStyle(0x44cc44, 0.12); sf2.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: sf2, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => sf2.destroy() });

    const flash = scene.add.graphics().setDepth(12);
    flash.fillStyle(0x88ff88, 0.6); flash.fillCircle(x, y, 8);
    scene.tweens.add({ targets: flash, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

    const ring = scene.add.graphics().setDepth(12);
    ring.lineStyle(3, 0x66dd66, 0.7); ring.strokeCircle(x, y, 4);
    scene.tweens.add({ targets: ring, scaleX: 18, scaleY: 18, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });

    const leaves = scene.add.particles(x, y, 'particle_leaf', {
      speedY: { min: -300, max: -80 }, speedX: { min: -180, max: 180 },
      gravityY: 250, scale: { start: 1.5 * s, end: 0.4 * s },
      alpha: { start: 1, end: 0.3 }, rotate: { min: -180, max: 180 },
      angle: { min: 0, max: 360 }, lifespan: { min: 800, max: 2000 },
      quantity: 22, tint: [0x88dd44, 0x44aa22, 0x66cc33, 0xaaee55],
      emitting: false,
    }).setDepth(10);
    leaves.explode();

    const petals = scene.add.particles(x, y, 'particle_leaf', {
      speedY: { min: -100, max: -30 }, speedX: { min: -80, max: 80 },
      gravityY: 80, scale: { start: 0.8 * s, end: 0.2 * s },
      alpha: { start: 0.7, end: 0 }, rotate: { min: -90, max: 90 },
      lifespan: { min: 1200, max: 3000 }, quantity: 12,
      tint: [0x66cc33, 0x88dd44, 0x55bb22],
      emitting: false,
    }).setDepth(10);
    petals.explode();

    const spores = scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 40, max: 200 }, angle: { min: 0, max: 360 },
      gravityY: -30, scale: { start: 1.0 * s, end: 0 },
      alpha: { start: 0.6, end: 0 }, lifespan: { min: 1000, max: 2200 },
      quantity: 18, tint: [0x88ff88, 0x66ff44, 0xccff88, 0x44dd22],
      blendMode: 'ADD', emitting: false,
    }).setDepth(11);
    spores.explode();

    scene.time.delayedCall(3200, () => { leaves.destroy(); petals.destroy(); spores.destroy(); });

    const pool = scene.add.graphics().setDepth(10);
    pool.fillStyle(0x44cc44, 0.2); pool.fillCircle(x, y, 20);
    pool.fillStyle(0x66dd44, 0.1); pool.fillCircle(x, y, 32);
    pool.fillStyle(0x88ee55, 0.05); pool.fillCircle(x, y, 44);
    scene.tweens.add({ targets: pool, alpha: 0, duration: 1200, delay: 200, ease: 'Quad.easeIn', onComplete: () => pool.destroy() });
    return;
  }

  if (type === 2) {
    const w = camW, h = camH, s = sf;
    scene.cameras.main.shake(200, 0.012);

    const sf2 = scene.add.graphics().setDepth(50);
    sf2.fillStyle(0x664422, 0.2); sf2.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: sf2, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => sf2.destroy() });

    const ring = scene.add.graphics().setDepth(12);
    ring.lineStyle(4, 0x886644, 0.7); ring.strokeCircle(x, y, 4);
    scene.tweens.add({ targets: ring, scaleX: 16, scaleY: 16, alpha: 0, duration: 500, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });

    const rocks = scene.add.particles(x, y, 'particle_rock_0', {
      speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 },
      gravityY: 500, scale: { start: 1.8 * s, end: 0.3 * s },
      alpha: { start: 1, end: 0.5 }, rotate: { min: -360, max: 360 },
      lifespan: { min: 600, max: 1500 }, quantity: 16,
      tint: [0x8a7a6a, 0x6a5a4a, 0x5a4a3a, 0x9a8a7a],
      emitting: false,
    }).setDepth(10);
    rocks.explode();

    const gravel = scene.add.particles(x, y, 'particle_rock_1', {
      speed: { min: 150, max: 500 }, angle: { min: 0, max: 360 },
      gravityY: 600, scale: { start: 1.4 * s, end: 0.2 * s },
      alpha: { start: 1, end: 0.3 }, rotate: { min: -540, max: 540 },
      lifespan: { min: 400, max: 1000 }, quantity: 20,
      tint: [0x7a6a5a, 0x5a4a3a, 0x6a5a4a],
      emitting: false,
    }).setDepth(10);
    gravel.explode();

    const dust = scene.add.particles(x, y, 'particle_rock_dust', {
      speed: { min: 30, max: 180 }, angle: { min: 0, max: 360 },
      gravityY: 100, scale: { start: 2.0 * s, end: 0 },
      alpha: { start: 0.5, end: 0 }, lifespan: { min: 800, max: 2200 },
      quantity: 18, blendMode: 'ADD', emitting: false,
    }).setDepth(11);
    dust.explode();

    const chips = scene.add.particles(x, y, 'particle_rock_2', {
      speed: { min: 60, max: 250 }, angle: { min: 0, max: 360 },
      gravityY: 350, scale: { start: 1.0 * s, end: 0.1 * s },
      alpha: { start: 0.8, end: 0 }, rotate: { min: -720, max: 720 },
      lifespan: { min: 500, max: 1200 }, quantity: 10,
      tint: [0x9a8a7a, 0x6a5a4a, 0x8a7a6a],
      emitting: false,
    }).setDepth(10);
    chips.explode();

    scene.time.delayedCall(2500, () => { rocks.destroy(); gravel.destroy(); dust.destroy(); chips.destroy(); });

    const crater = scene.add.graphics().setDepth(10);
    crater.fillStyle(0x664422, 0.25); crater.fillCircle(x, y, 18);
    crater.fillStyle(0x553311, 0.12); crater.fillCircle(x, y, 30);
    scene.tweens.add({ targets: crater, alpha: 0, duration: 1000, delay: 200, ease: 'Quad.easeIn', onComplete: () => crater.destroy() });
    return;
  }

  if (type === 4) {
    const w = camW, h = camH, s = sf;
    scene.cameras.main.shake(350, 0.025);

    const flashWhite = scene.add.graphics().setDepth(50);
    flashWhite.fillStyle(0xffffff, 0.35); flashWhite.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: flashWhite, alpha: 0, duration: 80, ease: 'Quad.easeOut', onComplete: () => flashWhite.destroy() });

    const flashPurple = scene.add.graphics().setDepth(49);
    flashPurple.fillStyle(0xaa44ff, 0.25); flashPurple.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: flashPurple, alpha: 0, duration: 200, ease: 'Quad.easeOut', delay: 30, onComplete: () => flashPurple.destroy() });

    const strike = scene.add.graphics().setDepth(13);
    const boltSegs = (minR: number, maxR: number, forks: number) => {
      strike.lineStyle(3 * (1 - forks * 0.15), 0xffffff, 0.9 - forks * 0.15);
      for (let f = 0; f < 1 + forks; f++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const dist = Phaser.Math.Between(minR, maxR);
        const segments = 5 + Phaser.Math.Between(0, 3);
        let cx = x, cy = y;
        strike.beginPath(); strike.moveTo(cx, cy);
        for (let i = 0; i < segments; i++) {
          const t = (i + 1) / segments;
          const targetX = x + Math.cos(angle) * dist * t;
          const targetY = y + Math.sin(angle) * dist * t;
          const jitter = dist * 0.03 * (1 - t);
          cx += (targetX - cx) + Phaser.Math.FloatBetween(-jitter, jitter);
          cy += (targetY - cy) + Phaser.Math.FloatBetween(-jitter, jitter);
          strike.lineTo(cx, cy);
        }
        strike.strokePath();
        const subAngle = angle + Phaser.Math.FloatBetween(-0.4, 0.4);
        const subDist = dist * Phaser.Math.FloatBetween(0.3, 0.6);
        if (subDist > 20) {
          strike.lineStyle(2 * (1 - forks * 0.15), 0xdd88ff, 0.5);
          strike.beginPath(); strike.moveTo(cx, cy);
          let scx = cx, scy = cy;
          for (let i = 0; i < 3; i++) {
            scx += Math.cos(subAngle) * subDist * 0.33 + Phaser.Math.FloatBetween(-8, 8);
            scy += Math.sin(subAngle) * subDist * 0.33 + Phaser.Math.FloatBetween(-8, 8);
            strike.lineTo(scx, scy);
          }
          strike.strokePath();
        }
      }
    };
    boltSegs(30, 90, 3);

    scene.tweens.add({
      targets: strike, alpha: 0, duration: 300, delay: 120,
      ease: 'Quad.easeOut', onComplete: () => scene.time.delayedCall(100, () => strike.destroy()),
    });

    const glowStrike = scene.add.graphics().setDepth(12);
    boltSegs.call(glowStrike, 20, 70, 2);

    const boltGlow = scene.add.graphics().setDepth(12);
    boltGlow.lineStyle(8, 0xcc66ff, 0.3);
    boltGlow.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = Phaser.Math.Between(40, 80);
      boltGlow.moveTo(x, y); boltGlow.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    boltGlow.strokePath();
    scene.tweens.add({ targets: boltGlow, alpha: 0, duration: 250, delay: 80, ease: 'Quad.easeOut', onComplete: () => boltGlow.destroy() });

    scene.time.delayedCall(500, () => { glowStrike.destroy(); });

    const sparkBurst = scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 250, max: 700 }, angle: { min: 0, max: 360 },
      scale: { start: 2.5 * s, end: 0.1 * s },
      alpha: { start: 1, end: 0 }, rotate: { min: -180, max: 180 },
      lifespan: { min: 200, max: 500 }, quantity: 40,
      tint: [0xffffff, 0xee88ff, 0xcc66ff, 0xaa44ff],
      blendMode: 'ADD', emitting: false,
    }).setDepth(10);
    sparkBurst.explode();

    const arcChain = scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 },
      scale: { start: 1.5 * s, end: 0.1 * s },
      alpha: { start: 0.9, end: 0 }, rotate: { min: -360, max: 360 },
      lifespan: { min: 400, max: 1000 }, quantity: 25,
      tint: [0xcc66ff, 0xee88ff, 0xffffff, 0xff88cc],
      blendMode: 'ADD', emitting: false,
    }).setDepth(10);
    arcChain.explode();

    const plasma = scene.add.particles(x, y, 'particle_fire_ember', {
      speed: { min: 20, max: 120 }, angle: { min: 0, max: 360 },
      gravityY: -40, scale: { start: 2.0 * s, end: 0 },
      alpha: { start: 0.6, end: 0 }, lifespan: { min: 600, max: 1800 },
      quantity: 18, tint: [0xcc66ff, 0xaa44ff, 0x8822dd],
      blendMode: 'ADD', emitting: false,
    }).setDepth(9);
    plasma.explode();

    scene.time.delayedCall(2500, () => { sparkBurst.destroy(); arcChain.destroy(); plasma.destroy(); });

    const groundPool = scene.add.graphics().setDepth(10);
    groundPool.fillStyle(0xaa44ff, 0.2); groundPool.fillCircle(x, y, 15);
    groundPool.fillStyle(0xcc66ff, 0.12); groundPool.fillCircle(x, y, 28);
    groundPool.fillStyle(0xee88ff, 0.06); groundPool.fillCircle(x, y, 40);
    groundPool.fillStyle(0xffffff, 0.03); groundPool.fillCircle(x, y, 55);
    scene.tweens.add({ targets: groundPool, alpha: 0, duration: 1200, delay: 200, ease: 'Quad.easeIn', onComplete: () => groundPool.destroy() });
    return;
  }

  if (type === 5) {
    const w = camW, h = camH, s = sf;

    const flash = scene.add.graphics().setDepth(50);
    flash.fillStyle(0xccf0ff, 0.18); flash.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 250, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

    const drawHex = (g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number) => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.closePath();
    };

    const snowGfx = scene.add.graphics().setDepth(13);

    const drawSnowflake = (cx: number, cy: number, size: number, color: number, alpha: number) => {
      snowGfx.fillStyle(color, alpha);
      drawHex(snowGfx, cx, cy, size);
      snowGfx.fill();
      snowGfx.lineStyle(1, 0xffffff, alpha * 0.6);
      drawHex(snowGfx, cx, cy, size);
      snowGfx.strokePath();
      snowGfx.lineStyle(1, color, alpha * 0.4);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const inner = size * 0.25;
        snowGfx.beginPath();
        snowGfx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        snowGfx.lineTo(cx + Math.cos(a) * size, cy + Math.sin(a) * size);
        snowGfx.strokePath();
        const ba = a + Math.PI / 6;
        const bl = size * 0.4;
        snowGfx.beginPath();
        snowGfx.moveTo(cx + Math.cos(a) * size * 0.6, cy + Math.sin(a) * size * 0.6);
        snowGfx.lineTo(cx + Math.cos(ba) * bl + Math.cos(a) * size * 0.6, cy + Math.sin(ba) * bl + Math.sin(a) * size * 0.6);
        snowGfx.strokePath();
        snowGfx.beginPath();
        snowGfx.moveTo(cx + Math.cos(a) * size * 0.6, cy + Math.sin(a) * size * 0.6);
        snowGfx.lineTo(cx + Math.cos(-ba) * bl + Math.cos(a) * size * 0.6, cy + Math.sin(-ba) * bl + Math.sin(a) * size * 0.6);
        snowGfx.strokePath();
      }
    };

    drawSnowflake(x, y, 14, 0xffffff, 0.9);
    drawSnowflake(x + 28, y - 24, 9, 0xccf0ff, 0.7);
    drawSnowflake(x - 32, y + 16, 8, 0xaaddff, 0.65);
    drawSnowflake(x + 22, y + 30, 7, 0x88ddff, 0.6);
    drawSnowflake(x - 20, y - 35, 10, 0xbbeeff, 0.75);
    drawSnowflake(x + 42, y + 8, 6, 0xccf0ff, 0.5);
    drawSnowflake(x - 40, y - 6, 7, 0xaaddff, 0.55);

    const hexRing = scene.add.graphics().setDepth(12);
    hexRing.lineStyle(2, 0xffffff, 0.4);
    drawHex(hexRing, x, y, 20);
    hexRing.strokePath();
    hexRing.lineStyle(1.5, 0xccf0ff, 0.25);
    drawHex(hexRing, x, y, 36);
    hexRing.strokePath();
    hexRing.lineStyle(1, 0xaaddff, 0.15);
    drawHex(hexRing, x, y, 52);
    hexRing.strokePath();

    scene.tweens.add({
      targets: [snowGfx, hexRing],
      alpha: 0, duration: 600, delay: 300,
      ease: 'Quad.easeIn', onComplete: () => { snowGfx.destroy(); hexRing.destroy(); },
    });

    const iceShards = scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 120, max: 450 }, angle: { min: 0, max: 360 },
      scale: { start: 2.5 * s, end: 0.1 * s },
      alpha: { start: 1, end: 0 }, rotate: { min: -180, max: 180 },
      lifespan: { min: 400, max: 900 }, quantity: 30,
      tint: [0xffffff, 0xeef8ff, 0xccf0ff, 0x88ddff],
      blendMode: 'ADD', emitting: false,
    }).setDepth(10);
    iceShards.explode();

    const snowfall = scene.add.particles(x, y, 'particle_hex', {
      speedX: { min: -40, max: 40 }, speedY: { min: 60, max: 180 },
      scale: { start: 1.5 * s, end: 0.3 * s },
      alpha: { start: 0.8, end: 0 }, rotate: { min: -180, max: 180 },
      lifespan: { min: 1500, max: 3500 }, quantity: 22,
      tint: [0xffffff, 0xccf0ff, 0xeef8ff],
      blendMode: 'ADD', emitting: false,
    }).setDepth(11);
    snowfall.explode();

    const frostMist = scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 20, max: 100 }, angle: { min: 0, max: 360 },
      gravityY: -20, scale: { start: 3.5 * s, end: 0 },
      alpha: { start: 0.35, end: 0 }, lifespan: { min: 1000, max: 2800 },
      quantity: 14, tint: [0xccf0ff, 0xaaddff, 0xffffff],
      blendMode: 'ADD', emitting: false,
    }).setDepth(9);
    frostMist.explode();

    scene.time.delayedCall(4000, () => { iceShards.destroy(); snowfall.destroy(); frostMist.destroy(); });

    const frozenPatch = scene.add.graphics().setDepth(10);
    frozenPatch.fillStyle(0x88ddff, 0.15); frozenPatch.fillCircle(x, y, 16);
    frozenPatch.fillStyle(0xccf0ff, 0.1); frozenPatch.fillCircle(x, y, 28);
    drawHex(frozenPatch, x, y, 22);
    frozenPatch.fillStyle(0xaaddff, 0.06);
    frozenPatch.fillPath();
    drawHex(frozenPatch, x, y, 38);
    frozenPatch.fillStyle(0x88ddff, 0.04);
    frozenPatch.fillPath();
    frozenPatch.lineStyle(1, 0xffffff, 0.12);
    drawHex(frozenPatch, x, y, 22); frozenPatch.strokePath();
    drawHex(frozenPatch, x, y, 38); frozenPatch.strokePath();
    scene.tweens.add({ targets: frozenPatch, alpha: 0, duration: 1500, delay: 200, ease: 'Quad.easeIn', onComplete: () => frozenPatch.destroy() });
    return;
  }

  if (type === 6) {
    const w = camW, h = camH, s = sf;

    const flash = scene.add.graphics().setDepth(50);
    flash.fillStyle(0xddff99, 0.12); flash.fillRect(0, 0, w, h);
    scene.tweens.add({ targets: flash, alpha: 0, duration: 250, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

    const spiralGfx = scene.add.graphics().setDepth(13);
    spiralGfx.lineStyle(2, 0xeeffbb, 0.5);
    for (let ring = 0; ring < 3; ring++) {
      spiralGfx.beginPath();
      const startAngle = ring * 1.2;
      const turns = 2.5 - ring * 0.3;
      const maxR = (30 + ring * 18) * s;
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + t * turns * Math.PI * 2;
        const r = maxR * t;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        i === 0 ? spiralGfx.moveTo(px, py) : spiralGfx.lineTo(px, py);
      }
      spiralGfx.strokePath();
    }

    spiralGfx.lineStyle(1.5, 0xccdd88, 0.35);
    for (let ring = 0; ring < 2; ring++) {
      spiralGfx.beginPath();
      const startAngle = -ring * 1.5 + 0.5;
      const turns = 2 - ring * 0.4;
      const maxR = (40 + ring * 22) * s;
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + t * turns * Math.PI * 2;
        const r = maxR * t;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        i === 0 ? spiralGfx.moveTo(px, py) : spiralGfx.lineTo(px, py);
      }
      spiralGfx.strokePath();
    }

    scene.tweens.add({
      targets: spiralGfx, alpha: 0, scaleX: 1.8, scaleY: 1.8,
      duration: 700, ease: 'Quad.easeOut',
      onComplete: () => spiralGfx.destroy(),
    });

    const streakCount = 24;
    const streaks: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < streakCount; i++) {
      const a = (i / streakCount) * Math.PI * 2;
      const startR = Phaser.Math.Between(5, 15) * s;
      const endR = Phaser.Math.Between(30, 70) * s;
      const g = scene.add.graphics().setDepth(12);
      g.lineStyle(Phaser.Math.Between(1, 3), [0xeeffbb, 0xddff99, 0xccdd88, 0xffffff][Phaser.Math.Between(0, 3)], Phaser.Math.FloatBetween(0.3, 0.7));
      g.beginPath();
      const midR = (startR + endR) / 2;
      const curve = Phaser.Math.FloatBetween(-0.3, 0.3);
      g.moveTo(x + Math.cos(a) * startR, y + Math.sin(a) * startR);
      g.lineTo(x + Math.cos(a + curve) * midR, y + Math.sin(a + curve) * midR);
      g.lineTo(x + Math.cos(a + curve * 1.5) * endR, y + Math.sin(a + curve * 1.5) * endR);
      g.strokePath();
      streaks.push(g);
    }

    scene.tweens.add({
      targets: streaks,
      alpha: 0, duration: 500, delay: 200,
      ease: 'Quad.easeOut',
      onComplete: () => streaks.forEach(g => g.destroy()),
    });

    const dustSwirl = scene.add.particles(x, y, 'particle_air', {
      speed: { min: 100, max: 350 }, angle: { min: 0, max: 360 },
      scale: { start: 3.0 * s, end: 0.1 * s },
      alpha: { start: 0.7, end: 0 }, rotate: { min: -180, max: 180 },
      lifespan: { min: 300, max: 800 }, quantity: 35,
      tint: [0xffffff, 0xeeffbb, 0xddff99, 0xccdd88],
      blendMode: 'ADD', emitting: false,
    }).setDepth(10);
    dustSwirl.explode();

    const updraft = scene.add.particles(x, y, 'particle_air', {
      speedY: { min: -350, max: -80 }, speedX: { min: -80, max: 80 },
      scale: { start: 2.0 * s, end: 0 },
      alpha: { start: 0.5, end: 0 }, rotate: { min: -360, max: 360 },
      lifespan: { min: 600, max: 1500 }, quantity: 18,
      tint: [0xddff99, 0xccdd88, 0xeeffbb],
      blendMode: 'ADD', emitting: false,
    }).setDepth(10);
    updraft.explode();

    const leaves = scene.add.particles(x, y, 'particle_leaf', {
      speed: { min: 80, max: 280 }, angle: { min: 0, max: 360 },
      gravityY: 150, scale: { start: 1.2 * s, end: 0.3 * s },
      alpha: { start: 0.8, end: 0 }, rotate: { min: -540, max: 540 },
      lifespan: { min: 800, max: 2200 }, quantity: 14,
      tint: [0x88dd44, 0x66cc33, 0xaadd55],
      blendMode: 'ADD', emitting: false,
    }).setDepth(11);
    leaves.explode();

    scene.time.delayedCall(3000, () => { dustSwirl.destroy(); updraft.destroy(); leaves.destroy(); });

    const afterGlow = scene.add.graphics().setDepth(10);
    afterGlow.fillStyle(0xccdd88, 0.1); afterGlow.fillCircle(x, y, 18);
    afterGlow.fillStyle(0xddff99, 0.06); afterGlow.fillCircle(x, y, 32);
    afterGlow.fillStyle(0xeeffbb, 0.03); afterGlow.fillCircle(x, y, 48);
    scene.tweens.add({ targets: afterGlow, alpha: 0, duration: 1200, delay: 300, ease: 'Quad.easeIn', onComplete: () => afterGlow.destroy() });
    return;
  }
}
