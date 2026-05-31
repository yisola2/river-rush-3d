declare const window: any;

class AudioController {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private waterSource: AudioBufferSourceNode | null = null;
  private waterGain: GainNode | null = null;
  private duckGrunt: HTMLAudioElement | null = null;
  private melodyTimer: number | null = null;
  private melodyStep = 0;
  private failTimer: number | null = null;
  private failStep = 0;
  private muted = localStorage.getItem("riverRushMuted") === "1";

  init() {
    if (!this.ctx) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      this.ctx = new AudioContextCtor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      this.duckGrunt = new Audio("./assets/audio/duck-grunt.m4a");
      this.duckGrunt.volume = 0.75;
      this.duckGrunt.preload = "auto";
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    localStorage.setItem("riverRushMuted", muted ? "1" : "0");
    if (this.master) this.master.gain.value = muted ? 0 : 0.55;
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  startMenuAudio() {
    this.init();
    this.stopMusicTimers();
    this.startWaterAmbience();
    this.startMenuMelody();
  }

  startGameplayAudio() {
    this.init();
    this.stopMusicTimers();
    this.startWaterAmbience();
    this.playStartSting();
    this.startMelody();
  }

  stopGameplayAudio() {
    this.stopMusicTimers();
  }

  startFailAudio() {
    this.stopMusicTimers();
    window.setTimeout(() => this.startFailMelody(), 680);
  }

  playStartSting() {
    this.playTone(392, 0.12, "triangle", 0.06, 0);
    this.playTone(523.25, 0.12, "triangle", 0.065, 0.13);
    this.playTone(659.25, 0.16, "triangle", 0.07, 0.26);
    this.playTone(783.99, 0.24, "sine", 0.055, 0.43);
  }

  playCoin() {
    this.playTone(880, 0.055, "sine", 0.1, 0.02);
    this.playTone(1320, 0.11, "triangle", 0.08, 0.055);
  }

  playSplash() {
    this.playNoise({ duration: 0.22, volume: 0.16, filter: 950, attack: 0.01, release: 0.2 });
    this.playTone(180, 0.12, "sine", 0.045, 0, 95);
  }

  playDuck() {
    this.playAudioElement(this.duckGrunt, 0.82, 1.0);
    this.playNoise({ duration: 0.16, volume: 0.07, filter: 1100, attack: 0.004, release: 0.14 });
  }

  playDuckExit() {
    this.playNoise({ duration: 0.12, volume: 0.07, filter: 850, attack: 0.004, release: 0.11 });
    this.playBreath(125, 175, 0.12, 0.07);
  }

  playCrash() {
    this.playNoise({ duration: 0.34, volume: 0.22, filter: 260, attack: 0.005, release: 0.32 });
    this.playTone(92, 0.22, "sawtooth", 0.12, 0, 46);
  }

  playFailMelody() {
    this.playTone(392, 0.16, "triangle", 0.08, 0);
    this.playTone(311.13, 0.18, "triangle", 0.08, 0.16);
    this.playTone(246.94, 0.22, "triangle", 0.09, 0.34);
    this.playTone(123.47, 0.42, "sine", 0.07, 0.5, 82);
  }

  playPass() {
    this.playNoise({ duration: 0.1, volume: 0.055, filter: 1200, attack: 0.004, release: 0.09 });
  }

  private playAudioElement(element: HTMLAudioElement | null, volume = 1, startTime = 0) {
    this.init();
    if (!element || this.muted) return;
    element.pause();
    element.currentTime = startTime;
    element.volume = volume;
    element.play().catch(() => {});
  }

  private stopMusicTimers() {
    if (this.melodyTimer !== null) {
      clearInterval(this.melodyTimer);
      this.melodyTimer = null;
    }
    if (this.failTimer !== null) {
      clearInterval(this.failTimer);
      this.failTimer = null;
    }
  }

  private startWaterAmbience() {
    if (!this.ctx || !this.master || this.waterSource) return;
    const duration = 2.5;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      last = last * 0.985 + (Math.random() * 2 - 1) * 0.015;
      data[i] = last;
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "bandpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.75;
    gain.gain.value = 0.075;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    this.waterSource = source;
    this.waterGain = gain;
  }

  private startMenuMelody() {
    if (this.melodyTimer !== null) return;
    this.melodyStep = 0;
    const swing = [261.63, 329.63, 392, 466.16, 440, 392, 329.63, 0, 293.66, 349.23, 440, 523.25, 493.88, 440, 349.23, 0];
    this.melodyTimer = window.setInterval(() => {
      if (this.muted) return;
      const note = swing[this.melodyStep % swing.length];
      if (note) {
        this.playTone(note, 0.16, "triangle", 0.023);
        if (this.melodyStep % 4 === 0) this.playTone(note / 2, 0.28, "sine", 0.017);
      }
      this.melodyStep += 1;
    }, 310);
  }

  private startMelody() {
    if (this.melodyTimer !== null) return;
    this.melodyStep = 0;
    const notes = [392, 0, 523.25, 0, 587.33, 523.25, 440, 0, 392, 0, 329.63, 392, 0, 440, 0, 0];
    this.melodyTimer = window.setInterval(() => {
      if (this.muted) return;
      const note = notes[this.melodyStep % notes.length];
      if (note) {
        this.playTone(note, 0.18, "triangle", 0.025);
        this.playTone(note / 2, 0.24, "sine", 0.018);
      }
      this.melodyStep += 1;
    }, 360);
  }

  private startFailMelody() {
    if (this.failTimer !== null) return;
    this.failStep = 0;
    const notes = [246.94, 0, 220, 0, 196, 0, 164.81, 0, 0, 0, 196, 0, 185, 0, 0, 0];
    this.failTimer = window.setInterval(() => {
      if (this.muted) return;
      const note = notes[this.failStep % notes.length];
      if (note) {
        this.playTone(note, 0.26, "triangle", 0.028);
        this.playTone(note / 2, 0.34, "sine", 0.02);
      }
      this.failStep += 1;
    }, 420);
  }

  private playBreath(startFrequency: number, endFrequency: number, duration: number, volume: number) {
    this.init();
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(startFrequency, now);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(760, now);
    filter.frequency.exponentialRampToValueAtTime(430, now + duration);
    filter.Q.value = 3.2;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.05);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.07);
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0, endFrequency?: number) {
    this.init();
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise({ duration, volume, filter, attack, release }: { duration: number; volume: number; filter: number; attack: number; release: number }) {
    this.init();
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, Math.max(1, Math.floor(this.ctx.sampleRate * duration)), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = this.ctx.createBufferSource();
    const biquad = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    biquad.type = "lowpass";
    biquad.frequency.setValueAtTime(filter, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
    source.connect(biquad);
    biquad.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }
}

export const audio = new AudioController();
