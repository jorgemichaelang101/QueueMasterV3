import { describe, it, expect } from 'vitest';
import { generateWandQueue, countPartnerHistory, countOpponentHistory, shuffleWeights } from '../lib/engine/wand';
import type { Player, Match, WandWeights, SkillTier } from '../lib/types';

describe('Magic Wand Queue Engine', () => {
  const baseWeights: WandWeights = {
    waitingTime: 35,
    gamesPlayed: 30,
    repetition: 20,
    skillBalance: 15,
  };

  const createPlayer = (
    id: string,
    name: string,
    skill: SkillTier,
    waitingMinsAgo: number,
    gamesPlayed = 0,
    status: 'active' | 'sitting_out' = 'active'
  ): Player => ({
    id,
    name,
    skill,
    status,
    waitingSince: Date.now() - waitingMinsAgo * 60 * 1000,
    gamesPlayed,
    wins: 0,
    payment: { paid: false, customAmount: null },
  });

  it('weight shuffle stays within roughly ±40% range', () => {
    const shuffled = shuffleWeights(baseWeights);
    expect(shuffled.waitingTime).toBeGreaterThanOrEqual(14);
    expect(shuffled.waitingTime).toBeLessThanOrEqual(56);
  });

  it('excludes sitting_out players from matchmaking', () => {
    const players: Player[] = [
      createPlayer('p1', 'Alice', 3, 20),
      createPlayer('p2', 'Bob', 3, 19),
      createPlayer('p3', 'Charlie', 3, 18),
      createPlayer('p4', 'Diana', 3, 17, 0, 'sitting_out'), // Sitting out!
      createPlayer('p5', 'Eve', 3, 16),
    ];

    const suggestion = generateWandQueue(players, [], 'doubles', baseWeights, 1);
    expect(suggestion.matches.length).toBe(1);
    const match = suggestion.matches[0];
    const matchPlayers = [...match.teamA, ...match.teamB];

    expect(matchPlayers).not.toContain('p4');
    expect(matchPlayers).toContain('p5');
  });

  it('produces doubles matches with 2 players per team', () => {
    const players: Player[] = [
      createPlayer('p1', 'Alice', 2, 25),
      createPlayer('p2', 'Bob', 5, 20),
      createPlayer('p3', 'Charlie', 2, 18),
      createPlayer('p4', 'Diana', 5, 15),
    ];

    const suggestion = generateWandQueue(players, [], 'doubles', baseWeights, 1);
    expect(suggestion.matches.length).toBe(1);
    const m = suggestion.matches[0];
    expect(m.teamA.length).toBe(2);
    expect(m.teamB.length).toBe(2);
    // Unique players
    const unique = new Set([...m.teamA, ...m.teamB]);
    expect(unique.size).toBe(4);
  });

  it('produces singles matches with 1 player per team', () => {
    const players: Player[] = [
      createPlayer('p1', 'Alice', 3, 25),
      createPlayer('p2', 'Bob', 3, 20),
      createPlayer('p3', 'Charlie', 3, 15),
    ];

    const suggestion = generateWandQueue(players, [], 'singles', baseWeights, 1);
    expect(suggestion.matches.length).toBe(1);
    const m = suggestion.matches[0];
    expect(m.teamA.length).toBe(1);
    expect(m.teamB.length).toBe(1);
  });

  it('avoids repeat partners when alternative pairings exist', () => {
    // 4 players. Suppose p1 and p2 have already played together 3 times.
    const pastMatches: Match[] = [
      { id: 'm1', teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
      { id: 'm2', teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
      { id: 'm3', teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
    ];

    const p1 = createPlayer('p1', 'Alice', 3, 10, 3);
    const p2 = createPlayer('p2', 'Bob', 3, 10, 3);
    const p3 = createPlayer('p3', 'Charlie', 3, 10, 3);
    const p4 = createPlayer('p4', 'Diana', 3, 10, 3);

    // High repetition weight test
    const highRepWeight: WandWeights = {
      waitingTime: 10,
      gamesPlayed: 10,
      repetition: 80,
      skillBalance: 10,
    };

    const suggestion = generateWandQueue([p1, p2, p3, p4], pastMatches, 'doubles', highRepWeight, 1);
    const m = suggestion.matches[0];

    // p1 and p2 should NOT be paired together on the same team!
    const p1AndP2Teammates =
      (m.teamA.includes('p1') && m.teamA.includes('p2')) ||
      (m.teamB.includes('p1') && m.teamB.includes('p2'));

    expect(p1AndP2Teammates).toBe(false);
  });

  it('does not duplicate players across multiple generated matches', () => {
    const players: Player[] = [];
    for (let i = 1; i <= 8; i++) {
      players.push(createPlayer(`p${i}`, `Player ${i}`, 3, 30 - i));
    }

    const suggestion = generateWandQueue(players, [], 'doubles', baseWeights, 2);
    expect(suggestion.matches.length).toBe(2);

    const m1 = suggestion.matches[0];
    const m2 = suggestion.matches[1];
    const allAssigned = [...m1.teamA, ...m1.teamB, ...m2.teamA, ...m2.teamB];
    const unique = new Set(allAssigned);
    expect(unique.size).toBe(8);
  });
});
