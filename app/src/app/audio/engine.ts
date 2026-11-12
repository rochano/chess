// @ts-nocheck -- tuned audio code ported line for line from the original game; typed at its boundary (AudioService).
/* eslint-disable */
/*
 * Sound effects and adaptive orchestral music, ported from the original game (index.html, "Sound" section) with
 * the same instruments, themes and timing. Everything goes through Web Audio; samples come from public/sounds/.
 * The game state it needs (settings, mood) comes from the AudioService through `host`.
 * Loosely typed on purpose: it is a direct port of tuned audio code, kept line for line so it sounds the same.
 */
type Any = any;
export interface AudioHost {
  prefs(): { volMove: number; volAlert: number; volMusic: number; music: boolean; track?: string; voice?: string; voiceRate?: string };
  mood(): { theme: string; level: number };
  stopVoice(): void;
  lang(): 'th' | 'en';
}
let host: AudioHost = { prefs: () => ({ volMove: 60, volAlert: 60, volMusic: 40, music: true }), lang: () => 'th', mood: () => ({ theme: "menu", level: 0 }), stopVoice: () => {} };
export function setAudioHost(h: AudioHost) { host = h; }
declare global { interface Navigator { audioSession?: { type: string } } }
let audio: Any = null, sfxBus: Any = null, musicBus: Any = null, noiseBuf: Any = null, master: Any = null;
// While the replay video's soundtrack is rendered, audio is an OfflineAudioContext and sounds are placed sfxAt seconds in.
let sfxAt = 0, sfxOff = false;
function ctx() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    // everything goes through one master gain, so it can be faded out before the page goes away (no pop)
    master = audio.createGain(); master.connect(audio.destination);
    sfxBus = audio.createGain(); sfxBus.connect(master);
    musicBus = audio.createGain(); musicBus.gain.value = 0;
    // A limiter keeps the loud battle themes from clipping.
    const lim = audio.createDynamicsCompressor();
    lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.005; lim.release.value = 0.25;
    musicBus.connect(lim); lim.connect(master);
    noiseBuf = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    orchLoad(SFX_INST); // sound effects use real instrument samples, so fetch them as soon as sound starts
  }
  if (sfxOff) return audio;
  // Safari can also leave it "interrupted" (another tab played sound, or the Mac slept).
  if (audio.state !== "running" && audio.state !== "closed") { const p = audio.resume(); if (p && p.catch) p.catch(() => {}); }
  return audio;
}
function env(g, t, peak, attack, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
// A wooden "clack": a filtered noise burst over a short, low, muffled knock.
function clack(vol, when = 0, pitch = 1) {
  if (vol <= 0) return;
  try {
    const a = ctx(), t = a.currentTime + sfxAt + when;
    const n = a.createBufferSource(); n.buffer = noiseBuf;
    const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2200 * pitch; bp.Q.value = 3;
    const ng = a.createGain(); env(ng, t, 0.9 * vol, 0.002, 0.05);
    n.connect(bp).connect(ng).connect(sfxBus); n.start(t); n.stop(t + 0.08);
    const body = a.createBufferSource(); body.buffer = noiseBuf;
    const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380 * pitch; lp.Q.value = 4;
    const og = a.createGain(); env(og, t, 1.4 * vol, 0.003, 0.1);
    body.connect(lp).connect(og).connect(sfxBus); body.start(t); body.stop(t + 0.12);
  } catch (e) {}
}
let volOv = null; // the replay soundtrack plays the piece sounds as loud as the game allows
const mv = () => (volOv ? volOv.vm : host.prefs().volMove) / 100, al = () => (volOv ? volOv.va : host.prefs().volAlert) / 100;
// Sound effects: wooden clacks for the pieces and real instrument samples (harp, pizzicato, horn,
// timpani, cello) for everything else. No synth beeps.
const SFX_INST = ["orchestral_harp", "pizzicato_strings", "timpani", "french_horn", "cello"];
function splay(name, n, dur, vol, when = 0) {
  if (vol <= 0) return;
  try { const a = ctx(); play(name, a.currentTime + sfxAt + when, n, dur, vol, sfxBus); } catch (e) {}
}
const sfx = {
  select: () => clack(mv() * 0.35, 0, 1.6),
  move: () => clack(mv()),
  capture: () => { clack(mv(), 0, 0.8); clack(mv() * 0.8, 0.07, 1.15); splay("timpani", 40, 0.5, mv() * 0.35); },
  castle: () => { clack(mv()); clack(mv(), 0.11, 1.1); },
  promote: () => { clack(mv()); [72, 76, 79, 84].forEach((n, i) => splay("orchestral_harp", n, 0.6, mv() * 0.45, 0.05 + i * 0.07)); },
  check: () => { splay("french_horn", 67, 0.35, al() * 0.5); splay("french_horn", 72, 0.6, al() * 0.55, 0.18); splay("pizzicato_strings", 48, 0.3, al() * 0.5); },
  tick: () => clack(al() * 0.45, 0, 2.4),
  grumble: (level = 1) => {
    const v = al() * (0.3 + level * 0.12);
    for (let k = 0; k < level + 1; k++) splay("cello", 43 - k * 2 + level, 0.18, v, k * 0.14);
  },
  click: () => clack(mv() * 0.22, 0, 1.9),
  end: (o: { type: string; winner?: string } | null, lost: boolean) => {
    if (!o) return;
    if (o.type === "draw") [72, 76, 74].forEach((n, i) => splay("orchestral_harp", n, 0.8, al() * 0.5, i * 0.18));
    else if (lost) [69, 65, 64, 57].forEach((n, i) => splay("pizzicato_strings", n, 0.5, al() * 0.55, i * 0.2));
    else [60, 64, 67, 72, 76].forEach((n, i) => splay("orchestral_harp", n, i === 4 ? 1.2 : 0.5, al() * 0.5, i * 0.1));
  },
};

/* Background music: a slow lo-fi loop (Am7 - Fmaj7 - Cmaj7 - G6) with a soft pad, bass and sparse plucks. */
/* Adaptive orchestral music. Each theme is a 4-bar loop scheduled one bar at a
   time, so a change of theme or intensity lands on the next bar line.
   menu    slow and warm: the leitmotif on cello over harp and strings
   lesson  easy-going: flute tunes over pizzicato strings and harp
   battle  games. Intensity 0 is flute over strings, 1 brings cello and timpani,
           2 and 3 are the full orchestra: horns on the leitmotif, tremolo strings,
           trumpets and timpani rolls, faster as the pressure rises
   boss    driving full orchestra for boss stages
   after   a lone cello after a game ends
   Instruments are real samples (FluidR3 GM soundfont, CC BY 3.0) loaded on first
   play; until a sample arrives, a simple synth voice stands in. */
const MUSIC: Any = { timer: null, next: 0, bar: 0, theme: "menu", level: 0, game: 0 };
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function musicLevel() { return host.prefs().music ? (host.prefs().volMusic / 100) * 1.5 : 0; }
// The leitmotif: [midi note, start beat, length in beats] per bar.
const MOTIF = [
  [[76, 0, 1], [81, 1, 1], [79, 2, 0.5], [76, 2.5, 0.5], [74, 3, 1]],
  [[76, 0, 1.5], [72, 1.5, 0.5], [74, 2, 1], [71, 3, 1]],
  [[72, 0, 1], [76, 1, 1], [81, 2, 1], [83, 3, 0.5], [84, 3.5, 0.5]],
  [[83, 0, 1], [79, 1, 1], [76, 2, 2]],
];
const MOTIF_MINOR = [MOTIF[0], MOTIF[1], [[77, 0, 1], [81, 1, 1], [86, 2, 1], [84, 3, 0.5], [83, 3.5, 0.5]], [[83, 0, 1], [80, 1, 1], [76, 2, 2]]];
const LESSON_RIFF = [
  [[72, 0, 0.5], [76, 0.5, 0.5], [79, 1, 1], [76, 2, 0.5], [79, 2.5, 0.5], [81, 3, 1]],
  [[79, 0, 0.5], [76, 0.5, 0.5], [74, 1, 1], [72, 2, 2]],
  [[77, 0, 0.5], [81, 0.5, 0.5], [84, 1, 1], [81, 2, 0.5], [77, 2.5, 0.5], [76, 3, 1]],
  [[74, 0, 1], [79, 1, 1], [72, 2, 2]],
];
const SONGS: Any = {
  menu: { bpm: 72, chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]], roots: [45, 41, 48, 43] },
  lesson: { bpm: 96, chords: [[60, 64, 67], [57, 60, 64], [57, 60, 65], [55, 59, 62]], roots: [48, 45, 41, 43] },
  battle: { bpm: 88, chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], roots: [45, 41, 38, 40] },
  boss: { bpm: 120, chords: [[57, 60, 64], [58, 62, 65], [57, 60, 64], [52, 56, 59]], roots: [45, 46, 45, 40] },
  after: { bpm: 63, chords: [[57, 60, 64], [53, 57, 60]], roots: [45, 41] },
  // After the game: eight bars that suit the result, with melodies that change every pass.
  afterWin: { bpm: 72, chords: [[60, 64, 67], [59, 62, 67], [57, 60, 64], [53, 57, 60], [50, 53, 57], [55, 59, 62], [52, 55, 60], [55, 59, 62]], roots: [48, 47, 45, 41, 38, 43, 40, 43] },
  afterLose: { bpm: 60, chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62], [57, 60, 64], [50, 53, 57], [53, 57, 60], [52, 56, 59]], roots: [45, 41, 48, 43, 45, 38, 41, 40] },
  afterDraw: { bpm: 66, chords: [[50, 53, 57], [55, 59, 62], [50, 53, 57], [55, 59, 62], [53, 57, 60], [48, 52, 55], [46, 50, 53], [57, 61, 64]], roots: [38, 43, 38, 43, 41, 36, 34, 45] },
  // Extra soundtracks for the menu and calm play (tension still brings in the battle music).
  garden: { bpm: 84, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], roots: [48, 45, 41, 43] },
  nocturne: { bpm: 63, chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], roots: [38, 34, 41, 36] },
  waltz: { bpm: 150, beats: 3, chords: [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]], roots: [43, 40, 36, 38] },
  journey: { bpm: 104, chords: [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]], roots: [41, 38, 34, 36] },
};
// Tunes for the extra soundtracks: [note, beat, length] per bar, two passes (A then B).
const TUNES: Any = {
  garden: [
    [[[76, 0, 1], [79, 1, 0.5], [76, 1.5, 0.5], [74, 2, 1], [72, 3, 1]], [[69, 0, 1.5], [72, 1.5, 0.5], [74, 2, 1], [76, 3, 1]], [[72, 0, 1], [69, 1, 1], [67, 2, 2]], [[74, 0, 1], [76, 1, 0.5], [74, 1.5, 0.5], [72, 2, 2]]],
    [[[79, 0, 1], [81, 1, 1], [79, 2, 0.5], [76, 2.5, 0.5], [74, 3, 1]], [[72, 0, 1], [74, 1, 1], [76, 2, 2]], [[79, 0, 1], [76, 1, 1], [74, 2, 1], [72, 3, 1]], [[74, 0, 1.5], [76, 1.5, 0.5], [72, 2, 2]]],
  ],
  nocturne: [
    [[[62, 0, 2], [65, 2, 1], [64, 3, 1]], [[62, 0, 1.5], [58, 1.5, 0.5], [57, 2, 2]], [[60, 0, 1], [65, 1, 1], [69, 2, 1.5], [67, 3.5, 0.5]], [[67, 0, 2], [64, 2, 2]]],
    [[[69, 0, 1.5], [70, 1.5, 0.5], [69, 2, 1], [65, 3, 1]], [[65, 0, 1], [62, 1, 1], [58, 2, 2]], [[60, 0, 1], [65, 1, 1], [72, 2, 2]], [[70, 0, 1], [69, 1, 1], [67, 2, 2]]],
  ],
  waltz: [
    [[[74, 0, 2], [71, 2, 1]], [[71, 0, 1], [67, 1, 1], [71, 2, 1]], [[72, 0, 2], [76, 2, 1]], [[74, 0, 1.5], [72, 1.5, 0.5], [69, 2, 1]]],
    [[[79, 0, 2], [78, 2, 1]], [[76, 0, 1], [71, 1, 1], [74, 2, 1]], [[76, 0, 1], [72, 1, 1], [69, 2, 1]], [[74, 0, 3]]],
  ],
  journey: [
    [[[65, 0, 1], [69, 1, 1], [72, 2, 1.5], [69, 3.5, 0.5]], [[67, 0, 1], [65, 1, 1], [62, 2, 2]], [[62, 0, 1], [65, 1, 1], [70, 2, 1], [69, 3, 1]], [[67, 0, 3], [72, 3, 1]]],
    [[[72, 0, 1.5], [69, 1.5, 0.5], [65, 2, 1], [69, 3, 1]], [[69, 0, 1], [65, 1, 1], [62, 2, 2]], [[70, 0, 1], [69, 1, 1], [67, 2, 1], [65, 3, 1]], [[64, 0, 2], [67, 2, 1], [72, 3, 1]]],
  ],
};
// After-game melodies are built from the chord tones: [tone, beat, length], tone 0-2 = chord, 3-4 = an octave up.
const AFTER_SHAPES = [
  [[2, 0, 1.5], [1, 1.5, 0.5], [0, 2, 2]],
  [[0, 0, 1], [1, 1, 1], [2, 2, 1], [3, 3, 1]],
  [[3, 0, 2], [2, 2, 1], [4, 3, 1]],
  [[1, 0, 1], [2, 1, 0.5], [1, 1.5, 0.5], [0, 2, 2]],
  [[2, 0, 0.5], [3, 0.5, 0.5], [2, 1, 1], [1, 2, 1.5], [0, 3.5, 0.5]],
  [[4, 0, 1.5], [3, 1.5, 0.5], [2, 2, 1], [3, 3, 1]],
];
// Who sings the tune in each half of the eight bars, and how many octaves up from the chord.
const AFTER_VOICES: Any = [[["flute", 12], ["french_horn", 0]], [["cello", 0], ["flute", 12]], [["string_ensemble_1", 12], ["orchestral_harp", 12]]];
const TRACKS = ["classic", "garden", "nocturne", "waltz", "journey"];
// The soundtrack for the menu and calm play: the one chosen in Settings, or a new one each game.
function curTrack() { return host.prefs().track && host.prefs().track !== "auto" ? host.prefs().track : TRACKS[MUSIC.game % TRACKS.length]; }
function barLength() { const th = SONGS[MUSIC.theme]; return (60 / (th.bpm + (MUSIC.theme === "battle" ? MUSIC.level * 8 : 0))) * (th.beats || 4); }

