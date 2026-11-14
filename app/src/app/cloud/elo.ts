/** Fixed ratings for the computer, so games against it move a player's Elo. */
export const CPU_ELO: Record<number, number> = { 1: 800, 2: 1200, 3: 1600 };
export const START_ELO = 1000;
/** New rating after one game; score 1 win, 0.5 draw, 0 loss. Change is capped at ±32 (K). */
export function eloAfter(me: number, them: number, score: number, k = 32) {
  const expect = 1 / (1 + 10 ** ((them - me) / 400));
  return Math.round(me + k * (score - expect));
}
/** Points like the old leaderboard: win vs person 3, draw 1, win vs CPU Easy 1 / Normal 2 / Hard 3. */
export function pointsFor(res: 'w' | 'd' | 'l', cpuLevel: number | null) {
  return res === 'd' ? 1 : res === 'l' ? 0 : cpuLevel ? cpuLevel : 3;
}
