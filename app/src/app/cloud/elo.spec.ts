import { eloAfter, pointsFor } from './elo';
describe('elo', () => {
  it('moves by at most K and is symmetric for equal players', () => {
    expect(eloAfter(1000, 1000, 1)).toBe(1016);
    expect(eloAfter(1000, 1000, 0)).toBe(984);
    expect(eloAfter(1000, 1000, 0.5)).toBe(1000);
    expect(Math.abs(eloAfter(800, 1600, 1) - 800)).toBeLessThanOrEqual(32);
  });
  it('scores like the old board', () => {
    expect(pointsFor('w', null)).toBe(3); expect(pointsFor('w', 2)).toBe(2); expect(pointsFor('d', 3)).toBe(1); expect(pointsFor('l', null)).toBe(0);
  });
});
