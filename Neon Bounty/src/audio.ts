type SoundName = 'shoot' | 'jump' | 'hit' | 'hurt' | 'pickup' | 'boss' | 'start' | 'sand';

const MUSIC_URL = 'https://raw.githubusercontent.com/ravinkarunaratne21-collab/Neon-Bounty/main/Neon%20Bounty/public/ikoliks_aj-cyberpunk-cyberpunk-music-614562.mp3';

const frequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// One dark synthwave track per district: different key, tempo and seeded lead line.
const TRACKS = [
  { root: 45, tempo: 132, drive: 0.5 },
  { root: 43, tempo: 138, drive: 0.6 },
  { root: 41, tempo: 128, drive: 0.55 },
  { root: 44, tempo: 142, drive: 0.65 },
  { root: 42, tempo: 126, drive: 0.5 },
  { root: 43, tempo: 136, drive: 0.55 },
  { root: 45, tempo: 130, drive: 0.7 },
  { root: 40, tempo: 118, drive: 0.45 },
  { root: 42, tempo: 140, drive: 0.68 },
  { root: 41, tempo: 146, drive: 0.8 },
];

const MINOR = [0, 2, 3, 5, 7, 8, 10, 12];
const PROG = [0, 8, 10, 7]; // i, bVI, bVII, v

const makeMelody = (level: number, root: number) => {
  const rand = mulberry32(level * 7919 + 71);
  const steps: number[] = new Array(128).fill(-1);
  let idx = 4;
  for (let i = 0; i < 128; i += 2) {
    if (rand() < 0.46) continue;
    idx += Math.round((rand() - 0.5) * 4);
    idx = Math.max(1, Math.min(13, idx));
    const degree = MINOR[idx % 8] + Math.floor(idx / 8) * 12;
    steps[i] = root + 24 + degree;
    if (rand() < 0.55) {
      const next = Math.max(1, Math.min(13, idx + (rand() > 0.5 ? 1 : -1)));
      steps[i + 1] = root + 24 + MINOR[next % 8] + Math.floor(next / 8) * 12;
    }
  }
  return steps;
};

