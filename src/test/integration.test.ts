import { describe, it, expect, beforeEach } from 'vitest';
import { sessionStore } from '../lib/state/session.svelte';
import { SKILL_TIERS } from '../lib/constants';

describe('Queue Master v3 - Full End-to-End Workflow Integration Test', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      },
    };
    sessionStore.session = null;
  });

  it('runs complete lifecycle: setup -> players -> wand -> courts -> live match -> costs -> end session', () => {
    // 1. Session Initialization
    sessionStore.startSession('badminton', 'doubles', 2, '₱');
    expect(sessionStore.session).not.toBeNull();
    expect(sessionStore.session?.sport).toBe('badminton');
    expect(sessionStore.session?.format).toBe('doubles');
    expect(sessionStore.session?.courts.length).toBe(2);

    // 2. Add Players with 6-tier skill range
    const p1 = sessionStore.addPlayer('Marcus', 6)!; // Pro
    const p2 = sessionStore.addPlayer('Kevin', 5)!;  // High Int
    const p3 = sessionStore.addPlayer('Leo', 4)!;    // Low Int
    const p4 = sessionStore.addPlayer('Chua', 3)!;   // High Beginner
    const p5 = sessionStore.addPlayer('Dave', 2)!;   // Low Beginner
    const p6 = sessionStore.addPlayer('Sam', 1)!;    // Novice
    const p7 = sessionStore.addPlayer('Alex', 3)!;   // High Beginner
    const p8 = sessionStore.addPlayer('Ben', 4)!;    // Low Int

    expect(sessionStore.session?.players.length).toBe(8);

    // Verify Skill Tier constants exist and are distinct
    expect(SKILL_TIERS[1].label).toBe('Novice');
    expect(SKILL_TIERS[6].label).toBe('Pro');

    // 3. Magic Wand Smart Matchmaking
    const wandSuggestion = sessionStore.suggestMatches(2);
    expect(wandSuggestion.matches.length).toBe(2);

    // Verify weight shuffle occurred (non-zero weights)
    expect(wandSuggestion.shuffledWeights.waitingTime).toBeGreaterThan(0);
    expect(wandSuggestion.shuffledWeights.skillBalance).toBeGreaterThan(0);

    // Ensure all 8 players are unique across the 2 suggested doubles matches
    const m1 = wandSuggestion.matches[0];
    const m2 = wandSuggestion.matches[1];
    expect(m1.teamA.length).toBe(2);
    expect(m1.teamB.length).toBe(2);
    const assignedIds = new Set([...m1.teamA, ...m1.teamB, ...m2.teamA, ...m2.teamB]);
    expect(assignedIds.size).toBe(8);

    // 4. Accept Suggestions & Auto-assign to courts
    sessionStore.acceptMatches(wandSuggestion.matches);
    // Court 1 and Court 2 should both become READY with matches assigned
    expect(sessionStore.session?.courts[0].status).toBe('ready');
    expect(sessionStore.session?.courts[1].status).toBe('ready');
    expect(sessionStore.session?.nextUp.length).toBe(0);

    // 5. Dynamic Court Operations: Add and Remove Court
    const court3 = sessionStore.addCourt()!;
    expect(sessionStore.session?.courts.length).toBe(3);
    expect(court3.courtNumber).toBe(3);
    expect(court3.status).toBe('idle');

    // Start match on Court 1
    sessionStore.startMatch(sessionStore.session!.courts[0].id);
    expect(sessionStore.session?.courts[0].status).toBe('in_use');
    expect(sessionStore.session?.courts[0].match?.startedAt).toBeDefined();

    // Verify court removal restrictions:
    // Court 1 cannot be removed because it is in_use!
    const removeCourt1Result = sessionStore.removeCourt(sessionStore.session!.courts[0].id);
    expect(removeCourt1Result).toBe(false);
    expect(sessionStore.session?.courts.length).toBe(3);

    // Court 3 (idle) CAN be removed cleanly
    const removeCourt3Result = sessionStore.removeCourt(court3.id);
    expect(removeCourt3Result).toBe(true);
    expect(sessionStore.session?.courts.length).toBe(2);

    // 6. Complete Match on Court 1
    const court1Match = sessionStore.session!.courts[0].match!;
    const teamAPlayers = [...court1Match.teamA];
    sessionStore.endMatch(sessionStore.session!.courts[0].id, 'A', 21, 18);

    // Court 1 resets to idle
    expect(sessionStore.session?.courts[0].status).toBe('idle');
    expect(sessionStore.session?.courts[0].match).toBeNull();
    expect(sessionStore.session?.history.length).toBe(1);

    // Team A players have gamesPlayed = 1, wins = 1
    for (const pid of teamAPlayers) {
      const player = sessionStore.session?.players.find(p => p.id === pid);
      expect(player?.gamesPlayed).toBe(1);
      expect(player?.wins).toBe(1);
    }

    // 7. Costs and Expenses Section
    // Hourly rate ₱300, total court hours 2.5 (= ₱750)
    // Shuttlecock ₱90 unit cost, 3 shuttles used (= ₱270)
    // Grand Total = ₱1020
    sessionStore.setCosts({
      hourlyRate: 300,
      totalCourtHours: 2.5,
      shuttleUnitCost: 90,
      shuttlesUsed: 3,
    });

    let costsSummary = sessionStore.getCostSummary()!;
    expect(costsSummary.courtTotal).toBe(750);
    expect(costsSummary.equipmentTotal).toBe(270);
    expect(costsSummary.grandTotal).toBe(1020);
    expect(costsSummary.totalAttendees).toBe(8);
    // 1020 / 8 = 127.50
    expect(costsSummary.standardPerPlayer).toBe(127.5);

    // Toggle Payment for Marcus
    sessionStore.togglePlayerPaid(p1.id);
    costsSummary = sessionStore.getCostSummary()!;
    expect(costsSummary.totalCollected).toBe(127.5);
    expect(costsSummary.totalOutstanding).toBe(892.5);

    // Custom Amount Override: Kevin is a guest (₱0 override)
    sessionStore.setPlayerCustomAmount(p2.id, 0);
    costsSummary = sessionStore.getCostSummary()!;
    // Grand total: 1020. Kevin pays 0.
    // Remaining 1020 split across 7 players = 1020 / 7 = 145.71
    expect(costsSummary.standardPerPlayer).toBe(145.71);
    const kevinBreakdown = costsSummary.breakdown.find(b => b.playerId === p2.id);
    expect(kevinBreakdown?.amountDue).toBe(0);
    expect(kevinBreakdown?.isOverride).toBe(true);

    // 8. Settings Customization
    sessionStore.updateSettings('$', { waitingTime: 50 });
    expect(sessionStore.session?.settings.currency).toBe('$');
    expect(sessionStore.session?.settings.baseWeights.waitingTime).toBe(50);

    // 9. End Session & Reset
    const completedSession = sessionStore.endSession();
    expect(completedSession).not.toBeNull();
    expect(sessionStore.session).toBeNull();
  });
});
