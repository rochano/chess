// @ts-nocheck
/* Online play, ported line for line from the original index.html ("Online: two devices, joined by a room code").
   The PeerJS link is replaced by a Firestore room (deps.netOpen); everything else keeps the original logic. */
export function create(deps) {
  const { G, prefs, T, tr, esc, track, sfx, startMusic, render, finish, setClock, closePromo, doMove, newGame, openMenu, startGame, netMsg, netOpen, qrcode } = deps;
  const opp = c => (c === "w" ? "b" : "w");
/* ---------- Online: two devices, joined by a room code ----------
   Uses PeerJS (WebRTC, peer to peer) with its free public signalling server.
   The host plays White. Moves, resignations and clock flags go over the link. */
const NET_PREFIX = "rochano-chess-";
const Net = {
  role: null, code: "", color: null, live: false, connected: false, link: null, peerName: "", lastSeen: 0, gen: 0, away: false, goneAt: 0, left: false,
  send(d) { if (this.link) try { this.link.send(d); } catch (e) {} },
};
// netMsg comes from deps (the menu shows it).
function myName() { return prefs.nameW.trim() || (Net.role === "host" ? "Player 1" : "Player 2"); }
function netHandlers(gen) {
  const mine = f => (...a) => { if (gen === Net.gen) f(...a); };
  return {
    open: mine(() => {
      netBack(); Net.lastSeen = Date.now();
      if (Net.role === "join") { Net.send({ t: "hello", name: myName() }); netMsg("Connected. Starting the game…"); }
      if (Net.live) render();
    }),
    data: mine(d => {
      Net.lastSeen = Date.now();
      if (!d || typeof d !== "object") return;
      if (d.t === "bye") { netLeft(); return; }
      if (d.t === "away") { netGone(true); return; }
      netBack();
      if (d.t === "hello" && Net.role === "host") { Net.peerName = String(d.name || "").slice(0, 24) || "Player 2"; Net.start(); }
      else if (d.t === "start" && Net.role === "join") startOnline("b", d.names, d.clock);
      else if (d.t === "move") netMove(d);
      else if ((d.t === "resign" || d.t === "flag") && G.mode === "online" && !G.over) {
        const loser = opp(Net.color);
        const over = d.t === "resign"
          ? { type: "resign", winner: Net.color, text: (loser === "w" ? "White" : "Black") + " resigned. " + (Net.color === "w" ? "White" : "Black") + " wins." }
          : { type: "flag", winner: Net.color, text: (loser === "w" ? "White" : "Black") + " ran out of time. " + (Net.color === "w" ? "White" : "Black") + " wins." };
        if (d.t === "flag") setClock(loser, 0);
        finish(over);
      } else if (d.t === "again" && Net.role === "host") Net.start();
      else if (d.t === "claim" && G.mode === "online" && (!G.over || (G.over.type === "abandon" && G.st.turn === Net.color && G.over.winner === Net.color))) {
        finish({ type: "abandon", winner: opp(Net.color), text: "You were away too long, so " + (Net.color === "w" ? "Black" : "White") + " was given the win." });
      }
    }),
    close: mine(() => { if (Net.live) netGone(false); else { Net.connected = false; netMsg("The connection closed. Create or join a room again.", true); } }),
    error: mine(e => {
      if (e && e.type === "peer-unavailable") netMsg("No room with code <b>" + esc(Net.code) + "</b>. Check the code and try again.", true);
      else if (!Net.live) netMsg("Connection problem (" + esc((e && e.type) || "unknown") + "). Try again.", true);
    }),
  };
}
function roomCode() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let c = ""; for (let k = 0; k < 5; k++) c += a[Math.floor(Math.random() * a.length)]; return c; }
function roomLink(code) { return location.origin + location.pathname + "?room=" + code; }
// QR for the room link: the friend scans it with the phone camera and lands straight in the room (?room=CODE joins on load).
function qrSvg(text) {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(); let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" role="img" aria-label="QR"><path d="${d}" fill="#1a1a1a"/></svg>`;
}
Net.host = async function () {
  track("online_room", { action: "create" });
  Net.leave(); const gen = ++Net.gen;
  Net.role = "host"; netMsg("Creating a room…");
  for (let tries = 0; tries < 3; tries++) {
    const code = roomCode();
    try {
      const link = await netOpen("host", code, netHandlers(gen));
      if (gen !== Net.gen) { link.close(); return; }
      Net.link = link; Net.code = code;
      const msg = qr => `<div class="qrbox"><div class="qr" id="roomQR">${qr}</div><div style="display:grid;gap:6px"><span>${T("ให้เพื่อนสแกน QR ด้วยกล้องมือถือ เข้าห้องได้ทันที", "Your friend scans this with their phone camera and joins right away.")}</span><span>${T("รหัสห้อง", "Room code")}</span><span class="code">${code}</span></div></div><span>${T("หรือส่งรหัส/ลิงก์ให้เพื่อน เกมเริ่มเมื่อเพื่อนเข้าห้อง คุณเล่นฝ่ายขาว", "Or send the code or link. The game starts when they join. You play White.")}</span><span class="acts"><button class="chip" id="copyLink">${T("คัดลอกลิงก์", "Copy link")}</button>${navigator.share ? '<button class="chip" id="shareLink">Share</button>' : ""}</span>`;
      netMsg(msg("…"));
      try { const q = qrSvg(roomLink(code)); if (Net.code === code && !Net.live) netMsg(msg(q)); } catch (e) { netMsg(msg(T("โหลด QR ไม่ได้", "QR unavailable"))); }
      return;
    } catch (e) {
      if (gen !== Net.gen) return;
      if (!e || e.type !== "unavailable-id") { netMsg("Couldn't create a room (" + esc((e && e.type) || "network") + "). Check your connection and try again.", true); Net.role = null; return; }
    }
  }
};
Net.join = async function (code) {
  track("online_room", { action: "join" });
  code = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) { netMsg("Type the room code your friend sent you.", true); return; }
  Net.leave(); const gen = ++Net.gen;
  Net.role = "join"; Net.code = code; netMsg("Joining room <b>" + esc(code) + "</b>…");
  try {
    const link = await netOpen("join", code, netHandlers(gen));
    if (gen !== Net.gen) { link.close(); return; }
    Net.link = link;
  } catch (e) {
    if (gen === Net.gen) { netMsg("Couldn't connect (" + esc((e && e.type) || "network") + "). Check your connection and try again.", true); Net.role = null; }
  }
};
Net.start = function () {
  const names = { w: myName(), b: Net.peerName || "Player 2" };
  startOnline("w", names, prefs.clock);
  Net.send({ t: "start", names, clock: prefs.clock });
};
Net.again = function () { if (Net.left) { goneBox(`<b>Your opponent left the room</b><span>Leave the room to start a new one.</span>` + goneActs(false)); return; } if (Net.role === "host") Net.start(); else { Net.send({ t: "again" }); goneBox(`<b>${tr("Asked your opponent for a new game…")}</b>`); setTimeout(() => { if (!Net.live || G.over) return; goneBox(null); }, 100); } };
Net.leave = function () {
  if (Net.link) { Net.send({ t: "bye" }); const l = Net.link; setTimeout(() => l.close(), 150); }
  Net.gen++; Net.link = null; Net.role = null; Net.color = null; Net.live = false; Net.connected = false; Net.peerName = "";
  Net.away = false; Net.goneAt = 0; Net.left = false; goneBox(null);
  netMsg("");
};
/* ---------- Opponent left or dropped ----------
   "bye" means they left on purpose (Leave, closed or reloaded the page): the game is theirs to lose at once.
   Silence or a closed link may be a bad network, so they get a minute (two if they only switched apps) to come back before the win is awarded. */
