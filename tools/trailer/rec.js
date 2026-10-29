// Game trailer recorder: node tools/trailer/rec.js <out name> <scene from scenes.js>. Serve the repo at :8765 first.
// Records the game in slow motion (all clocks scaled by K) via CDP screencast, then rebuilds real-time video.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const S=process.env.THREE_DIR||path.join(__dirname,'..','..','..','threepkg'); // folder holding package/build/three.min.js (the CDN is blocked in some sandboxes)
const K=+process.env.K||0.2, OUT=process.argv[2]||'clip', SCN=process.argv[3]||'intro';
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const c=await b.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,locale:'th-TH'});const p=await c.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(K=>{window.__chessDev=true;localStorage.setItem('chess-tut','1');
   localStorage.setItem('chess-prefs',JSON.stringify({mode:'cpu',level:3,intro:'on',nameW:'คาปิบาร่าขี้เซา',shop:'on',taunts:'on',view:'3d'}));
   localStorage.setItem('chess-story',JSON.stringify({pro:1}));
   const rn=performance.now.bind(performance),t0=rn();performance.now=()=>t0+(rn()-t0)*K;
   const dn=Date.now,d0=dn();Date.now=()=>d0+(dn()-d0)*K;
   const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(performance.now()));
   const st=setTimeout,si=setInterval;window.setTimeout=(f,ms,...a)=>st(f,(ms||0)/K,...a);window.setInterval=(f,ms,...a)=>si(f,(ms||0)/K,...a);
 },K);
 await p.route('**three.min.js',r=>r.fulfill({path:path.join(S,'package/build/three.min.js'),contentType:'application/javascript'}));
 await p.route('**googletagmanager**',r=>r.abort());await p.route('**script.google.com**',r=>r.fulfill({body:'{"rows":[]}'}));
 await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(2500);
 const cdp=await c.newCDPSession(p);await cdp.send('Animation.enable');await cdp.send('Animation.setPlaybackRate',{playbackRate:K});
 await p.addStyleTag({content:`#cap{position:fixed;z-index:999;left:0;right:0;bottom:46px;text-align:center;pointer-events:none}
  #cap b{display:inline-block;padding:12px 30px;border-radius:16px;background:rgba(20,14,10,.82);color:#FFF4DC;font:800 40px "Baloo 2","Noto Sans Thai",sans-serif;letter-spacing:.01em;box-shadow:0 10px 30px rgba(0,0,0,.35)}
  #cap b i{font-style:normal;color:#F5C344}`});
 const dir=path.join(__dirname,'f-'+OUT);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir);
 const frames=[];let rec=false;
 cdp.on('Page.screencastFrame',async f=>{ if(rec){const n=frames.length;fs.writeFileSync(path.join(dir,String(n).padStart(6,'0')+'.jpg'),Buffer.from(f.data,'base64'));frames.push(f.metadata.timestamp);} cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:1280,maxHeight:720,everyNthFrame:1});
 const wait=ms=>p.waitForTimeout(ms/K);  // content milliseconds
 const cap=(html)=>p.evaluate(h=>{let e=document.getElementById('cap');if(!e){e=document.createElement('div');e.id='cap';document.body.appendChild(e);}e.innerHTML=h?'<b>'+h+'</b>':'';},html);
 const ctx={p,wait,cap,start:()=>{rec=true},stop:()=>{rec=false}};
 await require('./scenes.js')[SCN](ctx);
 rec=false;await cdp.send('Page.stopScreencast');
 // durations from timestamps, scaled back to content time
 const lst=frames.map((t,i)=>`file '${String(i).padStart(6,'0')}.jpg'\nduration ${(((frames[i+1]||t+0.2)-t)*K).toFixed(4)}`).join('\n');
 fs.writeFileSync(path.join(dir,'list.txt'),lst+`\nfile '${String(frames.length-1).padStart(6,'0')}.jpg'\n`);
 console.log(OUT,'frames',frames.length,'content s',((frames.at(-1)-frames[0])*K).toFixed(1),'errors',errs);
 await b.close();
 require('child_process').execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',path.join(dir,'list.txt'),'-vf','fps=30,format=yuv420p','-c:v','libx264','-crf','18',path.join(__dirname,OUT+'.mp4')]);
})();
