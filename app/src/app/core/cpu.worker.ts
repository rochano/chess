/// <reference lib="webworker" />
// The computer thinks in a worker so the board, animations and music never freeze (the old game ran it on the page).
import { cpuMove, GameState, Level } from './engine';

addEventListener('message', ({ data }: MessageEvent<{ id: number; st: GameState; level: Level; avoid: string[] }>) => {
  const move = cpuMove(data.st, data.level, new Set(data.avoid));
  postMessage({ id: data.id, move });
});
