import { describe, it, expect, beforeEach } from 'vitest';
import { sessionStore } from '../lib/state/session.svelte';
import { STORAGE_KEY } from '../lib/constants';

describe('SessionStore operations', () => {
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

  it('starts a session with correct court count and default costs', () => {
    sessionStore.startSession('badminton', 'doubles', 2, '₱');
    expect(sessionStore.session).not.toBeNull();
    expect(sessionStore.session?.sport).toBe('badminton');
    expect(sessionStore.session?.format).toBe('doubles');
    expect(sessionStore.session?.courts.length).toBe(2);
    expect(sessionStore.session?.courts[0].status).toBe('idle');
  });

  it('adds and removes courts dynamically, preventing removal of courts in use', () => {
    sessionStore.startSession('badminton', 'doubles', 1, '₱');
    expect(sessionStore.session?.courts.length).toBe(1);

    const c2 = sessionStore.addCourt();
    expect(sessionStore.session?.courts.length).toBe(2);
    expect(c2?.courtNumber).toBe(2);

    // Cannot remove when in_use
    sessionStore.session!.courts[0].status = 'in_use';
    const removedInUse = sessionStore.removeCourt(sessionStore.session!.courts[0].id);
    expect(removedInUse).toBe(false);
    expect(sessionStore.session?.courts.length).toBe(2);

    // Can remove idle court
    const removedIdle = sessionStore.removeCourt(c2!.id);
    expect(removedIdle).toBe(true);
    expect(sessionStore.session?.courts.length).toBe(1);
  });

  it('manages players, wand suggestion acceptance, and court match lifecycle', () => {
    sessionStore.startSession('badminton', 'doubles', 1, '₱');
    const p1 = sessionStore.addPlayer('Alice', 2)!;
    const p2 = sessionStore.addPlayer('Bob', 3)!;
    const p3 = sessionStore.addPlayer('Charlie', 2)!;
    const p4 = sessionStore.addPlayer('Diana', 3)!;

    expect(sessionStore.session?.players.length).toBe(4);

    const suggestion = sessionStore.suggestMatches(1);
    expect(suggestion.matches.length).toBe(1);

    // Accept suggestion: moves into nextUp, which then auto-assigns to the idle court!
    sessionStore.acceptMatches(suggestion.matches);
    const court = sessionStore.session?.courts[0];
    expect(court?.status).toBe('ready');
    expect(court?.match).not.toBeNull();

    // Start match
    sessionStore.startMatch(court!.id);
    expect(court?.status).toBe('in_use');

    // End match with Team A win
    sessionStore.endMatch(court!.id, 'A', 21, 19);
    expect(court?.status).toBe('idle');
    expect(sessionStore.session?.history.length).toBe(1);

    // All players should have gamesPlayed = 1
    const player1 = sessionStore.session?.players.find(p => p.id === p1.id);
    expect(player1?.gamesPlayed).toBe(1);
    expect(sessionStore.session?.history[0].courtNumber).toBe(1);
  });

  it('prevents adding players with duplicate names (case-insensitive)', () => {
    sessionStore.startSession('badminton', 'doubles', 1, '₱');
    const first = sessionStore.addPlayer('Alice', 3);
    expect(first).not.toBeNull();

    const exactDup = sessionStore.addPlayer('Alice', 4);
    expect(exactDup).toBeNull();

    const caseDup = sessionStore.addPlayer('  alice  ', 2);
    expect(caseDup).toBeNull();

    expect(sessionStore.session?.players.length).toBe(1);
  });

  it('accepts a single selected match from a multi-match Magic Wand suggestion', () => {
    sessionStore.startSession('badminton', 'doubles', 2, '₱');
    const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    names.forEach((name, idx) => {
      sessionStore.addPlayer(name, ((idx % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6);
    });

    const suggestion = sessionStore.suggestMatches(2);
    expect(suggestion.matches.length).toBe(2);

    const firstMatch = suggestion.matches[0];
    const secondMatch = suggestion.matches[1];

    sessionStore.acceptMatches([secondMatch]);

    const courts = sessionStore.session!.courts;
    expect(courts[0].status).toBe('ready');
    expect(courts[0].match?.id).toBe(secondMatch.id);
    expect(courts[0].match?.teamA).toEqual(secondMatch.teamA);
    expect(courts[0].match?.teamB).toEqual(secondMatch.teamB);

    expect(courts[1].status).toBe('idle');
    expect(courts[1].match).toBeNull();
    expect(sessionStore.session!.nextUp.length).toBe(0);

    const availableIds = new Set(sessionStore.getAvailablePlayers().map(p => p.id));
    expect(availableIds.size).toBe(4);
    for (const pid of [...firstMatch.teamA, ...firstMatch.teamB]) {
      expect(availableIds.has(pid)).toBe(true);
    }
  });
});
