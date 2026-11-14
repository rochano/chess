import { Injectable } from '@angular/core';
import { cpuMove, GameState, legalMoves, Level, Move } from './engine';

@Injectable({ providedIn: 'root' })
export class CpuService {
  private worker?: Worker;
  private seq = 0;
  private waiting = new Map<number, (m: Move | null) => void>();

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./cpu.worker', import.meta.url), { type: 'module' });
      this.worker.onmessage = ({ data }) => { this.waiting.get(data.id)?.(data.move); this.waiting.delete(data.id); };
    }
  }

  /** Pick the computer's move. Like the original game, it always takes at least a short "think" pause. */
  async think(st: GameState, level: Level, avoid: string[] = []): Promise<Move | null> {
    // Longer in busy positions, a little random, never instant (thinkTime in the original).
    const busy = Math.min(1, legalMoves(st).length / 35);
    const pause = new Promise(r => setTimeout(r, 900 + busy * 900 + Math.random() * 900));
    const pick = this.worker
      ? new Promise<Move | null>(res => { const id = ++this.seq; this.waiting.set(id, res); this.worker!.postMessage({ id, st, level, avoid }); })
      : Promise.resolve(cpuMove(st, level, new Set(avoid)));
    const [move] = await Promise.all([pick, pause]);
    return move;
  }
}