/* --- samples --- */
const INST: Any = {
  cello: { gain: 1, attack: 0.07, release: 0.35, notes: [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72] },
  contrabass: { gain: 1.1, attack: 0.05, release: 0.3, notes: [24, 27, 30, 33, 36, 39, 42, 45, 48] },
  flute: { gain: 0.75, attack: 0.05, release: 0.25, notes: [60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90, 93, 96] },
  string_ensemble_1: { gain: 0.55, attack: 0.3, release: 0.6, notes: [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84] },
  tremolo_strings: { gain: 0.45, attack: 0.12, release: 0.4, notes: [48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84] },
  french_horn: { gain: 0.8, attack: 0.08, release: 0.35, notes: [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72] },
  trumpet: { gain: 0.55, attack: 0.02, release: 0.2, notes: [51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84] },
  timpani: { gain: 1.2, attack: 0.004, release: 0.8, perc: true, notes: [36, 39, 42, 45, 48, 51, 54, 57, 60] },
  pizzicato_strings: { gain: 1, attack: 0.004, release: 0.3, perc: true, notes: [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84] },
  orchestral_harp: { gain: 0.8, attack: 0.004, release: 0.6, perc: true, notes: [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90, 93, 96] },
};
const ORCH: Any = { buf: {}, asked: {}, out: null };
// Load the instruments a theme needs (the rest follow in the background).
const NEEDS: Any = {
  menu: ["cello", "orchestral_harp", "string_ensemble_1", "contrabass"],
  lesson: ["flute", "pizzicato_strings", "orchestral_harp"],
  garden: ["flute", "orchestral_harp", "pizzicato_strings", "string_ensemble_1"],
  afterWin: ["flute", "french_horn", "cello", "orchestral_harp", "string_ensemble_1", "contrabass", "timpani"],
  afterLose: ["cello", "flute", "string_ensemble_1", "contrabass", "pizzicato_strings", "orchestral_harp", "french_horn"],
  afterDraw: ["flute", "french_horn", "cello", "orchestral_harp", "string_ensemble_1", "contrabass"],
  nocturne: ["orchestral_harp", "cello", "flute", "contrabass", "string_ensemble_1"],
  waltz: ["flute", "pizzicato_strings", "contrabass", "orchestral_harp", "string_ensemble_1"],
  journey: ["french_horn", "flute", "pizzicato_strings", "timpani", "string_ensemble_1"],
  battle: ["flute", "string_ensemble_1", "cello", "contrabass", "timpani", "french_horn", "tremolo_strings", "trumpet"],
};
function orchLoad(names) {
  for (const name of names) {
    if (ORCH.asked[name]) continue;
    ORCH.asked[name] = true; ORCH.buf[name] = {};
    for (const n of INST[name].notes) {
      fetch("sounds/" + name + "/" + n + ".mp3")
        .then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(b => new Promise((res, rej) => audio.decodeAudioData(b, res, rej)))
        .then(d => { ORCH.buf[name][n] = d; })
        .catch(() => {});
    }
  }
}
// Music goes through a hall reverb so the orchestra sounds like it is in a room.
function orchOut() {
  if (ORCH.out && ORCH.out.context === audio) return ORCH.out;
  const dry = audio.createGain(), verb = audio.createConvolver(), send = audio.createGain();
  const len = Math.floor(audio.sampleRate * 2.4), ir = audio.createBuffer(2, len, audio.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  verb.buffer = ir; send.gain.value = 0.32; dry.gain.value = 2.5;
  dry.connect(musicBus); dry.connect(send); send.connect(verb); verb.connect(musicBus);
  ORCH.out = dry;
  return dry;
}
function play(name, t, n, dur, vol, out = orchOut()) {
  const cfg = INST[name], set = ORCH.buf[name];
  let best = null;
  if (set) for (const k in set) if (best === null || Math.abs(k - n) < Math.abs(best - n)) best = +k;
  if (best === null || Math.abs(best - n) > 4) return; // stay silent until the real sample has loaded
  const src = audio.createBufferSource(), g = audio.createGain(), rate = Math.pow(2, (n - best) / 12);
  src.buffer = set[best]; src.playbackRate.value = rate;
  const room = set[best].duration / rate - 0.05;
  const hold = cfg.perc ? Math.min(room - cfg.release, Math.max(dur, 0.6)) : Math.min(dur, room - cfg.release);
  const peak = vol * cfg.gain, a = Math.min(cfg.attack, Math.max(0.01, hold / 2));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + Math.max(a, hold));
  g.gain.linearRampToValueAtTime(0.0001, t + Math.max(a, hold) + cfg.release);
  src.connect(g).connect(out); src.start(t); src.stop(t + Math.max(a, hold) + cfg.release + 0.05);
}
function line(name, t, bar, beat, vol, oct = 0) { for (const [n, b, d] of bar) play(name, t + b * beat, n + oct, d * beat * 0.97, vol); }
function chordOn(name, t, notes, dur, vol, oct = 0) { for (const n of notes) play(name, t, n + oct, dur, vol); }

