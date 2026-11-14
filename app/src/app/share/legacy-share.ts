// @ts-nocheck -- result sharing (picture, GIF, replay video with sound), the result entrance, product tips and the
// recap popup, ported line for line from the original game. Wired to Angular through create(deps).
/* eslint-disable */
// The encoders are bundled (the original pulled them from a CDN) and load only when the first video is made.
import { refTag } from "../cloud/ref";
import { HOUSE_SHARE } from "../cloud/referral.service";
const load = (u) => (u.includes("gifenc") ? import("gifenc/dist/gifenc.esm.js") : import("mp4-muxer"));

export function create(deps) {
  const { G, prefs, savePrefs, tr, trS, T, LANG, myColor, track, $, show, hide, newGame, showResult, lsGet, lsSet,
    HOME_URL, SHEET_URL, refPicks, GLYPH, NAME, VAL, sqName, opp, inCheck, legalMoves, applyMove, initialState, kingSq, fmt, esc,
    ctx, sfx, musicSting, musicLevel, orchLoad, ORCH, INST, SFX_INST, offlineRender, musicDuck, AVATAR, ICON, THEMES } = deps;
  /* ---------- Share a result ----------
     The link carries utm tags, so Google Analytics shows how many players each share brings in. */
  const Share = {
    link(method) { return HOME_URL + "?utm_source=" + method + "&utm_medium=share&utm_campaign=result" + refTag(); },
    text() {
      const o = G.over, me = myColor(), moves = Math.ceil(G.history.length / 2), lv = ["", "Easy", "Normal", "Hard"][G.level];
      const foe = G.ghost ? T("บอทของ " + G.ghost, G.ghost + "'s bot") : G.mode === "cpu" ? T("คอมระดับ " + lv, "the computer (" + lv + ")") : G.mode === "online" ? T("เพื่อนออนไลน์", "an online friend") : T("เพื่อน", "a friend");
      if (!o) return T("มาเล่นหมากรุก 3 มิติกัน ฟรี ไม่ต้องสมัคร", "Come play 3D chess. Free, no sign-up");
      if (o.type === "draw") return T("เสมอกับ" + foe + " ใน " + moves + " ตา มาลองเล่นหมากรุก 3 มิติกัน", "Drew with " + foe + " in " + moves + " moves! Come try 3D chess");
      if (me && o.winner === me) return T("ชนะ" + foe + (o.type === "mate" ? " แบบรุกฆาต" : "") + " ใน " + moves + " ตา! มาท้าดวลหมากรุก 3 มิติกัน", "Beat " + foe + (o.type === "mate" ? " by checkmate" : "") + " in " + moves + " moves! Come challenge me at 3D chess");
      if (me) return T("แพ้" + foe + " ใน " + moves + " ตา ใครเก่งมาช่วยแก้แค้นที! หมากรุก 3 มิติ เล่นฟรี", "Lost to " + foe + " in " + moves + " moves! Who can avenge me? Free 3D chess");
      return T((o.winner === "w" ? G.names.w : G.names.b) + " ชนะใน " + moves + " ตา มาเล่นหมากรุก 3 มิติด้วยกัน", (o.winner === "w" ? G.names.w : G.names.b) + " won in " + moves + " moves! Come play 3D chess together");
    },
    // A 1080x1080 picture of the final position, for the phone share sheet.
    logo: null,
    async art() {
      if (!this.logo) { try { const img = new Image(); img.src = "img/logo.svg"; await img.decode(); this.logo = img; } catch (e) { this.logo = false; } }
    },
    font: "'Baloo 2', 'Nunito', system-ui, sans-serif",
    // Centre a piece by its drawn shape, not its advance width: on iPhones the pawn's "text style" marker (U+FE0E)
    // adds width, which pushed pawns to the right of their squares. Safari's text metrics don't show it reliably,
    // so the glyph is drawn once off screen and its ink is measured pixel by pixel. Use with textAlign "center".
    ink: {},
    inkDx(g, ch) {
      const k = g.font + ch; if (k in this.ink) return this.ink[k];
      let dx = 0;
      try {
        const px = parseFloat(/(\d+(\.\d+)?)px/.exec(g.font)[1]), w = Math.ceil(px * 3), h = Math.ceil(px * 2);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const t = c.getContext("2d", { willReadFrequently: true }); t.font = g.font; t.textAlign = "center"; t.textBaseline = "middle"; t.fillStyle = "#000";
        t.fillText(ch, w / 2, h / 2);
        const d = t.getImageData(0, 0, w, h).data; let L = w, R = -1;
        for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < L) L = x; R = x; break; }
        if (R >= L) dx = w / 2 - (L + R + 1) / 2;
      } catch (e) { dx = 0; }
      return (this.ink[k] = dx);
    },
    // The game's piece font has its own pawn, so once that font is loaded the marker is left out of drawings altogether.
    symFont: false,
    hasSym() { try { return document.fonts.check("40px 'Noto Sans Symbols 2'", "♟"); } catch (e) { return false; } },
    glyph(t) { const ch = GLYPH[t]; return this.symFont ? ch.replace("\uFE0E", "") : ch; },
    async picture() {
      await this.art(); this.symFont = this.hasSym();
      const S = 1080, c = document.createElement("canvas"); c.width = c.height = S;
      const g = c.getContext("2d"), dark = ["#F1E4C3", "#B58863"]; // lighter than the in-game wood so both colours of pieces stand out
      g.fillStyle = "#F3EDE0"; g.fillRect(0, 0, S, S);
      const ink = "#2F2620", font = this.font;
      if (this.logo) g.drawImage(this.logo, 60, 48, 96, 96);
      g.fillStyle = ink; g.font = "800 56px " + font; g.fillText("Chess Game", 176, 116);
      g.font = "700 34px system-ui, sans-serif"; g.fillStyle = "#6E5E50";
      const line = this.text().split(/!| มา| ใคร/)[0]; g.fillText(line, 60, 196);
      const B = 760, x0 = (S - B) / 2, y0 = 236, q = B / 8, flip = myColor() === "b";
      g.fillStyle = ink; g.fillRect(x0 - 14, y0 - 14, B + 28, B + 28);
      for (let i = 0; i < 64; i++) {
        const r = i >> 3, f = i & 7, vr = flip ? 7 - r : r, vf = flip ? 7 - f : f;
        g.fillStyle = (r + f) % 2 ? dark[1] : dark[0];
        if (G.last && (G.last.from === i || G.last.to === i)) g.fillStyle = (r + f) % 2 ? "#B8963A" : "#F2D77A";
        g.fillRect(x0 + vf * q, y0 + vr * q, q, q);
        const p = G.st.board[i]; if (!p) continue;
        g.font = Math.round(q * 0.82) + "px 'Noto Sans Symbols 2', 'Segoe UI Symbol', serif"; g.textAlign = "center"; g.textBaseline = "middle";
        const cx = x0 + vf * q + q / 2 + this.inkDx(g, this.glyph(p[1])), cy = y0 + vr * q + q / 2 + q * 0.04;
        g.lineWidth = 5; g.strokeStyle = p[0] === "w" ? ink : "#F3EDE0"; g.strokeText(this.glyph(p[1]), cx, cy);
        g.fillStyle = p[0] === "w" ? "#FBF7EE" : ink; g.fillText(this.glyph(p[1]), cx, cy);
      }
      g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = ink; g.font = "800 34px " + font;
      g.fillText(tr("เล่นฟรีที่ rochano.github.io/chess"), S / 2, S - 36);
      return new Promise(res => c.toBlob(b => res(b), "image/png"));
    },
    /* An animated GIF that replays the last few moves the way they looked on screen: the player picks a piece
       (the square lights up and the dots show where it can go), then the square it goes to, at the real pace of the game.
       Long thinks are shortened to a few seconds, but the clock shows the real time taken.
       Built when the result appears (iOS only opens the share sheet straight after a tap, so it must be ready by then).
       The encoder (gifenc, 9 KB) is fetched only when needed. */
    PLIES: 4,
    LENGTH: 13900, // the whole replay stays under 15 s (a little spare for the recorder): long thinks are shortened to fit, the clock still shows the real time
    END: 2500, // how long the result stays up at the end
    gifJob: null,
    loadGif() {
      if (!this._gifenc) this._gifenc = load("https://unpkg.com/gifenc@1.0.3/dist/gifenc.esm.js");
      return this._gifenc;
    },
    prepare() {
      this.gifBlob = this.vidBlob = this._vid = null;
      const over = G.over;
      this.gifJob = over && G.history.length ? this.replay().then(b => { if (G.over === over) this.gifBlob = b; return b; }).catch(e => { console.warn("replay gif", e); return null; }) : null;
      this.vidJob = this.gifJob ? this.gifJob.then(b => b && G.over === over ? this.video() : null).then(b => { if (b && G.over === over) this.vidBlob = b; return b; }).catch(e => { console.warn("replay video", e); return null; }) : null;
      return this.gifJob;
    },
    gifBlob: null, vidBlob: null,
    banner() {
      const o = G.over; if (!o) return null;
      const side = c => tr(c === "w" ? "ขาว" : "ดำ");
      const title = o.type === "mate" ? T("รุกฆาต!", "Checkmate!") : o.type === "resign" ? T(side(opp(o.winner)) + "ยอมแพ้", side(opp(o.winner)) + " resigns") : o.type === "flag" ? T("หมดเวลา!", "Time's up!") : o.type === "abandon" ? T("ออกจากเกม", "Left the game") : o.stalemate ? T("อับ! เสมอ", "Stalemate!") : T("เสมอ", "Draw");
      const sub = o.type === "draw" ? (o.stalemate ? T(side(opp(o.stalemate)) + "ไม่มีตาเดิน แต่ไม่โดนรุก", side(opp(o.stalemate)) + " can't move but isn't in check") : T("ไม่มีใครแพ้", "Nobody loses")) : T(side(o.winner) + "ชนะ", side(o.winner) + " wins");
      return title + " · " + sub;
    },
    svgImg(svg, color) {
      if (!svg || !/<svg/.test(svg)) return Promise.resolve(null);
      if (color) svg = svg.replace(/currentColor/g, color);
      if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      return new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
    },
    /* A replay frame: the phone play screen, in the same layout and proportions (828 x 1472 units, 2x a 414 px wide phone).
       Header with the turn orb and buttons, the wooden board, the status line, and both player cards with clocks. */
    W: 828, H: 1472,
    screen(g, f, P) {
      const ink = P.ink, disp = this.font, body = "'Nunito', system-ui, sans-serif", S = this.W;
      // Paper, header buttons and the wooden frame never change: drawn once, then copied in every frame (30 a second).
      if (!P.bg || P.bg.width !== g.canvas.width) {
        const c = document.createElement("canvas"); c.width = g.canvas.width; c.height = g.canvas.height;
        const b = c.getContext("2d"); b.setTransform(g.getTransform()); this.screenBg(b, P); P.bg = c;
      }
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(P.bg, 0, 0); g.restore();
      g.fillStyle = P.card; g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.arc(455, 78, 39, 0, 7); g.fill(); g.stroke();
      g.fillStyle = f.turn === "b" ? "#3C4A63" : "#F5C344"; g.lineWidth = 4; g.beginPath(); g.arc(455, 78, 27, 0, 7); g.fill(); g.stroke();
      const ic = P.icon[f.turn === "b" ? "moon" : "sun"]; if (ic) g.drawImage(ic, 437, 60, 36, 36);
      const FX = 32, FY = 156, FW = 748, band = 44, B = FX + 6 + band, BY = FY + 6 + band, BS = FW - 2 * (6 + band), q = BS / 8, cq = BS / 100, flip = P.flip;
      this.screenBoard(g, f, P, B, BY, q, cq, flip);
      this.screenRest(g, f, P, flip);
    },
    screenBg(g, P) {
      const ink = P.ink, disp = this.font, S = this.W;
      g.fillStyle = P.paper; g.fillRect(0, 0, S, this.H);
      g.fillStyle = "rgba(47,38,32,.07)";
      for (let y = 14; y < this.H; y += 28) for (let x = 14; x < S; x += 28) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
      g.textAlign = "left"; g.textBaseline = "alphabetic";
      // header
      if (this.logo) g.drawImage(this.logo, 32, 54, 48, 48);
      g.fillStyle = ink; g.font = "800 40px " + disp; g.fillText("Chess Game", 92, 93);
      const btn = (x, bg) => { g.fillStyle = ink; g.beginPath(); g.roundRect(x, 42, 84, 84, 24); g.fill(); g.fillStyle = bg; g.beginPath(); g.roundRect(x, 36, 84, 84, 24); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke(); };
      btn(512, P.leaf); if (P.icon.music) g.drawImage(P.icon.music, 532, 56, 44, 44);
      btn(612, P.ember); g.fillStyle = P.card; g.font = "800 32px " + disp; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(P.view, 654, 80); g.textAlign = "left"; g.textBaseline = "alphabetic";
      btn(712, P.slate); if (P.icon.gear) g.drawImage(P.icon.gear, 732, 56, 44, 44);
      // wooden frame
      const FX = 32, FY = 156, FW = 748, band = 44, B = FX + 6 + band, BY = FY + 6 + band, BS = FW - 2 * (6 + band), q = BS / 8, cq = BS / 100, flip = P.flip;
      g.fillStyle = "rgba(47,38,32,.85)"; g.beginPath(); g.roundRect(FX + 12, FY + 12, FW, FW, 24); g.fill();
      const wg = g.createLinearGradient(0, FY, 0, FY + FW); wg.addColorStop(0, P.wood); wg.addColorStop(1, P.woodDark);
      g.save(); g.beginPath(); g.roundRect(FX, FY, FW, FW, 24); g.clip(); g.fillStyle = wg; g.fillRect(FX, FY, FW, FW);
      g.strokeStyle = "rgba(0,0,0,.07)"; g.lineWidth = 4; // grain, like the repeating gradient in the CSS
      for (let x = FX - 200; x < FX + FW + 200; x += 18) { g.beginPath(); g.moveTo(x, FY); g.lineTo(x + FW * Math.tan(10 * Math.PI / 180), FY + FW); g.stroke(); }
      g.restore();
      g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.roundRect(FX + 3, FY + 3, FW - 6, FW - 6, 22); g.stroke();
      g.fillStyle = "#F6EBD3"; g.font = "700 26px " + disp; g.textAlign = "center"; g.textBaseline = "middle";
      for (let k = 0; k < 8; k++) {
        const file = "abcdefgh"[flip ? 7 - k : k], rank = String(flip ? k + 1 : 8 - k);
        g.fillText(file, B + k * q + q / 2, BY - band / 2); g.fillText(file, B + k * q + q / 2, BY + BS + band / 2);
        g.fillText(rank, B - band / 2, BY + k * q + q / 2); g.fillText(rank, B + BS + band / 2, BY + k * q + q / 2);
      }
      g.fillStyle = ink; g.fillRect(B - 4, BY - 4, BS + 8, BS + 8);
    },
    screenBoard(g, f, P, B, BY, q, cq, flip) {
      const ink = P.ink;
      const at = i => { const r = i >> 3, c = i & 7; return [B + (flip ? 7 - c : c) * q, BY + (flip ? 7 - r : r) * q]; };
      const glow = (i, rgb) => { const [x, y] = at(i), gr = g.createRadialGradient(x + q / 2, y + q / 2, 0, x + q / 2, y + q / 2, q * 0.72); gr.addColorStop(0, `rgba(${rgb},.95)`); gr.addColorStop(0.42, `rgba(${rgb},.95)`); gr.addColorStop(0.83, `rgba(${rgb},.38)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x, y, q, q); };
      for (let i = 0; i < 64; i++) {
        const [x, y] = at(i), dark = ((i >> 3) + (i & 7)) % 2;
        g.fillStyle = dark ? P.dark : P.light; g.fillRect(x, y, q + 0.5, q + 0.5);
        if (f.last && (f.last.from === i || f.last.to === i)) { g.fillStyle = "rgba(245,195,68,.38)"; g.fillRect(x, y, q, q); }
        if (f.sel === i) { g.fillStyle = "rgba(245,195,68,.6)"; g.fillRect(x, y, q, q); g.strokeStyle = ink; g.lineWidth = cq; g.strokeRect(x + cq / 2, y + cq / 2, q - cq, q - cq); }
        if (f.hit === i) glow(i, "229,72,77"); else if (f.check === i) glow(i, "255,216,77");
      }
      // pieces, styled like .pc.w / .pc.b in the game
      g.font = Math.round(10.2 * cq) + "px " + P.pieceFont; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      // A moving piece glides from its square to the new one (eased); what it takes stays until it arrives.
      const sl = f.slide, board = sl ? sl.board : f.board, list = [];
      const dr = f.drop, lift = dr ? (1 - dr.t) ** 2 : 0; // lands with an ease-out, like the game's .pc.lift
      for (let i = 0; i < 64; i++) if (board[i] && !(sl && (i === sl.from || i === sl.to))) list.push([board[i], ...at(i), dr && i === dr.to ? lift : 0]);
      if (sl) {
        const e = sl.t < .5 ? 2 * sl.t * sl.t : 1 - (-2 * sl.t + 2) ** 2 / 2, [ax, ay] = at(sl.from), [bx, by] = at(sl.to);
        if (sl.victim) list.push([sl.victim, bx, by, false]);
        list.push([sl.p, ax + (bx - ax) * e, ay + (by - ay) * e, Math.sin(Math.PI * sl.t)]);
      }
      for (const [p, x, y, up] of list) {
        const ch = this.glyph(p[1]);
        g.save(); g.translate(x + q / 2 + this.inkDx(g, ch), y + q / 2 + 0.06 * q - 0.2 * cq - up * 2.2 * cq); if (up) g.scale(1 + up * 0.06, 1 + up * 0.06);
        if (p[0] === "w") {
          g.shadowColor = "rgba(47,38,32,.35)"; g.shadowOffsetY = 0.55 * cq;
          g.lineWidth = 0.84 * cq; g.strokeStyle = ink; g.strokeText(ch, 0, 0);
          g.shadowColor = "transparent"; g.fillStyle = P.white; g.fillText(ch, 0, 0);
        } else {
          g.shadowColor = "rgba(0,0,0,.3)"; g.shadowOffsetY = 0.55 * cq; g.fillStyle = P.black; g.fillText(ch, 0, 0);
          // the game's soft light glow; in a 256-colour GIF a blur turns to smudges, so a crisp light rim stands in
          if (P.gif) { g.shadowColor = "transparent"; g.shadowOffsetY = 0; g.lineWidth = 1.1 * cq; g.strokeStyle = "rgba(255,238,205,.25)"; g.strokeText(ch, 0, 0); }
          else { g.shadowOffsetY = 0; g.shadowColor = "rgba(255,238,205,.45)"; g.shadowBlur = 0.7 * cq; g.fillText(ch, 0, 0); }
          g.shadowColor = "transparent"; g.shadowBlur = 0; g.lineWidth = 0.5 * cq; g.strokeStyle = "#111214"; g.strokeText(ch, 0, 0); g.fillText(ch, 0, 0);
        }
        g.restore();
      }
      for (const d of f.dots || []) {
        const [x, y] = at(d.to), dark = ((d.to >> 3) + (d.to & 7)) % 2;
        g.beginPath();
        if (d.take) { g.strokeStyle = "rgba(210,74,64,.75)"; g.lineWidth = 0.8 * cq; g.arc(x + q / 2, y + q / 2, q * 0.44 - 0.4 * cq, 0, 7); g.stroke(); }
        else { g.fillStyle = dark ? "rgba(251,245,230,.45)" : "rgba(47,38,32,.38)"; g.arc(x + q / 2, y + q / 2, q * 0.15, 0, 7); g.fill(); }
      }
    },
    screenRest(g, f, P, flip) {
      const ink = P.ink, disp = this.font, body = "'Nunito', system-ui, sans-serif", S = this.W;
      // status line under the board (the result in red at the end, with where to play)
      g.textAlign = "center"; g.textBaseline = "middle";
      if (f.banner) {
        g.fillStyle = "#C0392B"; g.font = "800 38px " + disp; g.fillText(f.status, S / 2, 946, S - 60);
        g.fillStyle = ink; g.font = "800 28px " + disp; g.fillText(tr("เล่นฟรีที่ rochano.github.io/chess"), S / 2, 994);
      } else { g.fillStyle = P.soft; g.font = "800 30px " + disp; g.fillText(f.status || "", S / 2, 950, S - 60); }
      // player cards
      const card = (side, y) => {
        const x = 32, w = 764, h = 190, on = !f.banner && f.turn === side;
        if (on) { g.fillStyle = ink; g.beginPath(); g.roundRect(x + 8, y + 8, w, h, 28); g.fill(); }
        g.fillStyle = on ? "#FFF9E8" : P.card; g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.roundRect(x, y, w, h, 28); g.fill(); g.stroke();
        g.save(); g.beginPath(); g.roundRect(x + 28, y + 48, 92, 92, 20); g.clip(); g.fillStyle = P.paper2; g.fillRect(x + 28, y + 48, 92, 92); if (P.av[side]) g.drawImage(P.av[side], x + 28, y + 48, 92, 92); g.restore();
        g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.roundRect(x + 28, y + 48, 92, 92, 20); g.stroke();
        g.textAlign = "left"; g.textBaseline = "alphabetic";
        g.fillStyle = ink; g.font = "800 36px " + disp; g.fillText(P.name[side], x + 140, y + 70, f.clk ? 400 : 580);
        g.fillStyle = P.soft; g.font = "700 24px " + body; g.fillText(P.sub[side], x + 140, y + 104, 400);
        const caps = (f.caps && f.caps[side]) || [];
        if (caps.length) {
          g.font = "36px " + P.pieceFont; let cx = x + 140;
          for (const p of caps.slice().sort((a, b) => VAL[b[1]] - VAL[a[1]])) {
            if (p[0] === "w") { g.lineWidth = 4; g.strokeStyle = ink; g.strokeText(this.glyph(p[1]), cx, y + 162); g.fillStyle = P.white; } else g.fillStyle = P.black;
            g.fillText(this.glyph(p[1]), cx, y + 162); { const m = g.measureText(this.glyph(p[1])), w = (m.actualBoundingBoxRight || 0) + (m.actualBoundingBoxLeft || 0); cx += (w > 0 ? w + 3 : m.width * 0.82); }
          }
        } else { g.fillStyle = P.soft; g.font = "700 24px " + body; g.fillText(tr("No captures yet"), x + 140, y + 160); }
        if (f.clk) {
          const ms = f.clk[side], cx = x + w - 28 - 156, cy = y + 26, low = ms < 20000;
          g.fillStyle = on ? (low ? P.flag : ink) : P.paper2; g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.roundRect(cx, cy, 156, 88, 16); g.fill(); g.stroke();
          g.fillStyle = on ? (low ? P.card : P.paper) : (low ? P.flag : ink); g.font = "800 44px " + disp; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(fmt(ms), cx + 78, cy + 47);
        }
      };
      card(flip ? "w" : "b", 1032); card(flip ? "b" : "w", 1250);
    },
    // The replay as a list of [frame, ms] at the real pace of the game.
    async timeline() {
      // Fonts must be in before the first frame, or the pieces change shape halfway through (3D players never loaded them).
      const fonts = document.fonts ? Promise.all(["40px 'Noto Sans Symbols 2'", "800 40px 'Baloo 2'", "700 20px 'Baloo 2'"].map(f => document.fonts.load(f, "♚♛♜♝♞♟Chess Game"))).catch(() => {}) : null;
      await Promise.all([this.art(), fonts]);
      this.symFont = this.hasSym();
      const n = Math.min(this.PLIES, G.history.length), H = G.history, first = H.length - n;
      const css = getComputedStyle($("app")), v = k => css.getPropertyValue(k).trim();
      const P = {
        flip: myColor() === "b", ink: v("--ink") || "#2F2620", soft: v("--ink-soft") || "#6E5E50", paper: v("--paper") || "#F3EDE0",
        light: v("--sq-light") || "#F1E4C3", dark: v("--sq-dark") || "#4B3528", wood: v("--wood") || "#8F6A47", woodDark: v("--wood-dark") || "#5B3F28",
        white: v("--white-pc") || "#FBF5E6", black: v("--black-pc") || "#2A2C31", pieceFont: v("--font-piece") || "serif",
        name: { w: tr(G.names.w), b: tr(G.names.b) },
        av: { w: await this.svgImg($("avW").innerHTML), b: await this.svgImg($("avB").innerHTML) },
        // for the video's play screen
        card: v("--card") || "#FBF7EE", paper2: v("--paper-2") || "#E8DFCB", leaf: v("--leaf") || "#6E8B4E", ember: v("--ember") || "#E07A3E", slate: v("--slate") || "#7D8995", flag: v("--flag") || "#D24A40",
        view: ($("viewBtn").textContent || "3D").trim(),
        // the labels under the names, upper-cased like the CSS does in the game
        sub: { w: (($("nameW").querySelector("small") || {}).textContent || tr("White")).toUpperCase(), b: (($("nameB").querySelector("small") || {}).textContent || tr("Black")).toUpperCase() },
        icon: { sun: await this.svgImg(ICON.sun, v("--ink") || "#2F2620"), moon: await this.svgImg(ICON.moon, "#F4E7B8"), music: await this.svgImg($("musicBtn").innerHTML, v("--card") || "#FBF7EE"), gear: await this.svgImg($("openSettings").innerHTML, v("--card") || "#FBF7EE") },
      };
      const nm = el => { const t = $(el) && $(el).firstChild; return t && t.nodeType === 3 && t.textContent.trim(); };
      P.name = { w: nm("nameW") || P.name.w, b: nm("nameB") || P.name.b };
      const capsAt = k => k < H.length ? H[k].captured : G.captured;
      const statusOf = (st, k) => trS(inCheck(st.board, st.turn) ? "Check! " + (st.turn === "w" ? "White" : "Black") + " must answer it." : "Move " + (Math.floor(k / 2) + 1));
      const clkAt = k => G.tc ? (k < H.length && H[k].clk ? { ...H[k].clk } : { ...G.clocks }) : null;
      const mmss = ms => { const s = Math.max(1, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
      const kingIn = st => inCheck(st.board, st.turn) ? st.board.indexOf(st.turn + "K") : -1;
      const frames = []; // [frame, delay ms]
      // The real pace of the game: each move takes as long as it really took, the piece is picked up for as long as it
      // really was, and it lands the way it does in the game (a short lift). Only if the moves together would run past
      // LENGTH are the longest thinks trimmed (the idle waiting, never the moves themselves); the clock keeps the real time.
      const DROP = 180, room = this.LENGTH - 300 - 700 - this.END - 400 - n * DROP;
      const reals = []; for (let k = first; k < H.length; k++) reals.push(Math.max(400, H[k].think || 2000));
      let cap = Infinity;
      if (reals.reduce((a, b) => a + b, 0) > room) { // water-fill: the largest cap that makes everything fit
        const sorted = reals.slice().sort((a, b) => a - b); let used = 0;
        for (let i = 0; i < sorted.length; i++) { const c = (room - used) / (sorted.length - i); if (sorted[i] >= c) { cap = Math.max(400, c); break; } used += sorted[i]; }
      }
      for (let k = first; k < H.length; k++) {
        const before = H[k].st, after = k + 1 < H.length ? H[k + 1].st : G.st, m = k + 1 < H.length ? H[k + 1].last : G.last;
        const last = H[k].last, side = before.turn, check = kingIn(before);
        const real = reals[k - first], show = Math.min(real, cap), scale = real / show;
        const pick = Math.min(H[k].pick || 0, show * 0.8), wait = show - pick; // the computer never picks a piece up: it just moves
        const atMove = clkAt(k), startClk = atMove && { ...atMove, [side]: atMove[side] + real };
        const clkAfter = atMove && { ...atMove, [side]: atMove[side] + (G.tc.inc || 0) };
        const base = { board: before.board, last, check, turn: side, caps: H[k].captured, status: statusOf(before, k) };
        for (let t = 0; t < wait; t += 250) frames.push([{ ...base, clock: { side, text: mmss((t + 250) * scale) }, clk: startClk && { ...startClk, [side]: startClk[side] - t * scale } }, Math.min(250, wait - t)]);
        if (pick > 0) {
          const dots = legalMoves(before).filter(x => x.from === m.from).filter((x, i, a) => a.findIndex(y => y.to === x.to) === i).map(x => ({ to: x.to, take: !!(before.board[x.to] || x.ep) }));
          frames.push([{ ...base, sel: m.from, dots, clock: { side, text: mmss(real) }, clk: atMove, snd: "select" }, pick]);
        }
        const land = { board: after.board, last: m, check: kingIn(after), turn: after.turn, caps: capsAt(k + 1), status: statusOf(after, k + 1), clk: clkAfter };
        frames.push([{ ...land, lift: m.to, drop: { to: m.to, t: 1 }, snd: { before, after, m, over: k === H.length - 1 && !!G.over && G.over.type !== "resign" && G.over.type !== "flag" } }, DROP]);
        if (k === H.length - 1) frames.push([land, 400]);
      }
      const o = G.over, hit = o.type === "mate" || o.type === "resign" || o.type === "flag" ? G.st.board.indexOf(opp(o.winner) + "K") : -1;
      frames.push([{ board: G.st.board, last: G.last, hit, banner: this.banner(), turn: G.st.turn, caps: G.captured, status: trS(o.text), clk: G.tc ? { ...G.clocks } : null, snd: "end" }, this.END]);
      return { P, frames };
    },
    async replay() {
      const [lib, { P, frames }] = await Promise.all([this.loadGif(), this.timeline()]);
      const { GIFEncoder, quantize } = lib;
      // Exact colour lookup (gifenc's own applyPalette shares one answer per colour bucket, so the same pixel could change between frames and flicker).
      const near = new Map(), applyPalette = (d, pal) => {
        const out = new Uint8Array(d.length / 4);
        for (let i = 0, j = 0; i < d.length; i += 4, j++) {
          const key = d[i] << 16 | d[i + 1] << 8 | d[i + 2]; let k = near.get(key);
          if (k === undefined) { let best = 1e9; for (let c = 0; c < pal.length; c++) { const p = pal[c], e = (p[0] - d[i]) ** 2 + (p[1] - d[i + 1]) ** 2 + (p[2] - d[i + 2]) ** 2; if (e < best) { best = e; k = c; } } near.set(key, k); }
          out[j] = k;
        }
        return out;
      };

      // The play screen as on a phone (portrait), one pixel per unit (828 x 1472) so lines and pieces stay crisp.
      P.gif = true;
      const W = this.W, Hh = this.H, c = document.createElement("canvas"); c.width = W; c.height = Hh;
      const g = c.getContext("2d", { willReadFrequently: true }); g.setTransform(W / this.W, 0, 0, Hh / this.H, 0, 0);
      const grab = f => { this.screen(g, f, P); return g.getImageData(0, 0, W, Hh).data; };
      // a landing piece settles in three steps, like the game's short lift
      for (let i = frames.length - 1; i >= 0; i--) {
        const [f, ms] = frames[i]; if (!f.drop) continue;
        frames.splice(i, 1, [{ ...f, drop: { to: f.drop.to, t: 0 } }, 60], [{ ...f, snd: null, drop: { to: f.drop.to, t: 0.5 } }, 60], [{ ...f, snd: null, drop: { to: f.drop.to, t: 1 } }, Math.max(20, ms - 120)]);
      }
      // One palette for every frame, taken from a picked-piece frame and the end, which hold all the colours in use.
      const picks = frames.filter(x => x[0].sel != null).map(x => x[0]), samples = [picks[0], picks[picks.length - 1], frames[0][0], frames[frames.length - 1][0]].filter(Boolean).map(grab); // no picked frames when every move was the computer's or a friend's online
      const all = new Uint8ClampedArray(samples[0].length * samples.length); samples.forEach((d, i) => all.set(d, i * d.length));
      const palette = quantize(all, 255), CLEAR = palette.length, gif = GIFEncoder();
      let prev = null;
      for (const [f, delay] of frames) {
        const idx = applyPalette(grab(f), palette);
        // After the first frame only changed pixels are stored; the rest are see-through, which keeps the file small.
        if (prev) { const out = idx.slice(); for (let i = 0; i < out.length; i++) if (out[i] === prev[i]) out[i] = CLEAR; gif.writeFrame(out, W, Hh, { delay: Math.round(delay), transparent: true, transparentIndex: CLEAR, dispose: 1 }); }
        else gif.writeFrame(idx, W, Hh, { palette: palette.concat([[255, 0, 255]]), delay: Math.round(delay), repeat: 0 }); // the extra colour is the see-through one
        prev = idx;
        await new Promise(r => setTimeout(r)); // let the result animation breathe between frames
      }
      gif.finish();
      this._vid = { frames, P: { ...P, gif: false } };
      return new Blob([gif.bytes()], { type: "image/gif" });
    },
    loadMux() {
      if (!this._mux) this._mux = load("https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/build/mp4-muxer.mjs");
      return this._mux;
    },
    // Facebook, Instagram and Threads show an uploaded GIF as a still picture, so the same replay (same frames, same pace)
    // is also made as a silent MP4: 1080 x 1920 at 30 fps, encoded on the phone with WebCodecs, faster than real time.
    async video() {
      const v = this._vid; if (!v || !window.VideoEncoder || !window.VideoFrame) return null;
      const W = 1080, H = 1920, FPS = 30, rate = 16e6; // high: the picture is mostly still, and Facebook/IG compress it again
      let codec = null;
      for (const c of ["avc1.640028", "avc1.4d0028", "avc1.42E028", "avc1.42001f"]) {
        try { if ((await VideoEncoder.isConfigSupported({ codec: c, width: W, height: H, bitrate: rate, framerate: FPS })).supported) { codec = c; break; } } catch (e) {}
      }
      if (!codec) return null;
      const { Muxer, ArrayBufferTarget } = await this.loadMux();
      // Sound: encoded on the phone where it can encode AAC (iOS 26+, Chrome); otherwise recorded in real time with
      // MediaRecorder (iOS 18 and the like) while the picture is encoded, then unpacked and put into the video.
      const total = v.frames.reduce((a, f) => a + f[1], 0), SR = 48000, ac = { codec: "mp4a.40.2", sampleRate: SR, numberOfChannels: 2, bitrate: 160000 };
      let aac = false; try { aac = !!(window.AudioEncoder && window.AudioData && (await AudioEncoder.isConfigSupported(ac)).supported); } catch (e) { this.log("aac check " + e); }
      this.dbg = []; this.log("AudioEncoder " + !!window.AudioEncoder + ", aac " + aac + ", MediaRecorder " + !!window.MediaRecorder);
      const audioJob = (aac ? this.encodeSound(v.frames, total, ac) : this.recordSound(v.frames, total)).catch(e => { console.warn("replay sound", e); this.log("sound error " + (e && e.message || e)); return null; });
      let err = null; const vchunks = [];
      const enc = new VideoEncoder({ output: (chunk, meta) => vchunks.push([chunk, meta]), error: e => { err = e; } });
      enc.configure({ codec, width: W, height: H, bitrate: rate, bitrateMode: "variable", latencyMode: "quality", framerate: FPS, avc: { format: "avc" } });
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      // Reels and Shorts fill a taller phone screen, cutting about a tenth off each side, and lay their buttons over the
      // bottom: so the play screen sits at 80% in the middle (a little high) on the same dotted paper, and nothing is lost.
      const g = c.getContext("2d"), k = 0.8 * W / this.W, ox = (W - this.W * k) / 2, oy = Math.round((H - this.H * k) * 0.4);
      g.fillStyle = v.P.paper; g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(47,38,32,.07)";
      for (let y = 14 * k; y < H; y += 28 * k) for (let x = (ox % (28 * k)) + 14 * k - 28 * k; x < W; x += 28 * k) { g.beginPath(); g.arc(x, y, 2 * k, 0, 7); g.fill(); }
      g.setTransform(k, 0, 0, k, ox, oy);
      let n = 0, t = 0;
      for (const [f, ms] of v.frames) {
        this.screen(g, f, v.P); t += ms;
        while (n * 1000 / FPS < t) { // hold the picture for as many video frames as the GIF frame lasts
          if (err) throw err;
          const vf = new VideoFrame(c, { timestamp: Math.round(n * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
          enc.encode(vf, { keyFrame: n % FPS === 0 }); vf.close(); n++;
          while (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 5));
        }
        await new Promise(r => setTimeout(r));
      }
      await enc.flush(); enc.close();
      if (err) throw err;
      const snd = await audioJob; this.log(snd ? "sound " + snd.codec + " " + snd.sampleRate + "Hz x" + snd.numberOfChannels + ", " + snd.chunks.length + " frames, desc " + (snd.description ? snd.description.length : 0) : "no sound"); // { codec, sampleRate, numberOfChannels, description, chunks: [[data, type, us, durUs]] }
      const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, audio: snd ? { codec: snd.codec, sampleRate: snd.sampleRate, numberOfChannels: snd.numberOfChannels } : undefined, fastStart: "in-memory", firstTimestampBehavior: "offset" });
      for (const [chunk, meta] of vchunks) muxer.addVideoChunk(chunk, meta);
      if (snd) {
        const meta = { decoderConfig: { codec: snd.decoderCodec, sampleRate: snd.sampleRate, numberOfChannels: snd.numberOfChannels, description: snd.description } };
        snd.chunks.forEach(([data, type, ts, dur], i) => { if (ts < total * 1000) muxer.addAudioChunkRaw(data, type, ts, dur, i ? undefined : meta); });
      }
      muxer.finalize();
      return new Blob([muxer.target.buffer], { type: "video/mp4" });
    },
    async encodeSound(frames, total, ac) {
      const sound = await this.soundtrack(frames, total); if (!sound) return null;
      const SR = ac.sampleRate, chunks = []; let desc = null, err = null;
      const aenc = new AudioEncoder({ output: (chunk, meta) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); chunks.push([d, chunk.type, chunk.timestamp, chunk.duration || 0]); if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = new Uint8Array(meta.decoderConfig.description.buffer || meta.decoderConfig.description); }, error: e => { err = e; } });
      let cfg = Object.assign({}, ac, { aac: { format: "aac" } }); // raw frames, not ADTS
      try { if (!(await AudioEncoder.isConfigSupported(cfg)).supported) cfg = ac; } catch (e) { cfg = ac; }
      aenc.configure(cfg);
      const L = sound.getChannelData(0), R = sound.getChannelData(1), len = Math.min(L.length, Math.round(SR * total / 1000)), step = SR / 2;
      for (let i = 0; i < len; i += step) {
        const n = Math.min(step, len - i), data = new Float32Array(n * 2); data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n);
        const ad = new AudioData({ format: "f32-planar", sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i * 1e6 / SR), data });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
      if (err) throw err;
      const hex = a => a ? Array.from(a.slice(0, 24), b => b.toString(16).padStart(2, "0")).join(" ") : "-";
      this.log("desc " + hex(desc)); if (chunks[0]) this.log("frame0 " + chunks[0][0].length + "B " + hex(chunks[0][0]));
      // Safari (iOS 18) hands back a 39-byte description (a whole esds box, not the 2-byte AudioSpecificConfig the MP4 needs),
      // and may send ADTS frames: players then cannot decode the track and the video plays silent. So the MP4 always gets a
      // plain AAC-LC config made here, and any ADTS header is cut off each frame.
      const fi = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000].indexOf(SR);
      const asc = new Uint8Array([(2 << 3) | (fi >> 1), ((fi & 1) << 7) | (2 << 3)]);
      let adts = 0;
      for (const c of chunks) { const d = c[0]; if (d.length > 7 && d[0] === 0xFF && (d[1] & 0xF6) === 0xF0) { c[0] = d.subarray(d[1] & 1 ? 7 : 9); adts++; } }
      if (adts) this.log("adts stripped " + adts);
      return { codec: "aac", decoderCodec: ac.codec, sampleRate: SR, numberOfChannels: 2, description: /^mp4a/.test(ac.codec) ? asc : desc || undefined, chunks };
    },
    loadMp4box() {
      if (!this._m4b) this._m4b = new Promise((res, rej) => {
        if (window.MP4Box) return res(window.MP4Box);
        import("mp4box").then(m => { window.MP4Box = m.default || m; res(window.MP4Box); }, rej);
      });
      return this._m4b;
    },
    // Plays the soundtrack into a MediaRecorder (not out loud) and unpacks the recorded MP4 into audio frames.
    dbg: [],
    log(m) { this.dbg.push(m); if (/debug/.test(location.search)) console.log("[replay]", m); },
    async recordSound(frames, total) {
      this.log("rec types mp4 " + (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/mp4")) + ", aac " + (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2")));
      if (!window.MediaRecorder || !MediaRecorder.isTypeSupported("audio/mp4")) return null;
      const [buf, M] = await Promise.all([this.soundtrack(frames, total), this.loadMp4box()]); this.log("soundtrack " + (buf ? buf.duration.toFixed(1) + "s" : "none") + ", mp4box " + !!M); if (!buf) return null;
      const a = ctx(); this.log("ctx " + a.state); if (a.state !== "running") { try { await a.resume(); } catch (e) {} } this.log("ctx after resume " + a.state); if (a.state !== "running") return null;
      const dest = a.createMediaStreamDestination(), src = a.createBufferSource(); src.buffer = buf; src.connect(dest);
      const type = MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2") ? "audio/mp4;codecs=mp4a.40.2" : "audio/mp4";
      const rec = new MediaRecorder(dest.stream, { mimeType: type, audioBitsPerSecond: 160000 }), parts = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
      const stopped = new Promise(r => { rec.onstop = r; });
      rec.start(); src.start();
      await new Promise(r => setTimeout(r, Math.ceil(buf.duration * 1000) + 150));
      rec.stop(); await stopped; try { src.disconnect(); } catch (e) {}
      const ab = await new Blob(parts).arrayBuffer(); ab.fileStart = 0; this.log("recorded " + rec.mimeType + " " + parts.length + " parts " + ab.byteLength + " bytes");
      return await new Promise((res, rej) => {
        const f = M.createFile(), samples = []; let info = null;
        f.onError = e => rej(new Error(String(e)));
        f.onReady = i => { info = i; const t = i.audioTracks && i.audioTracks[0]; if (!t) return; f.setExtractionOptions(t.id, null, { nbSamples: 1e6 }); f.start(); };
        f.onSamples = (id, u, list) => { for (const x of list) samples.push(x); };
        f.appendBuffer(ab); f.flush();
        setTimeout(() => {
          const t = info && info.audioTracks && info.audioTracks[0]; this.log("parsed " + (t ? t.codec + " " + samples.length + " samples" : "no audio track") + (info ? " frag " + info.isFragmented : " no info")); if (!t || !samples.length) return res(null);
          const aacTrack = /^mp4a/.test(t.codec), trak = f.getTrackById(t.id), entry = trak && trak.mdia.minf.stbl.stsd.entries[0];
          let description;
          try { if (aacTrack) description = entry.esds.esd.descs[0].descs[0].data; } catch (e) {}
          const t0 = samples[0].cts;
          res({ codec: aacTrack ? "aac" : "opus", decoderCodec: aacTrack ? t.codec : "opus", sampleRate: t.audio.sample_rate, numberOfChannels: t.audio.channel_count, description,
            chunks: samples.map(x => [new Uint8Array(x.data), x.is_sync === false ? "delta" : "key", Math.round((x.cts - t0) * 1e6 / x.timescale), Math.round(x.duration * 1e6 / x.timescale)]) });
        }, 0);
      });
    },
    // The game's own sounds, placed where they happen in the replay: the piece picked up, each move landing
    // (check, capture, castle, promotion), and the end of the game with its fanfare. Rendered offline, faster than real time.
    async soundtrack(frames, ms) {
      const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!Off) return null;
      ctx(); // the instrument samples are decoded by the game's audio context
      const need = SFX_INST.concat(["trumpet", "french_horn", "timpani", "string_ensemble_1", "cello", "contrabass", "flute"]); orchLoad(need);
      const have = n => ORCH.buf[n] && Object.keys(ORCH.buf[n]).length >= INST[n].notes.length - 2;
      for (let k = 0; k < 40 && !need.every(have); k++) await new Promise(r => setTimeout(r, 100));
      const SR = 48000, off = new Off(2, Math.ceil(SR * (ms / 1000 + 0.5)), SR);
      offlineRender(off, place => {
        let t = 0, ended = false;
        for (const [f, d] of frames) {
          const s = f.snd; place(t / 1000); t += d;
          if (!s) continue;
          if (s === "select") sfx.select();
          else if (s === "end") {
            if (!ended) sfx.end(G.over, G.mode === "cpu" && G.over.winner === G.cpuColor);
            const o = G.over, me = myColor(); musicSting(o.type === "draw" ? "draw" : me && o.winner !== me ? "lose" : "win");
          } else {
            const { after, m, over } = s;
            if (over) { sfx.end(G.over, G.mode === "cpu" && G.over.winner === G.cpuColor); ended = true; } else if (inCheck(after.board, after.turn)) sfx.check(); else if (m.promo) sfx.promote(); else if (m.castle) sfx.castle(); else if (after.captured) sfx.capture(); else sfx.move();
          }
        }
      });
      const buf = await off.startRendering();
      let peak = 0; for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
      const gain = peak > 0 ? Math.min(3, 0.9 / peak) : 1; // as loud as it can be without clipping
      this.log("soundtrack peak " + peak.toFixed(3) + ", " + buf.length + " samples");
      if (gain !== 1) for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= gain; }
      return buf;
    },
    // On phones the video goes out when it is ready (it plays everywhere); the GIF is the fallback, and what LINE gets.
    phone() { return !!(navigator.share && navigator.canShare && matchMedia("(pointer: coarse)").matches); },
    mp4File() { return this.vidBlob ? new File([this.vidBlob], "chess-replay.mp4", { type: "video/mp4" }) : null; },
    async go() {
      const url = this.link("native"), text = this.text();
      track("share", { method: "native", opponent: G.mode });
      try {
        const gifBlob = await (this.gifJob || null), files = [], mp4 = this.phone() && this.mp4File();
        if (mp4 && navigator.canShare({ files: [mp4] })) files.push(mp4);
        else if (gifBlob) files.push(new File([gifBlob], "chess-replay.gif", { type: "image/gif" }));
        if (!files.length || !(navigator.canShare && navigator.canShare({ files }))) { const blob = await this.picture(); files.length = 0; if (blob) files.push(new File([blob], "chess-result.png", { type: "image/png" })); }
        const file = files[0];
        if (file && navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, text: text + " " + url }); return; }
        if (navigator.share) { await navigator.share({ title: "Chess Game", text, url }); return; }
        // Desktop without a share sheet: save the replay (or the picture) and copy the link.
        const save = this.vidBlob ? { b: this.vidBlob, n: "chess-replay.mp4" } : gifBlob ? { b: gifBlob, n: "chess-replay.gif" } : file ? { b: file, n: file.name } : null;
        if (save) { const a = document.createElement("a"); a.href = URL.createObjectURL(save.b); a.download = save.n; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
        this.copy(true);
      } catch (e) {}
    },
    open(method) {
      const url = encodeURIComponent(this.link(method)), text = encodeURIComponent(this.text());
      track("share", { method, opponent: G.mode });
      // Facebook's and LINE's share links only carry the page link (its preview picture), never a file.
      // On phones the replay goes through the share sheet instead, where the player picks Facebook or LINE:
      // the video for Facebook (it shows GIFs as still pictures), the GIF for LINE.
      if (this.phone()) {
        const mp4 = method === "facebook" && this.mp4File(), files = [mp4 && navigator.canShare({ files: [mp4] }) ? mp4 : this.gifBlob && new File([this.gifBlob], "chess-replay.gif", { type: "image/gif" })].filter(Boolean);
        if (files.length && navigator.canShare({ files })) { navigator.share({ files, text: this.text() + " " + this.link(method) }).catch(() => {}); return; }
      }
      const to = method === "line" ? "https://social-plugins.line.me/lineit/share?url=" + url + "&text=" + text : "https://www.facebook.com/sharer/sharer.php?u=" + url;
      window.open(to, "_blank", "noopener,width=600,height=640");
    },
    copy(quiet) {
      const t = this.text() + " " + this.link("copy"), b = $("shareCopy");
      if (!quiet) track("share", { method: "copy", opponent: G.mode });
      const done = () => { b.textContent = tr("Link copied"); setTimeout(() => { b.textContent = tr("Copy link"); }, 2000); };
      try { navigator.clipboard.writeText(t).then(done, () => prompt("Copy this", t)); } catch (e) { prompt("Copy this", t); }
    },
  };
  /* ---------- Shop tips: after a game, Sergeant Somchai suggests something that fits how it went ----------
     Items live in shop.json. Each item has moods (tense, lost, won, learn) and a url; affiliate: true marks a paid link.
     Optional from/until (YYYY-MM-DD, Bangkok) limit an item to a week or season; look borrows another item's Atmo set. */
  // Result entrance, played with element.animate() (CSS animations restarted by un-hiding were unreliable in Safari).
  // Each product arrives the way that thing moves in real life. With reduced motion everything just fades in.
  const ResultFx = {
    K: {
      // stress ball: dropped, squashes on landing, bounces twice
      squish: [1100, [{ opacity: 0, transform: "translateY(-120%) scale(.9,1.1)" }, { opacity: 1, transform: "translateY(0) scale(1.18,.78)", offset: .35 }, { transform: "translateY(-14%) scale(.94,1.06)", offset: .5 }, { transform: "translateY(0) scale(1.08,.9)", offset: .65 }, { transform: "translateY(-4%) scale(.98,1.02)", offset: .78 }, { transform: "scale(1.02,.98)", offset: .9 }, { opacity: 1, transform: "none" }]],
      // aroma oil: comes into focus out of mist
      mist: [1700, [{ opacity: 0, transform: "scale(1.15)" }, { opacity: .7, transform: "scale(1.05)", offset: .5 }, { opacity: 1, transform: "none" }]],
      // tea: rises up warm like steam
      rise: [1500, [{ opacity: 0, transform: "translateY(40%) scale(.92)" }, { opacity: 1, offset: .7 }, { opacity: 1, transform: "none" }]],
      // neck massager: switches on, hums with a small vibration, settles
      hum: [1300, [{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "scale(1.03)", offset: .3 }, { transform: "translate(-4px,1px)", offset: .36 }, { transform: "translate(4px,-1px)", offset: .42 }, { transform: "translate(-3px,1px)", offset: .48 }, { transform: "translate(3px,0)", offset: .54 }, { transform: "translate(-2px,0)", offset: .6 }, { transform: "translate(1px,0)", offset: .66 }, { opacity: 1, transform: "none" }]],
      // dark chocolate: the wrapper peels back left to right
      unwrap: [1100, [{ clipPath: "inset(0 100% 0 0)", transform: "rotate(-3deg)" }, { clipPath: "inset(0 0% 0 0)", transform: "rotate(1deg)", offset: .7 }, { clipPath: "inset(0 0% 0 0)", transform: "none" }]],
      // folding wooden board: unfolds on its hinge and lands with a knock
      unfold: [1100, [{ opacity: 0, transform: "perspective(700px) rotateY(-88deg)", transformOrigin: "left center" }, { opacity: 1, transform: "perspective(700px) rotateY(8deg)", transformOrigin: "left center", offset: .6 }, { transform: "perspective(700px) rotateY(-2deg) translateY(-3px)", transformOrigin: "left center", offset: .8 }, { opacity: 1, transform: "perspective(700px) rotateY(0deg)", transformOrigin: "left center" }]],
      // magnetic set: pulled in fast and snaps into place
      snap: [900, [{ opacity: 0, transform: "translateX(-160%) rotate(-12deg) scale(.85)", easing: "cubic-bezier(.5,0,.9,.5)" }, { opacity: 1, transform: "translateX(6%) rotate(2deg) scale(1.04)", offset: .55 }, { transform: "translateX(-2%) scale(.99)", offset: .63 }, { opacity: 1, transform: "none", offset: .7 }, { opacity: 1, transform: "none" }]],
      // book: the cover swings open from the spine
      open: [1200, [{ opacity: 0, transform: "perspective(700px) rotateY(80deg) scale(.9)", transformOrigin: "left center" }, { opacity: 1, transform: "perspective(700px) rotateY(-6deg)", transformOrigin: "left center", offset: .65 }, { opacity: 1, transform: "perspective(700px) rotateY(0deg)", transformOrigin: "left center" }]],
      // chess clock: ticks into place step by step, then its button is pressed
      tick: [1200, [{ opacity: 0, transform: "rotate(-30deg) scale(.85)", easing: "steps(5,end)" }, { opacity: 1, transform: "rotate(0deg) scale(1)", offset: .6 }, { transform: "translateY(5px) scale(1.04,.95)", offset: .72 }, { transform: "translateY(-2px)", offset: .84 }, { opacity: 1, transform: "none" }]],
    },
    BURST: { hum: "ring", snap: "ring", unwrap: "glint", tick: "glint" },
    soft() { return matchMedia("(prefers-reduced-motion: reduce)").matches; },
    run(el, frames, o) { if (el && el.animate) try { return el.animate(frames, Object.assign({ fill: "backwards", easing: "ease-out" }, o)); } catch (e) {} },
    card() {
      const card = $("result").querySelector(".card"), soft = this.soft();
      [...card.children].forEach((el, i) => {
        if (el.hidden || el.id === "shop" && $("result").classList.contains("atmo-on")) return;
        this.run(el, soft ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }],
          { duration: 520, delay: Math.min(i, 4) * 90 + (el.id === "shop" ? 120 : 0), easing: "cubic-bezier(.2,.9,.3,1.15)" });
      });
      if (!soft) this.run($("resBadge"), [{ opacity: 0, transform: "scale(.2) rotate(-25deg)" }, { transform: "scale(1.12) rotate(4deg)", offset: .7 }, { opacity: 1, transform: "none" }], { duration: 700, easing: "cubic-bezier(.2,1.6,.4,1)" });
      this.product(380);
    },
    product(delay) {
      const r = $("result"), tag = r.dataset.enter;
      if (!tag || !this.K[tag]) return;
      const soft = this.soft(), [ms, frames] = this.K[tag], start = delay + 120;
      const bg = r.querySelector(":scope > .atmo"), shop = $("shop");
      // the room's light comes up first, like walking into the product's space
      this.run(bg, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200 });
      this.run(shop, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay });
      if (soft) { this.run($("shopIc"), [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: start }); return; }
      this.run($("shopIc"), frames, { duration: ms, delay: start });
      const end = start + ms;
      shop.querySelectorAll(".shop-txt, .shop-go").forEach((el, i) => this.run(el, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: end - 150 + i * 120 }));
      this.run($("shopItem"), [{ opacity: 0, transform: "scale(2.2) rotate(-14deg)" }, { opacity: 1, transform: "rotate(-4deg)" }], { duration: 420, delay: end + 150, easing: "cubic-bezier(.2,1.8,.4,1)", pseudoElement: "::before" });
      const burst = bg && bg.querySelector(".burst"), kind = this.BURST[tag];
      this.run(burst, kind === "ring" ? [{ opacity: 0, transform: "scale(.4)" }, { opacity: .9, offset: .15 }, { opacity: 0, transform: "scale(2.4)" }]
        : kind === "glint" ? [{ opacity: 1, transform: "translateX(-80%)" }, { opacity: 0, transform: "translateX(80%)" }]
        : [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 0 }], { duration: 1600, delay: start + ms * .45, fill: "none" });
    },
  };
  const Atmo = {
    // fx: motes (sun and dust), steam, bokeh, breath, sweep. tint is laid over the blurred photo with soft-light.
    SETS: {
      "stress-ball": { enter: "squish", fx: "bokeh", tint: "#FF9DB8", glow: "rgba(255,190,210,.9)", base: "#C8657F", btn: "#D9466F" },
      "lavender": { enter: "mist", fx: "bokeh", tint: "#9C7BE0", glow: "rgba(214,190,255,.9)", base: "#5E4A8C", btn: "#7A55C7" },
      "chamomile": { enter: "rise", fx: "steam", tint: "#F4C46A", glow: "rgba(255,224,160,.9)", base: "#9C7434", btn: "#B97A16" },
      "neck-pillow": { enter: "hum", fx: "breath", tint: "#7FC9C0", glow: "rgba(170,235,225,.85)", base: "#2F6F69", btn: "#2F8F86" },
      "dark-choc": { enter: "unwrap", fx: "steam", tint: "#8A5232", glow: "rgba(255,200,150,.8)", base: "#3B2216", btn: "#7A4426" },
      "wood-chess": { enter: "unfold", fx: "motes", tint: "#E0A868", glow: "rgba(255,220,170,.9)", base: "#6B4524", btn: "#8A5328" },
      "magnet-chess": { enter: "snap", fx: "sweep", tint: "#8FB0F0", glow: "rgba(190,210,255,.9)", base: "#34508F", btn: "#3A5FC2" },
      "chess-book": { enter: "open", fx: "motes", tint: "#E8C27A", glow: "rgba(255,230,180,.9)", base: "#5C4A2C", btn: "#8A5A1E" },
      "chess-clock": { enter: "tick", fx: "sweep", tint: "#FFA36A", glow: "rgba(255,200,160,.9)", base: "#7A3416", btn: "#D2552A" },
    },
    build(a, img, small) {
      const L = document.createElement("div"); L.className = "atmo"; L.setAttribute("aria-hidden", "true");
      L.style.setProperty("--atmo-img", img ? `url("${img}")` : "none");
      L.style.setProperty("--atmo-base", `radial-gradient(circle at 40% 35%, ${a.tint}, ${a.base})`);
      L.style.setProperty("--atmo-tint", a.tint); L.style.setProperty("--atmo-glow", a.glow);
      if (small) L.style.setProperty("--atmo-blur", "14px");
      const add = (cls, vars) => { const e = document.createElement("i"); e.className = cls; for (const k in vars || {}) e.style.setProperty(k, vars[k]); L.appendChild(e); return e; };
      const R = (a, b) => a + Math.random() * (b - a);
      add("ph"); add("tint");
      if (a.fx === "motes") { add("beam"); for (let i = 0; i < (small ? 14 : 34); i++) add("mote", { "--s": R(2, 5) + "px", "--x": R(0, 100) + "%", "--y": R(0, 100) + "%", "--dx": R(-40, 40) + "px", "--dy": R(-60, 20) + "px", "--d": R(5, 11) + "s", "--dl": -R(0, 10) + "s" }); }
      if (a.fx === "steam") for (let i = 0; i < (small ? 3 : 6); i++) add("steam", { "--x": R(5, 85) + "%", "--dx": R(-80, 80) + "px", "--d": R(6, 10) + "s", "--dl": -R(0, 9) + "s" });
      if (a.fx === "bokeh") for (let i = 0; i < (small ? 7 : 16); i++) add("bokeh", { "--s": R(40, small ? 110 : 220) + "px", "--x": R(-5, 95) + "%", "--y": R(-5, 95) + "%", "--dx": R(-50, 50) + "px", "--dy": R(-50, 50) + "px", "--d": R(6, 12) + "s", "--dl": -R(0, 10) + "s" });
      if (a.fx === "breath") add("breath");
      if (a.fx === "sweep") add("sweep");
      add("vig"); add("burst"); add("grain");
      return L;
    },
    set(it, img) {
      this.clear(); const a = this.SETS[it.id] || this.SETS[it.look] || this.SETS[{ tense: "lavender", lost: "chamomile", won: "wood-chess", learn: "chess-book" }[(it.moods || [])[0]]]; if (!a) return;
      const r = $("result"); r.classList.add("atmo-on"); r.style.setProperty("--atmo-btn", a.btn);
      r.dataset.enter = a.enter;
      r.prepend(this.build(a, img, false));
      $("shop").prepend(this.build(a, img, true));
      if (!r.hidden) ResultFx.product(0);
    },
    clear() { const r = $("result"); r.classList.remove("atmo-on"); delete r.dataset.enter; r.querySelectorAll(".atmo").forEach(e => e.remove()); },
  };
  const Shop = {
    items: null, games: 0, lastShown: -9,
    LINES: {
      tense: [tr("ท่านครับ เกมนี้เครียดจัด พักแป๊บนึงก่อนดีไหมครับ"), tr("ผมเห็นท่านกำหมัดแน่นเลย ผ่อนคลายหน่อยครับ")],
      lost: [tr("แพ้ไม่เป็นไรครับท่าน ชาร์จพลังก่อนแล้วค่อยแก้มือ"), tr("ทหารยังต้องพัก ท่านก็เหมือนกันครับ")],
      won: [tr("ชนะสวยครับท่าน! ลองไปโชว์ฝีมือบนกระดานจริงไหม"), tr("เก่งขนาดนี้ ต้องมีกระดานจริงไว้ท้าเพื่อนแล้วครับ")],
      learn: [tr("อยากเก่งขึ้นอีก ผมมีของแนะนำครับท่าน")],
      stalemate: [tr("เกือบชนะแล้วครับท่าน! ฝึกปิดเกมอีกนิดนะครับ")],
    },
    async load() {
      if (this.items) return this.items;
      // Products come from the "Shop" tab of the score sheet (so they can be planned week by week); shop.json is the fallback.
      const fromSheet = async () => {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
        try { const d = await (await fetch(SHEET_URL + "?action=shop", { signal: ctl.signal })).json(); if (d && d.items && d.items.length) return d; } catch (e) {} finally { clearTimeout(t); }
        return null;
      };
      try { const d = (SHEET_URL && await fromSheet()) || await (await fetch("shop.json", { cache: "no-cache" })).json(); const today = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); // Bangkok date
        const ok = d.items.filter(i => i.url && i.affiliate && (!i.from || i.from <= today));
        this.items = ok.filter(i => !i.until || today <= i.until);
        // Nothing planned for this week (for a mood): keep showing the most recent lot that had it.
        for (const m of ["tense", "lost", "won", "learn"]) {
          if (this.items.some(i => i.moods.includes(m))) continue;
          const old = ok.filter(i => i.moods.includes(m)), top = old.reduce((a, i) => (i.from || "") > a ? i.from || "" : a, "");
          this.items.push(...old.filter(i => (i.from || "") === top && !this.items.includes(i)));
        }
      } catch (e) { this.items = []; }
      return this.items;
    },
    // How the game felt for this player: stress built up during the game, the result, and recent losses.
    mood() {
      const me = myColor(), o = G.over;
      if (!o) return null;
      // two players on one device: no "you", so suggest something for whoever played
      if (!me) return o.type === "draw" ? "learn" : "won";
      const stress = (G.stress && G.stress[me]) || 0;
      const lost = o.type !== "draw" && o.winner !== me;
      const streak = lsGet("chess-losses", 0);
      if (lost && (stress >= 40 || streak >= 2)) return "tense";
      if (lost) return "lost";
      if (stress >= 60) return "tense";
      if (o.type !== "draw") return "won";
      if (o.stalemate === me) return "stalemate";
      return "learn";
    },
    async after() {
      $("shop").hidden = true; Atmo.clear();
      const me = myColor(), o = G.over;
      if (!o || G.mode === "train") return;
      if (this.forceId) { const id = this.forceId; this.forceId = null; return this.showItem([...(await refPicks()), ...(await this.load())].find(i => i.id === id), "lost", true); }
      const lost = !!me && o.type !== "draw" && o.winner !== me;
      if (me) lsSet("chess-losses", lost ? lsGet("chess-losses", 0) + 1 : 0);
      this.games++;
      if (prefs.shop === "off" || LANG !== "th") return;
      const mood = this.mood();
      // After a loss or a tense game: every game. After a win or a draw: every other game.
      const gap = mood === "tense" || mood === "lost" ? 1 : 2;
      if (this.games - this.lastShown < gap) return;
      const want = mood === "stalemate" ? "learn" : mood;
      // A player who came through a friend's invite sees that friend's approved products first (for this mood, else any of them).
      // The game keeps a share of those showings for its own products (the platform fee, told to inviters on their page).
      const mine = Math.random() < HOUSE_SHARE ? [] : await refPicks();
      let pool = mine.length ? (mine.some(i => i.moods.includes(want)) ? mine.filter(i => i.moods.includes(want)) : mine) : (await this.load()).filter(i => i.moods.includes(want));
      if (pool.length > 1) pool = pool.filter(i => i.id !== this.lastId); // not the same product twice in a row
      if (!pool.length) return;
      this.lastShown = this.games;
      const it = pool[Math.floor(Math.random() * pool.length)]; this.lastId = it.id;
      return this.showItem(it, mood);
    },
    async showItem(it, mood, preview = false) {
      if (!it) return;
      // Wait for the photo (up to 4s) so the product never arrives as a placeholder and then jumps to the picture.
      let photo = null;
      if (it.img) {
        const im = new Image(); im.alt = ""; im.referrerPolicy = "no-referrer"; im.src = it.img;
        const ok = await Promise.race([im.decode().then(() => true, () => false), new Promise(r => setTimeout(r, 4000, false))]);
        if (ok) photo = im;
      }
      const want = mood === "stalemate" ? "learn" : mood, lines = this.LINES[mood];
      $("shopSay").textContent = lines[Math.floor(Math.random() * lines.length)];
      const ic = $("shopIc"); ic.textContent = photo ? "" : it.icon || "🛍️";
      if (photo) ic.appendChild(photo);
      $("shopTitle").textContent = it.title;
      $("shopNote").textContent = (it.notes && it.notes[want]) || it.note || "";
      $("shopItem").href = it.url;
      $("shopItem").onclick = () => track("shop_click", { item: it.id, mood, ref: it.ref || "" });
      $("shopAd").textContent = it.by ? "แนะนำโดย " + it.by + " เพื่อนที่ชวนคุณมาเล่น เขาอาจได้ค่าคอมมิชชันเมื่อคุณซื้อ"
        : it.affiliate ? tr("ลิงก์แนะนำสินค้า เราอาจได้ค่าคอมมิชชันเมื่อคุณซื้อ") : "";
      $("shop").hidden = false;
      Atmo.set(it, photo ? it.img : "");
      if (!preview) track("shop_view", { item: it.id, mood, ref: it.ref || "" });
    },
    // ?preview=<item id> shows the result screen with that product, to check how it looks. Nothing is recorded.
    preview(id) {
      lsSet("chess-tut", 1); this.forceId = id; prefs.mode = "cpu"; hide("menu"); newGame();
      G.reported = true; G.over = { type: "mate", winner: "b", text: "Checkmate." }; showResult();
    },
  };
  // Fetch the product list early so the tip is ready when a game ends.
  /* ---------- Recap: after a game, watch the replay video first; the share button is under it ---------- */
  const Recap = {
    url: null, of: null, thumb: null,
    open() {
      $("recapTitle").textContent = T("รีแคปเกมนี้", "Game recap");
      $("recapShare").textContent = T("แชร์", "Share"); $("recapClose").textContent = T("ปิด", "Close");
      show("recap"); track("recap", { opponent: G.mode });
      // the replay brings its own sound, so the after-game music steps aside
      musicDuck(true);
      this.fill();
    },
    src(b) { if (this.of !== b) { if (this.url) URL.revokeObjectURL(this.url); this.url = b ? URL.createObjectURL(b) : null; this.of = b; } return this.url; },
    fill() {
      if ($("recap").hidden) return;
      if (/debug/.test(location.search)) { let d = $("recapDbg"); if (!d) { d = document.createElement("pre"); d.id = "recapDbg"; d.style.cssText = "white-space:pre-wrap;font-size:11px;text-align:left;margin:0;max-height:30vh;overflow:auto"; $("recapTitle").after(d); } d.textContent = (Share.dbg || []).join("\n") || "(video not made yet)"; }
      const v = $("recapVid"), img = $("recapGif"), w = $("recapWait");
      if (Share.vidBlob) {
        img.hidden = true; w.hidden = true; v.hidden = false;
        if (v.getAttribute("src") !== this.src(Share.vidBlob)) v.src = this.url;
        v.currentTime = 0; v.muted = false;
        const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => {}); });
        return;
      }
      v.hidden = true;
      if (Share.gifBlob) { img.src = this.src(Share.gifBlob); img.hidden = false; }
      const vj = Share.vidJob, gj = Share.gifJob;
      w.hidden = !(vj || gj); w.textContent = T("กำลังทำวิดีโอ…", "Making the video…");
      if (!Share.gifBlob && gj) gj.then(() => { if (!Share.vidBlob && Share.gifBlob && !$("recap").hidden) { img.src = this.src(Share.gifBlob); img.hidden = false; } });
      if (vj) vj.then(() => { if (Share.vidBlob) this.fill(); else w.hidden = true; });
    },
    close() {
      const v = $("recapVid"); try { v.pause(); } catch (e) {}
      hide("recap");
      musicDuck(false);
    },
  };

  return { Share, ResultFx, Atmo, Shop, Recap };
}
