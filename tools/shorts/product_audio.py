"""Soundtrack for a product Short: a sad cello for the rough game, then warm harp, strings and flute when the
product arrives, and a harp flourish for the call to action. Uses the game's own samples via audio.py."""
import json, subprocess, sys
import numpy as np
from audio import SR, sample, add, clack

def build(events, dur, out):
    buf = np.zeros(int((dur + 0.5) * SR), dtype=np.float32)
    at = {e["k"]: e["t"] for e in events}
    # the rough game: A minor, cello sighing down
    for n in (45, 52, 60): add(buf, at["sad"], sample("string_ensemble_1", n), 0.16, 4.2)
    for i, n in enumerate([57, 55, 53, 52]): add(buf, at["sad"] + i * 0.95, sample("cello", n), 0.35, 1.1)
    add(buf, at["hit"], sample("timpani", 40), 0.7); add(buf, at["hit"], clack(), 0.8)
    # the product: C major, harp arpeggios, strings, a flute tune
    t0, beat = at["arrive"], 0.6
    for i, n in enumerate([60, 64, 67, 72, 76, 79, 84]): add(buf, t0 + i * 0.05, sample("orchestral_harp", n), 0.28)
    bars = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]]
    tune = [[76, 0, 1], [79, 1, 1], [76, 2, 2], [72, 4, 1], [74, 5, 1], [76, 6, 2], [77, 8, 1], [76, 9, 1], [72, 10, 2], [74, 12, 3]]
    for b, ch in enumerate(bars):
        tb = t0 + 0.4 + b * 4 * beat
        for n in ch: add(buf, tb, sample("string_ensemble_1", n), 0.13, 4 * beat + 0.3)
        for e in range(8): add(buf, tb + e * beat / 2, sample("orchestral_harp", ch[e % 3] + 12), 0.12)
    for n, b, d in tune: add(buf, t0 + 0.4 + b * beat, sample("flute", n), 0.26, d * beat + 0.1)
    # call to action
    t1 = at["cta"]
    for n in (48, 55, 64, 72): add(buf, t1, sample("string_ensemble_1", n), 0.14, 4.4)
    for i, n in enumerate([67, 72, 76, 79, 84]): add(buf, t1 + i * 0.1, sample("orchestral_harp", n), 0.3)
    add(buf, t1, sample("timpani", 36), 0.4)
    buf /= max(1.0, np.abs(buf).max() / 0.9)
    pcm = (buf * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", out], input=pcm, check=True)

if __name__ == "__main__":
    info = json.load(open(sys.argv[1]))
    build(info["events"], info["dur"], sys.argv[2])
