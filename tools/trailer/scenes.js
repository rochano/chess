const hideSkip = p => p.addStyleTag({content:'#intro .skip,#story .skip{display:none!important} .map-hint{display:none!important}'});
const mv = (p, uci) => p.evaluate(u => { const f = sqIdx(u.slice(0,2)), t = sqIdx(u.slice(2,4)); const m = G.moves.find(x => x.from === f && x.to === t); doMove(m); }, uci);
module.exports = {
 async intro({p, wait, start}) {
   await hideSkip(p); await p.evaluate(() => hide('menu'));
   start(); await p.evaluate(() => Intro.run('hard')); await wait(5500);
 },
 async game({p, wait, cap, start}) {
   await hideSkip(p);
   await p.evaluate(() => { prefs.mode = 'friend'; prefs.nameW = 'คาปิบาร่าขี้เซา'; prefs.nameB = 'นากทะเลหัวร้อน'; prefs.shop = 'off'; prefs.taunts = 'off'; prefs.intro = 'off'; hide('menu'); newGame(); });
   await wait(600); start();
   await cap('หมากรุก <i>3 มิติ</i> เล่นฟรีบนเว็บ');
   const moves = ['e2e4','e7e5','g1f3','d7d6','f1c4','c8g4','b1c3','g7g6','f3e5','g4d1','c4f7','e8e7','c3d5'];
   for (let i = 0; i < moves.length; i++) {
     await mv(p, moves[i]); await wait(i >= 8 ? 1500 : 850);
     if (i === 5) await cap('เล่นกับเพื่อน คอม 3 ระดับ หรือออนไลน์');
     if (i === 9) await cap('ทุกการกิน <i>ระเบิดตูม!</i>');
   }
   await cap(''); await wait(3200);
 },
 async story({p, wait, cap, start}) {
   await hideSkip(p);
   await p.evaluate(() => { hide('menu'); Train.lessonStars = (ci, li) => ci < 4 ? 3 : 0; Story.play(STORY.before[7], { chap: [T('บทที่ 8', 'Chapter 8'), T('บัลลังก์ราชาดำ', '')] }, () => {}); });
   await p.addStyleTag({content:'#cap{top:120px;bottom:auto}'});
   start(); await cap('โหมดเรื่องราว <i>สงครามแห่งหมอกดำ</i>');
   await wait(1600); await p.click('#story', {force: true}).catch(() => {}); await wait(2600); await p.click('#story', {force: true}).catch(() => {}); await wait(2600);
 },
 async map({p, wait, cap, start}) {
   await hideSkip(p);
   await p.evaluate(() => { hide('menu'); Train.lessonStars = (ci, li) => ci < 4 ? 3 : 0; Train.openList(); $('townPanel').hidden = true;
     const v = Train.view; v.z = 1.5; v.fit(); v.x = 20; v.y = 150; v.apply(); const t0 = performance.now();
     const step = () => { const k = Math.min(1, (performance.now() - t0) / 6500), e = k * k * (3 - 2 * k); v.x = 20 + e * (1000 - v.w - 20); v.y = 150 - e * 150; v.apply(); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); });
   start(); await cap('ออกเดินทาง 8 เมือง ไปโค่น<i>ราชาดำ</i>'); await wait(6800);
 },
 async puzzle({p, wait, cap, start}) {
   await hideSkip(p);
   await p.evaluate(() => { hide('menu'); prefs.view = '2d'; Daily.open(); });
   await wait(1200); start(); await cap('โจทย์ใหม่ <i>ทุกวัน</i> · มีตารางคะแนน'); await wait(4500);
 },
 async endcard({p, wait, start}) {
   await p.evaluate(() => { const e = document.createElement('div'); e.id = 'endc';
     e.innerHTML = `<img src="img/logo.svg" onerror="this.remove()"><h1>Chess Game</h1><p class="a">เล่นฟรี · ไม่ต้องสมัคร · ไม่ต้องโหลดแอป</p><div class="url">rochano.github.io/chess</div><p class="b">กดลิงก์ในคำอธิบายด้านล่างได้เลย</p>`;
     document.body.appendChild(e); });
   await p.addStyleTag({content:`#endc{position:fixed;inset:0;z-index:1000;background:radial-gradient(circle at 50% 40%,#3B2A1A,#140C08);display:grid;place-content:center;justify-items:center;gap:14px;color:#FFF4DC;text-align:center;font-family:"Baloo 2","Noto Sans Thai",sans-serif;animation:ein .8s ease-out}
     #endc img{width:120px;height:120px;border-radius:26px}#endc h1{margin:0;font-size:84px;line-height:1;color:#F5C344}#endc .a{margin:0;font-size:36px;font-weight:700}
     #endc .url{margin-top:8px;padding:14px 34px;border-radius:18px;background:#F5C344;color:#2F2620;font-size:52px;font-weight:800;animation:pulse 1.4s ease-in-out infinite}
     #endc .b{margin:0;font-size:30px;color:#E3C27A}@keyframes ein{from{opacity:0;transform:scale(.96)}}@keyframes pulse{50%{transform:scale(1.05)}}`});
   start(); await wait(6500);
 },
};
