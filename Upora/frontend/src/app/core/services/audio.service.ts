import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SfxName = 'correct' | 'incorrect' | 'complete' | 'click' | 'whoosh' | 'pop' | 'tick' | 'levelup';
export type BgMusicStyle = 'calm' | 'upbeat' | 'focus' | 'ambient' | 'retro';

export interface BgMusicLoopConfig {
  loopStart?: number;   // seconds – default 0
  loopEnd?: number;     // seconds – default = full duration
  crossfade?: number;   // seconds of crossfade at loop point – default 2
}

interface MusicPreset {
  bpm: number;
  noteLength: number;
  chords: number[][];
  padVolume: number;
  arpVolume: number;
  arpOctaveShift: number;
  delayTime: number;
  delayFeedback: number;
  arpWave: OscillatorType;
  padWave: OscillatorType;
  skipChance: number;
}

@Injectable({ providedIn: 'root' })
export class AudioService {
  private ctx: AudioContext | null = null;

  // SFX
  private sfxVolume = 0.18;

  // Background music (synthesised)
  private bgVolume = 0.06;
  private bgMusicStyle: BgMusicStyle | null = null;
  private bgMasterGain: GainNode | null = null;
  private bgDelay: DelayNode | null = null;
  private bgDelayFeedback: GainNode | null = null;
  private bgPadOsc: OscillatorNode | null = null;
  private bgPadGain: GainNode | null = null;
  private bgTimer: ReturnType<typeof setInterval> | null = null;
  private bgChordIdx = 0;
  private bgNoteIdx = 0;
  private bgRunning = false;

  // Background music (custom audio file with crossfade looping)
  private bgFileUrl: string | null = null;
  private bgFileBuffer: AudioBuffer | null = null;
  private bgFileGain: GainNode | null = null;
  private bgFileSrcA: AudioBufferSourceNode | null = null;
  private bgFileSrcB: AudioBufferSourceNode | null = null;
  private bgFileLoopTimer: ReturnType<typeof setTimeout> | null = null;
  private bgFileRunning = false;
  private bgFileLoopCfg: Required<BgMusicLoopConfig> = { loopStart: 0, loopEnd: 0, crossfade: 2 };

  private _muted = new BehaviorSubject<boolean>(this.loadMutedState());
  readonly muted$ = this._muted.asObservable();

  get isMuted(): boolean {
    return this._muted.value;
  }

  toggleMute(): void {
    const next = !this._muted.value;
    this._muted.next(next);
    localStorage.setItem('upora_audio_muted', JSON.stringify(next));
    if (next) this.stopBgMusic();
  }

