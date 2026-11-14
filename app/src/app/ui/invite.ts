import { Component, computed, inject, signal } from '@angular/core';
import { track } from '../core/analytics';
import { I18nService } from '../core/i18n.service';
import { TrPipe } from '../core/tr.pipe';
import { UiService } from '../core/ui.service';
import { CloudService } from '../cloud/cloud.service';
import { IMG_RE, MAX_PICKS, Mood, MOODS, Pick, ReferralService, SHOPEE_RE } from '../cloud/referral.service';
import { HOME_URL } from '../share/share.service';

const EMPTY: Pick = { owner: '', ref: '', name: '', title: '', note: '', url: '', img: '', moods: [...MOODS], status: 'pending' };

/** Invite friends: a personal link, how many friends came, and the products this player recommends to them. */
@Component({
  selector: 'app-invite',
  imports: [TrPipe],
  host: { style: 'display: contents' },
  styles: `
    #invite .card { width: min(100%, 520px); }
    .inv-link { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
    .inv-link input, .pick-form input { width: 100%; min-width: 0; padding: 8px 10px; border: 2.5px solid var(--ink); border-radius: 10px; background: var(--paper-2); font: inherit; font-weight: 700; color: var(--ink); }
    .inv-link input { font-size: 14px; }
    .inv-count { display: flex; align-items: baseline; gap: 10px; padding: 10px 14px; border: 2.5px solid var(--ink); border-radius: 12px; background: var(--sun); }
    .inv-count b { font-family: var(--font-display); font-size: 34px; line-height: 1; }
    .inv-count span { font-weight: 800; }
    .inv-sec { display: grid; gap: 10px; border-top: 2px dashed var(--paper-2); padding-top: 14px; }
    .inv-sec h3 { margin: 0; font-family: var(--font-display); font-weight: 800; font-size: 19px; }
    .picks { display: grid; gap: 8px; }
    .pick { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px; border: 2px solid var(--ink); border-radius: 12px; background: var(--paper); }
    .pick .ph { width: 48px; height: 48px; border-radius: 8px; background: var(--paper-2) center / cover no-repeat; display: grid; place-items: center; font-size: 22px; }
    .pick .tx { min-width: 0; display: grid; gap: 2px; }
    .pick .tx b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pick .acts { display: flex; gap: 6px; }
    .pick .acts .chip { box-shadow: 0 2px 0 var(--ink); }
    .st { justify-self: start; font-size: 12px; font-weight: 800; padding: 1px 8px; border-radius: 999px; border: 1.5px solid var(--ink); }
    .st.pending { background: var(--stone); }
    .st.ok { background: var(--leaf); color: #fff; }
    .st.no { background: var(--flag); color: #fff; }
    .pick-form { display: grid; gap: 10px; padding: 12px; border: 2.5px dashed var(--ink); border-radius: 12px; background: var(--paper); }
    .pick-form label { display: grid; gap: 4px; font-weight: 800; font-size: 14px; }
    .pick-form small { font-weight: 600; color: var(--ink-soft); font-size: 12.5px; line-height: 1.4; }
    .moods { display: flex; flex-wrap: wrap; gap: 6px; }
    .moods .chip { box-shadow: 0 2px 0 var(--ink); }
    .err { color: var(--flag); font-weight: 800; font-size: 14px; }
  `,
  template: `
<div class="scrim" id="invite">
  <div class="card" role="dialog" aria-labelledby="invTitle">
    <h2 id="invTitle">{{ t('ชวนเพื่อนมาเล่น', 'Invite friends') }}</h2>
    <p>{{ t('ส่งลิงก์นี้ให้เพื่อน ใครเข้ามาเล่นครั้งแรกจากลิงก์ของคุณ จะนับเป็นเพื่อนที่คุณชวนมา', 'Send this link to friends. Anyone who plays for the first time through it counts as a friend you invited.') }}</p>
    @if (code()) {
      <div class="inv-link">
        <input readonly [value]="link('copy')" [attr.aria-label]="t('ลิงก์ชวนเพื่อน', 'Invite link')" (focus)="$any($event.target).select()">
        <button class="btn go" (click)="copy()">{{ copied() ? t('คัดลอกแล้ว', 'Copied') : t('คัดลอก', 'Copy') }}</button>
      </div>
      <div class="share-row">
        <button class="chip" (click)="native()">{{ t('แชร์', 'Share') }}</button>
        <button class="chip line" (click)="open('line')">LINE</button>
        <button class="chip fb" (click)="open('facebook')">Facebook</button>
      </div>
      <div class="inv-count"><b>{{ ref.friends() ?? '–' }}</b><span>{{ t('เพื่อนที่มาเล่นจากลิงก์ของคุณ', 'friends joined through your link') }}</span></div>
    } @else {
      <p class="fine">{{ t('กำลังเตรียมลิงก์ของคุณ…', 'Getting your link ready…') }}</p>
    }

    @if (i18n.lang() === 'th') {
    <section class="inv-sec" aria-labelledby="pickHd">
      <h3 id="pickHd">สินค้าแนะนำของฉัน</h3>
      <p class="fine">ใส่ลิงก์ Shopee Affiliate ของคุณเอง เพื่อนที่คุณชวนมาจะเห็นสินค้านี้หลังจบเกม ถ้าเขากดซื้อ ค่าคอมมิชชันจะเข้าบัญชี Shopee ของคุณ สินค้าจะขึ้นหลังผ่านการตรวจแล้ว</p>
      @if (!ref.google) {
        <button class="btn" (click)="login()">เข้าสู่ระบบด้วย Google</button>
        <p class="fine">ต้องเข้าสู่ระบบก่อน เพื่อให้สินค้าของคุณไม่หายเวลาเปลี่ยนเครื่อง</p>
      } @else {
        @if (ref.mine() === null) { <p class="fine">กำลังโหลด…</p> }
        @else {
          <div class="picks">
            @for (p of ref.mine(); track p.id) {
              <div class="pick">
                <span class="ph" [style.background-image]="p.img ? 'url(' + p.img + ')' : null">{{ p.img ? '' : '🛍️' }}</span>
                <span class="tx"><b>{{ p.title }}</b><span class="st" [class]="'st ' + p.status">{{ statusText[p.status] }}</span></span>
                <span class="acts"><button class="chip" (click)="edit(p)">แก้</button><button class="chip" (click)="remove(p)">ลบ</button></span>
              </div>
            } @empty { <p class="fine">ยังไม่มีสินค้า</p> }
          </div>
          @if (form(); as f) {
            <div class="pick-form">
              <label>ชื่อสินค้า<input maxlength="60" [value]="f.title" (input)="patch('title', $any($event.target).value)" placeholder="เช่น กระดานหมากรุกไม้พับได้"></label>
              <label>ข้อความสั้นๆ ชวนซื้อ<input maxlength="90" [value]="f.note" (input)="patch('note', $any($event.target).value)" placeholder="เช่น ผมใช้อยู่ทุกวัน หมากหนักมือดี"></label>
              <label>ลิงก์ Shopee ของคุณ<input inputmode="url" [value]="f.url" (input)="patch('url', $any($event.target).value)" placeholder="https://s.shopee.co.th/…">
                <small>สร้างจากหน้า Shopee Affiliate (กดแชร์สินค้า แล้วคัดลอกลิงก์)</small></label>
              <label>รูปสินค้า (ไม่ใส่ก็ได้)<input inputmode="url" [value]="f.img" (input)="patch('img', $any($event.target).value)" placeholder="https://down-th.img.susercontent.com/…">
                <small>เปิดสินค้าใน Shopee บนคอม คลิกขวาที่รูป แล้วเลือก "คัดลอกที่อยู่รูปภาพ"</small></label>
              <div class="field"><span class="lbl">แสดงหลังเกมแบบไหน</span>
                <div class="moods">@for (m of moods; track m) {<button class="chip" [attr.aria-pressed]="f.moods.includes(m)" (click)="toggle(m)">{{ moodText[m] }}</button>}</div></div>
              @if (err()) { <p class="err">{{ err() }}</p> }
              <div class="row2"><button class="btn" (click)="form.set(null); err.set('')">ยกเลิก</button><button class="btn go" [disabled]="busy()" (click)="save()">{{ busy() ? 'กำลังบันทึก…' : 'บันทึก' }}</button></div>
            </div>
          } @else if ((ref.mine()?.length || 0) < max) {
            <button class="btn" (click)="add()">+ เพิ่มสินค้า</button>
          }
        }
      }
    </section>
    }
    <div class="btns"><button class="btn" (click)="close()">{{ 'Back to menu' | tr }}</button></div>
  </div>
</div>`,
})
export class InviteComponent {
  protected ref = inject(ReferralService);
  protected i18n = inject(I18nService);
  private cloud = inject(CloudService);
  private ui = inject(UiService);
  protected readonly moods = MOODS;
  protected readonly max = MAX_PICKS;
  protected readonly moodText: Record<Mood, string> = { lost: 'หลังแพ้', won: 'หลังชนะ', tense: 'เกมเครียด', learn: 'อยากเก่งขึ้น' };
  protected readonly statusText = { pending: 'รอตรวจ', ok: 'ขึ้นแล้ว', no: 'ไม่ผ่าน ลองแก้แล้วส่งใหม่' };
  protected code = computed(() => this.cloud.user() ? this.ref.code : '');
  protected copied = signal(false);
  protected form = signal<Pick | null>(null);
  protected err = signal('');
  protected busy = signal(false);

