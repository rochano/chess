/* Auto names for empty name fields: quirky animal + Gen Z vibe (from the original game). */
export const NAME_ANIMALS = [["คาปิบาร่า", "Capybara"], ["อโซลอเติ้ล", "Axolotl"], ["ตุ่นปากเป็ด", "Platypus"], ["แพนด้าแดง", "Red Panda"], ["ควอกก้า", "Quokka"], ["นากทะเล", "Sea Otter"],
  ["ตัวนิ่ม", "Armadillo"], ["สลอธ", "Sloth"], ["อัลปาก้า", "Alpaca"], ["นกฮูก", "Owl"], ["ลิงลม", "Slow Loris"], ["เพนกวิน", "Penguin"], ["ตัวกินมด", "Anteater"],
  ["ปลาปักเป้า", "Pufferfish"], ["ปลาหมึก", "Octopus"], ["ชูก้าไกลเดอร์", "Sugar Glider"], ["หมีน้ำ", "Tardigrade"], ["ทาปีร์", "Tapir"], ["นาร์วาล", "Narwhal"], ["วอมแบต", "Wombat"],
  ["เม่น", "Hedgehog"], ["นกกระทุง", "Pelican"], ["แมวน้ำ", "Seal"], ["ฟลามิงโก", "Flamingo"], ["ไคเมร่า", "Chimera"]];
export const NAME_VIBES = [["ขี้เซา", "Sleepy"], ["สายมู", "Lucky"], ["หัวร้อน", "Spicy"], ["สายชิล", "Chill"], ["ตัวตึง", "Boss"], ["สายเปย์", "Fancy"], ["นิรนาม", "Anonymous"],
  ["งงๆ", "Confused"], ["สายฮา", "Silly"], ["ตาโต", "Wide-eyed"], ["อินดี้", "Indie"], ["ใจบาง", "Soft"], ["ขี้อ้อน", "Clingy"], ["สายลุย", "Bold"], ["ลึกลับ", "Mysterious"]];
export const OLD_HERO = /^((ขุนพล|อัศวิน|นักรบ|จอมทัพ|พลธนู|เสือ|หมาป่า|เหยี่ยว|มังกร|ทหารม้า)(เงา|เหล็ก|หมอก|เพลิง|สายฟ้า|ทมิฬ|พายุ|ศิลา|จันทรา|ไร้นาม)|(Iron|Shadow|Misty|Ember|Storm|Silent|Stone|Moon|Grim|Swift) (Knight|Rook|Warden|Ranger|Falcon|Wolf|Captain|Archer|Lancer|Bishop)) \d\d$/;

export function heroName(lang: 'th' | 'en'): string {
  const r = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const [at, ae] = r(NAME_ANIMALS), [vt, ve] = r(NAME_VIBES);
  return lang === 'th' ? at + vt : ve + ' ' + ae;
}
