import { describe, it, expect } from 'vitest';
import { calculateCosts } from '../lib/engine/costs';
import type { Player, SessionCosts } from '../lib/types';

describe('calculateCosts', () => {
  const createPlayer = (id: string, customAmount: number | null = null, paid = false): Player => ({
    id,
    name: `Player ${id}`,
    skill: 3,
    status: 'active',
    waitingSince: Date.now(),
    gamesPlayed: 0,
    wins: 0,
    payment: {
      paid,
      customAmount,
    },
  });

  it('calculates court and equipment total accurately with decimal hours', () => {
    const costs: SessionCosts = {
      hourlyRate: 300,
      totalCourtHours: 2.5, // 2.5 * 300 = 750
      shuttleUnitCost: 100,
      shuttlesUsed: 3,      // 3 * 100 = 300
    };
    const players = [createPlayer('p1'), createPlayer('p2')];

    const result = calculateCosts(costs, players);
    expect(result.courtTotal).toBe(750);
    expect(result.equipmentTotal).toBe(300);
    expect(result.grandTotal).toBe(1050);
    expect(result.standardPerPlayer).toBe(525);
  });

  it('handles custom amount overrides and re-splits remainder among other attendees', () => {
    const costs: SessionCosts = {
      hourlyRate: 400,
      totalCourtHours: 2.0, // 800
      shuttleUnitCost: 50,
      shuttlesUsed: 4,      // 200 => Grand total = 1000
    };

    // 4 players: p1 is a guest (0 override), p2 pays 100 flat, p3 and p4 split the rest
    const players = [
      createPlayer('p1', 0),    // override 0
      createPlayer('p2', 100),  // override 100
      createPlayer('p3', null), // standard split
      createPlayer('p4', null), // standard split
    ];

    const result = calculateCosts(costs, players);
    // Grand total = 1000. Overrides sum = 100. Remainder = 900.
    // 2 standard players => 900 / 2 = 450 each.
    expect(result.grandTotal).toBe(1000);
    expect(result.standardPerPlayer).toBe(450);

    const b1 = result.breakdown.find(b => b.playerId === 'p1');
    const b2 = result.breakdown.find(b => b.playerId === 'p2');
    const b3 = result.breakdown.find(b => b.playerId === 'p3');
    const b4 = result.breakdown.find(b => b.playerId === 'p4');

    expect(b1?.amountDue).toBe(0);
    expect(b1?.isOverride).toBe(true);
    expect(b2?.amountDue).toBe(100);
    expect(b2?.isOverride).toBe(true);
    expect(b3?.amountDue).toBe(450);
    expect(b3?.isOverride).toBe(false);
    expect(b4?.amountDue).toBe(450);
    expect(b4?.isOverride).toBe(false);
  });

  it('tracks collected and outstanding balances accurately based on paid status', () => {
    const costs: SessionCosts = {
      hourlyRate: 200,
      totalCourtHours: 1.0,
      shuttleUnitCost: 0,
      shuttlesUsed: 0,
    };
    // 2 players, 100 each. p1 is paid, p2 is unpaid.
    const players = [
      createPlayer('p1', null, true),
      createPlayer('p2', null, false),
    ];

    const result = calculateCosts(costs, players);
    expect(result.totalCollected).toBe(100);
    expect(result.totalOutstanding).toBe(100);
  });
});