// If both devices lost each other, the one waiting for a move gets there first; the other side concedes on reconnect.
const netGrace = () => (Net.away ? 120000 : 60000) * (G.st.turn === Net.color ? 2 : 1);
function goneBox(html) {
  let el = document.getElementById("netGone");
  if (!html) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement("div"); el.id = "netGone"; el.className = "netgone"; el.setAttribute("role", "alert"); document.body.appendChild(el); }
  el.innerHTML = html; el.hidden = false;
}
function goneActs(claim) {
  return `<span class="acts">${claim ? '<button class="chip" data-g="claim">Claim the win</button>' : ""}<button class="chip" data-g="leave">Leave the room</button><button class="chip" data-g="ok">OK</button></span>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("#netGone [data-g]");
  if (!b) return;
  if (b.dataset.g === "claim") netAbandon();
  else if (b.dataset.g === "leave") { Net.leave(); newGame(); openMenu(); }
  else goneBox(null);
});
function netWinText() { const w = Net.color, l = opp(w); return (l === "w" ? "White" : "Black") + " left the game. " + (w === "w" ? "White" : "Black") + " wins."; }
function netAbandon() {
  goneBox(null);
  if (G.mode !== "online" || G.over || !Net.color) return;
  Net.send({ t: "claim" }); // reaches them if they come back
  finish({ type: "abandon", winner: Net.color, text: netWinText() });
}
// They left on purpose.
function netLeft() {
  Net.connected = false; Net.left = true; Net.away = false;
  if (!Net.live) { netMsg("Your friend left the room.", true); return; }
  const name = esc(G.names[opp(Net.color)] || "Your opponent");
  if (!G.over && G.history.length) { netAbandon(); goneBox(`<b>${name} left the game</b><span>You win by default. Leave the room to play someone else.</span>` + goneActs(false)); return; }
  if (!G.over) { G.over = { type: "draw", winner: null, text: "Your opponent left before the first move." }; render(); }
  else render();
  goneBox(`<b>${name} left the room</b><span>They can't play again here. Leave the room to start a new one.</span>` + goneActs(false));
}
// They went quiet: app switched, screen locked or network dropped.
function netGone(away) {
  if (Net.left) return;
  const first = Net.connected || !Net.goneAt;
  Net.connected = false; Net.away = !!away;
  if (first) Net.goneAt = Date.now();
  if (Net.live) { render(); goneTick(); }
}
function netBack() {
  if (Net.connected && !Net.goneAt) return;
  const was = !Net.connected && Net.goneAt;
  Net.connected = true; Net.away = false; Net.left = false; Net.goneAt = 0;
  if (!Net.live) return;
  render();
  if (G.over && G.over.type === "abandon" && G.over.winner === Net.color) { Net.send({ t: "claim" }); return; }
  if (was) {
    goneBox(`<b>${esc(G.names[opp(Net.color)] || "Your opponent")} is back</b><span>The game carries on.</span>`);
    setTimeout(() => { if (Net.connected && !Net.goneAt) goneBox(null); }, 2500);
  }
}
function goneTick() {
  if (!Net.live || Net.connected || Net.left || !Net.goneAt) return;
  const name = esc(G.names[opp(Net.color)] || "Your opponent");
  if (G.over && G.over.type === "abandon") return;
  if (G.over) { goneBox(`<b>${name} is offline</b><span>The game is finished. Wait for them or leave the room.</span>` + goneActs(false)); return; }
  const left = Math.max(0, netGrace() - (Date.now() - Net.goneAt)), secs = Math.ceil(left / 1000);
  if (!left) { netAbandon(); goneBox(`<b>${name} didn't come back</b><span>You win because your opponent left the game.</span>` + goneActs(false)); return; }
  const what = Net.away ? "switched away from the game" : "lost connection";
  goneBox(`<b>${name} ${what}</b><span>Clocks are paused. If they're not back in ${secs} s, you win.</span><span class="bar"><i style="transform:scaleX(${left / netGrace()})"></i></span>` + goneActs(true));
}
function startOnline(color, names, clock) {
  track("game_start", { opponent: "online", role: Net.role || "", clock: String(clock) });
  Net.color = color; Net.live = true; Net.connected = true;
  Net.away = false; Net.goneAt = 0; Net.left = false; goneBox(null);
  startGame(color, { w: String(names.w || "Player 1").slice(0, 24), b: String(names.b || "Player 2").slice(0, 24) }, /^(0|\d+\+\d+)$/.test(clock) ? clock : "5+0");
  sfx.move(); startMusic();
}
function netMove(d) {
  if (G.mode !== "online" || G.over || G.st.turn === Net.color) return;
  if (d.n !== G.history.length) return;
  const m = G.moves.find(x => x.from === d.from && x.to === d.to && (x.promo || "") === (d.promo || ""));
  if (!m) return;
  closePromo();
  doMove(m);
  if (G.tc && typeof d.clock === "number") setClock(opp(Net.color), d.clock);
}
// Keep-alive: notice when the other device goes quiet.
setInterval(() => {
  if (!Net.link) return;
  if (!document.hidden) Net.send({ t: "ping" });
  if (Net.live && Net.connected && Date.now() - Net.lastSeen > 40000) netGone(false);
}, 3000);
setInterval(goneTick, 1000);
// Tell the other device when this one leaves or is put in the background.
addEventListener("pagehide", () => { if (Net.link) Net.send({ t: "bye" }); });
document.addEventListener("visibilitychange", () => {
  if (!Net.link) return;
  if (document.hidden) Net.send({ t: "away" });
  else { Net.send({ t: "ping" }); if (Net.live && Net.connected) Net.lastSeen = Math.max(Net.lastSeen, Date.now() - 30000); }
});
  // Copy / Share buttons live in the room box the menu draws from netMsg.
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("#copyLink, #shareLink"); if (!b || !Net.code) return;
    const code = Net.code;
    if (b.id === "shareLink") { navigator.share({ title: "Chess Game", text: tr("มาเล่นหมากรุกกัน รหัสห้อง ") + code, url: roomLink(code) }).catch(() => {}); return; }
    const done = () => { b.textContent = T("คัดลอกแล้ว", "Link copied"); };
    try { navigator.clipboard.writeText(roomLink(code)).then(done, () => prompt("Copy this link", roomLink(code))); } catch (e) { prompt("Copy this link", roomLink(code)); }
  });
  return { Net, goneBox };
}
