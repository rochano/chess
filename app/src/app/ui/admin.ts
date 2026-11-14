import { Component, computed, inject, signal } from '@angular/core';
import { UiService } from '../core/ui.service';
import { CloudService } from '../cloud/cloud.service';
import { flagWords, Pick, PickStatus, ReferralService } from '../cloud/referral.service';

type Row = Pick & { at?: Date };

/** Owner's page (open with ?admin): check and approve the products players recommend, and see who invited how many friends. Thai only. */
@Component({
  selector: 'app-admin',
  host: { style: 'display: contents' },
  styles: `
    #admin .card { width: min(100%, 760px); }
    .ad-seg { max-width: 420px; }
    .ad-list { display: grid; gap: 10px; }
    .ad-item { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 12px; padding: 10px; border: 2px solid var(--ink); border-radius: 12px; background: var(--paper); }
    .ad-item .ph { width: 72px; height: 72px; border-radius: 10px; background: var(--paper-2) center / cover no-repeat; display: grid; place-items: center; font-size: 28px; }
    .ad-item .tx { display: grid; gap: 4px; min-width: 0; }
    .ad-item .tx a { word-break: break-all; font-size: 13px; color: var(--ink-soft); }
    .ad-item .acts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .ad-item .acts .chip { box-shadow: 0 2px 0 var(--ink); }
    .st { font-size: 12px; font-weight: 800; padding: 1px 8px; border-radius: 999px; border: 1.5px solid var(--ink); }
    .st.pending { background: var(--sun); } .st.ok { background: var(--leaf); color: #fff; } .st.no { background: var(--flag); color: #fff; }
    table { width: 100%; border-collapse: collapse; } td, th { text-align: left; padding: 6px 8px; border-bottom: 1.5px solid var(--paper-2); }
    .flag { justify-self: start; font-size: 13px; font-weight: 800; padding: 2px 10px; border-radius: 8px; background: var(--flag); color: #fff; }
    .ad-item.sus { border-color: var(--flag); }
    code { background: var(--paper-2); padding: 2px 6px; border-radius: 6px; word-break: break-all; }
  `,
  template: `
<div class="scrim" id="admin">
  <div class="card" role="dialog" aria-labelledby="adTitle">
    <h2 id="adTitle">หลังร้าน: สินค้าแนะนำของผู้ชวน</h2>
    @switch (state()) {
      @case ('loading') { <p class="fine">กำลังโหลด…</p> }
      @case ('login') {
        <p>เข้าสู่ระบบด้วยบัญชี Google ของเจ้าของเกม</p>
        <button class="btn go" (click)="login()">เข้าสู่ระบบด้วย Google</button>
      }
      @case ('denied') {
        <p>บัญชีนี้ยังไม่ได้เป็นเจ้าของร้าน ถ้านี่คือบัญชีของคุณ ให้เพิ่มสิทธิ์ครั้งเดียวใน Firebase console:</p>
        <p class="fine">Firestore Database &gt; Start collection ชื่อ <code>admins</code> &gt; Document ID ใส่ <code>{{ uid() }}</code> &gt; เพิ่ม field อะไรก็ได้ เช่น <code>name</code> = <code>owner</code> &gt; Save แล้วกลับมาเปิดหน้านี้ใหม่</p>
      }
      @case ('ok') {
        <div class="seg ad-seg">
          <button [attr.aria-pressed]="tab() === 'pending'" (click)="tab.set('pending')">รอตรวจ ({{ count('pending') }})</button>
          <button [attr.aria-pressed]="tab() === 'ok'" (click)="tab.set('ok')">ขึ้นแล้ว ({{ count('ok') }})</button>
          <button [attr.aria-pressed]="tab() === 'no'" (click)="tab.set('no')">ไม่ผ่าน ({{ count('no') }})</button>
          <button [attr.aria-pressed]="tab() === 'people'" (click)="tab.set('people')">ผู้ชวน</button>
        </div>
        @if (tab() === 'people') {
          <table><thead><tr><th>ผู้ชวน</th><th>อีเมล</th><th>เพื่อนที่ชวนมา</th><th>สินค้าที่ขึ้นแล้ว</th></tr></thead>
            <tbody>@for (p of people(); track p.ref) {<tr><td>{{ p.name }}</td><td>{{ p.email || '-' }}</td><td>{{ p.friends }}</td><td>{{ p.ok }}</td></tr>} @empty {<tr><td colspan="4">ยังไม่มีใครชวนเพื่อนมา</td></tr>}</tbody></table>
        } @else {
          <div class="ad-list">
            @for (p of shown(); track p.id) {
              <div class="ad-item" [class.sus]="p.flags.length">
                <span class="ph" [style.background-image]="p.img ? 'url(' + p.img + ')' : null">{{ p.img ? '' : '🛍️' }}</span>
                <div class="tx">
                  @if (p.flags.length) { <span class="flag">⚠ น่าสงสัย: มีคำว่า {{ p.flags.join(', ') }}</span> }
                  <b>{{ p.title }}</b>
                  @if (p.note) { <span>{{ p.note }}</span> }
                  <span class="fine">โดย {{ p.name }} · {{ p.at ? p.at.toLocaleDateString('th-TH') : '' }} · <span [class]="'st ' + p.status">{{ label[p.status] }}</span></span>
                  @if (owners().get(p.owner); as o) { <span class="fine">บัญชี Google: {{ o.name || '-' }} · <a [href]="'mailto:' + o.email">{{ o.email }}</a></span> }
                  <a [href]="p.url" target="_blank" rel="noopener noreferrer">{{ p.url }}</a>
                  <div class="acts">
                    @if (p.status !== 'ok') { <button class="chip" (click)="set(p, 'ok')">ให้ขึ้น</button> }
                    @if (p.status !== 'no') { <button class="chip" (click)="set(p, 'no')">ไม่ผ่าน</button> }
                  </div>
                </div>
              </div>
            } @empty { <p class="fine">ไม่มีรายการ</p> }
          </div>
        }
        <p class="fine">ก่อนกด "ให้ขึ้น" ลองกดลิงก์ดูว่าพาไปสินค้าใน Shopee จริง และชื่อกับรูปตรงกับสินค้า ป้ายแดง "น่าสงสัย" ขึ้นเมื่อเจอคำที่มักผิดข้อกำหนด เป็นแค่การเตือน ระบบดูของจริงหลังลิงก์ไม่ได้</p>
      }
    }
    @if (err()) { <p class="fine" style="color: var(--flag)">{{ err() }}</p> }
    <div class="btns"><button class="btn" (click)="close()">ปิด</button></div>
  </div>
</div>`,
})
export class AdminComponent {
  private ref = inject(ReferralService);
  private cloud = inject(CloudService);
  private ui = inject(UiService);
  protected state = signal<'loading' | 'login' | 'denied' | 'ok'>('loading');
  protected tab = signal<PickStatus | 'people'>('pending');
  protected rows = signal<Row[]>([]);
  protected invites = signal<Map<string, number>>(new Map());
  protected owners = signal<Map<string, { name: string; email: string }>>(new Map());
  protected err = signal('');
  protected readonly label = { pending: 'รอตรวจ', ok: 'ขึ้นแล้ว', no: 'ไม่ผ่าน' };
  protected uid = computed(() => this.cloud.user()?.uid ?? '');
  protected shown = computed(() => this.rows().filter(r => r.status === this.tab()).map(r => ({ ...r, flags: flagWords(r) })).sort((a, b) => (b.at?.getTime() || 0) - (a.at?.getTime() || 0)));
  protected people = computed(() => {
    const names = new Map<string, string>(), ok = new Map<string, number>(), mail = new Map<string, string>();
    for (const r of this.rows()) { names.set(r.ref, r.name); mail.set(r.ref, this.owners().get(r.owner)?.email || ''); if (r.status === 'ok') ok.set(r.ref, (ok.get(r.ref) || 0) + 1); }
    const refs = new Set([...this.invites().keys(), ...names.keys()]);
    return [...refs].map(ref => ({ ref, name: names.get(ref) || 'ผู้เล่น ' + ref, email: mail.get(ref) || '', friends: this.invites().get(ref) || 0, ok: ok.get(ref) || 0 }))
      .sort((a, b) => b.friends - a.friends || b.ok - a.ok);
  });

