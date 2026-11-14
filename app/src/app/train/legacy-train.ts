// @ts-nocheck -- Road to master (course, drills, story, world map), daily puzzle, coach, teaching arrows and the
// tutorial, ported line for line from the original game. Wired to Angular through create(deps).
/* eslint-disable */
import { refTag } from "../cloud/ref";
export function create(deps) {
  const { G, prefs, savePrefs, tr, trS, T, LANG, myColor, track, $, show, hide, closeAll, openMenu, newGame, doMove, render,
    lsGet, lsSet, esc, HOME_URL, GLYPH, NAME, VAL, sqName, opp, inCheck, legalMoves, applyMove, posKey, fromFEN, insufficient,
    bestMove, negamax, orderScore, evaluate, quiesce, pseudoMoves, kingSq, voice, stopVoice, hasVoice, startMusic, musicSting,
    splay, mv, al, sfx, Battle, Intro } = deps;
  const sqIdx = s => (8 - +s[1]) * 8 + "abcdefgh".indexOf(s[0]);
  const uci = m => sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : "");
  /* ---------- Road to chess master: course content ----------
     Each chapter ends with a boss lesson. Each lesson teaches first (slides shown on
     the board with arrows and circles), then drills. Drill goals:
     collect  capture every enemy piece within n moves (the other side does not move)
     pick     play one of the moves in ok
     win      win at least target centipawns within n moves
     keep     move so nothing is lost
     defend   stop the opponent's mate and keep material
     mate     checkmate within n moves
     promote  promote a pawn within n moves without losing it
     opening  castle and develop three minor pieces within n moves without losing material
     beat     win a full game against the computer at level */
  const RANKS = [tr("ทหารเกณฑ์"), tr("พลทหาร"), tr("สิบตรี"), tr("สิบเอก"), tr("จ่าสิบเอก"), tr("ร้อยตรี"), tr("ร้อยเอก"), tr("พันเอก"), tr("เทพหมากรุก")];
  const COURSE = [
    { title: tr("ฝึกเดินหมาก"), rank: 1, lessons: [
      { title: tr("เรือ"), look: [tr("เรือวิ่งเป็นเส้นตรง กี่ช่องก็ได้"), tr("มองทั้ง 4 ทิศ: ขึ้น ลง ซ้าย ขวา")], warn: [tr("ข้ามหมากไม่ได้ ถ้ามีหมากขวางต้องหยุด")],
        teach: [
          { fen: "8/8/8/8/3R4/8/8/8 w - - 0 1", arrows: ["d4d8", "d4d1", "d4a4", "d4h4"], text: tr("เรือเดินเป็นเส้นตรง ขึ้น ลง ซ้าย ขวา กี่ช่องก็ได้ ตามลูกศรเลย") },
          { fen: "8/8/8/3n4/8/8/8/1P1R4 w - - 0 1", arrows: ["d1d5"], marks: ["b1", "d5"], text: tr("ข้ามหมากไม่ได้ ทางซ้ายติดเบี้ยเราที่ b1 จึงไปได้แค่ c1 แต่ถ้าเจอหมากข้าศึก (ม้า d5) กินมันได้แล้วหยุดตรงนั้น") },
        ],
        drills: [
          { goal: "collect", n: 3, fen: "8/8/8/p3p3/8/8/4p3/R7 w - - 0 1", text: tr("เก็บเบี้ยดำให้หมด 3 ตัว ภายใน 3 ตา (ฝ่ายดำจะไม่เดิน)"), hint: "a1a5" },
          { goal: "collect", n: 2, fen: "8/7n/8/8/8/3P4/8/3R3b w - - 0 1", text: tr("เก็บหมากดำ 2 ตัว ภายใน 2 ตา ระวังเบี้ยเราเองขวางทาง"), hint: "d1h1" },
        ] },
      { title: tr("บิชอป"), look: [tr("บิชอปวิ่งแนวทแยง กี่ช่องก็ได้"), tr("บิชอปอยู่บนสีเดิมตลอดเกม")], warn: [tr("บิชอปช่องขาวไม่มีวันไปช่องดำได้")],
        teach: [
          { fen: "8/8/8/8/3B4/8/8/8 w - - 0 1", arrows: ["d4h8", "d4a7", "d4a1", "d4g1"], text: tr("บิชอปเดินแนวทแยงได้ไกล 4 ทิศ และอยู่บนสีเดิมตลอดเกม") },
        ],
        drills: [
          { goal: "collect", n: 3, fen: "8/6p1/8/4p3/8/2p5/8/B7 w - - 0 1", text: tr("เก็บเบี้ยดำ 3 ตัว ภายใน 3 ตา"), hint: "a1c3" },
          { goal: "collect", n: 2, fen: "8/3p4/8/1p6/8/8/8/5B2 w - - 0 1", text: tr("เก็บเบี้ยดำ 2 ตัว ภายใน 2 ตา"), hint: "f1b5" },
        ] },
      { title: tr("ม้า"), look: [tr("ม้าเดินเป็นรูปตัว L: ตรง 2 ช่องแล้วเลี้ยว 1"), tr("ม้ากระโดดข้ามหมากได้ ตัวเดียวในเกม")], warn: [tr("ม้าที่อยู่ริมกระดานเดินได้น้อยลงมาก")],
        teach: [
          { fen: "8/8/8/8/3N4/8/8/8 w - - 0 1", arrows: ["d4c6", "d4e6", "d4f5", "d4f3", "d4e2", "d4c2", "d4b3", "d4b5"], text: tr("ม้าเดินเป็นรูปตัว L ได้ 8 ทาง และกระโดดข้ามหมากตัวอื่นได้") },
          { fen: "8/8/8/8/8/8/5PPP/6N1 w - - 0 1", arrows: ["g1f3", "g1h3", "g1e2"], text: tr("ถึงจะมีเบี้ยล้อมอยู่ ม้าก็กระโดดออกมาได้") },
        ],
        drills: [
          { goal: "collect", n: 3, fen: "8/8/5p2/3p4/8/2p5/8/1N6 w - - 0 1", text: tr("เก็บเบี้ยดำ 3 ตัว ภายใน 3 ตา"), hint: "b1c3" },
          { goal: "collect", n: 2, fen: "8/8/8/8/3p4/8/4pPPP/6N1 w - - 0 1", text: tr("กระโดดออกมาเก็บเบี้ยดำ 2 ตัว ภายใน 2 ตา"), hint: "g1e2" },
        ] },
      { title: tr("ควีน คิง และเบี้ย"), look: [tr("ควีน = เรือ + บิชอป เดินได้ 8 ทิศ"), tr("คิงเดินทีละ 1 ช่อง"), tr("เบี้ยเดินตรง แต่กินทแยง")], warn: [tr("คิงห้ามเดินเข้าช่องที่ข้าศึกเล็งอยู่"), tr("เบี้ยเดินถอยหลังไม่ได้")],
        teach: [
          { fen: "8/8/8/8/3Q4/8/8/8 w - - 0 1", arrows: ["d4d8", "d4h8", "d4h4", "d4g1", "d4d1", "d4a1", "d4a4", "d4a7"], text: tr("ควีนแรงที่สุด เดินได้ทั้งเส้นตรงและแนวทแยง 8 ทิศ") },
          { fen: "8/8/8/8/3K4/8/8/8 w - - 0 1", marks: ["c5", "d5", "e5", "c4", "e4", "c3", "d3", "e3"], text: tr("คิงเดินได้ทีละ 1 ช่องทุกทิศ (วงสีส้ม) และห้ามเดินเข้าช่องที่โดนเล็ง") },
          { fen: "8/8/8/3p4/4P3/8/1P6/8 w - - 0 1", arrows: ["b2b4", "e4d5"], text: tr("เบี้ยเดินหน้าทีละช่อง ตาแรกเดินได้ 2 ช่อง แต่เวลากินจะกินทางทแยงหน้า") },
        ],
        drills: [
          { goal: "collect", n: 4, fen: "8/p7/7p/8/8/4p3/7p/Q7 w - - 0 1", text: tr("ใช้ควีนเก็บเบี้ยดำ 4 ตัว ภายใน 4 ตา"), hint: "a1a7" },
          { goal: "collect", n: 3, fen: "8/8/8/5p2/4p3/3p4/4P3/8 w - - 0 1", text: tr("ใช้เบี้ยขาวกินเบี้ยดำ 3 ตัว ภายใน 3 ตา (เบี้ยกินทางทแยง)"), hint: "e2d3" },
        ] },
      { title: tr("ด่านบอส: เก็บกวาด"), boss: true, look: [tr("วางแผนก่อนเดิน: ตัวไหนเก็บอะไร ลำดับไหน")], warn: [tr("ตาไม่พอถ้าเดินเสียเปล่าแม้แต่ตาเดียว"), tr("ด่านบอสไม่มีคำใบ้")],
        teach: [{ fen: "8/8/8/8/8/8/8/8 w - - 0 1", text: tr("ด่านบอส! ใช้ทุกอย่างที่ฝึกมา เก็บหมากให้หมดโดยไม่เสียตาเปล่า") }],
        drills: [
          { goal: "collect", n: 4, fen: "8/5p2/8/4p3/2p5/8/8/5BN1 w - - 0 1", text: tr("ใช้บิชอปกับม้าเก็บให้หมด 3 ตัว ภายใน 4 ตา") },
          { goal: "collect", n: 4, fen: "8/1p6/5p2/8/8/8/1p6/5b1Q w - - 0 1", text: tr("ใช้ควีนเก็บให้หมด 4 ตัว ภายใน 4 ตา") },
        ] },
    ] },
    { title: tr("ของฟรีและของแพง"), rank: 2, lessons: [
      { title: tr("กินของฟรี"), look: [tr("ค่าหมาก: เบี้ย 1 ม้า 3 บิชอป 3 เรือ 5 ควีน 9"), tr("หมากข้าศึกที่ไม่มีใครคุ้มกัน = ของฟรี")], warn: [tr("ก่อนกิน ดูว่าช่องนั้นมีใครรอกินคืนไหม"), tr("อย่าเอาตัวแพงไปแลกตัวถูก")],
        teach: [
          { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", marks: ["d1", "a1", "b1", "c1"], text: tr("หมากแต่ละตัวมีค่าไม่เท่ากัน: เบี้ย 1, ม้า 3, บิชอป 3, เรือ 5, ควีน 9 แต้ม (คิงมีค่าเท่าชีวิต)") },
          { fen: "4k3/8/4p3/3n3b/8/5N2/8/3RK3 w - - 0 1", arrows: ["f3h4", "d1d5"], marks: ["h5", "d5"], text: tr("บิชอป h5 ไม่มีใครคุ้มกัน (ของฟรี) แต่ม้า d5 มีเบี้ย e6 คุ้มอยู่ ถ้าเอาเรือไปกิน จะโดนเบี้ยกินคืน เสีย 5 ได้ 3") },
        ],
        drills: [
          { goal: "win", target: 800, n: 1, fen: "rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", text: tr("ควีนดำยืนอยู่โดยไม่มีใครคุ้มกัน หาแล้วกินเลย"), hint: "f3h4" },
          { goal: "win", target: 800, n: 1, fen: "r3k2r/ppp2ppp/2n5/3q4/8/2N5/PPP2PPP/R2QKB1R w KQkq - 0 1", text: tr("ดำเผลออีกแล้ว มีตัวใหญ่ให้กินฟรี"), hint: "c3d5" },
          { goal: "win", target: 300, n: 1, fen: "6k1/5ppp/4p3/3n4/7b/5N2/5PPP/3R2K1 w - - 0 1", text: tr("มีให้กิน 2 ตัว ตัวไหนกินแล้วไม่โดนกินคืน?"), hint: "f3h4" },
        ] },
      { title: tr("โดนจ่อแล้วต้องหนี"), look: [tr("ทุกตาที่ข้าศึกเดิน ถามว่า: มันจ่อกินอะไรเรา"), tr("หนีไปช่องที่ไม่มีใครเล็ง หรือหาคนมาคุ้มกัน")], warn: [tr("อย่าหนีไปช่องที่ยังโดนกินได้")],
        teach: [
          { fen: "rnbqkb1r/pppp1ppp/5n2/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3", arrows: ["f6h5"], marks: ["h5"], text: tr("ม้าดำ f6 จ่อกินควีนเราที่ h5 อยู่ (ลูกศร) ต้องรู้ตัวก่อนจะสาย") },
        ],
        drills: [
          { goal: "keep", n: 1, fen: "rnbqkb1r/pppp1ppp/5n2/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3", text: tr("พาควีนหนีไปช่องที่ปลอดภัย"), hint: "h5e2" },
          { goal: "keep", n: 1, fen: "r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4", text: tr("เบี้ย a6 ไล่บิชอปเรา ทำยังไงไม่ให้เสียหมาก"), hint: "b5a4" },
          { goal: "keep", n: 1, fen: "6k1/5ppp/8/8/3b4/8/1R3PPP/6K1 w - - 0 1", text: tr("บิชอปดำจ่อเรือเราอยู่ หนีให้รอด (ถ้าหนีแล้วได้รุกด้วยยิ่งดี)"), hint: "b2b8" },
        ] },
      { title: tr("ด่านบอส: ตาไว"), boss: true, look: [tr("มองหาของฟรีของข้าศึก"), tr("เช็กว่าของเราโดนจ่ออยู่ไหม")], warn: [tr("ด่านบอสไม่มีคำใบ้")],
        teach: [{ fen: "8/8/8/8/8/8/8/8 w - - 0 1", text: tr("ด่านบอส! แต่ละโจทย์อาจเป็นการกินของฟรี หรือการหนี ต้องดูให้ออกเอง") }],
        drills: [
          { goal: "win", target: 300, n: 1, fen: "r1bqkbnr/pppp1ppp/8/4n3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4", text: tr("หาของฟรีให้เจอ") },
          { goal: "keep", n: 1, fen: "r1bqkb1r/ppp2ppp/2n2n2/3pp3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq d6 0 5", text: tr("เบี้ย d5 จ่อบิชอปเราอยู่ ตอบให้ดีโดยไม่เสียหมาก") },
        ] },
    ] },
    { title: tr("รุกและรุกฆาต"), rank: 3, lessons: [
      { title: tr("แก้รุก"), look: [tr("โดนรุกแก้ได้ 3 ทาง: หนี บัง หรือกินตัวที่รุก"), tr("ทางที่ดีที่สุดมักเป็นการกินตัวที่รุก")], warn: [tr("เดินอย่างอื่นไม่ได้จนกว่าจะแก้รุก")],
        teach: [
          { fen: "4k3/8/8/8/4q3/8/3N4/R3K3 w - - 0 1", arrows: ["e4e1"], marks: ["e1"], text: tr("ควีนดำรุกคิงเราตามแนว e (ลูกศร) เราต้องแก้ด้วยการ หนี บัง หรือกิน") },
        ],
        drills: [
          { goal: "win", target: 800, n: 1, fen: "4k3/8/8/8/4q3/8/3N4/R3K3 w - - 0 1", text: tr("โดนรุก! แก้รุกแบบที่ได้กำไรที่สุด"), hint: "d2e4" },
        ] },
      { title: tr("รุกฆาตในตาเดียว"), look: [tr("รุกฆาต = รุกแล้วคิงหนีไม่ได้ บังไม่ได้ กินไม่ได้"), tr("คิงที่ติดหมากตัวเองล้อมอยู่ อันตรายที่สุด")], warn: [tr("รุกแล้วคิงยังหนีได้ ไม่ใช่รุกฆาต"), tr("ถ้าคิงไม่โดนรุกแต่เดินไม่ได้เลย จะเป็นอับ (เสมอ)")],
        teach: [
          { fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", arrows: ["a1a8"], marks: ["f7", "g7", "h7"], text: tr("คิงดำโดนเบี้ยตัวเองขังไว้ ถ้าเรือวิ่งเข้าแถวหลัง คิงจะหนีไม่ได้ = รุกฆาตแถวหลัง") },
          { fen: "k7/8/1K6/8/8/8/8/7Q w - - 0 1", arrows: ["h1h8"], marks: ["a7", "b7", "b8"], text: tr("ใช้คิงเราช่วย: คิง b6 คุมช่อง a7 b7 ควีนมาคุมแถว 8 คิงดำก็ไม่มีที่ไป") },
        ],
        drills: [
          { goal: "mate", n: 1, fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", text: tr("รุกฆาตในตาเดียว"), hint: "a1a8" },
          { goal: "mate", n: 1, fen: "k7/8/1K6/8/8/8/8/7Q w - - 0 1", text: tr("รุกฆาตในตาเดียว (ใช้คิงช่วย)"), hint: "h1h8" },
          { goal: "mate", n: 1, fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", text: tr("รุกฆาตด้วยม้า: คิงดำติดหมากตัวเองหมดแล้ว"), hint: "g5f7" },
          { goal: "mate", n: 1, fen: "7k/R7/8/8/8/8/8/1R5K w - - 0 1", text: tr("เรือ 2 ตัวช่วยกัน รุกฆาตในตาเดียว"), hint: "b1b8" },
        ] },
      { title: tr("ด่านบอส: มือสังหาร"), boss: true, look: [tr("หาช่องที่คิงข้าศึกหนีได้ แล้วปิดให้หมด")], warn: [tr("ด่านบอสไม่มีคำใบ้")],
        teach: [{ fen: "8/8/8/8/8/8/8/8 w - - 0 1", text: tr("ด่านบอส! รุกฆาตในตาเดียว 3 ข้อติด") }],
        drills: [
          { goal: "mate", n: 1, fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4", text: tr("รุกฆาตในตาเดียว") },
          { goal: "mate", n: 1, fen: "5rk1/5ppp/8/8/8/8/1B6/K5Q1 w - - 0 1", text: tr("รุกฆาตในตาเดียว") },
          { goal: "mate", n: 1, fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", text: tr("รุกฆาตในตาเดียว") },
        ] },
    ] },
    { title: tr("อาวุธลับ: ส้อม ตรึง เสียบ"), rank: 4, lessons: [
      { title: tr("ส้อม (Fork)"), look: [tr("ส้อม = จ่อ 2 ตัวพร้อมกัน ข้าศึกหนีได้ตัวเดียว"), tr("ม้าส้อมเก่งที่สุด เพราะกระโดดได้และเล็งได้หลายทิศ"), tr("เบี้ยก็ส้อมได้!")], warn: [tr("ช่องที่ไปส้อมต้องไม่โดนกินคืน")],
        teach: [
          { fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", arrows: ["b5c7"], text: tr("ม้า b5 กำลังจะกระโดดไป c7") },
          { fen: "r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1", arrows: ["c7e8", "c7a8"], marks: ["e8", "a8"], text: tr("จาก c7 ม้าจ่อทั้งคิงและเรือ คิงต้องหนี แล้วเราก็กินเรือฟรี นี่คือส้อม") },
        ],
        drills: [
          { goal: "win", target: 450, n: 2, fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", text: tr("หาตาที่ม้าจ่อคิงกับเรือพร้อมกัน แล้วเก็บเรือ"), hint: "b5c7" },
          { goal: "win", target: 200, n: 3, fen: "4k3/8/8/2n1n3/8/3P4/8/7K w - - 0 1", text: tr("ใช้เบี้ยส้อมม้า 2 ตัว แล้วเก็บมาให้ได้ 1 ตัว"), hint: "d3d4" },
        ] },
      { title: tr("ตรึง (Pin) และเสียบ (Skewer)"), look: [tr("ตรึง: หมากที่บังคิงอยู่ ขยับไม่ได้"), tr("เสียบ: รุกตัวใหญ่ข้างหน้า พอมันหลบ ก็กินตัวข้างหลัง")], warn: [tr("หมากที่โดนตรึงช่วยป้องกันอะไรไม่ได้")],
        teach: [
          { fen: "4k3/pp3ppp/2n5/1B6/8/8/PPP2PPP/4K3 w - - 0 1", arrows: ["b5e8"], marks: ["c6"], text: tr("ตรึง: ม้า c6 ขยับไม่ได้ เพราะข้างหลังมันคือคิง ถ้าขยับคิงจะโดนกิน") },
          { fen: "q7/8/8/3k4/8/5B2/8/7K w - - 0 1", arrows: ["f3a8"], marks: ["d5", "a8"], text: tr("เสียบ: บิชอปรุกคิง d5 คิงต้องหลบ แล้วบิชอปก็กินควีน a8 ที่อยู่ข้างหลัง") },
        ],
        drills: [
          { goal: "pick", ok: ["f1b5"], fen: "4k3/pp3ppp/2n5/8/8/8/PPP2PPP/4KB2 w - - 0 1", text: tr("ตรึงม้า c6 ไว้กับคิง"), hint: "f1b5" },
          { goal: "win", target: 450, n: 2, fen: "q7/8/8/3k4/8/8/8/3B3K w - - 0 1", text: tr("เสียบคิงกับควีนดำ แล้วกินควีน"), hint: "d1f3" },
          { goal: "win", target: 300, n: 2, fen: "8/8/8/qk6/8/8/8/6KR w - - 0 1", text: tr("ใช้เรือเสียบคิงกับควีน"), hint: "h1h5" },
        ] },
      { title: tr("ด่านบอส: นักฆ่าเงียบ"), boss: true, look: [tr("หาตัวที่ยืนเรียงกัน หรือยืนให้ม้าแตะได้ 2 ตัว")], warn: [tr("ด่านบอสไม่มีคำใบ้")],
        teach: [{ fen: "8/8/8/8/8/8/8/8 w - - 0 1", text: tr("ด่านบอส! ใช้ส้อมหรือเสียบให้ได้กำไร") }],
        drills: [
          { goal: "win", target: 800, n: 2, fen: "q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", text: tr("ได้กำไรให้มากที่สุด") },
          { goal: "win", target: 200, n: 3, fen: "4k3/8/8/1n1n4/8/2P5/8/4K3 w - - 0 1", text: tr("ได้กำไรอย่างน้อย 1 ตัว") },
        ] },
    ] },
    { title: tr("เปิดเกมแบบมือโปร"), rank: 5, lessons: [
      { title: tr("3 กฎทอง"), look: [tr("1) ยึดกลางกระดานด้วยเบี้ย e หรือ d"), tr("2) ออกม้าและบิชอปให้ไว"), tr("3) เข้าป้อมให้คิงปลอดภัย")], warn: [tr("อย่าเดินตัวเดิมซ้ำ"), tr("อย่าเอาควีนออกเร็ว")],
        teach: [
          { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", arrows: ["e2e4", "d2d4"], marks: ["e4", "d4", "e5", "d5"], text: tr("กฎข้อ 1: ยึด 4 ช่องกลาง เพราะหมากที่อยู่กลางเดินได้หลายทาง") },
          { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", arrows: ["g1f3", "b1c3", "f1c4"], text: tr("กฎข้อ 2: ออกม้าและบิชอปมาทางกลาง") },
          { fen: "r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NP1N2/PPP1QPPP/R1B1K2R w KQkq - 0 1", arrows: ["e1g1", "h1f1"], text: tr("กฎข้อ 3: เข้าป้อม แตะคิงแล้วแตะ g1 เรือจะข้ามมาเอง") },
        ],
        drills: [
          { goal: "pick", ok: ["e2e4", "d2d4"], fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: tr("ตาแรก: ยึดกลางกระดาน"), hint: "e2e4" },
          { goal: "pick", ok: ["g1f3", "b1c3", "f1c4", "f1b5"], fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", text: tr("ออกหมากรอง 1 ตัว"), hint: "g1f3" },
          { goal: "pick", ok: ["e1g1"], fen: "r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NP1N2/PPP1QPPP/R1B1K2R w KQkq - 0 1", text: tr("เข้าป้อม"), hint: "e1g1" },
        ] },
      { title: tr("กับดักเปิดเกม"), look: [tr("ช่อง f7 ของดำ (และ f2 ของขาว) มีแค่คิงคอยคุ้มกัน จึงเป็นจุดที่โดนโจมตีง่าย"), tr("ถ้าอีกฝ่ายเอาควีนออกมาเร็ว ให้ออกม้าหรือบิชอปไปโจมตีควีน ได้ทั้งไล่ควีนและพัฒนาหมากในตาเดียว")], warn: [tr("ตอนเล่นดำ ถ้าควีนขาวอยู่ h5 และบิชอปอยู่ c4 อย่าเพิ่งออกม้าไป f6 เพราะควีนจะกิน f7 รุกฆาตทันที ต้องกัน f7 ก่อน")],
        teach: [
          { fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3", arrows: ["h5f7", "c4f7"], marks: ["f7"], text: tr("กลลวง 4 ตา: ควีนกับบิชอปขาวรุมช่อง f7 ถ้าดำไม่กัน จะโดน Qxf7 รุกฆาต") },
        ],
        drills: [
          { goal: "defend", n: 1, fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3", text: tr("คุณเล่นฝ่ายดำ กันรุกฆาตให้ได้ โดยไม่เสียหมาก"), hint: "g7g6" },
          { goal: "pick", ok: ["g1f3"], fen: "rnb1kbnr/pppp1ppp/8/4p3/4P2q/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3", text: tr("ควีนดำรีบออกมาที่ h4 เร็วเกินไป เดินม้าออกไปโจมตีควีน จะได้ไล่ควีนและออกหมากไปพร้อมกัน"), hint: "g1f3" },
        ] },
      { title: tr("ด่านบอส: เปิดเกมจริง"), boss: true, look: [tr("ยึดกลาง ออกม้าบิชอป 3 ตัว แล้วเข้าป้อม")], warn: [tr("ห้ามเสียหมาก"), tr("ด่านบอสไม่มีคำใบ้")],
        teach: [{ fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: tr("ด่านบอส! เล่นจริงกับคอมพิวเตอร์ ภายใน 10 ตา ต้องออกม้าหรือบิชอป 3 ตัว และเข้าป้อม โดยไม่เสียหมาก") }],
        drills: [
          { goal: "opening", n: 10, level: 1, fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: tr("ออกม้า/บิชอป 3 ตัว + เข้าป้อม ภายใน 10 ตา ห้ามเสียหมาก") },
        ] },
    ] },
    { title: tr("รุกฆาต 2 ตา"), rank: 6, lessons: [
      { title: tr("คิดล่วงหน้า 2 ตา"), look: [tr("ตาแรกบีบคิงให้ไม่มีที่ไป ตาที่สองรุกฆาต"), tr("บางทีต้องยอมเสียตัวใหญ่ก่อน (สละ) เพื่อรุกฆาต")], warn: [tr("ระวังทำให้คิงข้าศึกอับ (ไม่มีทางเดินแต่ไม่โดนรุก = เสมอ)")],
        teach: [
          { fen: "6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1", arrows: ["a2a7", "b1b8"], text: tr("บันไดเรือ: เรือตัวแรกปิดแถว 7 แล้วเรือตัวที่สองรุกฆาตที่แถว 8") },
          { fen: "5r1k/6pp/7N/8/8/1Q6/8/7K w - - 0 1", arrows: ["b3g8", "h6f7"], marks: ["g8"], text: tr("สละควีน: ควีนรุกที่ g8 เรือดำต้องกิน แล้วม้า f7 รุกฆาตเพราะคิงโดนหมากตัวเองล้อม (ม้าอุดอู้)") },
        ],
        drills: [
          { goal: "mate", n: 2, fen: "6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1", text: tr("รุกฆาตใน 2 ตา"), hint: "a2a7" },
          { goal: "mate", n: 2, fen: "5r1k/6pp/7N/8/8/1Q6/8/7K w - - 0 1", text: tr("รุกฆาตใน 2 ตา (ต้องกล้าสละ)"), hint: "b3g8" },
        ] },
      { title: tr("ด่านบอส: 2 ตาจบ"), boss: true, look: [tr("ลองคิดว่าข้าศึกจะตอบยังไง ทุกทาง")], warn: [tr("ด่านบอสไม่มีคำใบ้")],
        teach: [{ fen: "8/8/8/8/8/8/8/8 w - - 0 1", text: tr("ด่านบอส! รุกฆาตใน 2 ตา") }],
        drills: [
          { goal: "mate", n: 2, fen: "7k/8/8/8/8/8/1R6/R5K1 w - - 0 1", text: tr("รุกฆาตใน 2 ตา") },
          { goal: "mate", n: 2, fen: "rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 6", text: tr("ดำเพิ่งกินควีนเรา แต่เรารุกฆาตใน 2 ตาได้!") },
        ] },
    ] },
    { title: tr("ปิดเกม (Endgame)"), rank: 7, lessons: [
      { title: tr("เบี้ยเข้าเมือง"), look: [tr("เบี้ยที่ถึงแถวสุดท้ายเปลี่ยนเป็นควีนได้"), tr("นับตา: เบี้ยเราถึงก่อน หรือคิงข้าศึกตามทัน")], warn: [tr("อย่าปล่อยให้เบี้ยโดนกินระหว่างทาง")],
        teach: [{ fen: "8/8/8/1P6/8/8/8/6k1 w - - 0 1", arrows: ["b5b8"], marks: ["b8"], text: tr("เบี้ยวิ่งไปแถวสุดท้ายแล้วเลือกเป็นควีน คิงดำอยู่ไกล ตามไม่ทัน") }],
        drills: [
          { goal: "promote", n: 3, fen: "8/8/8/1P6/8/8/8/K5k1 w - - 0 1", text: tr("พาเบี้ยเข้าเมืองให้เป็นควีน"), hint: "b5b6" },
          { goal: "promote", n: 6, fen: "7k/7p/8/8/8/8/P7/K7 w - - 0 1", text: tr("แข่งกันวิ่ง! ใครเข้าเมืองก่อน"), hint: "a2a4" },
        ] },
      { title: tr("รุกฆาตด้วยควีน"), look: [tr("ใช้ควีนขังคิงข้าศึกไว้ในกล่องที่เล็กลงเรื่อยๆ (ห่างแบบม้าเดิน)"), tr("พาคิงเรามาช่วย แล้วรุกฆาตที่ขอบกระดาน")], warn: [tr("ระวังอับ! ถ้าคิงข้าศึกไม่โดนรุกแต่ไม่มีที่เดิน = เสมอ"), tr("อย่าเอาควีนไปยืนข้างคิงข้าศึกโดยไม่มีคนคุ้ม")],
        teach: [{ fen: "8/8/8/3k4/8/8/8/Q3K3 w - - 0 1", arrows: ["a1c3", "e1e2"], text: tr("ขั้นตอน: ควีนบีบคิงดำไปที่ขอบกระดาน แล้วเดินคิงเรามาใกล้ จากนั้นรุกฆาต") }],
        drills: [
          { goal: "mate", n: 16, fen: "8/8/8/3k4/8/8/8/Q3K3 w - - 0 1", text: tr("รุกฆาตด้วยควีนกับคิง ภายใน 16 ตา"), hint: "a1c3" },
        ] },
      { title: tr("ด่านบอส: เรือปิดเกม"), boss: true, look: [tr("เรือขังคิงทีละแถว คิงเราเดินเข้าไปประกบ")], warn: [tr("อย่าให้คิงข้าศึกเข้าใกล้เรือเรา"), tr("ด่านบอสไม่มีคำใบ้")],
        teach: [{ fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1", arrows: ["a1a4"], text: tr("ด่านบอส! เรือกับคิงต้องช่วยกัน เรือปิดแถว คิงเราเดินเข้าไปประกบคิงข้าศึก แล้วเรือรุกฆาตที่ขอบ") }],
        drills: [
          { goal: "mate", n: 30, fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1", text: tr("รุกฆาตด้วยเรือกับคิง ภายใน 30 ตา") },
        ] },
    ] },
    { title: tr("ด่านเทพ"), rank: 8, lessons: [
      { title: tr("ล้มคอมพิวเตอร์"), boss: true, look: [tr("ใช้ทุกอย่าง: ยึดกลาง ออกหมาก เข้าป้อม หาของฟรี และอย่าแจกฟรี")], warn: [tr("คอมไม่พลาดง่ายๆ ตรวจทุกตาว่าโดนจ่ออะไรอยู่"), tr("ด่านเทพไม่มีคำใบ้")],
        teach: [{ fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: tr("ด่านสุดท้าย! ชนะคอมพิวเตอร์ให้ได้ทั้ง 3 ระดับ แล้วคุณคือเทพหมากรุก") }],
        drills: [
          { goal: "beat", level: 1, fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: tr("ชนะคอมพิวเตอร์ระดับ Easy") },
          { goal: "beat", level: 2, fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: tr("ชนะคอมพิวเตอร์ระดับ Normal") },
          { goal: "beat", level: 3, fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", text: tr("ชนะคอมพิวเตอร์ระดับ Hard") },
        ] },
    ] },
  ];

  /* ---------- Road to chess master: judging a drill move ---------- */
  const TJ = {
    // Search value of st from side's point of view (two plies plus captures).
    value(st, side, depth) { const v = negamax(st, depth || 2, -1e9, 1e9, 0); return st.turn === side ? v : -v; },
    stat(st, side) { const v = evaluate(st.board); return side === "w" ? v : -v; },
    // A move for the side to move that forces mate within n of its moves, or null.
    mateIn(st, n) {
      const ms = legalMoves(st);
      ms.sort((a, b) => orderScore(st, b) - orderScore(st, a));
      for (const m of ms) {
        const s = applyMove(st, m), rs = legalMoves(s);
        if (!rs.length) { if (inCheck(s.board, s.turn)) return m; continue; }
        if (n > 1 && rs.every(r => TJ.mateIn(applyMove(s, r), n - 1))) return m;
      }
      return null;
    },
    // The defender is to move: does the attacker still force mate within n?
    stillMates(st, n) {
      const rs = legalMoves(st);
      if (!rs.length) return inCheck(st.board, st.turn);
      return rs.every(r => !!TJ.mateIn(applyMove(st, r), n));
    },
    noMateIn1(st) { return !TJ.mateIn(st, 1); },
    mat(board, side) { return board.reduce((s, p) => s + (p ? (p[0] === side ? 1 : -1) * VAL[p[1]] : 0), 0); },
    count(board, side, t) { return board.filter(p => p && p[0] === side && (!t || p[1] === t)).length; },
    // Set up the bookkeeping for a drill.
    begin(d, st) {
      const side = st.turn;
      return { side, used: 0, start: TJ.stat(st, side), startMat: TJ.mat(st.board, side), pawns: TJ.count(st.board, side, "P"), castled: false };
    },
    /* Judge the position after the player's move m.
       Returns ["ok"], ["fail", why], ["go"] (opponent replies) or ["self"] (player moves again). */
    judge(d, c, st, m) {
      const side = c.side, them = opp(side);
      c.used++;
      if (m.castle) c.castled = true;
      const left = (d.n || 99) - c.used;
      const moves = legalMoves(st);
      const mated = !moves.length && inCheck(st.board, st.turn);
      const stuck = !moves.length && !mated;
      if (d.goal === "collect") {
        if (!st.board.some(p => p && p[0] === them && p[1] !== "K")) return ["ok"];
        return left <= 0 ? ["fail", tr("ตาหมดแล้ว แต่ยังเก็บไม่ครบ ลองวางลำดับใหม่")] : ["self"];
      }
      if (d.goal === "pick") return d.ok.includes(uci(m)) ? ["ok"] : ["fail", null];
      if (mated) return ["ok"];
      if (stuck) return ["fail", tr("อับ! คิงข้าศึกไม่มีทางเดินแต่ไม่โดนรุก เกมเลยเสมอ ต้องเว้นช่องให้มันหายใจ")];
      if (d.goal === "keep") return TJ.value(st, side) >= c.start - 100 ? ["ok"] : ["fail", null];
      if (d.goal === "defend") return TJ.noMateIn1(st) && TJ.value(st, side) >= c.start - 150 ? ["ok"] : ["fail", null];
      if (d.goal === "mate") {
        if (left <= 0) return ["fail", tr("ตาหมดแล้ว ยังรุกฆาตไม่สำเร็จ")];
        if (left <= 2 && !TJ.stillMates(st, left)) return ["fail", tr("ตานี้ปล่อยให้คิงข้าศึกหนีรอด")];
        if (d.n > 2 && TJ.value(st, side) < c.start - 300) return ["fail", tr("ระวัง! หมากเรากำลังจะโดนกิน")];
        return ["go"];
      }
      if (d.goal === "win") {
        const v = TJ.value(st, side, d.n > 1 ? 3 : 2);
        if (v < c.start + d.target - 120) return ["fail", null];
        if (TJ.mat(st.board, side) - c.startMat >= d.target - 50) return ["ok"];
        return left <= 0 ? ["fail", null] : ["go"];
      }
      if (d.goal === "promote") {
        if (m.promo) return TJ.value(st, side) >= c.start - 50 ? ["ok"] : ["fail", tr("ควีนใหม่โดนกินทันที")];
        if (TJ.count(st.board, side, "P") < c.pawns) return ["fail", tr("เบี้ยโดนกินแล้ว")];
        return left <= 0 ? ["fail", tr("ตาหมดแล้ว เบี้ยยังไม่ถึงแถวสุดท้าย")] : ["go"];
      }
      if (d.goal === "opening") {
        if (TJ.value(st, side) < c.start - 150) return ["fail", tr("เสียหมากแล้ว! เปิดเกมต้องระวังของฟรี")];
        const r = side === "w" ? 56 : 0;
        const out = [[1, "N"], [2, "B"], [5, "B"], [6, "N"]].filter(([f, t]) => st.board[r + f] !== side + t).length;
        if (c.castled && out >= 3) return ["ok"];
        return left <= 0 ? ["fail", tr("ครบ 10 ตาแล้ว ยังออกหมากหรือเข้าป้อมไม่ครบ")] : ["go"];
      }
      if (d.goal === "beat") return ["go"];
      return ["go"];
    },
    // The opponent's reply during a drill.
    reply(d, st) {
      if (d.goal === "beat" || d.goal === "opening") {
        const lvl = d.level || 2;
        return bestMove(st, lvl === 1 ? 1 : lvl === 2 ? 2 : 3, lvl === 1 ? 140 : d.goal === "opening" ? 40 : 0);
      }
      return bestMove(st, d.goal === "win" ? 3 : 2, 0);
    },
  };

  /* ---------- Road to chess master: the lesson runner ---------- */
  const STAR = n => "★".repeat(n) + "☆".repeat(3 - n);
  /* ---------- Story: Road to master as a war against the Black King, with a prologue, a scene before and
     after each chapter, and three endings decided by how many stars the player earned. ---------- */
  const STORY = {
    // [speaker, Thai, English]; n = narrator, s = Sergeant Somchai, k = the Black King
    prologue: [
      ["n", "คืนนั้น หมอกดำกลืนกระดานไปครึ่งหนึ่ง", "That night, a black fog swallowed half the board."],
      ["n", "ทัพของราชาดำเดินออกมาจากหมอก ไม่มีใครรู้ว่ามาจากไหน", "The Black King's army marched out of it. No one knows where it came from."],
      ["k", "กระดานนี้… จะเป็นของข้าทั้งหมด", "This board… will all be mine."],
      ["s", "ท่านคือพลทหารคนสุดท้ายที่เหลืออยู่ ผมจะฝึกท่านเอง เริ่มกันเลยครับ", "You're the last recruit we have left. I'll train you myself. Let's begin."],
    ],
    before: [
      [["s", "ทหารที่ไม่รู้จักอาวุธตัวเอง ตายก่อนใคร เริ่มจากรู้จักหมากทีละตัว", "A soldier who doesn't know his weapons dies first. We start with each piece, one at a time."]],
      [["s", "ทัพดำชอบวางเหยื่อไว้ ของฟรีบางชิ้นมีกับดักซ่อนอยู่", "The black army loves to leave bait. Some free pieces hide a trap."]],
      [["n", "ทัพดำล้อมหมู่บ้านริมแม่น้ำไว้ ต้องปิดทางหนีของแม่ทัพมันให้ได้", "The black army surrounds the river village. Its general must have no way out."],
       ["s", "ศึกจะจบก็ต่อเมื่อคิงจนมุม จำไว้ครับ", "A war only ends when the king is cornered. Remember that."]],
      [["s", "ศัตรูเก่งขึ้นทุกวัน เราต้องมีอาวุธลับ", "The enemy gets stronger every day. We need secret weapons."]],
      [["n", "ทัพดำเปิดศึกใหญ่ที่ทุ่งกว้าง ใครวางกำลังได้ดีกว่าตั้งแต่ตาแรก คนนั้นชนะ", "The black army opens a great battle on the open plain. Whoever sets up better from the first move wins."]],
      [["n", "หมอกหนาจนมองไม่เห็นช่องข้างหน้า", "The fog is so thick you can't see the next square."],
       ["s", "ในหมอกแบบนี้ ต้องคิดล่วงหน้าให้ได้สองตา", "In fog like this, you have to think two moves ahead."]],
      [["s", "ทหารเราเหลือน้อยแล้ว แต่เหลือน้อยแค่ไหนก็ยังชนะได้ ถ้ารู้วิธี", "We have few soldiers left. But however few, you can still win if you know how."]],
      [["n", "ห้องบัลลังก์เงียบสนิท ราชาดำนั่งรออยู่", "The throne room is silent. The Black King is waiting."],
       ["k", "ในที่สุดเจ้าก็มา… ข้ารอเจ้ามานานแล้ว", "At last you've come… I've waited so long for you."],
       ["n", "ต้องผ่านองครักษ์สามชั้น ง่าย ปกติ และยาก ก่อนจะถึงตัวเขา", "Three guards stand in the way: Easy, Normal and Hard. Then the king himself."]],
    ],
    after: [
      [["n", "เสียงฝีเท้าในหมอกดังใกล้เข้ามา", "Footsteps in the fog grow closer."]],
      [["n", "ท่านยึดหมู่บ้านริมแม่น้ำคืนมาได้ หมอกถอยไปหนึ่งแถว", "You won back the river village. The fog pulls back one row."]],
      [["n", "เชลยดำคนหนึ่งพึมพำซ้ำไปมา", "One black prisoner keeps mumbling the same words."], ["k", "ราชา… ไม่มีหน้า…", "The king… has no face…"]],
      [["n", "ในซากค่ายดำ ท่านเจอกระดานเก่าที่มีชื่อท่านสลักอยู่", "In the ruins of a black camp, you find an old board with your name carved on it."], ["s", "ชื่อท่าน? เป็นไปไม่ได้…", "Your name? That's impossible…"]],
      [["s", "ผมไม่เคยเล่าให้ใครฟัง… ผมเคยเห็นหน้าราชาดำครั้งหนึ่ง แล้วผมก็วิ่งหนี", "I've never told anyone… I saw the Black King's face once. And I ran."]],
      [["n", "ประตูปราสาทดำเปิดอยู่ เหมือนรอท่านมานาน", "The gate of the black castle stands open, as if it has waited for you a long time."]],
      [["s", "ผมไปต่อกับท่านไม่ได้แล้ว ข้างในนั้น ท่านต้องไปคนเดียว", "I can't go any further with you. In there, you go alone."]],
    ],
    endings: {
      normal: { name: ["หมอกยังไม่จาง", "The fog remains"], mood: "",
        lines: [["n", "ราชาดำล้มลง แต่ร่างของเขาสลายกลายเป็นหมอก", "The Black King falls, but his body melts into fog."],
                ["n", "ไกลออกไป หมอกยังคลุมกระดานอยู่ครึ่งหนึ่ง", "Far away, the fog still covers half the board."],
                ["k", "ข้าจะกลับมา… ตราบใดที่เจ้ายังไม่เก่งพอ", "I will return… as long as you are not strong enough."]],
        hint: ["เก็บดาวให้ได้อย่างน้อย 70% แล้วดูตอนจบอีกแบบ", "Earn at least 70% of the stars to see another ending."] },
      good: { name: ["วีรบุรุษแห่งกระดาน", "Hero of the board"], mood: "gold",
        lines: [["n", "ราชาดำคุกเข่าลง หมอกจางหายไปทั้งกระดาน", "The Black King kneels. The fog lifts from the whole board."],
                ["s", "ท่านทำได้! ทั้งอาณาจักรรู้จักชื่อท่านแล้ว", "You did it! The whole kingdom knows your name now."],
                ["n", "แต่ตอนถอดหมวกเกราะของเขา ข้างในกลับว่างเปล่า…", "But when you lift his helmet, there is nothing inside…"],
                ["n", "แล้วราชาดำ… เป็นใครกันแน่?", "So who… was the Black King?"]],
        hint: ["เก็บดาวให้ได้ 95% ขึ้นไป เพื่อดูตอนจบที่แท้จริง", "Earn 95% of the stars or more to see the true ending."] },
      true: { name: ["เงาในกระจก (ตอนจบที่แท้จริง)", "The shadow in the mirror (true ending)"], mood: "gold",
        lines: [["n", "ท่านถอดหมวกเกราะของราชาดำออกช้าๆ", "Slowly, you lift the Black King's helmet."],
                ["n", "ใบหน้าข้างใต้… คือใบหน้าของท่านเอง", "The face underneath… is your own."],
                ["k", "ข้าคือความกลัวแพ้ของเจ้า ทุกครั้งที่เจ้าไม่ยอมแพ้ ข้าก็อ่อนลง", "I am your fear of losing. Every time you refused to give up, I grew weaker."],
                ["n", "หมอกจางไปจนหมด ทั้งสองฝั่งของกระดานสว่างเท่ากัน", "The last of the fog fades. Both sides of the board shine the same."],
                ["s", "ทำความเคารพ… ท่านคือเทพหมากรุกตัวจริง", "Salute… you are a true Chess Master."]],
        hint: ["คุณเห็นตอนจบที่แท้จริงแล้ว ขอบคุณที่เล่นจนจบ", "You've seen the true ending. Thank you for playing to the very end."] },
    },
  };
  const Story = {
    seen() { return lsGet("chess-story", {}); },
    mark(k) { const s = this.seen(); s[k] = 1; lsSet("chess-story", s); },
    // Play a list of lines; tap moves on, Skip jumps to the end. done() runs afterwards.
    play(lines, opts, done) {
      const o = opts || {}, el = document.createElement("div");
      el.id = "story"; if (o.mood) el.dataset.mood = o.mood;
      el.innerHTML = `<div class="fog"></div><div class="fog b"></div>${o.chap ? `<div class="stchap">${esc(o.chap[0])}<b>${esc(o.chap[1])}</b></div>` : ""}
        <button class="skip" type="button">${T("ข้าม", "Skip")} ›</button>
        <div class="panel"><div class="who"></div><div class="box"><span class="name"></span><p class="txt"></p><span class="next">▼</span></div></div>`;
      document.body.appendChild(el);
      try { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 }); } catch (x) {}
      const sarge = document.querySelector("#taunt .soldier").outerHTML;
      const WHO = { n: ["", `<div class="narr">✦</div>`], s: [T("จ่าสมชาย", "Sergeant Somchai"), sarge], k: [T("ราชาดำ", "The Black King"), `<div class="king">♚</div>`] };
      let i = -1, typing = 0, full = "";
      const txt = el.querySelector(".txt");
      const finish = () => { clearInterval(typing); typing = 0; txt.textContent = full; };
      const close = () => {
        clearInterval(typing); el.onclick = null;
        try { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).onfinish = () => el.remove(); } catch (x) { el.remove(); }
        stopVoice();
        if (done) done();
      };
      const next = () => {
        if (typing) { finish(); return; }
        if (++i >= lines.length) { close(); return; }
        const [w, th, en] = lines[i]; full = T(th, en);
        el.querySelector(".who").innerHTML = WHO[w][1];
        el.querySelector(".name").textContent = WHO[w][0];
        el.querySelector(".name").hidden = !WHO[w][0];
        // type the line out, one character (or Thai syllable cluster) at a time
        const parts = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter(LANG, { granularity: "grapheme" }).segment(full)].map(x => x.segment) : [full];
        let k = 0; txt.textContent = "";
        typing = setInterval(() => { txt.textContent += parts[k++] || ""; if (k >= parts.length) finish(); }, 32);
        try { splay(w === "k" ? "contrabass" : "cello", w === "k" ? 31 : 43 + (i % 3) * 2, 2.2, Math.max(mv(), 0.3) * 0.5); if (w === "k") splay("timpani", 36, 1, Math.max(mv(), 0.3) * 0.6); } catch (x) {}
        if (w === "s" && prefs.taunts !== "off") voice(full, 0);
      };
      el.onclick = e => { if (e.target.closest(".skip")) { close(); return; } next(); };
      next();
    },
    chapterTitle(ci) { return [T("บทที่ ", "Chapter ") + (ci + 1), COURSE[ci].title]; },
    // Before a chapter's first lesson, the first time only.
    before(ci, go) {
      const k = "b" + ci;
      if (this.seen()[k] || !STORY.before[ci]) { go(); return; }
      this.mark(k); this.play(STORY.before[ci], { chap: this.chapterTitle(ci) }, go);
    },
    after(ci, go) {
      const k = "a" + ci;
      if (this.seen()[k] || !STORY.after[ci]) { if (go) go(); return; }
      this.mark(k); this.play(STORY.after[ci], {}, go);
    },
    prologue(go) {
      if (this.seen().pro) { go(); return; }
      this.mark("pro"); this.play(STORY.prologue, { chap: [T("เส้นทางสู่เทพ", "Road to master"), T("สงครามแห่งหมอกดำ", "The War of the Black Fog")], mood: "red" }, go);
    },
    // The menu button: chapter progress as pips and a teaser line for what is coming next.
    syncButton() {
      const b = $("openTrain"); if (!b) return;
      const k = Train.rank(), n = COURSE.length, seen = this.seen(), done = k >= n;
      const got = ["normal", "good", "true"].filter(e => seen["e_" + e]).length;
      const tease = !seen.pro ? T("หมอกดำกำลังคืบคลานเข้ามา…", "A black fog is creeping in…")
        : done ? T("ราชาดำล้มแล้ว · ตอนจบ ", "The Black King has fallen · Endings ") + got + "/3"
        : k === n - 1 ? T("ราชาดำรอคุณอยู่ที่ห้องบัลลังก์…", "The Black King waits in his throne room…")
        : T("บทที่ ", "Chapter ") + (k + 1) + "/" + n + " · " + COURSE[k].title;
      b.classList.toggle("done", done);
      b.innerHTML = `<span class="rfog"></span><span class="rfog b"></span>
        <span class="rtxt"><b>${T("เส้นทางสู่เทพ", "Road to master")}</b><small>${esc(tease)}</small>
        <span class="pips">${COURSE.map((_, i) => `<i class="${i < k ? "on" : i === k ? "now" : ""}"></i>`).join("")}</span></span>
        <span class="rking" aria-hidden="true">♚<i></i><i></i></span>${!seen.pro ? `<span class="rnew">${T("ใหม่", "NEW")}</span>` : ""}`;
      b.setAttribute("aria-label", T("เส้นทางสู่เทพ", "Road to master") + ": " + tease);
    },
    // The ending depends on the share of all stars the player has earned.
    endingKey() {
      const all = COURSE.reduce((s, ch) => s + ch.lessons.length * 3, 0), r = Train.totalStars() / all;
      return r >= 0.95 ? "true" : r >= 0.7 ? "good" : "normal";
    },
    ending() {
      const key = this.endingKey(), E = STORY.endings[key], got = this.seen();
      got["e_" + key] = 1; lsSet("chess-story", got);
      track("story_ending", { ending: key, stars: Train.totalStars() });
      closeAll();
      const rest = () => this.play(E.lines, { mood: E.mood, chap: [T("ตอนจบ", "Ending"), T(...E.name)] }, () => this.credits(key));
      if (!(Intro() && Intro().run("ending", rest))) rest();
    },
    credits(key) {
      const E = STORY.endings[key], el = document.createElement("div"); el.id = "story"; el.dataset.mood = E.mood || "";
      const roll = [[T("เกม", "A game by"), "Rochanapan"], [T("จ่าสมชาย", "Sergeant Somchai"), T("รับบทเป็นตัวเอง", "as himself")], [T("ราชาดำ", "The Black King"), "???"],
        [T("ดนตรี", "Music"), "FluidR3 GM soundfont · Frank Wen"], [T("ตัวหมาก", "Pieces"), "Noto Sans Symbols 2"], [T("และ", "And"), T("คุณ ผู้เล่นจนจบ", "you, for playing to the end")]];
      el.innerHTML = `<div class="fog"></div><div class="fog b"></div><button class="skip" type="button">${T("ข้าม", "Skip")} ›</button>
        <div class="roll"><p class="big">CHESS<br>GAME</p>${roll.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join("")}<h3></h3><p class="big" style="margin-top:60px">${T("จบ", "THE END")}</p></div>`;
      document.body.appendChild(el);
      const r = el.querySelector(".roll"); let anim = null;
      const final = () => {
        if (anim) anim.cancel(); r.remove(); el.onclick = null; el.querySelector(".skip").remove();
        const seen = this.seen(), names = ["normal", "good", "true"];
        const box = document.createElement("div"); box.className = "final";
        box.innerHTML = `<div class="end">${T("ตอนจบที่ได้", "ENDING")}</div><h2>${esc(T(...E.name))}</h2>
          <p>${T("ดาว", "Stars")} ${Train.totalStars()} / ${COURSE.reduce((s, ch) => s + ch.lessons.length * 3, 0)}</p>
          <div class="got">${names.map(n => `<span class="${seen["e_" + n] ? "on" : ""}">${seen["e_" + n] ? esc(T(...STORY.endings[n].name)) : "???"}</span>`).join("")}</div>
          <p>${esc(T(...E.hint))}</p>
          <div class="row2"><button class="btn" id="stShare">${T("แชร์", "Share")}</button><button class="btn go" id="stMap">${T("กลับแผนที่", "Back to map")}</button></div>`;
        el.appendChild(box);
        box.querySelector("#stMap").onclick = () => { el.remove(); Train.openList(); };
        box.querySelector("#stShare").onclick = () => {
          const text = T("ฉันเล่นหมากรุกจนจบ ได้ตอนจบ “" + T(...E.name) + "” คุณจะได้ตอนจบไหน?", "I finished Chess Game and got the ending “" + T(...E.name) + "”. Which ending will you get?");
          const url = HOME_URL + "?utm_source=story&utm_medium=share&utm_campaign=ending" + refTag();
          track("share", { method: "story", ending: key });
          if (navigator.share) navigator.share({ title: "Chess Game", text, url }).catch(() => {});
          else try { navigator.clipboard.writeText(text + " " + url); box.querySelector("#stShare").textContent = T("คัดลอกแล้ว", "Copied"); } catch (x) {}
        };
      };
      try { anim = r.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 16000, easing: "linear", fill: "forwards" }); anim.onfinish = final; } catch (x) { final(); }
      el.onclick = e => { if (e.target.closest(".skip")) final(); };
      try { musicSting("rank"); } catch (x) {}
    },
  };
  const Train = {
    ci: -1, li: -1, custom: null, phase: "", step: 0, di: 0, c: null, wait: false, done: false, mistakes: 0, hinted: false, timer: 0, results: [], fb: null,
    chapter() { return this.custom ? this.custom.chapter : COURSE[this.ci]; },
    lesson() { return this.custom ? this.custom.lesson : COURSE[this.ci] && COURSE[this.ci].lessons[this.li]; },
    drill() { const L = this.lesson(); return L && L.drills[this.di]; },
    side() { return this.phase === "drill" && this.c ? this.c.side : "w"; },
    passTurn() { return this.phase === "drill" && this.drill().goal === "collect"; },
    best() { return lsGet("chess-road", {}); },
    lessonStars(ci, li) { return this.best()[ci + "." + li] || 0; },
    chapterDone(ci) { return COURSE[ci].lessons.every((_, li) => this.lessonStars(ci, li) > 0); },
    chapterOpen(ci) { return ci === 0 || this.chapterDone(ci - 1); },
    lessonOpen(ci, li) { return this.chapterOpen(ci) && (li === 0 || this.lessonStars(ci, li - 1) > 0); },
    rank() { let k = 0; while (k < COURSE.length && this.chapterDone(k)) k++; return k; },
    totalStars() { return Object.values(this.best()).reduce((s, v) => s + v, 0); },
    status() {
      if (this.phase === "teach") return tr("ดูลูกศรบนกระดาน แล้วกด ถัดไป");
      if (this.done) return tr("ผ่านแล้ว!");
      if (this.wait) return G.thinking ? tr("ข้าศึกกำลังคิด…") : tr("ดูว่าเกิดอะไรขึ้น…");
      return tr("ภารกิจ: ") + this.drill().text;
    },

    /* --- road map: one town per chapter --- */
    TOWNS: [["ค่ายทหารใหม่", "Recruit Camp"], ["ตลาดเหยื่อล่อ", "Bait Market"], ["หมู่บ้านริมน้ำ", "River Village"], ["ซากค่ายดำ", "Ruined Black Camp"],
      ["ป้อมทุ่งกว้าง", "Plains Fort"], ["หุบเขาหมอก", "Misty Valley"], ["ประตูปราสาทดำ", "Black Castle Gate"], ["บัลลังก์ราชาดำ", "Black King's Throne"]],
    townArt(i) {
      const k = 'stroke="#2F2620" stroke-width="2.5" stroke-linejoin="round"';
      const house = (x, y, w, h, roof, wall = "#FBF7EE") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${wall}" ${k}/><path d="M${x - 4} ${y}L${x + w / 2} ${y - h * .7}L${x + w + 4} ${y}Z" fill="${roof}" ${k}/><rect x="${x + w / 2 - 3}" y="${y + h - 9}" width="6" height="9" fill="#2F2620"/>`;
      const tree = (x, y, c = "#6E8B4E") => `<rect x="${x - 2}" y="${y}" width="4" height="9" fill="#5B4636"/><circle cx="${x}" cy="${y - 4}" r="9" fill="${c}" ${k}/>`;
      const tent = (x, y, w, c) => `<path d="M${x} ${y}L${x + w / 2} ${y - w * .75}L${x + w} ${y}Z" fill="${c}" ${k}/><path d="M${x + w / 2} ${y}L${x + w / 2 - 5} ${y - 12}L${x + w / 2 + 5} ${y - 12}Z" fill="#2F2620"/>`;
      const flag = (x, y, c) => `<path d="M${x} ${y}V${y - 22}" ${k} fill="none"/><path d="M${x} ${y - 22}l14 5-14 5Z" fill="${c}" ${k}/>`;
      const tower = (x, y, w, h, c) => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${c}" ${k}/><path d="M${x} ${y - h}v-6h${w / 4}v4h${w / 4}v-4h${w / 4}v4h${w / 4}v-4" fill="${c}" ${k}/>`;
      const ground = (c = "#B9C98F") => `<ellipse cx="70" cy="80" rx="64" ry="16" fill="${c}" ${k}/>`;
      const art = [
        ground() + tent(14, 80, 34, "#D9A55B") + tent(52, 76, 40, "#C46A3A") + tent(92, 82, 30, "#D9A55B") + flag(70, 40, "#F5C344") + tree(122, 70),
        ground("#D8C79A") + `<rect x="12" y="58" width="34" height="18" fill="#FBF7EE" ${k}/><path d="M8 58h42l-6-12H14Z" fill="#E07A3E" ${k}/><rect x="56" y="54" width="34" height="22" fill="#FBF7EE" ${k}/><path d="M52 54h42l-6-12H58Z" fill="#6E8B4E" ${k}/><rect x="96" y="60" width="30" height="16" fill="#FBF7EE" ${k}/><path d="M92 60h38l-6-11H98Z" fill="#C9A227" ${k}/><circle cx="29" cy="72" r="4" fill="#E0533F"/><circle cx="73" cy="70" r="4" fill="#F5C344"/><circle cx="111" cy="72" r="4" fill="#E0533F"/>`,
        ground() + `<path d="M0 86C30 70 50 96 80 82S120 72 140 80V100H0Z" fill="#7FB3C8" ${k}/>` + house(14, 54, 26, 20, "#C46A3A") + house(56, 48, 30, 24, "#8E5A3C") + house(100, 56, 24, 18, "#C46A3A") + tree(46, 62),
        ground("#A79C86") + `<path d="M18 78l6-28 10 6 8-16 12 38Z" fill="#5C5250" ${k}/><path d="M66 78l4-20 14 4 6 16Z" fill="#4A403E" ${k}/>` + tent(94, 80, 30, "#3B3432") + `<path d="M104 52l4-8M112 50l2-10M120 54l6-8" stroke="#8A7A66" stroke-width="2" stroke-linecap="round"/>` + flag(56, 58, "#2F2620"),
        ground("#C9D69A") + tower(20, 78, 22, 40, "#D8C79A") + `<rect x="40" y="52" width="60" height="26" fill="#E8DFCB" ${k}/><path d="M40 52v-6h10v4h10v-4h10v4h10v-4h10v4h10v-6" fill="#E8DFCB" ${k}/><path d="M64 78v-14a6 6 0 0 1 12 0v14" fill="#2F2620"/>` + tower(98, 78, 22, 40, "#D8C79A") + flag(109, 32, "#F5C344"),
        ground("#9BA88A") + `<path d="M0 80L30 30L52 62L72 22L98 60L116 38L140 80Z" fill="#7A8478" ${k}/><path d="M30 30l-7 12h14ZM72 22l-8 14h16Z" fill="#FBF7EE"/><ellipse cx="40" cy="66" rx="40" ry="9" fill="rgba(240,235,225,.75)"/><ellipse cx="100" cy="72" rx="42" ry="9" fill="rgba(240,235,225,.7)"/>`,
        ground("#6E6460") + tower(16, 80, 26, 56, "#3B3432") + tower(98, 80, 26, 56, "#3B3432") + `<rect x="42" y="38" width="56" height="42" fill="#4A403E" ${k}/><path d="M54 80V58a16 16 0 0 1 32 0v22Z" fill="#1A1412" ${k}/><circle cx="29" cy="40" r="3" fill="#FF4A2E"/><circle cx="111" cy="40" r="3" fill="#FF4A2E"/>`,
        `<ellipse cx="70" cy="82" rx="64" ry="14" fill="#3B2422" ${k}/><path d="M24 82V30l10-12 10 12v52ZM96 82V30l10-12 10 12v52Z" fill="#2A1E1C" ${k}/><path d="M44 82V40h52v42Z" fill="#3B2C2A" ${k}/><path d="M52 82V56h36v26Z" fill="#7A1E1A" ${k}/><path d="M70 44v-6M67 41h6M62 66l-3-14 7 5 4-9 4 9 7-5-3 14Z" fill="#0D0807" stroke="#E0533F" stroke-width="2" stroke-linejoin="round"/><circle cx="34" cy="34" r="2.5" fill="#FF4A2E"/><circle cx="106" cy="34" r="2.5" fill="#FF4A2E"/>`,
      ];
      return `<svg viewBox="0 0 140 100" aria-hidden="true">${art[i]}</svg>`;
    },
    // Town positions on the 1000x560 war map, and the road between them (extra bends so it never runs straight).
    MAP: [[95, 470], [255, 500], [340, 345], [175, 205], [480, 150], [610, 330], [800, 445], [905, 180]],
    ROAD: [[[150, 525], [205, 470]], [[330, 470], [300, 400]], [[260, 300], [230, 250]], [[290, 120], [400, 95]], [[560, 190], [540, 280]], [[700, 330], [740, 420]], [[900, 420], [850, 290]]],
    // Textures painted once on a canvas (cheaper than SVG filters while the map is dragged around).
    tex: {},
    paper() {
      if (this.tex.paper) return this.tex.paper;
      const c = document.createElement("canvas"), W = c.width = 1500, H = c.height = 840, g = c.getContext("2d");
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      g.fillStyle = "#D4BE92"; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const x = rnd() * W, y = rnd() * H, r = 40 + rnd() * 220, gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${rnd() < .5 ? "120,82,40" : "235,220,185"},${.05 + rnd() * .08})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      const im = g.getImageData(0, 0, W, H), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n * .8; }
      g.putImageData(im, 0, 0);
      g.strokeStyle = "rgba(70,45,20,.16)"; g.lineWidth = 3;
      [[W / 3, 0, W / 3 + 6, H], [W * 2 / 3, 0, W * 2 / 3 - 4, H], [0, H / 2, W, H / 2 + 5]].forEach(([a, b, c2, d2]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d2); g.stroke(); });
      const v = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .62); v.addColorStop(0, "rgba(60,35,15,0)"); v.addColorStop(1, "rgba(50,28,10,.6)");
      g.fillStyle = v; g.fillRect(0, 0, W, H);
      return this.tex.paper = c.toDataURL("image/jpeg", .86);
    },
    fog() {
      if (this.tex.fog) return this.tex.fog;
      const c = document.createElement("canvas"), W = c.width = 360, H = c.height = 260, g = c.getContext("2d");
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 90; i++) { const a = rnd() * Math.PI * 2, q = Math.sqrt(rnd()), x = W / 2 + Math.cos(a) * q * W * .36, y = H / 2 + Math.sin(a) * q * H * .32, r = 30 + rnd() * 60;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(28,24,22,${.12 + (1 - q) * .14})`); gr.addColorStop(1, "rgba(28,24,22,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      return this.tex.fog = c.toDataURL("image/png");
    },
    worldMap(rank) {
      const INK = "#3B2A1A", k = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
      let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const pts = [this.MAP[0]]; this.ROAD.forEach((r, i) => pts.push(...r, this.MAP[i + 1]));
      const curve = upto => { const P = pts.slice(0, upto * 3 + 1); let d = `M${P[0]}`;
        for (let i = 0; i < P.length - 1; i++) { const a = P[i - 1] || P[i], b = P[i], c = P[i + 1], e = P[i + 2] || c;
          d += `C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c}`; } return d; };
      // pen-and-ink pieces
      const mtn = (x, y, s, dark) => `<path d="M${x - s} ${y}C${x - s * .6} ${y - s * .45} ${x - s * .25} ${y - s * 1.05} ${x} ${y - s * 1.25}C${x + s * .3} ${y - s * .9} ${x + s * .62} ${y - s * .4} ${x + s} ${y}" fill="${dark ? "#2C211A" : "#CDB688"}" ${k}/>` +
        [1, 2, 3, 4].map(i => `<path d="M${x + s * .08 * i} ${y - s * (1.12 - .2 * i)}l${s * .2} ${s * .34}" stroke="${dark ? "#6B5440" : INK}" stroke-width="1" opacity=".7"/>`).join("");
      const range = (x, y, n, s, dark) => Array.from({ length: n }, (_, i) => mtn(x + i * s * 1.1 + rnd() * 10, y + rnd() * 18 - (i % 2) * 14, s * (.75 + rnd() * .5), dark)).join("");
      const tree = (x, y, dark) => `<path d="M${x} ${y}v-4M${x - 5} ${y - 4}a5 6.5 0 1 1 10 0Z" fill="${dark ? "#2C211A" : "#BFA676"}" stroke="${INK}" stroke-width="1.1"/>`;
      const forest = (x, y, n, dark) => Array.from({ length: n }, (_, i) => tree(x + (i % 6) * 11 + (rnd() * 6 | 0) + (i / 6 | 0) * 5, y + (i / 6 | 0) * 10 + (rnd() * 4 | 0), dark)).join("");
      const hills = (x, y, n) => Array.from({ length: n }, (_, i) => `<path d="M${x + i * 30 - 13} ${y + (i % 2) * 8}q13 -12 26 0" fill="none" ${k} stroke-width="1.2"/><path d="M${x + i * 30 + 2} ${y + (i % 2) * 8 - 6}l5 5" stroke="${INK}" stroke-width=".9"/>`).join("");
      const coast = (d, dx, dy) => `<path d="${d}" fill="#A79670" fill-opacity=".55" stroke="${INK}" stroke-width="1.8"/>` + [1, 2, 3, 4].map(i => `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".9" opacity="${.32 - i * .06}" transform="translate(${dx * i} ${dy * i})"/>`).join("");
      const RIVER = "M430 0C390 110 450 210 395 300S300 430 335 560";
      const F = "#E0CFA4"; // fill for buildings
      const house = (x, y, w = 14, h = 10, f = F) => `<path d="M${x} ${y}v${-h}l${w / 2} ${-h * .7}l${w / 2} ${h * .7}v${h}Z" fill="${f}" ${k}/>`;
      const tent = (x, y, w, f = F) => `<path d="M${x} ${y}l${w / 2} ${-w * .8}l${w / 2} ${w * .8}Z" fill="${f}" ${k}/><path d="M${x + w / 2} ${y}v${-w * .35}" ${k}/>`;
      const tower = (x, y, w, h, f = F) => `<path d="M${x} ${y}v${-h}h${w / 5}v-4h${w / 5}v4h${w / 5}v-4h${w / 5}v4h${w / 5}v${h}Z" fill="${f}" ${k}/>`;
      const spire = (x, y, w, h, f) => `<path d="M${x} ${y}v${-h}l${w / 2} ${-h * .6}l${w / 2} ${h * .6}v${h}Z" fill="${f}" ${k}/>`;
      const banner = (x, y, c = "#8E1B12") => `<path d="M${x} ${y}v-26" ${k}/><path d="M${x} ${y - 26}h14l-4 5 4 5h-14Z" fill="${c}" ${k} stroke-width="1.2"/>`;
      const icon = [
        (x, y) => tent(x - 30, y, 20) + tent(x - 8, y + 2, 24) + tent(x + 16, y, 18) + banner(x + 2, y - 18),
        (x, y) => house(x - 30, y) + house(x - 14, y + 3, 16, 12) + house(x + 4, y, 14, 11) + house(x + 18, y + 4, 13, 9) + `<path d="M${x - 34} ${y + 6}h68" ${k} stroke-width="1"/>`,
        (x, y) => house(x - 26, y - 2) + house(x - 10, y, 16, 12) + house(x + 8, y - 3, 13, 10) + `<path d="M${x + 22} ${y - 2}h18M${x + 26} ${y - 2}v6M${x + 34} ${y - 2}v6" ${k}/>`,
        (x, y) => `<path d="M${x - 30} ${y}l2-14M${x - 24} ${y}l1-20M${x - 18} ${y}l-1-9M${x - 12} ${y}l2-17M${x + 14} ${y}l1-13M${x + 20} ${y}l-2-18M${x + 26} ${y}l1-8" ${k}/><path d="M${x - 8} ${y}l9-16l3 6l7 10Z" fill="#9C876A" ${k}/><path d="M${x - 2} ${y - 22}c-4-6 4-8 0-14M${x + 6} ${y - 20}c-4-6 4-8 0-14" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>`,
        (x, y) => tower(x - 34, y, 14, 30) + `<path d="M${x - 20} ${y}v-18h4v-4h5v4h5v-4h5v4h5v-4h5v4h5v-4h6v18Z" fill="${F}" ${k}/><path d="M${x - 4} ${y}v-8a4 4 0 0 1 8 0v8" fill="${INK}"/>` + tower(x + 20, y, 14, 30) + banner(x + 27, y - 30),
        (x, y) => tower(x - 6, y, 12, 26) + house(x + 10, y, 14, 9) + house(x - 26, y + 2, 13, 9),
        (x, y) => spire(x - 34, y, 16, 34, "#3A2C22") + `<path d="M${x - 18} ${y}v-26h36v26Z" fill="#3A2C22" ${k}/><path d="M${x - 8} ${y}v-14a8 8 0 0 1 16 0v14Z" fill="#120C08" ${k}/>` + spire(x + 18, y, 16, 34, "#3A2C22") + banner(x - 26, y - 54, "#120C08"),
        (x, y) => spire(x - 36, y, 14, 40, "#1E1510") + spire(x - 20, y, 16, 56, "#1E1510") + spire(x - 2, y, 20, 70, "#1E1510") + spire(x + 20, y, 16, 56, "#1E1510") + spire(x + 36, y, 14, 40, "#1E1510") + `<path d="M${x - 36} ${y}h86" ${k}/><rect x="${x + 6}" y="${y - 50}" width="4" height="7" fill="#C0301E"/><rect x="${x - 14}" y="${y - 40}" width="3" height="6" fill="#C0301E"/><rect x="${x + 25}" y="${y - 38}" width="3" height="6" fill="#C0301E"/>`,
      ];
      const swords = (x, y) => `<g transform="translate(${x} ${y})" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"><path d="M-8-8L8 8M8-8L-8 8"/><path d="M-9 3l4 4M9 3l-4 4" stroke-width="1.3"/></g>`;
      const fog = this.fog(), paper = this.paper();
      const serif = `font-family="Cinzel, 'Noto Serif Thai', Georgia, serif"`;
      const label = (x, y, txt, size, fill = INK, extra = "") => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${fill}" ${serif} ${extra} stroke="#D9C59A" stroke-width="4" stroke-opacity=".85" paint-order="stroke">${esc(txt)}</text>`;
      const terrain = `
        <defs><linearGradient id="wmDark" x1="0" x2="1"><stop offset=".56" stop-color="#140C08" stop-opacity="0"/><stop offset=".76" stop-color="#140C08" stop-opacity=".45"/><stop offset="1" stop-color="#0A0604" stop-opacity=".82"/></linearGradient></defs>
        <image href="${paper}" x="0" y="0" width="1000" height="560" preserveAspectRatio="none"/>
        ${coast("M0 0H170C150 50 95 70 60 120S0 150 0 150Z", 7, 7)}${coast("M0 560V380C30 400 40 470 10 560Z", -6, 0)}
        <path d="${RIVER}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="${RIVER}" fill="none" stroke="#B4A47C" stroke-width="5.4"/>
        ${hills(120, 300, 4)}${hills(520, 490, 3)}${hills(250, 160, 2)}
        ${range(530, 285, 4, 30)}${range(240, 70, 3, 28)}${range(680, 170, 4, 34, false)}${range(760, 520, 3, 26, true)}${range(930, 300, 2, 30, true)}
        ${forest(90, 340, 16)}${forest(560, 470, 14)}${forest(250, 420, 6)}${forest(560, 70, 10)}${forest(660, 520, 10, true)}${forest(860, 330, 8, true)}${forest(205, 280, 6)}
        <rect width="1000" height="560" fill="url(#wmDark)"/>
        <g class="fogs"><image href="${fog}" x="700" y="-30" width="360" height="260"/><image href="${fog}" x="760" y="250" width="320" height="230" opacity=".8"/><image href="${fog}" x="540" y="240" width="200" height="140" opacity=".55"/></g>
        ${label(640, 36, T("แผนที่สงครามแห่งหมอกดำ", "Map of the Black Fog War"), 20, INK, 'font-weight="700" letter-spacing="2"')}
        <path d="M520 46h240" stroke="${INK}" stroke-width="1"/><circle cx="640" cy="46" r="2.5" fill="${INK}"/>
        <text x="880" y="540" text-anchor="middle" font-size="15" fill="#C9A35A" ${serif} font-style="italic" letter-spacing="3" opacity=".8">${esc(T("ดินแดนหมอกดำ", "The Black Fog Lands"))}</text>
        <g transform="translate(470 505)" opacity=".85"><circle r="30" fill="none" stroke="${INK}" stroke-width="1"/><circle r="24" fill="none" stroke="${INK}" stroke-width=".6"/>
          <path d="M0-34L5-5 34 0 5 5 0 34-5 5-34 0-5-5Z" fill="#CDB688" stroke="${INK}" stroke-width="1.2"/><path d="M0-34L5-5 0 0ZM34 0L5 5 0 0ZM0 34L-5 5 0 0ZM-34 0L-5-5 0 0Z" fill="${INK}"/>
          <path d="M-17-17l20 17M17-17l-17 20" stroke="${INK}" stroke-width=".6"/><text y="-38" text-anchor="middle" font-size="12" fill="${INK}" ${serif} font-weight="700">N</text></g>`;
      const bridges = [[322, 455], [412, 98]].map(([x, y]) => `<path d="M${x - 14} ${y - 6}h28M${x - 14} ${y + 6}h28" ${k}/><path d="M${x - 9} ${y - 6}v12M${x - 3} ${y - 6}v12M${x + 3} ${y - 6}v12M${x + 9} ${y - 6}v12" stroke="${INK}" stroke-width="1"/>`).join("");
      const road = `<path d="${curve(7)}" fill="none" stroke="#6A1A12" stroke-width="2" stroke-dasharray="1.5 7" stroke-linecap="round" opacity=".75"/>
        ${rank ? `<path d="${curve(Math.min(rank, 7))}" fill="none" stroke="#7A1E14" stroke-width="3" stroke-dasharray="10 5" stroke-linecap="round"/>` : ""}`;
      const towns = COURSE.map((ch, ci) => {
        const [x, y] = this.MAP[ci], open = this.chapterOpen(ci), done = this.chapterDone(ci), here = open && !done, dark = ci >= 6;
        const name = open || ci === rank + 1 ? T(...this.TOWNS[ci]) : "???";
        const got = ch.lessons.reduce((s, _, li) => s + this.lessonStars(ci, li), 0);
        const lc = dark ? "#E3CFA2" : INK, halo = dark ? `stroke="#140C08" stroke-opacity=".7"` : "";
        return `<g class="mt ${open ? "" : "locked"}" data-ci="${ci}" role="button" tabindex="${open ? 0 : -1}" aria-label="${esc(T("บทที่", "Chapter") + " " + (ci + 1) + ": " + name)}">
          <ellipse class="halo" cx="${x}" cy="${y - 14}" rx="62" ry="40" fill="none" stroke="#8E1B12" stroke-width="2" stroke-dasharray="4 5"/>
          <rect x="${x - 60}" y="${y - 80}" width="120" height="130" fill="transparent"/>
          ${icon[ci](x, y)}
          ${open ? "" : `<g class="fogs"><image href="${fog}" x="${x - 110}" y="${y - 100}" width="220" height="160"/></g>`}
          ${done ? swords(x + 46, y - 30) : ""}
          <text x="${x}" y="${y + 24}" text-anchor="middle" font-size="16" font-weight="700" fill="${ci === 7 ? "#E0533F" : lc}" ${serif} stroke="${dark ? "#140C08" : "#D9C59A"}" stroke-width="4" stroke-opacity=".85" paint-order="stroke">${esc(name)}</text>
          <text x="${x}" y="${y + 40}" text-anchor="middle" font-size="11.5" fill="${dark ? "#C9A35A" : "#7A1E14"}" ${serif} font-style="italic" ${halo} stroke-width="3" paint-order="stroke">${T("บทที่", "Chapter")} ${ci + 1}${open ? " · ★ " + got + "/" + ch.lessons.length * 3 : ""}</text>
          ${here ? `<g transform="translate(${x} ${y - 62})"><circle class="pulse" r="16" fill="none" stroke="#8E1B12" stroke-width="2"/><g class="bob"><path d="M0 22L-10 6A13 13 0 1 1 10 6Z" fill="#8E1B12" stroke="#3B0C08" stroke-width="1.6"/><path d="M0-9a3.5 3.5 0 0 1 2.4 6c1.8 1 2.4 2.4 2.4 4H3l1.6 6h-9.2L-3 1h-1.8c0-1.6.6-3 2.4-4A3.5 3.5 0 0 1 0-9Z" fill="#E8D5A8"/></g></g>` : ""}
        </g>`;
      }).join("");
      const eyes = `<g transform="translate(905 70)"><g class="eyes"><ellipse cx="-9" cy="0" rx="5" ry="2.6" fill="#FF3B1F"/><ellipse cx="9" cy="0" rx="5" ry="2.6" fill="#FF3B1F"/></g></g>`;
      return `<svg class="world" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" role="group" aria-label="${esc(T("แผนที่สงคราม", "War map"))}">${terrain}${road}${bridges}${eyes}${towns}</svg>`;
    },
    // Camera over the 1000x560 world: the viewBox always matches the screen's shape, so the map covers it.
    view: {
      init(el, focus) {
        this.el = el; this.svg = el.querySelector("svg"); this.z = 1;
        // start close enough that the map can be dragged in every direction, not only sideways
        this.fit(); this.z = 1.6; this.fit(); this.x = focus[0] - this.w / 2; this.y = focus[1] - 40 - this.h / 2; this.apply();
        // the map element is rebuilt every time the map opens, so its listeners are added each time too
        if (this.bound === el) return; this.bound = el;
        const pts = new Map(); let moved = 0, pinch = 0;
        el.addEventListener("pointerdown", e => { pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; pinch = 0; el.classList.add("drag"); });
        el.addEventListener("pointermove", e => {
          if (!pts.has(e.pointerId)) return;
          const [px, py] = pts.get(e.pointerId), r = el.getBoundingClientRect();
          if (pts.size === 2) {
            const [a, b] = [...pts.values()], d0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
            pts.set(e.pointerId, [e.clientX, e.clientY]);
            const [c, d] = [...pts.values()], d1 = Math.hypot(c[0] - d[0], c[1] - d[1]);
            if (d0) this.zoom(d1 / d0, (c[0] + d[0]) / 2 - r.left, (c[1] + d[1]) / 2 - r.top); moved = 99; pinch = 1; return;
          }
          pts.set(e.pointerId, [e.clientX, e.clientY]);
          moved += Math.abs(e.clientX - px) + Math.abs(e.clientY - py);
          if (moved > 6 && !el.hasPointerCapture(e.pointerId)) {
            try { el.setPointerCapture(e.pointerId); } catch (x) {}
            // on a phone the town card covers a third of the screen; tuck it away while exploring (tap a town to bring it back)
            if (innerWidth < 640 && $("townPanel")) $("townPanel").hidden = true;
          }
          this.x -= (e.clientX - px) * this.w / r.width; this.y -= (e.clientY - py) * this.h / r.height; this.apply();
        });
        const up = e => { pts.delete(e.pointerId); if (!pts.size) el.classList.remove("drag"); };
        el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
        // iOS Safari can still treat a drag on the SVG as a page scroll and cancel the pointer; stop that here
        el.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
        el.addEventListener("gesturestart", e => e.preventDefault());
        // a drag should not count as tapping a town
        el.addEventListener("click", e => { if (moved > 6 || pinch) { e.stopPropagation(); e.preventDefault(); } moved = 0; }, true);
        el.addEventListener("wheel", e => { e.preventDefault(); const r = el.getBoundingClientRect(); this.zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
        if (this.resizing) return; this.resizing = true;
        addEventListener("resize", () => { if (!$("train").hidden) { const cx = this.x + this.w / 2, cy = this.y + this.h / 2; this.fit(); this.x = cx - this.w / 2; this.y = cy - this.h / 2; this.apply(); } });
      },
      fit() {
        const r = this.el.getBoundingClientRect(), a = (r.width || 1) / (r.height || 1);
        // the smallest view that still covers the screen, then zoomed in
        let w = 1000, h = 1000 / a; if (h > 560) { h = 560; w = 560 * a; }
        this.base = [w, h]; this.zmin = Math.min(1, w / 1000, h / 560); this.z = Math.max(this.z, this.zmin); this.w = w / this.z; this.h = h / this.z;
      },
      zoom(f, sx, sy) {
        const r = this.el.getBoundingClientRect(), z = Math.min(4, Math.max(this.zmin, this.z * f)); if (z === this.z) return;
        const wx = this.x + sx / r.width * this.w, wy = this.y + sy / r.height * this.h;
        this.z = z; this.w = this.base[0] / z; this.h = this.base[1] / z;
        this.x = wx - sx / r.width * this.w; this.y = wy - sy / r.height * this.h; this.apply();
      },
      apply() {
        // when zoomed out past the map's edge, keep it centred
        // a little room past the edges so the camera never feels stuck on one axis
        const M = 90;
        this.x = this.w >= 1000 ? (1000 - this.w) / 2 : Math.min(Math.max(this.x, -M), 1000 - this.w + M);
        this.y = this.h >= 560 ? (560 - this.h) / 2 : Math.min(Math.max(this.y, -M), 560 - this.h + M);
        this.svg.setAttribute("viewBox", `${this.x.toFixed(1)} ${this.y.toFixed(1)} ${this.w.toFixed(1)} ${this.h.toFixed(1)}`);
      },
    },
    pickTown(ci) {
      const ch = COURSE[ci], open = this.chapterOpen(ci);
      document.querySelectorAll("#lessonList .mt").forEach(g => g.classList.toggle("sel", +g.dataset.ci === ci));
      const got = ch.lessons.reduce((s, _, li) => s + this.lessonStars(ci, li), 0);
      $("townPanel").hidden = false;
      $("townPanel").innerHTML = `<button class="tp-x" type="button" aria-label="${T("ปิด", "Close")}">✕</button><div class="tp-head"><b>${T("บทที่", "Chapter")} ${ci + 1} · ${esc(T(...this.TOWNS[ci]))}</b>
        <small>${esc(ch.title)} · <span class="tstar">★ ${got}/${ch.lessons.length * 3}</span> · ${T("ยศ", "Rank")} ${esc(RANKS[ch.rank])}</small></div>
        <div class="chap-lessons">${ch.lessons.map((L, li) => {
          const ok = open && this.lessonOpen(ci, li), st = this.lessonStars(ci, li);
          return `<button data-c="${ci}" data-l="${li}" ${ok ? "" : "disabled"} class="${L.boss ? "boss" : ""}"><span>${L.boss ? "👑 " : ""}${esc(L.title)}</span><span class="stars">${ok ? STAR(st) : "🔒"}</span></button>`;
        }).join("")}</div>`;
    },
    openList() {
      clearTimeout(this.timer);
      if (!Story.seen().pro) { closeAll(); Story.prologue(() => this.openList()); return; }
      const rank = this.rank(), all = COURSE.reduce((s, ch) => s + ch.lessons.length * 3, 0);
      $("roadRank").textContent = rank;
      $("roadRankName").textContent = tr("ยศตอนนี้: ") + RANKS[rank];
      $("roadStars").textContent = tr("ดาว ") + this.totalStars() + " / " + all + (rank < COURSE.length ? tr(" · ผ่านบท ") + (rank + 1) + tr(" เพื่อเลื่อนเป็น ") + RANKS[rank + 1] : tr(" · สูงสุดแล้ว!"));
      $("roadMeter").style.width = Math.round(rank / COURSE.length * 100) + "%";
      $("lessonList").innerHTML = `<div class="wmap">${this.worldMap(rank)}</div><div class="map-zoom"><button type="button" data-z="1.4" aria-label="${T("ซูมเข้า", "Zoom in")}">+</button><button type="button" data-z="0.7" aria-label="${T("ซูมออก", "Zoom out")}">−</button><button type="button" data-z="0" aria-label="${T("ดูทั้งแผนที่", "Whole map")}">⤢</button></div>
        <div class="map-hint">${T("ลากเพื่อสำรวจแผนที่ · ถ่างนิ้วเพื่อซูม", "Drag to explore · pinch to zoom")}</div><div class="town-panel" id="townPanel"></div>`;
      this.pickTown(Math.min(rank, COURSE.length - 1));
      const seen = Story.seen(), got = ["normal", "good", "true"].filter(n => seen["e_" + n]).length;
      $("roadEnd").hidden = rank < COURSE.length;
      $("roadEnd").textContent = T("ดูตอนจบ", "Watch the ending") + " (" + got + "/3)";
      closeAll(); show("train");
      if (!document.getElementById("mapFont")) { const l = document.createElement("link"); l.id = "mapFont"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Noto+Serif+Thai:wght@500;700&display=swap"; document.head.appendChild(l); }
      this.view.init($("lessonList").querySelector(".wmap"), this.MAP[Math.min(rank, COURSE.length - 1)]);
    },

    /* --- board helpers --- */
    setBoard(fen) {
      newGame();
      G.mode = "train"; G.tc = null;
      G.st = fromFEN(fen); G.moves = legalMoves(G.st); G.keys = [posKey(G.st)];
      G.names = { w: "White", b: "Black" };
    },
    coach(step, text, acts) {
      $("coach").hidden = false;
      $("coachStep").textContent = step;
      $("coachText").textContent = text;
      $("coachActs").innerHTML = "";
      for (const [label, fn, cls] of acts) {
        const b = document.createElement("button");
        b.className = "btn " + (cls || ""); b.textContent = label; b.addEventListener("click", fn);
        $("coachActs").appendChild(b);
      }
      if (window.speechSynthesis && hasVoice()) {
        const b = document.createElement("button");
        b.className = "btn say"; b.textContent = "🔊"; b.setAttribute("aria-label", tr("อ่านออกเสียง"));
        b.addEventListener("click", () => voice($("coachText").textContent, 1));
        $("coachActs").appendChild(b);
      }
    },
    feedback(text, ok) {
      const el = $("coachFb");
      el.hidden = !text; el.textContent = text || ""; el.className = "coach-fb " + (ok ? "ok" : "bad");
    },
    card() {
      const ch = this.chapter(), L = this.lesson();
      $("lsNum").textContent = this.custom ? ch.title : tr("บทที่ ") + (this.ci + 1) + ": " + ch.title;
      $("lsRank").textContent = RANKS[this.rank()];
      $("lsTitle").textContent = (L.boss ? "👑 " : "") + L.title;
      $("lsLook").innerHTML = L.look.map(t => `<li>${esc(t)}</li>`).join("");
      $("lsWarn").innerHTML = L.warn.map(t => `<li>${esc(t)}</li>`).join("");
      $("lsDots").innerHTML = L.drills.map((_, k) =>
        `<i class="${this.results[k] ? "ok" : ""} ${this.phase === "drill" && k === this.di ? "on" : ""}">${this.results[k] ? STAR(this.results[k]).replace(/☆/g, "") : k + 1}</i>`).join("");
    },

    /* --- teach slides --- */
    start(ci, li, told) {
      clearTimeout(this.timer);
      if (!told && li === 0 && !Story.seen()["b" + ci]) { closeAll(); Story.before(ci, () => this.start(ci, li, true)); return; }
      
      this.ci = ci; this.li = li; this.custom = null; this.results = []; this.step = 0;
      this.teach();
      startMusic();
    },
    teach() {
      const L = this.lesson(), s = L.teach[this.step], last = this.step === L.teach.length - 1;
      this.phase = "teach"; this.wait = true; this.done = false;
      this.setBoard(s.fen);
      G.look = (s.marks || []).map(sqIdx);
      G.arrows = (s.arrows || []).map(a => [sqIdx(a.slice(0, 2)), sqIdx(a.slice(2, 4))]);
      this.feedback("");
      this.coach(tr("สอน ") + (this.step + 1) + "/" + L.teach.length + " · " + L.title, s.text, [
        ...(this.step > 0 ? [[tr("ย้อน"), () => { this.step--; this.teach(); }]] : []),
        [last ? tr("เริ่มโจทย์") : tr("ถัดไป"), () => { if (last) this.startDrill(0); else { this.step++; this.teach(); } }, "go"],
      ]);
      this.card(); closeAll();
      if (Battle() && Battle().resetView) Battle().resetView();
      render();
    },

    /* --- drills --- */
    startDrill(di, keepFb) {
      clearTimeout(this.timer);
      const L = this.lesson(); this.di = di;
      const d = L.drills[di];
      this.phase = "drill"; this.wait = false; this.done = false;
      if (!keepFb) { this.mistakes = 0; this.hinted = false; }
      this.setBoard(d.fen);
      this.c = TJ.begin(d, G.st);
      G.look = null; G.arrows = null;
      if (!keepFb) this.feedback("");
      const acts = [];
      if (!L.boss) acts.push([tr("คำใบ้"), () => this.hint()]);
      acts.push([tr("เริ่มใหม่"), () => this.startDrill(this.di, false)]);
      const extra = d.goal === "collect" ? tr(" (เหลือ ") + d.n + tr(" ตา)") : d.goal === "mate" && d.n > 1 ? "" : "";
      this.coach((this.custom ? tr("โจทย์ประจำวัน") : (L.boss ? tr("👑 ด่านบอส ") : tr("โจทย์ ")) + (di + 1) + "/" + L.drills.length) + (this.c.side === "b" ? tr(" · คุณเล่นฝ่ายดำ") : ""), d.text + extra, acts);
      this.card(); closeAll();
      if (Battle() && Battle().resetView) Battle().resetView();
      render();
    },
    after(m, mover) {
      if (this.phase !== "drill" || mover !== this.side() || this.done) return;
      const d = this.drill();
      const r = TJ.judge(d, this.c, G.st, m);
      if (r[0] === "ok") this.pass();
      else if (G.over && G.over.type === "draw") this.fail(tr("เกมเสมอ ยังไม่ผ่าน"));
      else if (r[0] === "fail") this.fail(r[1]);
      else if (r[0] === "self") {
        if (d.goal === "collect") $("coachText").textContent = d.text + tr(" (เหลือ ") + (d.n - this.c.used) + tr(" ตา)");
        render();
      } else {
        this.wait = true; G.thinking = true; render();
        this.timer = setTimeout(() => {
          const rep = TJ.reply(d, G.st);
          G.thinking = false; this.wait = false;
          if (!rep) { render(); return; }
          doMove(rep);
          if (G.over) this.fail(G.over.type === "draw" ? tr("เกมเสมอ ยังไม่ผ่าน") : tr("โดนรุกฆาต! ลองใหม่อีกครั้ง"));
          else if (d.goal === "mate" && d.n > 2) $("coachText").textContent = d.text + tr(" (เหลือ ") + (d.n - this.c.used) + tr(" ตา)");
        }, d.goal === "beat" ? 250 : 550);
      }
    },
    pass() {
      this.done = true;
      const stars = this.hinted ? 1 : this.mistakes === 0 ? 3 : this.mistakes === 1 ? 2 : 1;
      this.results[this.di] = Math.max(this.results[this.di] || 0, stars);
      const L = this.lesson(), last = this.di === L.drills.length - 1;
      this.feedback(tr("ผ่าน! ") + STAR(stars) + (stars === 3 ? tr(" สุดยอด ไม่พลาดเลย") : this.hinted ? tr(" (ใช้คำใบ้)") : ""), true);
      sfx.promote();
      if (this.custom) this.custom.done(stars);
      else if (last) this.lessonDone();
      else this.coach($("coachStep").textContent, tr("เก่งมาก ไปโจทย์ต่อไปกัน"), [[tr("โจทย์ถัดไป"), () => this.startDrill(this.di + 1), "go"]]);
      this.card(); render();
    },
    fail(why) {
      if (this.done) return;
      this.mistakes++; this.wait = true;
      const d = this.drill();
      const generic = { win: tr("ยังไม่ได้กำไร หรือโดนกินคืน ลองดูใหม่"), keep: tr("ยังเสียหมากอยู่ ดูว่าข้าศึกจ่อกินอะไร"), defend: tr("ยังกันไม่อยู่ หรือเสียหมาก"), pick: tr("ยังไม่ใช่ ลองอ่านกล่อง ควรดูตรงไหน อีกที"), mate: tr("ยังไม่ใช่รุกฆาต ข้าศึกยังหนีได้") };
      this.feedback("✗ " + (why || generic[d.goal] || tr("ยังไม่ผ่าน")), false);
      render();
      if (d.goal === "beat") {
        this.coach($("coachStep").textContent, d.text, [[tr("เล่นใหม่"), () => this.startDrill(this.di, true), "go"], [tr("แผนที่"), () => this.openList()]]);
        return;
      }
      const back = () => { this.timer = setTimeout(() => { if (this.phase === "drill") this.startDrill(this.di, true); }, 2600); };
      // Show how the opponent punishes the mistake, then set the drill up again.
      if (["win", "keep", "defend"].includes(d.goal) && !G.over && G.st.turn !== this.side()) {
        this.timer = setTimeout(() => { const r = bestMove(G.st, 2, 0); if (r && this.phase === "drill") doMove(r); back(); }, 800);
      } else back();
    },
    lessonDone() {
      const key = this.ci + "." + this.li, L = this.lesson();
      const stars = Math.min(...L.drills.map((_, k) => this.results[k] || 1));
      const before = this.rank(), best = this.best();
      best[key] = Math.max(best[key] || 0, stars); lsSet("chess-road", best);
      track("road_lesson", { lesson: key, stars });
      const next = this.li + 1 < this.chapter().lessons.length ? [this.ci, this.li + 1] : this.ci + 1 < COURSE.length && this.chapterDone(this.ci) ? [this.ci + 1, 0] : null;
      this.coach(tr("จบบท: ") + L.title, tr("ได้ ") + STAR(stars) + (stars < 3 ? tr(" ทำใหม่ได้ถ้าอยากได้ 3 ดาว") : tr(" เต็ม!")), [
        ...(next ? [[tr("บทต่อไป"), () => this.start(...next), "go"]] : []),
        [tr("ทำอีกครั้ง"), () => this.start(this.ci, this.li)],
        [tr("แผนที่"), () => this.openList()],
      ]);
      const after = this.rank();
      if (after > before) setTimeout(() => this.rankUp(after), 700);
    },
    rankUp(k) {
      $("ruBadge").textContent = k;
      $("ruBadge").classList.toggle("top", k === COURSE.length);
      $("ruTitle").textContent = k === COURSE.length ? tr("คุณคือเทพหมากรุก!") : tr("เลื่อนยศ!");
      $("ruText").textContent = tr("ยศใหม่: ") + RANKS[k] + (k < COURSE.length ? tr(" บทต่อไปเปิดแล้ว") : tr(" ผ่านครบทุกด่าน สุดยอดจริงๆ"));
      show("rankup"); musicSting("rank");
      this.storyAfter = k;
      if (prefs.taunts !== "off") voice(k === COURSE.length ? tr("ทำความเคารพ ท่านคือเทพหมากรุก") : tr("ยินดีด้วยครับ เลื่อนยศเป็น ") + RANKS[k], 1);
    },
    hint() {
      if (this.phase !== "drill" || this.done || this.wait || this.lesson().boss) return;
      const d = this.drill();
      let m = null;
      if (this.c.used === 0 && d.hint) m = G.moves.find(x => uci(x) === d.hint);
      if (!m && d.goal === "mate" && d.n - this.c.used <= 3) m = TJ.mateIn(G.st, d.n - this.c.used);
      if (!m) m = bestMove(G.st, 3, 0);
      if (!m) return;
      this.hinted = true;
      G.hint = m; G.selected = m.from; G.stuck = null; render();
    },
    exit() { clearTimeout(this.timer); this.phase = ""; this.ci = -1; this.custom = null; $("coach").hidden = true; newGame(); openMenu(); },
  };
  // openTrain is wired by the Angular menu.
  /* ---------- Daily puzzle: one mate-in-1 or mate-in-2 a day, the same for everyone ---------- */
  const Daily = {
    START: Date.UTC(2026, 9, 24), list: null,
    // Dates are counted in Thailand time, so the puzzle changes at midnight there.
    today() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); },
    dayNo(key) { return Math.round((Date.parse(key) - this.START) / 864e5); },
    async load() {
      if (!this.list) this.list = await (await fetch("puzzles.json", { cache: "no-cache" })).json();
      return this.list;
    },
    pick(key) { const n = this.list.length, d = this.dayNo(key); return this.list[((d % n) + n) % n]; },
    solved() { return lsGet("chess-daily", {}); },
    streak() {
      const done = this.solved(); let k = 0, t = Date.parse(this.today());
      if (!done[this.today()]) t -= 864e5; // today not solved yet: count from yesterday
      while (done[new Date(t - k * 864e5).toISOString().slice(0, 10)]) k++;
      return k;
    },
    thaiDate(key) {
      const [y, m, d] = key.split("-").map(Number);
      if (LANG === "en") return d + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] + " " + y;
      return d + " " + [tr("ม.ค."), tr("ก.พ."), tr("มี.ค."), tr("เม.ย."), tr("พ.ค."), tr("มิ.ย."), tr("ก.ค."), tr("ส.ค."), tr("ก.ย."), tr("ต.ค."), tr("พ.ย."), tr("ธ.ค.")][m - 1] + " " + (y + 543 - 2500);
    },
    title(p) { return (p[0].split(" ")[1] === "w" ? tr("ขาว") : tr("ดำ")) + tr("เดิน รุกฆาต") + (p[1] === 1 ? tr("ในตาเดียว") : tr("ใน ") + p[1] + tr(" ตา")); },
    link(key, method) { return HOME_URL + "?puzzle=" + key + "&utm_source=" + method + "&utm_medium=share&utm_campaign=puzzle" + refTag(); },
    async open(key) {
      key = /^\d{4}-\d\d-\d\d$/.test(key || "") && key <= this.today() ? key : this.today();
      try { await this.load(); } catch (e) { $("status").textContent = tr("โหลดโจทย์ไม่สำเร็จ ลองใหม่อีกครั้ง"); return; }
      const p = this.pick(key), no = this.dayNo(key) + 1;
      
      clearTimeout(Train.timer);
      Train.ci = -1; Train.li = 0; Train.results = [];
      Train.custom = {
        key,
        chapter: { title: tr("โจทย์ประจำวัน #") + no + " · " + this.thaiDate(key) },
        lesson: {
          title: this.title(p),
          look: [tr("หาตาที่รุกแล้วคิงหนีไม่ได้ บังไม่ได้ กินตัวที่รุกไม่ได้"), p[1] > 1 ? tr("ตาแรกไม่จำเป็นต้องรุก แต่ต้องทำให้ตาต่อไปรุกฆาตได้แน่ๆ ไม่ว่าอีกฝ่ายจะตอบยังไง") : tr("ลองดูทุกตาที่รุกได้ทีละตา")],
          warn: [tr("รุกแล้วคิงยังหนีได้ ไม่นับ"), tr("ใช้คำใบ้ได้ แต่จะได้ 1 ดาว")],
          drills: [{ goal: "mate", n: p[1], fen: p[0], text: this.title(p), hint: p[2].split(" ")[0] }],
        },
        done: stars => this.done(key, stars),
      };
      track("puzzle_start", { day: no });
      Train.startDrill(0);
      startMusic();
    },
    done(key, stars) {
      const all = this.solved(), first = !all[key];
      all[key] = Math.max(all[key] || 0, stars); lsSet("chess-daily", all);
      const streak = this.streak();
      if (first) track("puzzle_solved", { day: this.dayNo(key) + 1, stars, streak });
      Train.coach(tr("โจทย์ประจำวัน"), tr("แก้ได้แล้ว! ") + STAR(stars) + (streak > 1 ? tr(" · แก้ติดต่อกัน ") + streak + tr(" วัน") : "") + tr(" พรุ่งนี้มีโจทย์ใหม่นะ"), [
        [tr("ชวนเพื่อนมาแก้"), () => this.share(key, stars), "go"],
        [tr("ลองใหม่"), () => this.open(key)],
        [tr("เมนู"), () => Train.exit()],
      ]);
    },
    async share(key, stars) {
      const text = tr("แก้โจทย์หมากรุกประจำวัน ") + this.thaiDate(key) + tr(" ได้ ") + STAR(stars) + tr(" คุณแก้ได้ไหม?");
      track("share", { method: "puzzle" });
      try {
        if (navigator.share) { await navigator.share({ title: tr("โจทย์หมากรุกประจำวัน"), text, url: this.link(key, "native") }); return; }
        await navigator.clipboard.writeText(text + " " + this.link(key, "copy"));
        $("coachText").textContent = tr("คัดลอกลิงก์แล้ว เอาไปวางให้เพื่อนได้เลย");
      } catch (e) {}
    },
    syncButton() {
      const b = $("openDaily"); if (!b) return;
      const ok = !!this.solved()[this.today()], k = this.streak();
      b.innerHTML = tr("Daily puzzle · โจทย์ประจำวัน") + (ok ? " ✓" : "") + (k > 1 ? `<small>${T(`ติดต่อกัน ${k} วัน`, `${k}-day streak`)}</small>` : "");
    },
  };

  $("closeTrain").addEventListener("click", () => { hide("train"); if (G.mode === "train") return; openMenu(); });
  $("lessonList").addEventListener("keydown", e => { const t = e.target.closest(".mt"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); t.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
  $("lessonList").addEventListener("click", e => {
    const zb = e.target.closest(".map-zoom button");
    if (zb) { const v = Train.view, r = v.el.getBoundingClientRect(), f = +zb.dataset.z; v.zoom(f ? f : v.zmin / v.z, r.width / 2, r.height / 2); return; }
    const t = e.target.closest(".mt");
    if (t) { if (!t.classList.contains("locked")) Train.pickTown(+t.dataset.ci); return; }
    if (e.target.closest(".tp-x")) { $("townPanel").hidden = true; document.querySelectorAll("#lessonList .mt.sel").forEach(g => g.classList.remove("sel")); return; }
    const b = e.target.closest("button[data-c]"); if (b && !b.disabled) Train.start(+b.dataset.c, +b.dataset.l); });
  $("lsList").addEventListener("click", () => Train.openList());
  $("lsExit").addEventListener("click", () => Train.exit());
  $("roadEnd").addEventListener("click", () => Story.ending());
  $("roadStory").addEventListener("click", () => { closeAll(); Story.play(STORY.prologue, { chap: [T("เส้นทางสู่เทพ", "Road to master"), T("สงครามแห่งหมอกดำ", "The War of the Black Fog")], mood: "red" }, () => Train.openList()); });
  $("ruOk").addEventListener("click", () => {
    hide("rankup");
    // after a chapter: its story scene; after the last one: the ending
    const k = Train.storyAfter; Train.storyAfter = 0;
    if (k === COURSE.length) Story.ending(); else if (k) Story.after(k - 1);
  });
  $("coachFace").innerHTML = document.querySelector("#taunt .soldier").outerHTML;
  // On wide screens the coach sits at the top of the side panel so the board keeps its full height.
  const wide = matchMedia("(min-width: 821px)");
  function placeCoach() {
    const coach = $("coach");
    if (wide.matches) document.querySelector(".side").prepend(coach);
    else document.querySelector(".board-col").prepend(coach);
  }
  placeCoach();
  wide.addEventListener ? wide.addEventListener("change", placeCoach) : wide.addListener(placeCoach);

  // Teaching arrows on the flat board.
  function drawArrows() {
    let svg = $("arrows");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "arrows"; svg.setAttribute("viewBox", "0 0 8 8"); svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = '<defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.6" markerHeight="2.6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#E07A3E"/></marker></defs><g></g>';
      $("board").appendChild(svg);
    }
    const f = myColor() === "b";
    const pt = i => { const r = i >> 3, c = i & 7; return f ? [7 - c + 0.5, 7 - r + 0.5] : [c + 0.5, r + 0.5]; };
    svg.querySelector("g").innerHTML = (G.arrows || []).map(([a, b]) => {
      const [x1, y1] = pt(a), [x2, y2] = pt(b), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      return `<line x1="${x1 + dx / L * 0.2}" y1="${y1 + dy / L * 0.2}" x2="${x2 - dx / L * 0.32}" y2="${y2 - dy / L * 0.32}" stroke="#E07A3E" stroke-opacity="0.9" stroke-width="0.17" stroke-linecap="round" marker-end="url(#ah)"/>`;
    }).join("");
  }

  /* ---------- Tutorial: a few slides before the first game ---------- */
  const TUT = [
    { t: tr("ยินดีต้อนรับสู่ Chess Game"), b: `<p>เป้าหมายคือ <b>รุกฆาต</b> คิงของอีกฝ่าย คือจ่อกินคิงจนมันไม่มีทางหนี</p><p>ฝ่ายขาวเดินก่อน แล้วผลัดกันเดินทีละตา หมากที่โดนกินจะออกจากกระดาน</p><p>อ่าน 6 หน้าสั้นๆ นี้ก่อน หรือกด ข้าม ก็ได้ ดูซ้ำได้จากปุ่ม How to play ในเมนู</p>` },
    { t: tr("วิธีเดิน"), b: `<ol><li>แตะหมากของคุณ</li><li>จุดเล็กคือช่องที่เดินได้ วงแดงคือกินได้</li><li>แตะช่องนั้นเพื่อเดิน</li></ol><p>ถ้าแตะหมากที่เดินไม่ได้ เกมจะบอกเหตุผล และหมากที่เดินได้จะเรืองแสงสีฟ้า</p>` },
    { t: tr("หมากแต่ละตัว"), b: `<div class="pcs">${[["K", tr("คิง: เดิน 1 ช่องทุกทิศ ต้องปกป้องให้ดี")], ["Q", tr("ควีน: ไปไกลได้ทั้งแนวตรงและแนวทแยง ตัวที่แรงที่สุด")], ["R", tr("เรือ: ไปไกลได้ตามแนวตรง")], ["B", tr("บิชอป: ไปไกลได้ตามแนวทแยง")], ["N", tr("ม้า: เดินเป็นรูปตัว L กระโดดข้ามหมากได้")], ["P", tr("เบี้ย: เดินหน้า 1 ช่อง (ตาแรก 2 ช่อง) กินทแยงหน้า")]].map(([k, d]) => `<div><span class="pc">${GLYPH[k]}</span><span>${d}</span></div>`).join("")}</div>` },
    { t: tr("กฎที่ควรรู้"), b: `<ul><li><b>รุก (Check)</b> คิงโดนจ่อ ต้องแก้ทันที โดยหนี บัง หรือกินตัวที่รุก</li><li><b>เข้าป้อม</b> แตะคิงแล้วแตะช่องที่ห่าง 2 ช่อง เรือจะข้ามมาเอง</li><li><b>เบี้ยถึงแถวสุดท้าย</b> เลือกเปลี่ยนเป็นควีน เรือ บิชอป หรือม้า</li><li>กินผ่าน (en passant) และการเสมอแบบต่างๆ เกมตัดสินให้อัตโนมัติ</li></ul>` },
    { t: tr("ปุ่มในเกม"), b: `<ul><li><b>Undo</b> ย้อนตา, <b>Hint</b> ให้คอมช่วยคิด, <b>Resign</b> ยอมแพ้</li><li><b>3D / 2D</b> สลับสนามรบกับกระดานแบน ลากเพื่อหมุนกล้อง</li><li><b>จ่าสมชาย</b> จะโผล่มาเตือนเวลาเดินเสี่ยงหรือเสียหมาก ปิดได้ใน Settings</li></ul>` },
    { t: tr("เลือกโหมดเล่น"), b: `<ul><li><b>Friend</b> เล่นกับเพื่อนบนเครื่องเดียวกัน</li><li><b>Computer</b> เล่นกับคอม 3 ระดับ</li><li><b>Online</b> เล่นกับเพื่อนคนละเครื่อง สร้างห้องแล้วส่งรหัสให้เพื่อน</li><li><b>Road to master</b> เส้นทางสู่เทพหมากรุก เรียนทีละขั้นตั้งแต่เดินหมากจนล้มคอมได้ ไล่ยศจากทหารเกณฑ์</li><li><b>Leaderboard</b> ใส่ชื่อก่อนเล่น แล้วชื่อจะขึ้นกระดานคะแนน</li></ul><p>มือใหม่แนะนำให้เริ่มที่ Road to master</p>` },
  ];
  const TUT_EN = [
    { t: "Welcome to Chess Game", b: `<p>The goal is to <b>checkmate</b> the other king: attack it so it has no way to escape.</p><p>White moves first, then you take turns one move at a time. Captured pieces leave the board.</p><p>Read these 6 short pages, or tap Skip. You can see them again from How to play in the menu.</p>` },
    { t: "How to move", b: `<ol><li>Tap one of your pieces</li><li>Small dots are squares it can move to, red rings are captures</li><li>Tap that square to move</li></ol><p>If you tap a piece that can't move, the game tells you why, and the pieces that can move glow blue.</p>` },
    { t: "The pieces", b: `<div class="pcs">${[["K", "King: moves 1 square any way. Keep it safe"], ["Q", "Queen: goes far along lines and diagonals. The strongest piece"], ["R", "Rook: goes far along straight lines"], ["B", "Bishop: goes far along diagonals"], ["N", "Knight: moves in an L and can jump over pieces"], ["P", "Pawn: moves forward 1 square (2 on its first move), captures diagonally forward"]].map(([k, d]) => `<div><span class="pc">${GLYPH[k]}</span><span>${d}</span></div>`).join("")}</div>` },
    { t: "Rules to know", b: `<ul><li><b>Check</b>: the king is attacked. Deal with it right away: move away, block, or capture the attacker</li><li><b>Castling</b>: tap the king, then the square 2 away. The rook jumps over by itself</li><li><b>Pawn on the last row</b>: choose a queen, rook, bishop or knight</li><li>En passant and the different kinds of draw are handled automatically</li></ul>` },
    { t: "Game buttons", b: `<ul><li><b>Undo</b> takes back a move, <b>Hint</b> lets the computer think for you, <b>Resign</b> gives up</li><li><b>3D / 2D</b> switches between the battlefield and the flat board. Drag to turn the camera</li><li><b>Sergeant Somchai</b> pops up to warn you about risky moves and lost pieces. Turn him off in Settings</li></ul>` },
    { t: "Choose a mode", b: `<ul><li><b>Friend</b>: play a friend on the same device</li><li><b>Computer</b>: play the computer at 3 levels</li><li><b>Online</b>: play a friend on another device. Create a room and send them the code</li><li><b>Road to master</b>: learn step by step, from moving pieces to beating the computer, rising through the ranks</li><li><b>Leaderboard</b>: enter your name before playing and it shows up on the board</li></ul><p>New players: start with Road to master.</p>` },
  ];
  const TUT_USE = LANG === "th" ? TUT : TUT_EN;
  const Tutorial = {
    i: 0,
    open() { this.i = 0; this.draw(); show("tutorial"); },
    draw() {
      const s = TUT_USE[this.i], last = this.i === TUT_USE.length - 1;
      $("tutTitle").textContent = s.t;
      $("tutBody").innerHTML = s.b;
      $("tutDots").innerHTML = TUT_USE.map((_, k) => `<i class="${k === this.i ? "on" : ""}"></i>`).join("");
      $("tutBack").disabled = this.i === 0;
      $("tutNext").textContent = last ? tr("เริ่มเล่น") : tr("ถัดไป");
    },
    close() { if (!lsGet("chess-tut", 0)) track("tutorial_done", { step: this.i + 1 }); lsSet("chess-tut", 1); hide("tutorial"); if (G.mode !== "online" && G.mode !== "train" && !G.history.length) show("menu"); },
  };
  $("tutBack").addEventListener("click", () => { if (Tutorial.i > 0) { Tutorial.i--; Tutorial.draw(); } });
  $("tutNext").addEventListener("click", () => { if (Tutorial.i < TUT.length - 1) { Tutorial.i++; Tutorial.draw(); } else Tutorial.close(); });
  $("tutSkip").addEventListener("click", () => Tutorial.close());
  $("tutTrain").addEventListener("click", () => { lsSet("chess-tut", 1); Train.openList(); });

  return { Train, Story, Daily, Tutorial, drawArrows, placeCoach, COURSE, STORY };
}
