"""Builds the soundtrack for one Short from the event timeline that render.html returns.
Uses the game's own orchestral samples (sounds/), so the video sounds like the game."""
import json, subprocess, sys, os
import numpy as np

SR = 44100
ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "sounds")
_cache = {}

def sample(inst, note):
    files = sorted(int(f[:-4]) for f in os.listdir(os.path.join(ROOT, inst)))
    base = min(files, key=lambda n: abs(n - note))
    key = (inst, base)
    if key not in _cache:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, inst, f"{base}.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                             capture_output=True, check=True).stdout
        _cache[key] = np.frombuffer(raw, dtype=np.float32)
    x = _cache[key]
    ratio = 2 ** ((note - base) / 12)
    if ratio == 1: return x
    idx = np.arange(0, len(x) - 1, ratio)
    return np.interp(idx, np.arange(len(x)), x).astype(np.float32)

def add(buf, t, x, gain=1.0, length=None):
    if length: x = x[: int(length * SR)] * np.linspace(1, 0, min(len(x), int(length * SR))) ** 0.5
    i = int(t * SR); j = min(len(buf), i + len(x))
    if i < len(buf): buf[i:j] += x[: j - i] * gain

def clack():
    n = int(0.09 * SR); env = np.exp(-np.linspace(0, 9, n))
    tone = np.sin(2 * np.pi * 900 * np.arange(n) / SR) * 0.5 + np.random.default_rng(1).normal(0, 0.4, n)
    return (tone * env).astype(np.float32)

def build(events, dur, out):
    buf = np.zeros(int((dur + 0.5) * SR), dtype=np.float32)
    # quiet string bed under the countdown: C major then A minor
    for t0, chord in ((0.2, [48, 55, 64]), (6.2, [45, 52, 60])):
        for n in chord: add(buf, t0, sample("string_ensemble_1", n), 0.22, 6.0)
    for e in events:
        t, k = e["t"], e["k"]
        if k == "intro":
            for i, n in enumerate([60, 64, 67, 72]): add(buf, t + i * 0.09, sample("orchestral_harp", n), 0.35)
        elif k == "tick":
            n = 72 if e["n"] > 3 else 79
            add(buf, t, sample("pizzicato_strings", n), 0.45 if e["n"] > 3 else 0.6, 0.6)
        elif k == "reveal":
            add(buf, t, sample("timpani", 43), 0.6)
            for i, n in enumerate([55, 59, 62, 67, 71, 74, 79]): add(buf, t + i * 0.05, sample("orchestral_harp", n), 0.3)
        elif k in ("move", "capture"):
            add(buf, t, clack(), 0.5 if k == "move" else 0.8)
            if k == "capture": add(buf, t, sample("pizzicato_strings", 48), 0.4, 0.4)
        elif k == "mate":
            for n in (60, 64, 67, 72): add(buf, t, sample("trumpet", n), 0.18, 2.6)
            for n in (48, 55, 64, 72): add(buf, t, sample("string_ensemble_1", n), 0.16, 3.2)
            add(buf, t, sample("timpani", 36), 0.6)
        elif k == "end":
            for i, n in enumerate([67, 72, 76, 79, 84]): add(buf, t + i * 0.12, sample("orchestral_harp", n), 0.3)
    buf /= max(1.0, np.abs(buf).max() / 0.9)
    pcm = (buf * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", out], input=pcm, check=True)

if __name__ == "__main__":
    info = json.load(open(sys.argv[1]))
    build(info["events"], info["dur"], sys.argv[2])