export class ChiptuneAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private timer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private level = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private melody: number[] = makeMelody(0, TRACKS[0].root);
  private backgroundTrack: HTMLAudioElement | null = null;
  enabled = true;

  private ensureContext() {
    if (this.context) return;
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.35 : 0;
      this.master.connect(this.context.destination);
      this.musicBus = this.context.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      const length = Math.floor(this.context.sampleRate * 0.3);
      this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.context = null;
    }
  }

  private ensureTrack() {
    if (this.backgroundTrack) return;
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.3;
    this.backgroundTrack = audio;
  }

  private startBackgroundTrack() {
    this.ensureTrack();
    if (!this.backgroundTrack) return;
    this.backgroundTrack.volume = this.enabled ? 0.28 : 0;
    this.backgroundTrack.currentTime = 0;
    void this.backgroundTrack.play().catch(() => {
      // Audio autoplay can be blocked until the user interacts with the page.
    });
  }

  private tone(midi: number, time: number, duration: number, volume: number, wave: OscillatorType, bus: AudioNode | null, detune = 0, slide = 0) {
    if (!this.context || !bus) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency(midi), time);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, frequency(midi + slide)), time + duration);
    if (detune) oscillator.detune.value = detune;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  private noise(time: number, duration: number, volume: number, filterType: BiquadFilterType, freq: number) {
    if (!this.context || !this.noiseBuffer || !this.musicBus) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = freq;
    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.musicBus);
    source.start(time);
    source.stop(time + duration);
  }

  private schedule = () => {
    if (!this.context || !this.musicBus) return;
    const track = TRACKS[this.level];
    const sixteenth = 60 / track.tempo / 4;
    while (this.nextNoteTime < this.context.currentTime + 0.14) {
      const beat = this.step % 16;
      const bar = Math.floor(this.step / 16) % 4;
      const chordRoot = track.root + PROG[bar];

      if (beat % 4 === 0) this.tone(36, this.nextNoteTime, 0.13, 0.5, 'sine', this.musicBus, 0, -24);
      if (beat === 7 || beat === 15) this.tone(36, this.nextNoteTime, 0.07, 0.2, 'sine', this.musicBus, 0, -20);

      if (beat === 4 || beat === 12) this.noise(this.nextNoteTime, 0.16, 0.28, 'bandpass', 1800);
      this.noise(this.nextNoteTime, beat % 2 === 0 ? 0.045 : 0.028, beat % 2 === 0 ? 0.05 : 0.036, 'highpass', 6500);
      if (beat === 14) this.noise(this.nextNoteTime, 0.22, 0.06, 'highpass', 4500);

      const bassPattern = [0, 0, 12, 0, 0, 10, 12, 7];
      const bassNote = chordRoot - 12 + bassPattern[beat] + (beat % 8 === 6 ? 12 : 0);
      this.tone(bassNote, this.nextNoteTime, sixteenth * 0.9, 0.26, 'sawtooth', this.musicBus, 6);
      this.tone(bassNote - 12, this.nextNoteTime, sixteenth * 0.9, 0.12, 'square', this.musicBus, 0);

      if (beat === 0) {
        this.tone(chordRoot + 7, this.nextNoteTime, sixteenth * 15, 0.08, 'sawtooth', this.musicBus, -8);
        this.tone(chordRoot + 12, this.nextNoteTime, sixteenth * 15, 0.072, 'sawtooth', this.musicBus, 8);
      }

      const note = this.melody[this.step % 128];
      if (note > 0 && (track.drive > 0.6 || this.step % 2 === 0)) {
        this.tone(note, this.nextNoteTime, sixteenth * 1.4, 0.18, 'square', this.musicBus);
        this.tone(note, this.nextNoteTime, sixteenth * 1.4, 0.10, 'square', this.musicBus, 12);
      }
      if (track.drive > 0.62 && beat >= 8 && beat % 2 === 0) {
        const arp = chordRoot + 24 + MINOR[(bar * 3 + beat) % 8];
        this.tone(arp, this.nextNoteTime, sixteenth * 0.6, 0.08, 'square', this.musicBus);
      }

      this.nextNoteTime += sixteenth;
      this.step++;
    }
  };

  start(level = 0) {
    this.ensureContext();
    if (!this.context) return;
    void this.context.resume();
    this.setLevel(level);
    if (this.timer !== null) window.clearInterval(this.timer);
    this.nextNoteTime = this.context.currentTime + 0.06;
    this.musicBus?.gain.setTargetAtTime(0, this.context.currentTime, 0.04);
    this.timer = window.setInterval(this.schedule, 25);
    this.schedule();
    this.startBackgroundTrack();
  }

  setLevel(level: number) {
    this.level = Math.min(TRACKS.length - 1, Math.max(0, level));
    this.melody = makeMelody(this.level, TRACKS[this.level].root);
    this.step = 0;
  }

  pause() {
    if (this.musicBus && this.context) this.musicBus.gain.setTargetAtTime(0, this.context.currentTime, 0.04);
    if (this.backgroundTrack) {
      this.backgroundTrack.pause();
    }
  }

  resume() {
    if (this.musicBus && this.context) this.musicBus.gain.setTargetAtTime(0, this.context.currentTime, 0.04);
    if (this.backgroundTrack && this.enabled) {
      void this.backgroundTrack.play().catch(() => {
        // Autoplay may still be blocked until user interaction.
      });
    }
    void this.context?.resume();
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.pause();
    if (this.backgroundTrack) {
      this.backgroundTrack.pause();
      this.backgroundTrack.currentTime = 0;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.enabled ? 0.35 : 0, this.context.currentTime, 0.025);
    if (this.backgroundTrack) {
      this.backgroundTrack.volume = this.enabled ? 0.28 : 0;
      if (this.enabled) {
        void this.backgroundTrack.play().catch(() => {});
      } else {
        this.backgroundTrack.pause();
      }
    }
    return this.enabled;
  }

  sound(name: SoundName) {
    if (!this.enabled || !this.context || !this.master) return;
    const t = this.context.currentTime;
    switch (name) {
      case 'shoot':
        this.tone(91, t, 0.065, 0.13, 'square', this.master, 0, -22);
        break;
      case 'jump':
        this.tone(57, t, 0.14, 0.09, 'square', this.master, 0, 12);
        break;
      case 'hit':
        this.tone(54, t, 0.075, 0.12, 'sawtooth', this.master, 0, -14);
        break;
      case 'hurt':
        this.tone(48, t, 0.25, 0.18, 'sawtooth', this.master, 0, -16);
        break;
      case 'pickup':
        this.tone(83, t, 0.085, 0.11, 'square', this.master);
        this.tone(90, t + 0.07, 0.12, 0.1, 'square', this.master);
        break;
      case 'boss':
        this.tone(47, t, 0.65, 0.25, 'sawtooth', this.master, 0, -27);
        this.tone(35, t + 0.08, 0.6, 0.16, 'square', this.master, 0, -12);
        break;
      case 'start':
        this.tone(64, t, 0.12, 0.1, 'square', this.master);
        this.tone(71, t + 0.1, 0.12, 0.1, 'square', this.master);
        this.tone(76, t + 0.2, 0.2, 0.12, 'square', this.master);
        break;
      case 'sand':
        this.tone(50, t, 0.4, 0.17, 'sawtooth', this.master, 0, 26);
        this.tone(82, t + 0.06, 0.32, 0.09, 'square', this.master, 0, 12);
        this.noise(t, 0.35, 0.14, 'highpass', 3000);
        break;
    }
  }

  destroy() {
    this.stop();
    if (this.backgroundTrack) {
      this.backgroundTrack.pause();
      this.backgroundTrack.src = '';
    }
    void this.context?.close();
    this.context = null;
  }
}
