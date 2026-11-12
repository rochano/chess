import { Component, inject } from '@angular/core';
import { TrPipe } from '../core/tr.pipe';
import { UiService } from '../core/ui.service';

/** Cards the Road to master code fills in itself (always in the page, hidden when closed). */
@Component({
  selector: 'app-train-cards',
  imports: [TrPipe],
  host: { style: 'display: contents' },
  template: `
<div class="scrim" id="tutorial" [hidden]="!ui.isOpen('tutorial')">
  <div class="card tut" role="dialog" aria-labelledby="tutTitle">
    <div class="tut-dots" id="tutDots" aria-hidden="true"></div>
    <h2 id="tutTitle"></h2>
    <div class="tut-body" id="tutBody"></div>
    <div class="row2"><button class="btn" id="tutBack">{{ 'ย้อนกลับ' | tr }}</button><button class="btn go" id="tutNext">{{ 'ถัดไป' | tr }}</button></div>
    <div class="row2"><button class="linkbtn" id="tutSkip">{{ 'ข้าม' | tr }}</button><button class="linkbtn" id="tutTrain">{{ 'ไปเส้นทางสู่เทพ' | tr }}</button></div>
  </div>
</div>
<div class="scrim" id="train" [hidden]="!ui.isOpen('train')">
  <div class="card road" role="dialog" aria-labelledby="trainTitle">
    <div class="road-map" id="lessonList"></div>
    <div class="road-hud">
      <h2 id="trainTitle">{{ 'เส้นทางสู่เทพหมากรุก' | tr }}</h2>
      <div class="road-head">
        <div class="rank-badge" id="roadRank">0</div>
        <div><b id="roadRankName"></b><small id="roadStars"></small><div class="meter"><i id="roadMeter"></i></div></div>
      </div>
    </div>
    <div class="road-btns"><button class="btn go" id="roadEnd" hidden>{{ 'ดูตอนจบ' | tr }}</button><button class="btn" id="roadStory">{{ 'เรื่องย่อ' | tr }}</button><button class="btn x" id="closeTrain" [attr.aria-label]="'ปิด' | tr">✕</button></div>
  </div>
</div>
<div class="scrim" id="rankup" [hidden]="!ui.isOpen('rankup')">
  <div class="card center" role="dialog" aria-labelledby="ruTitle">
    <div class="rank-badge big" id="ruBadge">1</div>
    <h2 id="ruTitle">{{ 'เลื่อนยศ!' | tr }}</h2>
    <p id="ruText"></p>
    <div class="btns"><button class="btn go" id="ruOk">{{ 'ไปต่อ' | tr }}</button></div>
  </div>
</div>`,
})
export class TrainCardsComponent { protected ui = inject(UiService); }