  setMuted(muted: boolean): void {
    this._muted.next(muted);
    localStorage.setItem('upora_audio_muted', JSON.stringify(muted));
    if (muted) this.stopBgMusic();
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  setBgVolume(vol: number): void {
    this.bgVolume = Math.max(0, Math.min(1, vol));
    if (this.bgMasterGain) {
      this.bgMasterGain.gain.setTargetAtTime(this.bgVolume, this.getCtx().currentTime, 0.1);
    }
    if (this.bgFileGain) {
      this.bgFileGain.gain.setTargetAtTime(this.bgVolume, this.getCtx().currentTime, 0.1);
    }
  }

  // ── Sound Effects ──────────────────────────────────────────────────

  playSfx(name: SfxName): void {
    if (this.isMuted) return;
    switch (name) {
      case 'correct':   this.sfxCorrect(); break;
      case 'incorrect': this.sfxIncorrect(); break;
      case 'complete':  this.sfxComplete(); break;
      case 'click':     this.sfxClick(); break;
      case 'whoosh':    this.sfxWhoosh(); break;
      case 'pop':       this.sfxPop(); break;
      case 'tick':      this.sfxTick(); break;
      case 'levelup':   this.sfxLevelUp(); break;
    }
  }

  // ── Background Music (synthesised presets) ─────────────────────────

  startBgMusic(style: BgMusicStyle = 'calm'): void {
    if (this.isMuted) return;
    if (this.bgMusicStyle === style && this.bgRunning) return;
    this.stopBgMusic();
    this.bgMusicStyle = style;
    this.bgRunning = true;

    const ctx = this.getCtx();
    const preset = this.getMusicPreset(style);

    this.bgMasterGain = ctx.createGain();
    this.bgMasterGain.gain.value = this.bgVolume;
    this.bgMasterGain.connect(ctx.destination);

    this.bgDelay = ctx.createDelay(1.0);
    this.bgDelay.delayTime.value = preset.delayTime;
    this.bgDelayFeedback = ctx.createGain();
    this.bgDelayFeedback.gain.value = preset.delayFeedback;
    this.bgDelay.connect(this.bgDelayFeedback);
    this.bgDelayFeedback.connect(this.bgDelay);
    this.bgDelay.connect(this.bgMasterGain);

    this.bgPadGain = ctx.createGain();
    this.bgPadGain.gain.value = preset.padVolume;
    this.bgPadGain.connect(this.bgMasterGain);
    this.bgPadOsc = ctx.createOscillator();
    this.bgPadOsc.type = preset.padWave;
    this.bgPadOsc.frequency.value = preset.chords[0][0] / 2;
    this.bgPadOsc.connect(this.bgPadGain);
    this.bgPadOsc.start();

    this.bgChordIdx = 0;
    this.bgNoteIdx = 0;
    const msPerNote = (60 / preset.bpm) * 1000 * preset.noteLength;

    this.bgTimer = setInterval(() => {
      if (!this.bgRunning) return;
      this.playArpNote(preset);
    }, msPerNote);
  }

  // ── Background Music (custom audio file with crossfade loop) ───────

  async startBgMusicFromUrl(url: string, loop?: BgMusicLoopConfig): Promise<void> {
    if (this.isMuted) return;
    if (this.bgFileUrl === url && this.bgFileRunning) return;
    this.stopBgMusic();

    this.bgFileUrl = url;
    this.bgFileRunning = true;

    const ctx = this.getCtx();

    try {
      const response = await fetch(url);
      const arrayBuf = await response.arrayBuffer();
      this.bgFileBuffer = await ctx.decodeAudioData(arrayBuf);
    } catch (err) {
      console.error('[AudioService] Failed to load audio file, falling back to synthesised:', err);
      this.bgFileRunning = false;
      this.bgFileUrl = null;
      this.startBgMusic('calm');
      return;
    }

    const dur = this.bgFileBuffer.duration;
    this.bgFileLoopCfg = {
      loopStart: loop?.loopStart ?? 0,
      loopEnd: (loop?.loopEnd && loop.loopEnd > 0) ? Math.min(loop.loopEnd, dur) : dur,
      crossfade: Math.min(loop?.crossfade ?? 2, dur / 4),
    };

    this.bgFileGain = ctx.createGain();
    this.bgFileGain.gain.value = this.bgVolume;
    this.bgFileGain.connect(ctx.destination);

    this.playFileLoop('A');
  }

  private bgPaused = false;
  private bgPausedSynthStyle: BgMusicStyle | null = null;
  private bgPausedFileUrl: string | null = null;
  private bgPausedFileLoopCfg: Required<BgMusicLoopConfig> | null = null;

  get isBgMusicPaused(): boolean { return this.bgPaused; }
  get isBgMusicPlaying(): boolean { return (this.bgRunning || this.bgFileRunning) && !this.bgPaused; }

  pauseBgMusic(): void {
    if (!this.bgRunning && !this.bgFileRunning) return;
    if (this.bgPaused) return;
    this.bgPaused = true;

    // Remember what was playing so we can resume
    if (this.bgRunning) {
      this.bgPausedSynthStyle = this.bgMusicStyle;
    }
    if (this.bgFileRunning) {
      this.bgPausedFileUrl = this.bgFileUrl;
      this.bgPausedFileLoopCfg = { ...this.bgFileLoopCfg };
    }

    // Fade out quickly rather than abrupt stop
    const ctx = this.ctx;
    const t = ctx ? ctx.currentTime : 0;
    if (this.bgMasterGain && ctx) {
      this.bgMasterGain.gain.setTargetAtTime(0, t, 0.08);
    }
    if (this.bgFileGain && ctx) {
      this.bgFileGain.gain.setTargetAtTime(0, t, 0.08);
    }

    // Stop timers/oscillators after the fade (150ms)
    setTimeout(() => {
      if (this.bgTimer) { clearInterval(this.bgTimer); this.bgTimer = null; }
      if (this.bgPadOsc) { try { this.bgPadOsc.stop(); } catch { } this.bgPadOsc = null; }
      this.bgPadGain = null;
      if (this.bgDelay) { this.bgDelay.disconnect(); this.bgDelay = null; }
      if (this.bgDelayFeedback) { this.bgDelayFeedback.disconnect(); this.bgDelayFeedback = null; }
      if (this.bgMasterGain) { this.bgMasterGain.disconnect(); this.bgMasterGain = null; }
      this.bgRunning = false;

      if (this.bgFileLoopTimer) { clearTimeout(this.bgFileLoopTimer); this.bgFileLoopTimer = null; }
      this.stopAndDisconnect(this.bgFileSrcA); this.bgFileSrcA = null;
      this.stopAndDisconnect(this.bgFileSrcB); this.bgFileSrcB = null;
      if (this.bgFileGain) { this.bgFileGain.disconnect(); this.bgFileGain = null; }
      this.bgFileRunning = false;
      this.bgFileBuffer = null;
    }, 150);
  }

  resumeBgMusic(): void {
    if (!this.bgPaused) return;
    this.bgPaused = false;
    if (this.isMuted) return;

    if (this.bgPausedFileUrl && this.bgPausedFileLoopCfg) {
      const url = this.bgPausedFileUrl;
      const cfg = this.bgPausedFileLoopCfg;
      this.bgPausedFileUrl = null;
      this.bgPausedFileLoopCfg = null;
      this.bgPausedSynthStyle = null;
      this.startBgMusicFromUrl(url, cfg);
    } else if (this.bgPausedSynthStyle) {
      const style = this.bgPausedSynthStyle;
      this.bgPausedSynthStyle = null;
      this.bgPausedFileUrl = null;
      this.bgPausedFileLoopCfg = null;
      this.startBgMusic(style);
    }
  }

  stopBgMusic(): void {
    this.bgPaused = false;
    this.bgPausedSynthStyle = null;
    this.bgPausedFileUrl = null;
    this.bgPausedFileLoopCfg = null;
    // Stop synthesised
    this.bgRunning = false;
    if (this.bgTimer) { clearInterval(this.bgTimer); this.bgTimer = null; }
    if (this.bgPadOsc) { try { this.bgPadOsc.stop(); } catch { /* ok */ } this.bgPadOsc = null; }
    this.bgPadGain = null;
    if (this.bgDelay) { this.bgDelay.disconnect(); this.bgDelay = null; }
    if (this.bgDelayFeedback) { this.bgDelayFeedback.disconnect(); this.bgDelayFeedback = null; }
    if (this.bgMasterGain) { this.bgMasterGain.disconnect(); this.bgMasterGain = null; }
    this.bgMusicStyle = null;
    this.bgChordIdx = 0;
    this.bgNoteIdx = 0;

    // Stop custom file playback
    this.bgFileRunning = false;
    if (this.bgFileLoopTimer) { clearTimeout(this.bgFileLoopTimer); this.bgFileLoopTimer = null; }
    this.stopAndDisconnect(this.bgFileSrcA); this.bgFileSrcA = null;
    this.stopAndDisconnect(this.bgFileSrcB); this.bgFileSrcB = null;
    if (this.bgFileGain) { this.bgFileGain.disconnect(); this.bgFileGain = null; }
    this.bgFileUrl = null;
    this.bgFileBuffer = null;
  }

  // ── Internals ──────────────────────────────────────────────────────

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private stopAndDisconnect(src: AudioBufferSourceNode | null): void {
    if (!src) return;
    try { src.stop(); } catch { /* already stopped */ }
    try { src.disconnect(); } catch { /* ok */ }
  }

  /**
   * Dual-source crossfade looping for custom audio files.
   * Two AudioBufferSourceNodes alternate: when the active one approaches
   * loopEnd, the next one starts from loopStart and we crossfade between them.
   */
  private playFileLoop(slot: 'A' | 'B'): void {
    if (!this.bgFileRunning || !this.bgFileBuffer || !this.bgFileGain) return;

    const ctx = this.getCtx();
    const { loopStart, loopEnd, crossfade } = this.bgFileLoopCfg;
    const segmentDur = loopEnd - loopStart;

    const src = ctx.createBufferSource();
    src.buffer = this.bgFileBuffer;

    const fadeGain = ctx.createGain();
    fadeGain.connect(this.bgFileGain);

    src.connect(fadeGain);

    const now = ctx.currentTime;

    // Fade in over crossfade duration
    fadeGain.gain.setValueAtTime(0, now);
    fadeGain.gain.linearRampToValueAtTime(1, now + crossfade);

    // Schedule fade out before loop end
    const fadeOutStart = now + segmentDur - crossfade;
    if (fadeOutStart > now + crossfade) {
      fadeGain.gain.setValueAtTime(1, fadeOutStart);
    }
    fadeGain.gain.linearRampToValueAtTime(0, now + segmentDur);

    src.start(now, loopStart, segmentDur + 0.05);

    if (slot === 'A') {
      this.stopAndDisconnect(this.bgFileSrcA);
      this.bgFileSrcA = src;
    } else {
      this.stopAndDisconnect(this.bgFileSrcB);
      this.bgFileSrcB = src;
    }

    // Schedule the next slot to start during the crossfade window
    const nextSlot: 'A' | 'B' = slot === 'A' ? 'B' : 'A';
    const nextStartDelay = Math.max(0, (segmentDur - crossfade) * 1000);

    this.bgFileLoopTimer = setTimeout(() => {
      if (this.bgFileRunning) this.playFileLoop(nextSlot);
    }, nextStartDelay);
  }

  private playArpNote(preset: MusicPreset): void {
    const ctx = this.getCtx();
    if (!this.bgMasterGain || !this.bgDelay) return;

    const chord = preset.chords[this.bgChordIdx];
    const freq = chord[this.bgNoteIdx % chord.length] * preset.arpOctaveShift;

    // Advance indices
    this.bgNoteIdx++;
    if (this.bgNoteIdx >= chord.length * 2) {
      this.bgNoteIdx = 0;
      this.bgChordIdx = (this.bgChordIdx + 1) % preset.chords.length;

      // Smoothly transition pad to new chord root
      if (this.bgPadOsc) {
        const newRoot = preset.chords[this.bgChordIdx][0] / 2;
        this.bgPadOsc.frequency.setTargetAtTime(newRoot, ctx.currentTime, 0.3);
      }
    }

    // Occasionally skip a note for breathing room
    if (Math.random() < preset.skipChance) return;

    // Slight random velocity variation
    const vel = preset.arpVolume * (0.7 + Math.random() * 0.3);
    const dur = (60 / preset.bpm) * preset.noteLength * 1.8;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = preset.arpWave;
    osc.frequency.value = freq;

    // Soft attack, gentle release
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vel, ctx.currentTime + 0.02);
    gain.gain.setTargetAtTime(vel * 0.6, ctx.currentTime + 0.02, dur * 0.3);
    gain.gain.setTargetAtTime(0.001, ctx.currentTime + dur * 0.7, dur * 0.3);

    osc.connect(gain);
    // Send to both dry (master) and wet (delay) paths
    gain.connect(this.bgMasterGain);
    gain.connect(this.bgDelay);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.5);
  }

  private getMusicPreset(style: BgMusicStyle): MusicPreset {
    // Frequencies: C4=261.63 D4=293.66 E4=329.63 F4=349.23 G4=392.00 A4=440 B4=493.88
    //             C5=523.25 D5=587.33 E5=659.25 G5=783.99
    switch (style) {
      case 'calm':
        return {
          bpm: 72,
          noteLength: 0.5,
          chords: [
            [261.63, 329.63, 392.00, 493.88],  // Cmaj7
            [220.00, 261.63, 329.63, 392.00],  // Am7
            [349.23, 440.00, 523.25, 329.63],  // Fmaj7
            [392.00, 493.88, 293.66, 349.23],  // G7
          ],
          padVolume: 0.35,
          arpVolume: 0.55,
          arpOctaveShift: 2,
          delayTime: 0.375,
          delayFeedback: 0.3,
          arpWave: 'sine',
          padWave: 'sine',
          skipChance: 0.2,
        };
      case 'ambient':
        return {
          bpm: 56,
          noteLength: 0.75,
          chords: [
            [220.00, 329.63, 440.00],          // Am(add9 feel)
            [261.63, 392.00, 493.88],          // C(add9 feel)
            [293.66, 440.00, 523.25],          // Dm7
            [261.63, 329.63, 493.88],          // Cmaj7
          ],
          padVolume: 0.45,
          arpVolume: 0.4,
          arpOctaveShift: 2,
          delayTime: 0.5,
          delayFeedback: 0.4,
          arpWave: 'sine',
          padWave: 'triangle',
          skipChance: 0.35,
        };
      case 'focus':
        return {
          bpm: 90,
          noteLength: 0.5,
          chords: [
            [329.63, 493.88, 659.25],          // Em pentatonic cluster
            [293.66, 440.00, 587.33],          // D5 cluster
            [261.63, 392.00, 523.25],          // C power
            [329.63, 440.00, 659.25],          // Em
          ],
          padVolume: 0.25,
          arpVolume: 0.5,
          arpOctaveShift: 2,
          delayTime: 0.333,
          delayFeedback: 0.25,
          arpWave: 'triangle',
          padWave: 'sine',
          skipChance: 0.15,
        };
      case 'upbeat':
        return {
          bpm: 110,
          noteLength: 0.5,
          chords: [
            [261.63, 329.63, 392.00],          // C
            [349.23, 440.00, 523.25],          // F
            [392.00, 493.88, 587.33],          // G
            [261.63, 329.63, 523.25],          // C(8va)
          ],
          padVolume: 0.2,
          arpVolume: 0.55,
          arpOctaveShift: 2,
          delayTime: 0.273,
          delayFeedback: 0.2,
          arpWave: 'triangle',
          padWave: 'sine',
          skipChance: 0.1,
        };
      case 'retro':
        return {
          bpm: 70,
          noteLength: 0.5,
          chords: [
            [164.81, 196.00, 246.94],          // E3 G3 B3 (Em)
            [146.83, 196.00, 220.00],          // D3 G3 A3
            [130.81, 164.81, 196.00],          // C3 E3 G3
            [146.83, 174.61, 220.00],          // D3 F3 A3 (Dm)
          ],
          padVolume: 0.15,
          arpVolume: 0.6,
          arpOctaveShift: 4,
          delayTime: 0.214,
          delayFeedback: 0.15,
          arpWave: 'square',
          padWave: 'sawtooth',
          skipChance: 0.05,
        };
    }
  }

  // ── SFX tone helper ────────────────────────────────────────────────

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol?: number): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const v = vol ?? this.sfxVolume;
    gain.gain.setValueAtTime(v, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private sfxCorrect(): void {
    this.tone(523.25, 0.12, 'sine');
    setTimeout(() => this.tone(659.25, 0.12, 'sine'), 80);
    setTimeout(() => this.tone(783.99, 0.2, 'sine', 0.15), 160);
  }

  private sfxIncorrect(): void {
    this.tone(311.13, 0.18, 'triangle', 0.14);
    setTimeout(() => this.tone(277.18, 0.25, 'triangle', 0.12), 120);
  }

  private sfxComplete(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.25, 'sine', 0.14), i * 100));
  }

  private sfxClick(): void {
    this.tone(1200, 0.05, 'sine', 0.1);
  }

  private sfxWhoosh(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  private sfxPop(): void {
    this.tone(880, 0.08, 'sine', 0.12);
  }

  private sfxTick(): void {
    this.tone(2000, 0.03, 'square', 0.06);
  }

  private sfxLevelUp(): void {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.18, 'sine', 0.12), i * 80));
  }

  private loadMutedState(): boolean {
    try {
      return JSON.parse(localStorage.getItem('upora_audio_muted') || 'false');
    } catch {
      return false;
    }
  }
}
