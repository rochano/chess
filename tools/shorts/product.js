// Renders one product Short: node tools/shorts/product.js <spec.json> <photo.jpg> <out.mp4>
// spec.json: { title, note, hook, story: [headline, subline, sad line, happy line], fx: "motes" | "steam", tint }
// Needs the repo served at http://localhost:8765, plus ffmpeg and python3 with numpy.
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const FPS = 30;

(async () => {
  const [specFile, photoFile, out] = process.argv.slice(2);
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.route("**fonts.g**", r => r.abort());
  // The product photo is served from the local file, so the renderer never fetches a shop's site.
  await page.route("**/__product.jpg", r => r.fulfill({ body: fs.readFileSync(photoFile), contentType: "image/jpeg" }));
  await page.goto("http://localhost:8765/tools/shorts/product.html");
  const info = await page.evaluate(s => setup(s), { ...spec, img: "/__product.jpg" });
  const base = out.replace(/\.mp4$/, "");
  fs.writeFileSync(base + ".json", JSON.stringify(info));
  execFileSync("python3", [path.join(__dirname, "product_audio.py"), base + ".json", base + ".wav"]);
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-i", base + ".wav",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-16:TP=-1.5", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-shortest", "-movflags", "+faststart", out]);
  for (let f = 0; f < Math.ceil(info.dur * FPS); f++) {
    const b64 = await page.evaluate(t => { frame(t); return grab(); }, f / FPS);
    if (!ff.stdin.write(Buffer.from(b64, "base64"))) await new Promise(r => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on("close", c => c ? rej(new Error("ffmpeg " + c)) : res()));
  fs.unlinkSync(base + ".wav"); fs.unlinkSync(base + ".json");
  await browser.close();
  console.log(out, info.dur + "s");
})();