  constructor() {
    track('invite_open', {});
    void this.cloud.start().then(() => { void this.ref.loadFriends(); if (this.ref.google) void this.ref.loadMine().catch(() => this.ref.mine.set([])); });
  }
  t(th: string, en: string) { return this.i18n.t(th, en); }

  link(method: string) { return HOME_URL + '?ref=' + this.code() + '&utm_source=' + method + '&utm_medium=invite&utm_campaign=friend'; }
  private text() { return this.t('มาเล่นหมากรุก 3 มิติกับฉัน ฟรี ไม่ต้องสมัคร', 'Come play 3D chess with me. Free, no sign-up'); }
  async copy() {
    try { await navigator.clipboard.writeText(this.link('copy')); this.copied.set(true); setTimeout(() => this.copied.set(false), 1800); } catch { /* blocked */ }
    track('share', { method: 'copy', campaign: 'invite' });
  }
  native() {
    track('share', { method: 'native', campaign: 'invite' });
    if (navigator.share) navigator.share({ title: 'Chess Game', text: this.text(), url: this.link('native') }).catch(() => {});
    else void this.copy();
  }
  open(m: 'line' | 'facebook') {
    track('share', { method: m, campaign: 'invite' });
    const u = encodeURIComponent(this.link(m)), tx = encodeURIComponent(this.text());
    window.open(m === 'line' ? 'https://social-plugins.line.me/lineit/share?url=' + u + '&text=' + tx : 'https://www.facebook.com/sharer/sharer.php?u=' + u, '_blank', 'noopener,width=600,height=640');
  }

