class SoundSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;

  get muted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    if (this.master) this.master.gain.value = this._muted ? 0 : 0.3;
    return this._muted;
  }

  setMuted(v: boolean) {
    this._muted = v;
    if (this.master) this.master.gain.value = this._muted ? 0 : 0.3;
  }

  constructor() {
    this.initTouchResume();
  }

  private initTouchResume() {
    const resume = () => { this.init(); this.ctx?.resume(); };
    document.addEventListener('touchend', resume);
    document.addEventListener('click', resume);
  }

  private init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
    } catch { /* no audio */ }
  }

  private resume() { this.init(); this.ctx?.resume(); }

  private noiseBuf(dur: number) {
    const len = this.ctx!.sampleRate * dur;
    const buf = this.ctx!.createBuffer(1, len, this.ctx!.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  playSwap() {
    this.resume(); if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.08);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.12);
  }

  playDenied() {
    this.resume(); if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, t);
    o.frequency.linearRampToValueAtTime(120, t + 0.18);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.18);
  }

  playMatch(type: number, combo: number) {
    this.resume(); if (!this.ctx || !this.master) return;
    const m = 1 + combo * 0.1;
    const t = this.ctx.currentTime;
    switch (type) {
      case 0: this.fire(t, m); break;
      case 1: this.water(t, m); break;
      case 2: this.earth(t, m); break;
      case 3: this.leaf(t, m); break;
    }
  }

  private fire(t: number, m: number) {
    const ctx = this.ctx!;
    const dst = this.master!;

    const whoosh = ctx.createBufferSource();
    whoosh.buffer = this.noiseBuf(0.35);
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.setValueAtTime(2000 * m, t);
    wf.frequency.exponentialRampToValueAtTime(200, t + 0.35);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.2, t);
    wg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    whoosh.connect(wf); wf.connect(wg); wg.connect(dst);
    whoosh.start(t); whoosh.stop(t + 0.35);

    const rumble = ctx.createOscillator();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(60 * m, t);
    rumble.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.12, t);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    rumble.connect(rg); rg.connect(dst);
    rumble.start(t); rumble.stop(t + 0.25);

    for (let i = 0; i < 6; i++) {
      const ct = t + 0.02 + i * 0.035;
      const pop = ctx.createBufferSource();
      pop.buffer = this.noiseBuf(0.04);
      const pf = ctx.createBiquadFilter();
      pf.type = 'bandpass';
      pf.frequency.setValueAtTime(1500 + Math.random() * 2000, ct);
      pf.Q.value = 2;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0.06 * m, ct);
      pg.gain.exponentialRampToValueAtTime(0.001, ct + 0.04);
      pop.connect(pf); pf.connect(pg); pg.connect(dst);
      pop.start(ct); pop.stop(ct + 0.04);
    }
  }

  private water(t: number, m: number) {
    const ctx = this.ctx!;
    const dst = this.master!;

    const splash = ctx.createBufferSource();
    splash.buffer = this.noiseBuf(0.3);
    const sf = ctx.createBiquadFilter();
    sf.type = 'bandpass';
    sf.frequency.setValueAtTime(200, t);
    sf.frequency.exponentialRampToValueAtTime(2000 * m, t + 0.12);
    sf.frequency.exponentialRampToValueAtTime(300, t + 0.3);
    sf.Q.value = 0.8;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.18, t);
    sg.gain.linearRampToValueAtTime(0.22, t + 0.05);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    splash.connect(sf); sf.connect(sg); sg.connect(dst);
    splash.start(t); splash.stop(t + 0.3);

    for (let i = 0; i < 4; i++) {
      const ct = t + 0.05 + i * 0.06;
      const bub = ctx.createOscillator();
      bub.type = 'sine';
      bub.frequency.setValueAtTime(400 + i * 150, ct);
      bub.frequency.exponentialRampToValueAtTime(600 + i * 200, ct + 0.08);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0, ct);
      bg.gain.linearRampToValueAtTime(0.04 * m, ct + 0.015);
      bg.gain.exponentialRampToValueAtTime(0.001, ct + 0.1);
      bub.connect(bg); bg.connect(dst);
      bub.start(ct); bub.stop(ct + 0.1);
    }
  }

  private earth(t: number, m: number) {
    const ctx = this.ctx!;
    const dst = this.master!;

    const crunch = ctx.createBufferSource();
    crunch.buffer = this.noiseBuf(0.3);
    const cf = ctx.createBiquadFilter();
    cf.type = 'lowpass';
    cf.frequency.setValueAtTime(800 * m, t);
    cf.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.18, t);
    cg.gain.linearRampToValueAtTime(0.25, t + 0.03);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    crunch.connect(cf); cf.connect(cg); cg.connect(dst);
    crunch.start(t); crunch.stop(t + 0.3);

    const low = ctx.createOscillator();
    low.type = 'triangle';
    low.frequency.setValueAtTime(100 * m, t);
    low.frequency.linearRampToValueAtTime(25, t + 0.35);
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(0.2, t + 0.04);
    lg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    low.connect(lg); lg.connect(dst);
    low.start(t); low.stop(t + 0.35);

    for (let i = 0; i < 5; i++) {
      const ct = t + 0.04 + i * 0.04;
      const rock = ctx.createOscillator();
      rock.type = 'sawtooth';
      rock.frequency.setValueAtTime(300 + Math.random() * 200, ct);
      rock.frequency.linearRampToValueAtTime(50, ct + 0.06);
      const rg = ctx.createGain();
      rg.gain.setValueAtTime(0, ct);
      rg.gain.linearRampToValueAtTime(0.05 * m, ct + 0.01);
      rg.gain.exponentialRampToValueAtTime(0.001, ct + 0.06);
      rock.connect(rg); rg.connect(dst);
      rock.start(ct); rock.stop(ct + 0.06);
    }
  }

  private leaf(t: number, m: number) {
    const ctx = this.ctx!;
    const dst = this.master!;

    const rustle = ctx.createBufferSource();
    rustle.buffer = this.noiseBuf(0.4);
    const rf = ctx.createBiquadFilter();
    rf.type = 'bandpass';
    rf.frequency.setValueAtTime(3000, t);
    rf.frequency.exponentialRampToValueAtTime(800, t + 0.4);
    rf.Q.value = 0.5;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.1, t);
    rg.gain.linearRampToValueAtTime(0.14, t + 0.06);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    rustle.connect(rf); rf.connect(rg); rg.connect(dst);
    rustle.start(t); rustle.stop(t + 0.4);

    for (let i = 0; i < 8; i++) {
      const ct = t + 0.02 + i * 0.04;
      const crisp = ctx.createBufferSource();
      crisp.buffer = this.noiseBuf(0.025);
      const cpf = ctx.createBiquadFilter();
      cpf.type = 'highpass';
      cpf.frequency.setValueAtTime(2000 + Math.random() * 3000, ct);
      const cpg = ctx.createGain();
      cpg.gain.setValueAtTime(0.04 * m, ct);
      cpg.gain.exponentialRampToValueAtTime(0.001, ct + 0.025);
      crisp.connect(cpf); cpf.connect(cpg); cpg.connect(dst);
      crisp.start(ct); crisp.stop(ct + 0.025);
    }

    const swish = ctx.createOscillator();
    swish.type = 'sine';
    swish.frequency.setValueAtTime(300 * m, t);
    swish.frequency.exponentialRampToValueAtTime(600 * m, t + 0.2);
    swish.frequency.exponentialRampToValueAtTime(200, t + 0.35);
    const swg = ctx.createGain();
    swg.gain.setValueAtTime(0, t);
    swg.gain.linearRampToValueAtTime(0.05, t + 0.04);
    swg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    swish.connect(swg); swg.connect(dst);
    swish.start(t); swish.stop(t + 0.35);
  }
}

export const sound = new SoundSynth();
