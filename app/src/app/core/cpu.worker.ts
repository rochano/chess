/// <reference lib="webworker" />
// The computer thinks in a worker so the board, animations and music never freeze (the old game ran it on the page).
import { cpuMove, GameState, Level } from './engine';
import { GhostPlay, ghostMove } from './ghost';

addEventListener('message', ({ data }: MessageEvent<{ id: number; st: GameState; level: Level; avoid: string[]; ghost?: GhostPlay }>) => {
  const avoid = new Set(data.avoid);
  const move = data.ghost ? ghostMove(data.st, data.ghost, avoid) : cpuMove(data.st, data.level, avoid);
  postMessage({ id: data.id, move });
});
