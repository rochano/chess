// Renders daily-puzzle Shorts: node tools/shorts/render.js <first day YYYY-MM-DD> <count> <out dir>
// Needs the repo served at http://localhost:8765 (python3 -m http.server 8765), plus ffmpeg and python3 with numpy.
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const FPS = 30, START = Date.UTC(2026, 9, 24);
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

(async () => {
  const [first, count, out] = [process.argv[2], +process.argv[3], process.argv[4]];
  fs.mkdirSync(out, { recursive: true });
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, "../../puzzles.json"), "utf8"));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.route("**fonts.g**", r => r.abort());
  await page.goto("http://localhost:8765/tools/shorts/render.html");
  const meta = [];
  for (let k = 0; k < count; k++) {
    const t = Date.parse(first) + k * 864e5, key = new Date(t).toISOString().slice(0, 10);
    const day = Math.round((t - START) / 864e5), no = day + 1, p = list[((day % list.length) + list.length) % list.length];
    const [y, m, d] = key.split("-").map(Number), date = d + " " + MONTHS[m - 1] + " " + (y + 543 - 2500);
    const info = await page.evaluate(([p, no, date]) => setup(p, no, date), [p, no, date]);
    const base = path.join(out, key);
    fs.writeFileSync(base + ".json", JSON.stringify(info));
    execFileSync("python3", [path.join(__dirname, "audio.py"), base + ".json", base + ".wav"]);
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-i", base + ".wav",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-16:TP=-1.5", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-shortest", "-movflags", "+faststart", base + ".mp4"]);
    const frames = Math.ceil(info.dur * FPS);
    for (let f = 0; f < frames; f++) {
      const b64 = await page.evaluate(t => { frame(t); return grab(); }, f / FPS);
      if (!ff.stdin.write(Buffer.from(b64, "base64"))) await new Promise(r => ff.stdin.once("drain", r));
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on("close", c => c ? rej(new Error("ffmpeg " + c)) : res()));
    fs.unlinkSync(base + ".wav"); fs.unlinkSync(base + ".json");
    const side = p[0].split(" ")[1] === "w" ? "ขาว" : "ดำ", goal = p[1] === 1 ? "ในตาเดียว" : "ใน " + p[1] + " ตา";
    meta.push({ key, no, date, file: key + ".mp4", title: `โจทย์หมากรุก #${no}: ${side}รุกฆาต${goal} หาเจอไหม? #shorts #หมากรุก`, n: p[1] });
    console.log(key, "#" + no, info.dur.toFixed(1) + "s");
  }
  fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify(meta, null, 1));
  await browser.close();
})();