  constructor() { void this.load(); }
  count(s: PickStatus) { return this.rows().filter(r => r.status === s).length; }

  private async load() {
    this.state.set('loading'); this.err.set('');
    await this.cloud.start();
    if (!this.ref.google) { this.state.set('login'); return; }
    if (!(await this.ref.isAdmin())) { this.state.set('denied'); return; }
    try {
      const [rows, inv, own] = await Promise.all([this.ref.allPicks(), this.ref.inviteCounts(), this.ref.owners().catch(() => new Map())]);
      this.rows.set(rows); this.invites.set(inv); this.owners.set(own); this.state.set('ok');
    } catch (e) { console.warn('admin', e); this.err.set('โหลดข้อมูลไม่ได้ ลองใหม่อีกครั้ง'); this.state.set('ok'); }
  }
  async login() { try { await this.cloud.signInGoogle(); } catch { /* closed */ } await this.load(); }
  async set(p: Pick, s: PickStatus) {
    try { await this.ref.setStatus(p.id!, s); this.rows.update(rs => rs.map(r => r.id === p.id ? { ...r, status: s } : r)); }
    catch (e) { console.warn('status', e); this.err.set('เปลี่ยนสถานะไม่ได้'); }
  }
  close() { this.ui.hide('admin'); history.replaceState(null, '', location.pathname); this.ui.show('menu'); }
}