/* --- percussion helpers (filtered noise for cymbals) --- */
function mNoise(t, dur, vol, type, freq, out) {
  const n = audio.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const f = audio.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = audio.createGain(); env(g, t, vol, 0.004, dur);
  n.connect(f).connect(g).connect(out || orchOut()); n.start(t); n.stop(t + dur + 0.05);
}
function mCrash(t, vol) { mNoise(t, 2.2, vol, "highpass", 4200); mNoise(t, 0.6, vol * 0.6, "bandpass", 2500); }
function timpRoll(t, n, len, vol) { const k = Math.round(len / 0.07); for (let i = 0; i < k; i++) play("timpani", t + i * 0.07, n, 0.3, vol * (0.35 + 0.65 * i / k)); }

/* --- one bar of the current theme --- */
function scheduleBar(t) {
  const name = MUSIC.theme, th = SONGS[name], lv = MUSIC.level, k = MUSIC.bar % th.chords.length;
  const len = barLength(), beat = len / (th.beats || 4), chord = th.chords[k], root = th.roots[k], pass = Math.floor(MUSIC.bar / 4);
  const tune = TUNES[name] && TUNES[name][pass % 2][k];
  if (name === "garden") {
    // Light and Thai-tinged: pentatonic flute, a harp ostinato and a little "ching" on the off-beats.
    for (let e = 0; e < 8; e++) play("orchestral_harp", t + e * beat / 2, [root + 12, chord[1], chord[2], root + 24][e % 4], beat, 0.12);
    play("pizzicato_strings", t, root - 12, beat, 0.32); play("pizzicato_strings", t + 2 * beat, root - 5, beat, 0.26);
    for (const b of [1, 3]) play("pizzicato_strings", t + b * beat, 84, beat * 0.3, 0.07);
    chordOn("string_ensemble_1", t, chord, len * 0.95, 0.05);
    line("flute", t, tune, beat, 0.3);
  } else if (name === "nocturne") {
    // Night-time: rolling harp arpeggios, cello melody, the flute takes it the second time.
    const arp = [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 12, chord[2]];
    for (let e = 0; e < 8; e++) play("orchestral_harp", t + e * beat / 2, arp[e], beat * 1.5, 0.12);
    play("contrabass", t, root - 12 + 12, len * 0.9, 0.16);
    chordOn("string_ensemble_1", t, chord, len * 0.95, 0.05);
    if (pass % 2 === 0) line("cello", t, tune, beat, 0.4); else line("flute", t, tune, beat, 0.24, 12);
  } else if (name === "waltz") {
    // Three in a bar: bass on one, plucked chords on two and three; flute, then strings.
    play("contrabass", t, root - 12 + 12, beat * 0.9, 0.26);
    for (const b of [1, 2]) chordOn("pizzicato_strings", t + b * beat, chord, beat * 0.5, 0.14);
    play("orchestral_harp", t + 2.5 * beat, chord[2] + 12, beat, 0.08);
    if (pass % 2 === 0) line("flute", t, tune, beat, 0.3); else line("string_ensemble_1", t, tune, beat, 0.22);
  } else if (name === "journey") {
    // Setting off: walking pizzicato bass, horn tune, flute answers, soft timpani.
    const walk = [root - 12, root - 5, root, root - 5];
    for (let e = 0; e < 8; e++) play("pizzicato_strings", t + e * beat / 2, walk[e % 4] + (e >= 4 ? 0 : 0), beat * 0.4, 0.24);
    chordOn("string_ensemble_1", t, chord, len * 0.95, 0.06);
    play("timpani", t, root, beat, 0.22);
    if (pass % 2 === 0) line("french_horn", t, tune, beat, 0.32); else line("flute", t, tune, beat, 0.26, 12);
  } else if (name === "menu") {
    chordOn("string_ensemble_1", t, chord, len * 0.95, 0.09);
    play("contrabass", t, root - 12, len * 0.9, 0.22);
    for (let e = 0; e < 8; e++) play("orchestral_harp", t + e * beat / 2, chord[e % 3] + (e < 4 ? 12 : 24), beat, 0.13);
    // The leitmotif on cello; every other pass the flute answers an octave up.
    if (pass % 2 === 0) line("cello", t, MOTIF[k], beat, 0.42, -12);
    else if (k >= 2) line("flute", t, MOTIF[k], beat, 0.22);
  } else if (name === "lesson") {
    for (let e = 0; e < 8; e++) play("pizzicato_strings", t + e * beat / 2, e % 2 ? chord[(e >> 1) % 3] : root, beat, e % 2 ? 0.18 : 0.26);
    line("flute", t, LESSON_RIFF[(MUSIC.bar + (pass % 2) * 0) % 4], beat, 0.3);
    if (k % 2 === 1) for (let e = 0; e < 4; e++) play("orchestral_harp", t + e * beat, chord[e % 3] + 24, beat, 0.1);
    if (lv >= 1) { play("timpani", t, root, beat, 0.35); play("timpani", t + 2 * beat, root + 7 - 12, beat, 0.25); }
  } else if (name === "battle") {
    if (lv === 0) {
      chordOn("string_ensemble_1", t, chord, len * 0.95, 0.15);
      play("pizzicato_strings", t, root - 12, beat, 0.45); play("pizzicato_strings", t + 2 * beat, root - 5, beat, 0.35);
      for (const b of [1, 3]) play("orchestral_harp", t + b * beat, chord[b % 3] + 12, beat, 0.12);
      if (pass % 2 === 1) line("flute", t, MOTIF_MINOR[k], beat, 0.4);
    } else if (lv === 1) {
      chordOn("string_ensemble_1", t, chord, len * 0.95, 0.09);
      for (let e = 0; e < 8; e++) play("cello", t + e * beat / 2, root - 12 + (e % 4 === 3 ? 7 : 0), beat * 0.45, 0.4);
      play("contrabass", t, root - 12, len * 0.8, 0.2);
      play("timpani", t, root - 12 + 12, beat, 0.45);
      chordOn("french_horn", t, [chord[0] - 12, chord[2] - 12], len * 0.9, 0.12);
      if (pass % 2 === 1) line("flute", t, MOTIF_MINOR[k], beat, 0.24);
    } else {
      // Full orchestra.
      chordOn("tremolo_strings", t, chord.map(n => n + 12), len * 0.95, 0.14 + (lv - 2) * 0.04);
      const steps = lv >= 3 ? 16 : 8;
      for (let e = 0; e < steps; e++) {
        const at = t + e * len / steps;
        play("cello", at, root - 12 + (e % 8 === 6 ? 7 : 0), len / steps * 0.8, 0.32);
        if (e % 2 === 0) play("contrabass", at, root - 12, len / steps * 1.6, 0.24);
      }
      line("french_horn", t, MOTIF_MINOR[k], beat, 0.42, -12);
      for (const b of [0, 1.5, 2, 3.5]) play("timpani", t + b * beat, b % 2 ? root - 5 : root, beat, 0.55);
      play("trumpet", t, chord[2] + 12, beat * 0.4, 0.3); play("trumpet", t + 2 * beat, chord[1] + 12, beat * 0.4, 0.3);
      if (lv >= 3) line("trumpet", t, MOTIF_MINOR[k], beat, 0.24);
      if (k === 0) mCrash(t, 0.1 + lv * 0.02);
      if (k === 3) timpRoll(t + 2 * beat, root, beat * 2, 0.5);
    }
  } else if (name === "boss") {
    const riff = [0, 0, 3, 0, 1, 0, -1, 0];
    chordOn("tremolo_strings", t, chord.map(n => n + 12), len * 0.95, 0.16);
    for (let e = 0; e < 8; e++) {
      const at = t + e * beat / 2;
      play("string_ensemble_1", at, 69 + riff[e], beat * 0.35, 0.3);
      play("cello", at, root - 12, beat * 0.4, 0.34);
      play("contrabass", at, root - 12, beat * 0.4, 0.2);
      play("timpani", at, root - 12 + 12, beat, e % 2 ? 0.35 : 0.6);
    }
    chordOn("french_horn", t, [chord[0] - 12, chord[1] - 12, chord[2] - 12], len * 0.9, 0.2);
    play("trumpet", t + 3.5 * beat, chord[2] + 12, beat * 0.5, 0.36);
    if (k === 0) mCrash(t, 0.16);
    if (k === 3) timpRoll(t + 2 * beat, root, beat * 2, 0.6);
  } else if (name.startsWith("after") && name !== "after") {
    const loop = Math.floor(MUSIC.bar / 8), v = (MUSIC.game + loop) % AFTER_VOICES.length;
    const [inst, oct] = AFTER_VOICES[v][k < 4 ? 0 : 1], tones = [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12];
    const shape = AFTER_SHAPES[(k + loop * 3 + MUSIC.game) % AFTER_SHAPES.length];
    line(inst, t, shape.map(([i, b, d]) => [tones[i], b, d]), beat, inst === "orchestral_harp" ? 0.22 : inst === "cello" ? 0.42 : 0.28, oct);
    chordOn("string_ensemble_1", t, chord, len * 0.95, 0.06);
    play("contrabass", t, root - 12 + 12, len * 0.9, 0.18);
    if (name === "afterLose") for (const b of [0, 2]) play("pizzicato_strings", t + b * beat, root, beat, 0.14);
    else for (let e = 0; e < 8; e++) play("orchestral_harp", t + e * beat / 2, tones[[0, 1, 2, 3, 2, 1, 2, 3][e]] + 12, beat, inst === "orchestral_harp" ? 0.06 : 0.1);
    if (k === 7 && name === "afterWin") play("timpani", t + 3 * beat, root, beat, 0.2);
  } else {
    chordOn("string_ensemble_1", t, chord, len * 0.95, 0.07);
    if (k === 0) line("cello", t, [[64, 0, 2], [60, 2, 1], [62, 3, 1]], beat, 0.5);
    else line("cello", t, [[64, 0, 1.5], [60, 1.5, 0.5], [57, 2, 2]], beat, 0.5);
  }
  MUSIC.bar++;
}
// Short phrases: winning (orchestra fanfare), losing (cello), a draw (flute), a rank-up.
function musicSting(kind) {
  try {
    const a = ctx(), t = a.currentTime + sfxAt + 0.05;
    orchLoad(["trumpet", "french_horn", "timpani", "string_ensemble_1", "cello", "contrabass", "flute"]);
    if (kind === "win" || kind === "rank") {
      line("trumpet", t, [[72, 0, 0.5], [76, 0.5, 0.5], [79, 1, 0.5], [84, 1.5, 3]], 0.22, 0.45);
      chordOn("french_horn", t + 0.33, [48, 55, 60, 64], 1.2, 0.3);
      chordOn("string_ensemble_1", t + 0.33, [60, 64, 67, 72], 1.4, 0.18);
      play("contrabass", t + 0.33, 36, 1.3, 0.3);
      timpRoll(t, 48, 0.33, 0.6); play("timpani", t + 0.33, 36, 1, 0.8); mCrash(t + 0.33, 0.14);
      if (kind === "rank") {
        line("trumpet", t + 1.3, [[79, 0, 0.5], [84, 0.5, 0.5], [88, 1, 3]], 0.22, 0.45);
        chordOn("french_horn", t + 1.52, [52, 55, 60, 67], 1.4, 0.3);
        play("timpani", t + 1.52, 36, 1, 0.8); mCrash(t + 1.52, 0.16);
      }
    } else if (kind === "lose") {
      line("cello", t, [[57, 0, 1], [53, 1, 1], [52, 2, 1], [45, 3, 3]], 0.5, 0.5);
      play("contrabass", t, 33, 2.5, 0.3);
    } else {
      line("flute", t, [[81, 0, 1], [84, 1, 1], [83, 2, 3]], 0.4, 0.35);
    }
  } catch (e) {}
}
function updateMusic() {
  if (!audio) return;
  const m = host.mood();
  if ((m.theme === "menu" || (m.theme === "battle" && m.level === 0)) && curTrack() !== "classic") m.theme = curTrack();
  if (m.level > 3) m.level = 3;
  if (m.theme !== MUSIC.theme) { MUSIC.theme = m.theme; MUSIC.bar = 0; }
  orchLoad(NEEDS[m.theme] || NEEDS.battle);
  MUSIC.level = m.level;
}
function startMusic() {
  try {
    const a = ctx();
    musicBus.gain.cancelScheduledValues(a.currentTime);
    musicBus.gain.setTargetAtTime(musicLevel(), a.currentTime, 0.4);
    updateMusic();
    setTimeout(() => orchLoad(Object.keys(INST)), 3000);
    if (MUSIC.timer || !host.prefs().music) return;
    MUSIC.next = a.currentTime + 0.1;
    MUSIC.timer = setInterval(() => {
      updateMusic();
      while (MUSIC.next < audio.currentTime + 0.6) { const t = MUSIC.next; MUSIC.next += barLength(); scheduleBar(t); }
    }, 200);
  } catch (e) {}
}
function stopMusic() {
  if (!audio) return;
  musicBus.gain.setTargetAtTime(0, audio.currentTime, 0.3);
  clearInterval(MUSIC.timer); MUSIC.timer = null;
}
// Mobile browsers only allow sound after a tap, and iPhones mute Web Audio
// while the ring/silent switch is on. On the first tap we start the audio
// context, ask for a "playback" audio session, and loop a silent <audio>
// element, which moves iOS into the media channel so the game is audible.
let unlocked = false, silentEl: Any = null;
function silentWavUrl() {
  // one second of true digital silence, 16-bit 44.1 kHz (an 8-bit 8 kHz clip can buzz or click when iOS resamples it)
  const rate = 44100, n = rate * 2, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const str = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
// Facebook, Instagram, LINE, Messenger, TikTok and X open links in their own browser. Taking over the
// phone's audio session there makes iOS switch audio back with a buzz when that browser is closed.
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|TikTok|musical_ly|Twitter/i.test(navigator.userAgent);
function unlockAudio(e) {
  // Safari only counts click, touchend and keydown as permission to play, not pointerdown,
  // so keep trying on every tap until the audio is really running.
  if (unlocked) { if (audio && audio.state !== "running" && e && e.type !== "pointerdown") { ctx(); if (host.prefs().music && !MUSIC.timer) startMusic(); } return; }
  if (e && e.type === "pointerdown" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) return;
  try {
    if (navigator.audioSession && !IN_APP) navigator.audioSession.type = "playback";
    const a = ctx();
    const src = a.createBufferSource(); src.buffer = a.createBuffer(1, 1, 22050);
    src.connect(a.destination); src.start(0);
    if (!IN_APP) {
      const el = silentEl = new Audio(silentWavUrl());
      el.loop = true; el.setAttribute("playsinline", "");
      const p = el.play(); if (p && p.catch) p.catch(() => {});
    }
    if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); }
    unlocked = true;
    // Music starts with the first tap, so the menu is not silent.
    if (host.prefs().music) startMusic();
  } catch (e) {}
}
// Leaving the page on a phone: stop everything, including the silent loop and the sergeant's voice.
// Otherwise iOS keeps the "playback" session alive in the background and the loop can click or buzz.
function audioAway(away) {
  if (away) {
    stopVoice();
    if (silentEl) try { silentEl.pause(); } catch (e) {}
    if (navigator.audioSession) try { navigator.audioSession.type = "auto"; } catch (e) {}
    // fade to silence first; cutting a sound mid-wave is what makes the click
    if (audio) try { master.gain.setTargetAtTime(0, audio.currentTime, 0.015); setTimeout(() => { if (document.hidden || away === "gone") audio.suspend(); }, 90); } catch (e) {}
  } else {
    if (navigator.audioSession && unlocked) try { navigator.audioSession.type = "playback"; } catch (e) {}
    if (silentEl) { const q = silentEl.play(); if (q && q.catch) q.catch(() => {}); }
    if (audio) { const p = audio.resume(); if (p && p.catch) p.catch(() => {}); try { master.gain.setTargetAtTime(1, audio.currentTime, 0.05); } catch (e) {} }
  }
}