  async login() {
    try { await this.cloud.signInGoogle(); } catch { return; }
    if (this.ref.google) { void this.ref.loadFriends(); await this.ref.loadMine().catch(() => this.ref.mine.set([])); }
  }

  add() { this.err.set(''); this.form.set({ ...EMPTY, moods: [...MOODS] }); }
  edit(p: Pick) { this.err.set(''); this.form.set({ ...p, moods: [...p.moods] }); }
  patch<K extends keyof Pick>(k: K, v: Pick[K]) { this.form.update(f => f && { ...f, [k]: v }); }
  toggle(m: Mood) { this.form.update(f => f && { ...f, moods: f.moods.includes(m) ? f.moods.filter(x => x !== m) : [...f.moods, m] }); }

  async save() {
    const f = this.form(); if (!f) return;
    const e = f.title.trim().length < 2 ? 'ใส่ชื่อสินค้าก่อนนะ'
      : !SHOPEE_RE.test(f.url.trim()) ? 'ลิงก์ต้องเป็นลิงก์ Shopee (ขึ้นต้นด้วย https://s.shopee.co.th/ หรือ https://shopee.co.th/)'
      : f.img.trim() && !IMG_RE.test(f.img.trim()) ? 'รูปต้องเป็นรูปจาก Shopee (ที่อยู่มีคำว่า susercontent.com) หรือเว้นว่างไว้'
      : !f.moods.length ? 'เลือกอย่างน้อยหนึ่งแบบว่าจะแสดงหลังเกมแบบไหน' : '';
    this.err.set(e); if (e) return;
    this.busy.set(true);
    try { await this.ref.savePick(f); this.form.set(null); }
    catch (x) { console.warn('save pick', x); this.err.set('บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ'); }
    finally { this.busy.set(false); }
  }
  remove(p: Pick) {
    this.ui.confirm('ลบสินค้านี้?', p.title, 'ลบ', () => void this.ref.deletePick(p.id!).catch(() => {}));
  }
  close() { this.ui.hide('invite'); this.ui.show('menu'); }
}
