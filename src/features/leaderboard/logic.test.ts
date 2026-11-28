import { describe, expect, it } from '@jest/globals';
import { gapToNext, splitPodium } from './logic';

const row = (user_id: string, points: number, rank: number) => ({ user_id, points, rank });
const board = [row('maya', 1520, 1), row('jules', 1390, 2), row('me', 1350, 3), row('alex', 1045, 4), row('priya', 980, 5)];

describe('splitPodium', () => {
  it('puts the first three on the podium and the rest in the list', () => {
    const { podium, rest } = splitPodium(board);
    expect(podium.map((r) => r.user_id)).toEqual(['maya', 'jules', 'me']);
    expect(rest.map((r) => r.user_id)).toEqual(['alex', 'priya']);
  });
  it('skips the podium for groups under three', () => {
    const two = board.slice(0, 2);
    expect(splitPodium(two)).toEqual({ podium: [], rest: two });
    expect(splitPodium([])).toEqual({ podium: [], rest: [] });
  });
});

describe('gapToNext', () => {
  it('gives the points to the next person up', () => {
    expect(gapToNext(board, 'me')).toEqual({ points: 40, rank: 2 });
    expect(gapToNext(board, 'priya')).toEqual({ points: 65, rank: 4 });
  });
  it('is null in first place or when not on the board', () => {
    expect(gapToNext(board, 'maya')).toBeNull();
    expect(gapToNext(board, 'nobody')).toBeNull();
  });
  it('skips people tied with you', () => {
    const tied = [row('a', 100, 1), row('b', 80, 2), row('me', 80, 2)];
    expect(gapToNext(tied, 'me')).toEqual({ points: 20, rank: 1 });
  });
});