/* ---------- Sergeant voice ---------- */
const THAI_VOWELS = [[700, 1220, 2600], [280, 2250, 2900], [310, 870, 2250], [400, 2000, 2550], [450, 800, 2830], [580, 1800, 2500], [600, 900, 2500], [320, 1400, 2400]];
let voiceNodes = [], thaiVoice = null, glottal = null;
function findThaiVoice() {
  try {
    const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    thaiVoice = vs.find(v => (host.lang() === "th" ? /^th/i : /^en/i).test(v.lang)) || null;
  } catch (e) { thaiVoice = null; }
}

function stopVoice() {
  voiceNodes.forEach(n => { try { n.stop(); } catch (e) {} });
  voiceNodes = [];
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
}
function voice(text, level) {
  stopVoice();
  const v = al();
  if (v <= 0) return;
  if (host.prefs().voice !== "mumble" && thaiVoice) {
    try {
      // Speak phrase by phrase (split at spaces and punctuation) so there are
      // natural pauses, at a steady slow speed. Anger shows in pitch only.
      const phrases = host.lang() === "th" ? text.replace(/\.{2,}|…/g, " ").split(/[\s!?]+/).filter(Boolean) : text.split(/(?<=[.!?…])\s+/).filter(Boolean);
      const rate = +host.prefs().voiceRate || 0.8;
      for (const ph of phrases) {
        const u = new SpeechSynthesisUtterance(ph);
        u.voice = thaiVoice; u.lang = thaiVoice.lang;
        u.pitch = [1, 0.85, 1.1, 1.4][level];
        u.rate = rate;
        u.volume = Math.min(1, v * 1.2);
        speechSynthesis.speak(u);
      }
      return;
    } catch (e) {}
  }
  mumble(text, level, v);
}
function mumble(text, level, v) {
  try {
    const a = ctx();
    if (!glottal) {
      const n = 40, re = new Float32Array(n), im = new Float32Array(n);
      for (let h = 1; h < n; h++) im[h] = 1 / Math.pow(h, 1.25);
      glottal = a.createPeriodicWave(re, im);
    }
    const base = [0, 118, 150, 192][level];
    const syl = [0, 0.17, 0.135, 0.11][level];
    const count = Math.min(30, Math.max(6, Math.round(text.replace(/\s+/g, "").length / 2.8)));
    const t0 = a.currentTime + 0.06;
    const total = count * syl + 0.3;

    const out = a.createGain(); out.gain.value = v * [0, 2.4, 2.8, 3.0][level];
    let dest = sfxBus;
    if (level === 3) {
      const ws = a.createWaveShaper(), c = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 1.6); }
      ws.curve = c; ws.connect(sfxBus); dest = ws;
    }
    out.connect(dest);

    // Formant filters shared by voice and breath, so both glide together.
    const fs = [0, 1, 2].map(k => {
      const f = a.createBiquadFilter(); f.type = "bandpass"; f.Q.value = [5, 9, 11][k];
      const g = a.createGain(); g.gain.value = [1, 0.6, 0.25][k];
      f.connect(g).connect(out); return f;
    });
    const amp = a.createGain(); amp.gain.value = 0.0001;
    fs.forEach(f => amp.connect(f));

    const o = a.createOscillator(); o.setPeriodicWave(glottal);
    const vib = a.createOscillator(), vibG = a.createGain();
    vib.frequency.value = 5 + level * 0.6; vibG.gain.value = base * 0.018;
    vib.connect(vibG).connect(o.frequency);
    o.connect(amp);
    const breath = a.createBufferSource(); breath.buffer = noiseBuf; breath.loop = true;
    const bg = a.createGain(); bg.gain.value = [0, 0.08, 0.14, 0.22][level];
    breath.connect(bg).connect(amp);

    const shout = /!/.test(text);
    let t = t0;
    for (let k = 0; k < count; k++) {
      const p = k / count;
      const [f1, f2, f3] = THAI_VOWELS[Math.floor(Math.random() * THAI_VOWELS.length)];
      // Intonation: calm falls, angry rises and jumps, furious stays high and shouts.
      let pitch = base * (1 + (Math.random() - 0.5) * (0.08 + level * 0.07));
      pitch *= level === 1 ? 1.06 - p * 0.2 : 1 + Math.sin(p * Math.PI * (1 + level)) * 0.06 * level;
      if (shout && p > 0.7) pitch *= 1.15 + (level - 1) * 0.12;
      const d = syl * (0.8 + Math.random() * 0.45);
      o.frequency.setTargetAtTime(pitch, t, 0.025);
      fs[0].frequency.setTargetAtTime(f1, t, 0.03);
      fs[1].frequency.setTargetAtTime(f2, t, 0.03);
      fs[2].frequency.setTargetAtTime(f3, t, 0.03);
      // Syllable shape: a quick consonant dip, then the vowel.
      const peak = 0.5 + Math.random() * 0.3 + (k % 4 === 0 ? 0.15 : 0);
      amp.gain.setTargetAtTime(0.02, t, 0.012);
      amp.gain.setTargetAtTime(peak, t + d * 0.18, 0.025);
      if (Math.random() < 0.35) {
        const ns = a.createBufferSource(); ns.buffer = noiseBuf;
        const hp = a.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2800 + Math.random() * 2000;
        const ng = a.createGain(); env(ng, t, v * 0.35, 0.005, 0.07);
        ns.connect(hp).connect(ng).connect(dest); ns.start(t); ns.stop(t + 0.09); voiceNodes.push(ns);
      }
      t += d;
      if (Math.random() < 0.15 && k < count - 1) { amp.gain.setTargetAtTime(0.0001, t, 0.03); t += syl * 0.7; }
    }
    amp.gain.setTargetAtTime(0.0001, t, 0.05);
    for (const n of [o, vib, breath]) { n.start(t0); n.stop(t + 0.4); voiceNodes.push(n); }
  } catch (e) {}
}

