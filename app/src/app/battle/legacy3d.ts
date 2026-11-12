// @ts-nocheck -- the 3D battlefield, intro scenes and hover card, ported line for line from the original game.
/* eslint-disable */
/*
 * Runs on three.js (window.THREE, set by BattleService before this module loads). Game state and helpers come in
 * through create(deps) under the same names the original code used (G, prefs, sfx, tr...), so the scene code is
 * unchanged. The Angular side talks to it through the returned { Battle, Intro, PieceTip }.
 */
export function create(deps) {
  const { G, prefs, savePrefs, onSquare, render, tr, T, LANG, myColor, track, esc, anyOverlay, hide, $,
    applyMove, inCheck, kingSq, legalMoves, fromFEN, GLYPH, NAME, sqName,
    ctx, env, splay, orchLoad, musicLevel, mv, al, sfx, A } = deps;
  const PieceTip = (() => {
    const INFO = {
      K: { th: tr("คิง (ราชา)"), pts: tr("ประเมินค่าไม่ได้"), how: tr("เดินได้ 1 ช่องทุกทิศทาง ห้ามเดินเข้าช่องที่โดนโจมตี โดนรุกฆาตคือแพ้"), extra: tr("เข้าป้อม (castling) ได้ถ้ายังไม่เคยเดิน") },
      Q: { th: tr("ควีน (ราชินี)"), pts: tr("9 แต้ม"), how: tr("เดินตรงและเฉียงกี่ช่องก็ได้ ทั้ง 8 ทิศ จนกว่าจะชนตัวอื่น"), extra: tr("ตัวที่แรงที่สุดบนกระดาน") },
      R: { th: tr("เรือ"), pts: tr("5 แต้ม"), how: tr("เดินตรง หน้า หลัง ซ้าย ขวา กี่ช่องก็ได้ จนกว่าจะชนตัวอื่น"), extra: tr("แรงมากตอนท้ายเกมและบนแถวที่โล่ง") },
      B: { th: tr("บิชอป (โคน)"), pts: tr("3 แต้ม"), how: tr("เดินเฉียงกี่ช่องก็ได้ จนกว่าจะชนตัวอื่น"), extra: tr("อยู่บนช่องสีเดิมตลอดเกม") },
      N: { th: tr("ไนท์ (ม้า)"), pts: tr("3 แต้ม"), how: tr("เดินเป็นรูปตัว L: ตรง 2 ช่องแล้วเลี้ยว 1 ช่อง"), extra: tr("ตัวเดียวที่กระโดดข้ามตัวอื่นได้") },
      P: { th: tr("เบี้ย"), pts: tr("1 แต้ม"), how: tr("เดินหน้า 1 ช่อง (ก้าวแรกเดินได้ 2 ช่อง) กินเฉียงไปข้างหน้า 1 ช่อง"), extra: tr("เดินถึงแถวสุดท้ายแล้วเลื่อนขั้นเป็นตัวอื่นได้ (ส่วนใหญ่เป็นควีน)") },
    };
    const DIRS = { K: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]], Q: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]], R: [[-1,0],[1,0],[0,-1],[0,1]], B: [[-1,-1],[-1,1],[1,-1],[1,1]] };
    // A 5x5 picture of the move pattern, with the piece in the middle and "forward" pointing up.
    function mini(t, color) {
      const cell = {};
      if (t === "N") for (const [r, c] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) cell[r + "," + c] = "go";
      else if (t === "P") { cell["-1,0"] = "go"; cell["-2,0"] = "go"; cell["-1,-1"] = "cap"; cell["-1,1"] = "cap"; }
      else for (const [dr, dc] of DIRS[t]) for (let k = 1; k <= (t === "K" ? 1 : 2); k++) cell[dr * k + "," + dc * k] = t === "K" ? "go" : "far";
      let h = "";
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++)
        h += !r && !c ? `<i class="me"><span class="pc ${color}" style="font-size:13px">${GLYPH[t]}</span></i>` : `<i class="${cell[r + "," + c] || ""}"></i>`;
      return `<div class="mini" aria-hidden="true">${h}</div>`;
    }
    let el = null, at = -1, timer = 0;
    function body(sq) {
      const p = G.st.board[sq], t = p[1], info = INFO[t];
      let now = "";
      if (G.st.turn === p[0] && !G.over) {
        const n = G.moves.filter(m => m.from === sq), caps = n.filter(m => G.st.board[m.to] || m.ep).length;
        now = n.length ? tr("ตอนนี้เดินได้ ") + n.length + tr(" ทาง") + (caps ? tr(" (กินได้ ") + caps + ")" : "") : tr("ตอนนี้ยังเดินไม่ได้");
      }
      return `<div>${mini(t, p[0])}</div><div><h4>${info.th} <small>${LANG === "th" ? NAME[t][0].toUpperCase() + NAME[t].slice(1) + " · " : ""}${p[0] === "w" ? tr("ขาว") : tr("ดำ")} · ${sqName(sq)}</small></h4>
        <p>${info.how}</p><p>${info.extra}</p><span class="pts">${info.pts}</span>${now ? `<p class="now">${now}</p>` : ""}</div>`;
    }
    function place(x, y) {
      const w = el.offsetWidth, h = el.offsetHeight, pad = 14;
      let left = x + pad, top = y + pad;
      if (left + w > innerWidth - 8) left = x - w - pad;
      if (top + h > innerHeight - 8) top = y - h - pad;
      el.style.left = Math.max(8, left) + "px"; el.style.top = Math.max(8, top) + "px";
    }
    function show(sq, x, y) {
      if (sq < 0 || !G.st.board[sq] || anyOverlay()) return hide();
      if (!el) { el = document.createElement("div"); el.className = "ptip"; el.setAttribute("role", "tooltip"); el.hidden = true; document.body.appendChild(el); }
      if (sq !== at) {
        at = sq; clearTimeout(timer);
        el.hidden = true;
        // A short pause, so sweeping the mouse across the board does not flash cards.
        timer = setTimeout(() => { if (at !== sq) return; el.innerHTML = body(sq); el.hidden = false; place(x, y); }, 250);
        return;
      }
      if (!el.hidden) place(x, y);
    }
    function hide() { at = -1; clearTimeout(timer); if (el) el.hidden = true; }
    return { show, hide };
  })();

  /* ---------- Battle view: a 3D battlefield with a third-person camera ---------- */
  const Battle = (() => {
    const T = window.THREE;
    const api = { active: false, ok: !!T, follow: true, refresh() {}, animate() {}, setActive() {} };
    if (!T) return api;

    let renderer, scene, camera, wrap, canvas, raf = 0, last = 0;
    let tiles = [], pieces = new Map(), snapshot = null, anims = [], bursts = [], marks = [];
    let embers, torches = [], banners = [], checkLight, shake = 0, boomFlash, boomGeo, boomMats;
    const orbit = { yaw: 0, pitch: 0.58, dist: 10.5, targetYaw: 0 };
    const camPos = new T.Vector3(0, 5, 10), camLook = new T.Vector3();
    let followUntil = 0, followMesh = null, followDir = new T.Vector3(0, 0, -1), focusPt = null;

    const sqPos = i => new T.Vector3((i & 7) - 3.5, 0.1, (i >> 3) - 3.5);
    const HEIGHT = { P: 0.62, R: 0.8, N: 0.85, B: 0.95, Q: 1.08, K: 1.18 };
    const PROFILES = {
      P: [[0,0],[.34,0],[.34,.07],[.27,.12],[.2,.16],[.13,.32],[.12,.36],[.21,.39],[.12,.43],[.17,.49],[.18,.55],[.14,.62],[.06,.66],[0,.67]],
      R: [[0,0],[.37,0],[.37,.08],[.29,.13],[.23,.18],[.21,.56],[.29,.61],[.29,.8],[.2,.8],[.2,.74],[0,.74]],
      B: [[0,0],[.35,0],[.35,.07],[.27,.12],[.2,.17],[.12,.52],[.21,.56],[.12,.6],[.18,.7],[.19,.8],[.11,.92],[.03,.98],[0,1]],
      Q: [[0,0],[.38,0],[.38,.08],[.29,.13],[.22,.18],[.13,.62],[.23,.67],[.14,.71],[.25,.93],[.18,.96],[.08,1.01],[0,1.03]],
      K: [[0,0],[.38,0],[.38,.08],[.29,.13],[.22,.18],[.14,.66],[.24,.71],[.15,.75],[.23,.96],[.2,.99],[0,1]],
      N: [[0,0],[.36,0],[.36,.08],[.28,.13],[.24,.2],[.26,.27],[0,.27]],
    };
    const geoCache = {};
    function pieceGroup(p) {
      const t = p[1], white = p[0] === "w";
      const mat = new T.MeshStandardMaterial(white
        ? { color: 0xEFE4CC, roughness: 0.42, metalness: 0.08 }
        : { color: 0x26282E, roughness: 0.32, metalness: 0.35 });
      const g = new T.Group();
      if (!geoCache[t]) geoCache[t] = new T.LatheGeometry(PROFILES[t].map(([x, y]) => new T.Vector2(x, y)), 28);
      const body = new T.Mesh(geoCache[t], mat); g.add(body);
      if (t === "N") {
        if (!geoCache.Nhead) {
          const s = new T.Shape();
          [[-.2,0],[.22,0],[.2,.18],[.3,.42],[.32,.6],[.24,.74],[.06,.8],[-.04,.74],[-.3,.56],[-.33,.45],[-.18,.41],[-.06,.47],[-.13,.28],[-.2,0]]
            .forEach(([x, y], k) => (k ? s.lineTo(x, y) : s.moveTo(x, y)));
          geoCache.Nhead = new T.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
          geoCache.Nhead.translate(0, 0, -0.1);
        }
        const head = new T.Mesh(geoCache.Nhead, mat);
        head.position.y = 0.24; head.rotation.y = white ? -Math.PI / 2 : Math.PI / 2;
        g.add(head);
      }
      if (t === "R") for (let k = 0; k < 4; k++) {
        const m = new T.Mesh(new T.BoxGeometry(0.11, 0.1, 0.11), mat);
        const a = k * Math.PI / 2 + Math.PI / 4; m.position.set(Math.cos(a) * 0.21, 0.84, Math.sin(a) * 0.21); g.add(m);
      }
      if (t === "K") {
        const v = new T.Mesh(new T.BoxGeometry(0.07, 0.26, 0.07), mat); v.position.y = 1.12; g.add(v);
        const h = new T.Mesh(new T.BoxGeometry(0.2, 0.07, 0.07), mat); h.position.y = 1.15; g.add(h);
      }
      if (t === "Q") {
        const ball = new T.Mesh(new T.SphereGeometry(0.07, 12, 10), mat); ball.position.y = 1.08; g.add(ball);
        for (let k = 0; k < 8; k++) {
          const sp = new T.Mesh(new T.ConeGeometry(0.035, 0.12, 6), mat), a = k * Math.PI / 4;
          sp.position.set(Math.cos(a) * 0.2, 0.98, Math.sin(a) * 0.2); g.add(sp);
        }
      }
      if (t === "B") { const ball = new T.Mesh(new T.SphereGeometry(0.045, 10, 8), mat); ball.position.y = 1.02; g.add(ball); }
      // Team ring at the base so the two armies read at a glance in low light.
      const ring = new T.Mesh(new T.TorusGeometry(0.36, 0.025, 8, 32),
        new T.MeshStandardMaterial({ color: white ? 0xF5C344 : 0xD0453A, emissive: white ? 0x7A5A10 : 0x6A1010, roughness: 0.5 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; g.add(ring);
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.userData.piece = p;
      return g;
    }

    function canvasTex(w, h, draw, repeat) {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      draw(c.getContext("2d"), w, h);
      const tex = new T.CanvasTexture(c);
      if (repeat) { tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(repeat, repeat); }
      return tex;
    }

    function build() {
      wrap = $("battle");
      canvas = $("battleCanvas");
      renderer = new T.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputEncoding = T.sRGBEncoding;
      scene = new T.Scene();
      scene.background = canvasTex(4, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#151c33"); gr.addColorStop(0.45, "#4b3550"); gr.addColorStop(0.75, "#b4583a"); gr.addColorStop(1, "#e69a52");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      scene.fog = new T.Fog(0x3b2a30, 12, 36);
      camera = new T.PerspectiveCamera(48, 1, 0.1, 200);

      scene.add(new T.HemisphereLight(0xffcfa0, 0x1e1826, 0.55));
      const sun = new T.DirectionalLight(0xffb070, 1.05);
      sun.position.set(-7, 9, 5); sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
      scene.add(sun);

      // Scorched ground
      const groundTex = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = "#2b261d"; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 900; k++) {
          const v = Math.random();
          g.fillStyle = v < 0.5 ? "rgba(70,62,40,0.5)" : v < 0.8 ? "rgba(30,26,20,0.5)" : "rgba(95,80,50,0.4)";
          const r = 2 + Math.random() * 9; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill();
        }
      }, 18);
      const ground = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

      // Stone plinth and tiles
      const plinth = new T.Mesh(new T.BoxGeometry(9.2, 0.35, 9.2), new T.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.9 }));
      plinth.position.y = -0.12; plinth.receiveShadow = true; plinth.castShadow = true; scene.add(plinth);
      const stone = (base) => canvasTex(64, 64, (g, w, h) => {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      });
      const lightMat = () => new T.MeshStandardMaterial({ map: stone("#d8c7a0"), roughness: 0.85 });
      const darkMat = () => new T.MeshStandardMaterial({ map: stone("#4a3628"), roughness: 0.85 });
      const tileGeo = new T.BoxGeometry(0.97, 0.12, 0.97);
      for (let i = 0; i < 64; i++) {
        const dark = ((i >> 3) + (i & 7)) % 2 === 1;
        const m = new T.Mesh(tileGeo, dark ? darkMat() : lightMat());
        m.position.copy(sqPos(i)).setY(0.0); m.receiveShadow = true; m.userData.sq = i;
        scene.add(m); tiles.push(m);
      }

      // File and rank letters carved on the plinth edge
      const label = (txt) => {
        const tex = canvasTex(64, 64, (g) => { g.fillStyle = "#f3e2b8"; g.font = "bold 44px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 32, 34); });
        const m = new T.Mesh(new T.PlaneGeometry(0.35, 0.35), new T.MeshBasicMaterial({ map: tex, transparent: true }));
        m.rotation.x = -Math.PI / 2; return m;
      };
      for (let c = 0; c < 8; c++) {
        for (const z of [4.32, -4.32]) { const l = label("abcdefgh"[c]); l.position.set(c - 3.5, 0.07, z); if (z < 0) l.rotation.z = Math.PI; scene.add(l); }
      }
      for (let r = 0; r < 8; r++) {
        for (const x of [-4.32, 4.32]) { const l = label(String(8 - r)); l.position.set(x, 0.07, r - 3.5); scene.add(l); }
      }

      // Props: rocks, dead trees, torches and banners
      const rockMat = new T.MeshStandardMaterial({ color: 0x5d5448, roughness: 1, flatShading: true });
      const barkMat = new T.MeshStandardMaterial({ color: 0x2c2018, roughness: 1 });
      for (let k = 0; k < 70; k++) {
        const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * 26;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (Math.random() < 0.65) {
          const r = new T.Mesh(new T.DodecahedronGeometry(0.3 + Math.random() * 0.9, 0), rockMat);
          r.position.set(x, 0.1, z); r.rotation.set(Math.random(), Math.random(), Math.random()); r.castShadow = true; scene.add(r);
        } else {
          const tr = new T.Group();
          const trunk = new T.Mesh(new T.CylinderGeometry(0.08, 0.16, 2.6, 6), barkMat); trunk.position.y = 1.3; tr.add(trunk);
          for (let b = 0; b < 3; b++) {
            const br = new T.Mesh(new T.CylinderGeometry(0.03, 0.06, 1.1, 5), barkMat);
            br.position.y = 1.6 + b * 0.35; br.rotation.z = (Math.random() - 0.5) * 1.8; br.rotation.y = Math.random() * 6; tr.add(br);
          }
          tr.position.set(x, 0, z); tr.traverse(o => o.isMesh && (o.castShadow = true)); scene.add(tr);
        }
      }
      const flameMat = new T.MeshBasicMaterial({ color: 0xffa040 });
      for (const [x, z] of [[-4.9, -4.9], [4.9, -4.9], [-4.9, 4.9], [4.9, 4.9]]) {
        const post = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 1.4, 6), barkMat); post.position.set(x, 0.7, z); post.castShadow = true; scene.add(post);
        const flame = new T.Mesh(new T.ConeGeometry(0.12, 0.35, 8), flameMat); flame.position.set(x, 1.55, z); scene.add(flame);
        const light = new T.PointLight(0xff8a3a, 0.9, 7, 2); light.position.set(x, 1.7, z); scene.add(light);
        torches.push({ flame, light, seed: Math.random() * 10 });
      }
      for (const [z, color] of [[6.4, 0xE8C25A], [-6.4, 0xB0302A]]) {
        for (const x of [-3, 3]) {
          const pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 3.2, 6), barkMat); pole.position.set(x, 1.6, z); pole.castShadow = true; scene.add(pole);
          const flag = new T.Mesh(new T.PlaneGeometry(1.1, 0.7, 10, 1), new T.MeshStandardMaterial({ color, side: T.DoubleSide, roughness: 0.8 }));
          flag.position.set(x + 0.58, 2.8, z); flag.castShadow = true; scene.add(flag);
          banners.push(flag);
        }
      }

      // Drifting embers
      const n = 260, pos = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { pos[k * 3] = (Math.random() - 0.5) * 30; pos[k * 3 + 1] = Math.random() * 6; pos[k * 3 + 2] = (Math.random() - 0.5) * 30; }
      const eg = new T.BufferGeometry(); eg.setAttribute("position", new T.BufferAttribute(pos, 3));
      embers = new T.Points(eg, new T.PointsMaterial({ color: 0xffa050, size: 0.07, transparent: true, opacity: 0.8 }));
      scene.add(embers);

      checkLight = new T.PointLight(0xff2a2a, 0, 3, 2); scene.add(checkLight);
      // Explosion parts share one box and three materials, and the flash is a light that is always there:
      // adding a light or a new material mid-game makes the GPU recompile shaders, which shows as a stutter.
      boomFlash = new T.PointLight(0xffb060, 0, 6, 2); scene.add(boomFlash);
      boomGeo = new T.BoxGeometry(1, 1, 1);
      boomMats = [new T.MeshBasicMaterial({ color: 0xffa040 }), new T.MeshBasicMaterial({ color: 0xff5a20 }), new T.MeshStandardMaterial({ color: 0x333333 })];
      for (const m of boomMats) { const w = new T.Mesh(boomGeo, m); w.position.set(0, -6, 0); w.scale.setScalar(0.01); scene.add(w); }

      bindControls();
      window.addEventListener("resize", resize);
    }

    function resize() {
      if (!renderer) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }

    /* --- pieces --- */
    function clearPieces() { for (const m of pieces.values()) scene.remove(m); pieces.clear(); }
    function rebuild() {
      clearPieces();
      G.st.board.forEach((p, i) => {
        if (!p) return;
        const m = pieceGroup(p); m.position.copy(sqPos(i)); m.userData.sq = i; scene.add(m); pieces.set(i, m);
      });
      anims = []; snapshot = G.st.board.slice();
    }

    function animate(m, prev) {
      if (!api.active) return;
      if (!snapshot || snapshot.join() !== prev.board.join()) rebuild();
      const mover = pieces.get(m.from);
      if (!mover) { rebuild(); return; }
      const now = performance.now();
      const isKnight = prev.board[m.from][1] === "N";
      const capSq = m.ep ? m.to + (prev.board[m.from][0] === "w" ? 8 : -8) : prev.board[m.to] ? m.to : -1;
      const victim = capSq >= 0 ? pieces.get(capSq) : null;
      pieces.delete(m.from); if (capSq >= 0) pieces.delete(capSq);
      const dur = isKnight ? 650 : 420 + Math.min(5, Math.hypot((m.to & 7) - (m.from & 7), (m.to >> 3) - (m.from >> 3))) * 70;
      anims.push({ mesh: mover, from: sqPos(m.from), to: sqPos(m.to), t0: now, dur, arc: isKnight ? 0.9 : 0.18, victim, promo: m.promo ? prev.board[m.from][0] + m.promo : null, sq: m.to });
      pieces.set(m.to, mover); mover.userData.sq = m.to;
      if (m.castle) {
        const rf = m.castle === "K" ? m.to + 1 : m.to - 2, rt = m.castle === "K" ? m.to - 1 : m.to + 1;
        const rook = pieces.get(rf);
        if (rook) { pieces.delete(rf); pieces.set(rt, rook); rook.userData.sq = rt; anims.push({ mesh: rook, from: sqPos(rf), to: sqPos(rt), t0: now + 150, dur: 450, arc: 0.18 }); }
      }
      snapshot = applyMove(prev, m).board.slice();
      if (api.follow) {
        followMesh = mover; followUntil = now + dur + 700;
        followDir.copy(sqPos(m.to)).sub(sqPos(m.from)).setY(0);
        if (followDir.lengthSq() < 1e-6) followDir.set(0, 0, prev.turn === "w" ? -1 : 1);
        followDir.normalize();
      }
    }

    function explode(pos, mesh) {
      scene.remove(mesh);
      const flash = boomFlash; flash.position.copy(pos).setY(0.8); flash.intensity = 4;
      const parts = [];
      for (let k = 0; k < 26; k++) {
        const s = 0.05 + Math.random() * 0.09;
        const p = new T.Mesh(boomGeo, boomMats[k % 3]); p.userData.s = s; p.scale.setScalar(s);
        p.position.copy(pos).setY(0.4);
        const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3;
        p.userData.v = new T.Vector3(Math.cos(a) * sp, 2.5 + Math.random() * 3.5, Math.sin(a) * sp);
        scene.add(p); parts.push(p);
      }
      bursts.push({ parts, flash, t0: performance.now() });
      shake = 0.35;
      sfx.boom && sfx.boom();
    }

    /* --- highlights --- */
    const markGeo = new T.PlaneGeometry(0.94, 0.94), dotGeo = new T.CircleGeometry(0.13, 20), ringGeo = new T.RingGeometry(0.34, 0.44, 32);
    function mark(i, geo, color, opacity) {
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.copy(sqPos(i)).setY(0.065); scene.add(m); marks.push(m);
    }
    function arrow(a, b, color) {
      const p = sqPos(a), q = sqPos(b), dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz);
      const s = new T.Shape(), w = 0.09, hw = 0.27, hl = 0.4, e = L - 0.12;
      s.moveTo(0.2, -w); s.lineTo(e - hl, -w); s.lineTo(e - hl, -hw); s.lineTo(e, 0); s.lineTo(e - hl, hw); s.lineTo(e - hl, w); s.lineTo(0.2, w); s.closePath();
      const m = new T.Mesh(new T.ShapeGeometry(s), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: T.DoubleSide }));
      m.rotation.order = "YXZ"; m.rotation.y = Math.atan2(-dz, dx); m.rotation.x = -Math.PI / 2;
      m.position.set(p.x, 0.09, p.z); scene.add(m); marks.push(m);
    }
    function refreshMarks() {
      for (const m of marks) scene.remove(m);
      marks = [];
      if (G.last) { mark(G.last.from, markGeo, 0xF5C344, 0.28); mark(G.last.to, markGeo, 0xF5C344, 0.35); }
      if (G.hint) { mark(G.hint.from, markGeo, 0x7DB35A, 0.5); mark(G.hint.to, markGeo, 0x7DB35A, 0.5); }
      if (G.stuck) for (const f of new Set(G.moves.map(m => m.from))) mark(f, ringGeo, 0x4FB3D9, 0.95);
      if (G.look) for (const f of G.look) mark(f, ringGeo, 0xE07A3E, 0.95);
      if (G.arrows) for (const [a, b] of G.arrows) arrow(a, b, 0xE07A3E);
      if (G.selected !== null) {
        mark(G.selected, markGeo, 0xFFD24A, 0.6);
        for (const mv of G.moves) if (mv.from === G.selected) {
          const take = G.st.board[mv.to] || mv.ep;
          mark(mv.to, take ? ringGeo : dotGeo, take ? 0xff4a3a : 0xfff0c8, 0.85);
        }
      }
      const k = inCheck(G.st.board, G.st.turn) ? kingSq(G.st.board, G.st.turn) : -1;
      if (k >= 0) { mark(k, ringGeo, 0xff2a2a, 0.9); checkLight.position.copy(sqPos(k)).setY(1); checkLight.intensity = 2; }
      else checkLight.intensity = 0;
    }

    /* --- camera and input --- */
    function bindControls() {
      const ptrs = new Map();
      let down = null, pinch0 = 0, dist0 = 0, moved = false;
      canvas.addEventListener("pointerdown", e => {
        canvas.setPointerCapture(e.pointerId);
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 1) { down = { x: e.clientX, y: e.clientY, yaw: orbit.targetYaw, pitch: orbit.pitch }; moved = false; }
        if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = orbit.dist; moved = true; }
      });
      canvas.addEventListener("pointerleave", () => PieceTip.hide());
      canvas.addEventListener("pointermove", e => {
        if (!ptrs.has(e.pointerId)) { if (e.pointerType === "mouse") PieceTip.show(hoverSq(e), e.clientX, e.clientY); return; }
        PieceTip.hide();
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2) {
          const [a, b] = [...ptrs.values()];
          orbit.dist = Math.min(14, Math.max(5.5, dist0 * pinch0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y))));
        } else if (down) {
          const dx = e.clientX - down.x, dy = e.clientY - down.y;
          if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
          if (moved) {
            orbit.targetYaw = down.yaw - dx * 0.008; focusPt = null;
            orbit.pitch = Math.min(1.25, Math.max(0.18, down.pitch + dy * 0.006));
            followUntil = 0;
          }
        }
      });
      const up = e => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.delete(e.pointerId);
        if (ptrs.size === 0 && down && !moved) pick(e);
        if (ptrs.size === 0) down = null;
      };
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", e => { ptrs.delete(e.pointerId); down = null; });
      canvas.addEventListener("wheel", e => { e.preventDefault(); orbit.dist = Math.min(14, Math.max(5.5, orbit.dist + e.deltaY * 0.01)); }, { passive: false });
    }
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    function hoverSq(e) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects([...pieces.values(), ...tiles], true)[0];
      let o = hit && hit.object; while (o && o.userData.sq === undefined) o = o.parent;
      return o ? o.userData.sq : -1;
    }
    function pick(e) {
      PieceTip.hide();
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects([...pieces.values(), ...tiles], true)[0];
      if (!hit) return;
      let o = hit.object; while (o && o.userData.sq === undefined) o = o.parent;
      if (o) onSquare(o.userData.sq);
    }
    function sideYaw() { return (myColor() || G.st.turn) === "w" ? 0 : Math.PI; }
    let lastSide = 0;
    function updateCamera(dt, now) {
      if (api.cine) {
        // Scripted shot (the intro): fly the camera to a given place and look point.
        const c = api.cine, k = 1 - Math.exp(-dt * (c.speed || 3));
        camPos.lerp(c.pos, k); camLook.lerp(c.look, k);
        camera.position.copy(camPos);
        if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake = Math.max(0, shake - dt * 1.2); }
        camera.lookAt(camLook); return;
      }
      const side = sideYaw();
      if (side !== lastSide) { orbit.targetYaw += side - lastSide; lastSide = side; }
      orbit.yaw += (orbit.targetYaw - orbit.yaw) * (1 - Math.exp(-dt * 4));
      const want = new T.Vector3(), look = new T.Vector3();
      if (followMesh && now < followUntil) {
        // Third-person: over the shoulder of the piece that is moving.
        const p = followMesh.position;
        want.copy(p).addScaledVector(followDir, -2.1).setY(p.y + 1.5);
        look.copy(p).addScaledVector(followDir, 2.2).setY(0.3);
      } else {
        followMesh = null;
        const y = orbit.yaw, pt = orbit.pitch, d = orbit.dist * (camera.aspect < 1.1 ? 1.28 : 1);
        if (focusPt) {
          // Close-up on the final position (e.g. the checkmated king).
          const fd = 5.2;
          want.set(focusPt.x + Math.sin(y) * Math.cos(0.42) * fd, Math.sin(0.42) * fd + 0.5, focusPt.z + Math.cos(y) * Math.cos(0.42) * fd);
          look.copy(focusPt).setY(0.5);
        } else {
          want.set(Math.sin(y) * Math.cos(pt) * d, Math.sin(pt) * d + 0.6, Math.cos(y) * Math.cos(pt) * d);
          look.set(0, 0, -0.3 * Math.cos(y));
        }
      }
      const k = 1 - Math.exp(-dt * (followMesh ? 5 : 3.5));
      camPos.lerp(want, k); camLook.lerp(look, k);
      camera.position.copy(camPos);
      if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake = Math.max(0, shake - dt * 1.2); }
      camera.lookAt(camLook);
    }

    /* --- loop --- */
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      // piece moves
      anims = anims.filter(a => {
        const t = Math.min(1, Math.max(0, (now - a.t0) / a.dur));
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        a.mesh.position.lerpVectors(a.from, a.to, e);
        a.mesh.position.y = 0.1 + Math.sin(Math.PI * t) * a.arc;
        if (a.victim && t > 0.8) { explode(a.to, a.victim); a.victim = null; }
        if (t >= 1) {
          if (a.promo) {
            scene.remove(a.mesh);
            const nm = pieceGroup(a.promo); nm.position.copy(a.to); nm.userData.sq = a.sq; scene.add(nm); pieces.set(a.sq, nm);
            explode(a.to.clone(), new T.Object3D()); shake = 0.15;
          }
          return false;
        }
        return true;
      });
      if (!anims.length && snapshot && snapshot.join() !== G.st.board.join()) { rebuild(); refreshMarks(); }
      // explosions
      bursts = bursts.filter(b => {
        const age = (now - b.t0) / 1000;
        b.flash.intensity = Math.max(0, 4 - age * 10);
        for (const p of b.parts) {
          p.userData.v.y -= 9.8 * dt;
          p.position.addScaledVector(p.userData.v, dt);
          if (p.position.y < 0.1) { p.position.y = 0.1; p.userData.v.multiplyScalar(0.4); p.userData.v.y *= -0.3; }
          p.rotation.x += dt * 6; p.rotation.y += dt * 4;
          const s = Math.max(0.01, 1 - age / 1.6); p.scale.setScalar(s * p.userData.s);
        }
        if (age > 1.6) { b.parts.forEach(p => scene.remove(p)); b.flash.intensity = 0; return false; }
        return true;
      });
      // ambience
      const ep = embers.geometry.attributes.position;
      for (let k = 0; k < ep.count; k++) {
        let y = ep.getY(k) + dt * (0.3 + (k % 7) * 0.05);
        if (y > 6) y = 0;
        ep.setY(k, y); ep.setX(k, ep.getX(k) + Math.sin(now / 900 + k) * dt * 0.1);
      }
      ep.needsUpdate = true;
      for (const t of torches) {
        const f = 0.75 + Math.sin(now / 90 + t.seed) * 0.12 + Math.sin(now / 37 + t.seed * 3) * 0.08;
        t.light.intensity = f; t.flame.scale.set(1, 0.85 + f * 0.3, 1);
      }
      for (const fl of banners) {
        const pos = fl.geometry.attributes.position;
        for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); pos.setZ(k, Math.sin(now / 300 + x * 4) * 0.08 * (x + 0.55)); }
        pos.needsUpdate = true;
      }
      if (checkLight.intensity > 0) checkLight.intensity = 1.6 + Math.sin(now / 160) * 0.9;
      updateCamera(dt, now);
      renderer.render(scene, camera);
    }

    api.refresh = () => {
      if (!api.active) return;
      if (!anims.length && (!snapshot || snapshot.join() !== G.st.board.join())) rebuild();
      refreshMarks();
    };
    api.animate = animate;
    api.setActive = on => {
      if (on && !renderer) {
        try { build(); } catch (e) { console.error("3D view unavailable", e); api.ok = false; return false; }
      }
      api.active = on;
      $("battle").hidden = !on;
      document.querySelector(".frame").hidden = on;
      if (on) {
        resize(); rebuild(); refreshMarks();
        orbit.targetYaw = orbit.yaw = lastSide = sideYaw();
        camPos.set(Math.sin(orbit.yaw) * 14, 9, Math.cos(orbit.yaw) * 14);
        if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
      } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      return true;
    };
    api.cine = null;
    api.resize = () => resize();
    // Full-screen intro: fewer pixels (the picture is moving, so it still looks sharp) and simpler shadows.
    api.lite = on => {
      if (!renderer) return;
      renderer.setPixelRatio(on ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 2));
      resize();
    };
    api.shot = (pos, look, speed, snap) => { api.cine = pos ? { pos: new T.Vector3(...pos), look: new T.Vector3(...look), speed } : null; if (snap && pos) { camPos.set(...pos); camLook.set(...look); } };
    api.focus = sq => { focusPt = sq >= 0 ? sqPos(sq) : null; followUntil = 0; };
    api.resetView = () => { focusPt = null; orbit.pitch = 0.58; orbit.dist = 10.5; orbit.targetYaw = sideYaw(); lastSide = orbit.targetYaw; };
    document.addEventListener("visibilitychange", () => {
      if (!api.active) return;
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!document.hidden && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    });
    return api;
  })();

  sfx.boom = () => {
    try {
      const a = ctx(), t = a.currentTime, v = mv();
      if (v <= 0) return;
      const n = a.createBufferSource(); n.buffer = A().noiseBuf;
      const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.6);
      const g = a.createGain(); env(g, t, 1.1 * v, 0.005, 0.7);
      n.connect(lp).connect(g).connect(A().sfxBus); n.start(t); n.stop(t + 0.5);
      splay("timpani", 36, 1, v);
    } catch (e) {}
  };

  /* ---------- Intro: a 5-second scene on the battlefield when a game starts, like the opening of a short video.
     Each opponent level gets its own scene: Easy is bright and funny, Normal is a sharp trap, Hard is a threat. ---------- */
  const Intro = {
    SCENES: {
      // Easy: Black hangs its queen and the white knight leaps on it.
      easy: { fen: "rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", mood: "day",
        cap1: ["ควีนดำยืนเด่นอยู่คนเดียว…", "The black queen, all alone…"], cap2: ["ม้าเห็นแล้ว!", "The knight sees it!"],
        big: ["ควีนฟรี!", "FREE QUEEN!"], tag: ["ระดับง่าย · เริ่มสบายๆ", "EASY · warm up"],
        steps: [[0, "shot", [0.9, 1.0, 2.9], [3.5, 0.6, 0.5], 2.5, true], [1300, "shot", null], [1350, "move", 45, 39], [2300, "shot", [1.4, 2.4, 2.4], [3.5, 0.4, 0.5], 3]] },
      // Normal: the four-move trap, queen takes f7, mate.
      normal: { fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3", mood: "dusk",
        cap1: ["ทุกตาเดิน คือสนามรบ", "Every move is a battle"], cap2: ["เผลอแค่ตาเดียว…", "One careless move…"],
        big: ["รุกฆาต!", "CHECKMATE!"], tag: ["ระดับปกติ · คิดให้ดี", "NORMAL · think twice"],
        steps: [[0, "shot", [4.6, 0.9, -0.2], [1.5, 0.6, -2.5], 2.2, true], [700, "shot", null], [700, "move", 6, 21], [1500, "shot", [3.9, 2.0, 1.2], [1.6, 0.4, -2.4], 3], [1900, "shot", null], [1900, "move", 31, 13], [2750, "shot", [0.6, 1.5, -1.6], [0.5, 0.7, -3.5], 4]] },
      // Story ending: the white rook ends the war on the black king's back rank.
      ending: { fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", mood: "gold",
        cap1: ["ห้องบัลลังก์ของราชาดำ", "The Black King's throne room"], cap2: ["ตาสุดท้ายของสงคราม…", "The last move of the war…"],
        big: ["ราชาดำล้มแล้ว!", "THE BLACK KING FALLS!"], tag: ["", ""], go: ["ชัยชนะ", "VICTORY"], herald: ["ชัยชนะเป็นของเรา!", "Victory is ours!"],
        steps: [[0, "shot", [3.6, 0.8, -5.4], [2.5, 0.6, -3.5], 2, true], [900, "shot", [-0.5, 1.4, 5.6], [-0.5, 0.4, 0], 2.5], [1700, "shot", null], [1700, "move", 59, 3], [2700, "shot", [3.4, 1.3, -5.2], [2.5, 0.5, -3.5], 4]] },
      // Hard: seen from behind your own king, the black rook slams down the back rank.
      hard: { fen: "3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1", mood: "night",
        cap1: ["คอมระดับยาก ไม่ให้อภัย", "Hard mode shows no mercy"], cap2: ["คิงของคุณ…", "Your king…"],
        big: ["คุณจะรอดไหม?", "WILL YOU SURVIVE?"], tag: ["ระดับยาก · บอสใหญ่", "HARD · the boss"],
        steps: [[0, "shot", [3.4, 0.7, 5.2], [2.5, 0.5, 3.5], 2, true], [900, "shot", [-1.5, 1.6, 5.6], [0, 0.4, -1], 2.5], [1700, "shot", null], [1700, "move", 3, 59], [2700, "shot", [3.8, 1.3, 5.4], [2.5, 0.5, 3.5], 4]] },
    },
    timers: [], el: null,
    INST: ["timpani", "french_horn", "trumpet", "contrabass"],
    // War drums under the whole scene, a horn call, a brass stab on the big word, then the battle fanfare and the herald.
    score(mood, at, sc = {}) {
      const v = Math.max(mv(), al(), 0.35) * 2;
      if (v <= 0 || !audio) return;
      const hard = mood === "night", key = mood === "day" || mood === "gold" ? 0 : mood === "dusk" ? 2 : -3;
      // drums: a roll that builds, then a march (boom ... boom-boom)
      for (let k = 0; k < 8; k++) at(k * 70, () => splay("timpani", 36, 0.4, v * (0.25 + k * 0.08)));
      for (const t of [700, 1300, 1450, 1900, 2500, 2650, 3100, 3700, 3850]) at(t, () => splay("timpani", hard ? 36 : 40, 0.6, v * 0.8));
      // horn call
      const call = hard ? [[48, 0, 900], [51, 600, 900], [47, 1200, 1400]] : [[55 + key, 0, 500], [60 + key, 450, 500], [64 + key, 900, 1300]];
      for (const [n, t, d] of call) at(250 + t, () => { splay("french_horn", n, d / 1000, v * 0.9); if (hard) splay("contrabass", n - 12, d / 1000, v * 0.7); });
      // brass stab with the big word
      at(2850, () => { for (const n of hard ? [48, 51, 55] : [60 + key, 64 + key, 67 + key]) splay("trumpet", n + 12 * (hard ? 1 : 0), 0.5, v * 0.7); splay("timpani", 36, 1, v); });
      // the battle fanfare with "FIGHT!": ta-ta-taaa, then the full chord over a timpani roll
      const root = hard ? 60 : 60 + key, third = hard ? 63 : 64 + key;
      [[root, 0], [root, 130], [root, 260], [third + 3, 400]].forEach(([n, t]) => at(4250 + t, () => splay("trumpet", n, t === 400 ? 0.3 : 0.12, v * 0.8)));
      at(4800, () => { for (const n of [root, third, root + 7, root + 12]) splay("trumpet", n, 1.4, v * 0.6); for (const n of [root - 12, root - 5]) splay("french_horn", n, 1.6, v * 0.8); });
      for (let k = 0; k < 10; k++) at(4300 + k * 55, () => splay("timpani", 36, 0.3, v * (0.4 + k * 0.05)));
      at(4800, () => splay("timpani", 36, 1.2, v * 1.2));
      // the herald proclaims it
      at(4350, () => this.herald(T(...(sc.herald || ["ศึกเริ่มแล้ว!", "Let the battle begin!"]))));
    },
    herald(text) {
      try {
        if (!window.speechSynthesis || !thaiVoice || al() <= 0) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = thaiVoice; u.lang = thaiVoice.lang; u.pitch = 0.6; u.rate = 0.85; u.volume = 1;
        speechSynthesis.speak(u);
      } catch (e) {}
    },
    sceneFor() { return G.mode === "cpu" ? ["", "easy", "normal", "hard"][G.level] || "normal" : "normal"; },
    run(name, onEnd) {
      if (this.el || !Battle.ok || matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      const sc = this.SCENES[name || this.sceneFor()], wasActive = Battle.active;
      if (!wasActive && !Battle.setActive(true)) return false;
      this.onEnd = onEnd || null;
      const L = pair => T(pair[0], pair[1]);
      const el = this.el = document.createElement("div"); el.id = "intro"; el.dataset.mood = sc.mood; el.setAttribute("aria-hidden", "true");
      el.innerHTML = `<div class="shade"></div><div class="tint"></div><div class="vig"></div><div class="bars"></div>
        <div class="line cap" id="inCap1">${esc(L(sc.cap1))}</div>
        <div class="line cap" id="inCap2">${esc(L(sc.cap2))}</div>
        <div class="line big" id="inBig">${esc(L(sc.big))}</div>
        <div class="line tag" id="inTag">${esc(L(sc.tag))}</div>
        <div class="line go" id="inGo">${esc(L(sc.go || ["เริ่ม!", "FIGHT!"]))}</div>
        <button class="skip" type="button">${T("ข้าม", "Skip")} ›</button>`;
      document.body.appendChild(el);
      document.documentElement.classList.add("intro-on"); Battle.lite(true);
      el.addEventListener("click", () => this.end());
      this.keep = { st: G.st, moves: G.moves, last: G.last, follow: Battle.follow, wasActive };
      G.st = fromFEN(sc.fen); G.moves = legalMoves(G.st); G.last = null; Battle.follow = true;
      Battle.focus(-1); Battle.refresh();
      const a = (sel, frames, o) => { const e = el.querySelector(sel); try { return e.animate(frames, Object.assign({ fill: "both", easing: "ease-out" }, o)); } catch (x) {} };
      const at = (ms, f) => this.timers.push(setTimeout(f, ms));
      for (const [t, kind, ...arg] of sc.steps) {
        if (kind === "shot") at(t, () => Battle.shot(arg[0], arg[1], arg[2], arg[3]));
        if (kind === "move") at(t, () => {
          const prev = G.st, m = legalMoves(prev).find(x => x.from === arg[0] && x.to === arg[1]);
          if (!m) return;
          G.st = applyMove(prev, m); G.moves = legalMoves(G.st); G.last = m;
          Battle.animate(m, prev); setTimeout(() => this.el && Battle.refresh(), 750);
          try { (prev.board[m.to] ? sfx.capture : sfx.move)(); } catch (x) {}
        });
      }
      const up = [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], out = [{ opacity: 1 }, { opacity: 0 }];
      // fade-outs only fill forwards, so they don't cover the fade-in while they wait
      const gone = (sel, delay) => a(sel, out, { duration: 250, delay, fill: "forwards" });
      a(".shade", out, { duration: 700 });
      a("#inCap1", up, { duration: 450, delay: 250 }); gone("#inCap1", 1250);
      a("#inCap2", up, { duration: 400, delay: 1500 }); gone("#inCap2", 2350);
      a("#inBig", [{ opacity: 0, transform: "scale(2.6) rotate(-6deg)" }, { opacity: 1, transform: "scale(.95) rotate(-3deg)", offset: .7 }, { opacity: 1, transform: "rotate(-3deg)" }], { duration: 420, delay: 2800, easing: "cubic-bezier(.2,1.4,.4,1)" });
      a("#inBig", [{ opacity: 1, transform: "rotate(-3deg)" }, { opacity: 0, transform: "scale(.8) rotate(-3deg)" }], { duration: 250, delay: 3700, fill: "forwards" });
      at(2850, () => { try { sfx.end && sfx.end(); } catch (x) {} });
      // end card: the real board, the level, and the start
      at(3800, () => { G.st = this.keep.st; G.moves = this.keep.moves; G.last = null; Battle.focus(-1); Battle.refresh(); Battle.shot(null); });
      a("#inTag", up, { duration: 400, delay: 3900 });
      a("#inGo", [{ opacity: 0, transform: "scale(1.8)" }, { opacity: 1, transform: "scale(.95)", offset: .7 }, { opacity: 1, transform: "none" }], { duration: 450, delay: 4300, easing: "cubic-bezier(.2,1.4,.4,1)" });
      at(5300, () => this.end());
      // sound: duck the music while the scene's own score plays
      try {
        const ac = ctx(); orchLoad(this.INST);
        A().musicBus.gain.cancelScheduledValues(ac.currentTime); A().musicBus.gain.setTargetAtTime(musicLevel() * 0.12, ac.currentTime, 0.2);
        this.score(sc.mood, at, sc);
      } catch (x) {}
      track("intro_view", { scene: name || this.sceneFor() });
      return true;
    },
    end() {
      if (!this.el) return;
      this.timers.forEach(clearTimeout); this.timers = [];
      const el = this.el, k = this.keep; this.el = null;
      try { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = () => el.remove(); } catch (x) { el.remove(); }
      document.documentElement.classList.remove("intro-on"); Battle.lite(false);
      try { if (A().audio && prefs.music) A().musicBus.gain.setTargetAtTime(musicLevel(), A().audio.currentTime, 0.8); } catch (x) {}
      Battle.shot(null); Battle.focus(-1);
      G.st = k.st; G.moves = k.moves; G.last = k.last; Battle.follow = k.follow;
      if (!k.wasActive) Battle.setActive(false);
      Battle.refresh(); render();
      const cb = this.onEnd; this.onEnd = null; if (cb) setTimeout(cb, 250);
    },
  };
  return { Battle, Intro, PieceTip };
}