export function initVoices() { if (window.speechSynthesis) { findThaiVoice(); speechSynthesis.addEventListener && speechSynthesis.addEventListener("voiceschanged", findThaiVoice); } }
export { voice, stopVoice };

/** Unlock audio on the first tap and stop it cleanly when the page goes away (call once). */
export function installAudioListeners() {
for (const ev of ["pointerdown", "touchend", "click", "keydown"]) document.addEventListener(ev, unlockAudio, { capture: true, passive: true });

document.addEventListener("visibilitychange", () => audioAway(document.hidden));
addEventListener("pagehide", () => audioAway("gone"));
// in-app browsers sometimes close without either event, but they do blur the window first
addEventListener("blur", () => { if (IN_APP) audioAway(true); });
addEventListener("focus", () => { if (IN_APP && !document.hidden) audioAway(false); });
addEventListener("pageshow", e => { if (e.persisted) audioAway(false); });}

export { sfx, startMusic, stopMusic, musicSting, updateMusic, MUSIC, ctx, unlockAudio, audioAway, env, splay, orchLoad, musicLevel, mv, al };
/** The replay video renders its soundtrack offline: point sounds at that context and time. */
export function setOffline(a: Any, at: number, off: boolean) { audio = a; sfxAt = at; sfxOff = off; }
export function audioState() { return { audio, sfxBus, musicBus, master, sfxAt, sfxOff }; }
export function rebindBuses(s: Any) { ({ audio, sfxBus, musicBus, master } = s); }

export { ORCH, INST, SFX_INST };
/** Render sounds into an OfflineAudioContext (for the replay video); place(t) sets where the next sounds land. */
export function offlineRender(off, run) {
  const keep = { audio, sfxBus, musicBus, out: ORCH.out };
  try {
    audio = off; sfxOff = true; ORCH.out = null;
    sfxBus = off.createGain(); sfxBus.connect(off.destination);
    musicBus = off.createGain(); musicBus.gain.value = 0.4; musicBus.connect(off.destination);
    volOv = { vm: 100, va: 85 };
    run(t => { sfxAt = t; });
  } finally {
    audio = keep.audio; sfxBus = keep.sfxBus; musicBus = keep.musicBus; ORCH.out = keep.out; volOv = null;
    sfxOff = false; sfxAt = 0;
  }
}
/** The replay brings its own sound, so the after-game music steps aside while it plays. */
export function musicDuck(on) {
  if (!audio || !musicBus) return;
  if (on) { musicBus.gain.cancelScheduledValues(audio.currentTime); musicBus.gain.setTargetAtTime(0, audio.currentTime, 0.2); }
  else if (host.prefs().music) musicBus.gain.setTargetAtTime(musicLevel(), audio.currentTime, 0.4);
}
