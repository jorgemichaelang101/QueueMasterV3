import {
  STORAGE_KEY,
  DEFAULT_WAND_WEIGHTS,
  SPORT_DEFAULTS,
} from '../constants';
import type {
  Session,
  Player,
  Court,
  Match,
  Sport,
  Format,
  SkillTier,
  WandWeights,
  WandSuggestion,
} from '../types';
import { generateWandQueue } from '../engine/wand';
import { calculateCosts } from '../engine/costs';

function getInitialSession(): Session | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && Array.isArray(parsed.players)) {
      return parsed as Session;
    }
  } catch (e) {
    console.warn('Failed to parse saved session from localStorage', e);
  }
  return null;
}

class SessionStore {
  session = $state<Session | null>(getInitialSession());

  constructor() {
    // Autosave on changes
    $effect.root(() => {
      $effect(() => {
        if (typeof window === 'undefined' || !window.localStorage) return;
        if (this.session) {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
          } catch (e) {
            console.error('Failed to save session to localStorage', e);
          }
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      });
    });
  }

  // --- Session Lifecycle ---

  startSession(
    sport: Sport,
    format: Format,
    courtCount: number,
    currency = '₱'
  ) {
    const now = Date.now();
    const defaults = SPORT_DEFAULTS[sport];

    const courts: Court[] = [];
    for (let i = 1; i <= courtCount; i++) {
      courts.push({
        id: `court_${i}_${now}`,
        courtNumber: i,
        status: 'idle',
        match: null,
      });
    }

    this.session = {
      id: `session_${now}`,
      sport,
      format,
      startedAt: now,
      players: [],
      courts,
      nextUp: [],
      history: [],
      costs: {
        hourlyRate: defaults.defaultHourlyRate,
        totalCourtHours: 0,
        shuttleUnitCost: defaults.equipmentUnitCostDefault,
        shuttlesUsed: 0,
      },
      settings: {
        currency,
        baseWeights: { ...DEFAULT_WAND_WEIGHTS },
      },
    };
  }

  endSession(): Session | null {
    const finished = this.session;
    this.session = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
    return finished;
  }

  // --- Player Management ---

  addPlayer(name: string, skill: SkillTier): Player | null {
    if (!this.session || !name.trim()) return null;
    const trimmed = name.trim();
    const now = Date.now();

    const newPlayer: Player = {
      id: `p_${now}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      skill,
      status: 'active',
      waitingSince: now,
      gamesPlayed: 0,
      wins: 0,
      payment: {
        paid: false,
        customAmount: null,
      },
    };

    this.session.players.push(newPlayer);
    return newPlayer;
  }

  removePlayer(playerId: string) {
    if (!this.session) return;
    // Remove player from session players
    this.session.players = this.session.players.filter(p => p.id !== playerId);
    // Remove any matches in nextUp containing this player
    this.session.nextUp = this.session.nextUp.filter(m =>
      !m.teamA.includes(playerId) && !m.teamB.includes(playerId)
    );
  }

  toggleSitOut(playerId: string) {
    if (!this.session) return;
    const player = this.session.players.find(p => p.id === playerId);
    if (!player) return;

    if (player.status === 'active') {
      player.status = 'sitting_out';
      // Remove any matches in nextUp containing this player
      this.session.nextUp = this.session.nextUp.filter(m =>
        !m.teamA.includes(playerId) && !m.teamB.includes(playerId)
      );
    } else {
      player.status = 'active';
      // Reset waiting time to now when returning to active
      player.waitingSince = Date.now();
    }
  }

  updatePlayerSkill(playerId: string, skill: SkillTier) {
    if (!this.session) return;
    const player = this.session.players.find(p => p.id === playerId);
    if (player) {
      player.skill = skill;
    }
  }

  // --- Court Management (Dynamic Add / Remove) ---

  addCourt(): Court | null {
    if (!this.session) return null;
    const nextNumber = this.session.courts.length > 0
      ? Math.max(...this.session.courts.map(c => c.courtNumber)) + 1
      : 1;

    const newCourt: Court = {
      id: `court_${nextNumber}_${Date.now()}`,
      courtNumber: nextNumber,
      status: 'idle',
      match: null,
    };

    this.session.courts.push(newCourt);
    this.autoAssignCourts();
    return newCourt;
  }

  removeCourt(courtId: string): boolean {
    if (!this.session) return false;
    const court = this.session.courts.find(c => c.id === courtId);
    if (!court) return false;

    // Disallowed if court match is in progress
    if (court.status === 'in_use') {
      return false;
    }

    // If court has a READY match waiting to be started, return it back to nextUp
    if (court.match) {
      const match = { ...court.match, courtId: undefined };
      this.session.nextUp.unshift(match);
    }

    this.session.courts = this.session.courts.filter(c => c.id !== courtId);
    // Re-index court numbers for clean sequential display
    this.session.courts.forEach((c, idx) => {
      c.courtNumber = idx + 1;
    });

    return true;
  }

  // --- Magic Wand & Queue ---

  /**
   * Players that are currently available for matchmaking:
   * Active, not on a court (in_use or ready), and not already in nextUp
   */
  getAvailablePlayers(): Player[] {
    if (!this.session) return [];

    const busyPlayerIds = new Set<string>();

    // Players on courts
    for (const court of this.session.courts) {
      if (court.match) {
        court.match.teamA.forEach(id => busyPlayerIds.add(id));
        court.match.teamB.forEach(id => busyPlayerIds.add(id));
      }
    }

    // Players in Next Up queue
    for (const match of this.session.nextUp) {
      match.teamA.forEach(id => busyPlayerIds.add(id));
      match.teamB.forEach(id => busyPlayerIds.add(id));
    }

    return this.session.players.filter(p =>
      p.status === 'active' && !busyPlayerIds.has(p.id)
    );
  }

  /**
   * Generates a Magic Wand suggestion based on weights, waiting times,
   * games played, repetition avoidance, and skill balance.
   */
  suggestMatches(targetCount?: number): WandSuggestion {
    if (!this.session) {
      return { matches: [], shuffledWeights: { ...DEFAULT_WAND_WEIGHTS } };
    }

    const available = this.getAvailablePlayers();
    const count = targetCount || Math.max(1, this.session.courts.length);
    const existingMatches = [
      ...this.session.history,
      ...this.session.courts.filter(c => c.match).map(c => c.match!),
      ...this.session.nextUp,
    ];

    return generateWandQueue(
      available,
      existingMatches,
      this.session.format,
      this.session.settings.baseWeights,
      count
    );
  }

  acceptMatches(matches: Match[]) {
    if (!this.session) return;
    this.session.nextUp.push(...matches);
    this.autoAssignCourts();
  }

  addManualMatch(teamA: string[], teamB: string[]): Match | null {
    if (!this.session) return null;
    const match: Match = {
      id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teamA,
      teamB,
    };
    this.session.nextUp.push(match);
    this.autoAssignCourts();
    return match;
  }

  updateNextUpMatch(matchId: string, teamA: string[], teamB: string[]) {
    if (!this.session) return;
    const match = this.session.nextUp.find(m => m.id === matchId);
    if (match) {
      match.teamA = teamA;
      match.teamB = teamB;
    }
  }

  moveNextUp(index: number, direction: 'up' | 'down') {
    if (!this.session) return;
    const list = this.session.nextUp;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
  }

  removeFromNextUp(matchId: string) {
    if (!this.session) return;
    this.session.nextUp = this.session.nextUp.filter(m => m.id !== matchId);
  }

  /**
   * Moves Next Up matches onto idle courts and sets court status to READY
   */
  autoAssignCourts() {
    if (!this.session) return;

    for (const court of this.session.courts) {
      if (court.status === 'idle' && this.session.nextUp.length > 0) {
        const nextMatch = this.session.nextUp.shift()!;
        nextMatch.courtId = court.id;
        court.match = nextMatch;
        court.status = 'ready';
      }
    }
  }

  // --- Court / Match Execution ---

  startMatch(courtId: string) {
    if (!this.session) return;
    const court = this.session.courts.find(c => c.id === courtId);
    if (!court || !court.match) return;

    court.status = 'in_use';
    court.match.startedAt = Date.now();
  }

  endMatch(
    courtId: string,
    winner?: 'A' | 'B' | null,
    scoreA?: number | null,
    scoreB?: number | null
  ) {
    if (!this.session) return;
    const court = this.session.courts.find(c => c.id === courtId);
    if (!court || !court.match) return;

    const match = court.match;
    const now = Date.now();
    match.endedAt = now;
    match.winner = winner || null;
    match.scoreA = scoreA ?? null;
    match.scoreB = scoreB ?? null;

    // Update stats for all players in the match
    const allPlayerIds = [...match.teamA, ...match.teamB];
    const winningPlayerIds = winner === 'A' ? match.teamA : winner === 'B' ? match.teamB : [];

    for (const pid of allPlayerIds) {
      const p = this.session.players.find(pl => pl.id === pid);
      if (p) {
        p.gamesPlayed += 1;
        p.waitingSince = now; // Fresh wait time starting upon match completion
        if (winningPlayerIds.includes(pid)) {
          p.wins += 1;
        }
      }
    }

    // Save to session match history
    this.session.history.push({ ...match });

    // Free court
    court.match = null;
    court.status = 'idle';

    // Auto assign next match if available in Next Up
    this.autoAssignCourts();
  }

  cancelMatch(courtId: string) {
    if (!this.session) return;
    const court = this.session.courts.find(c => c.id === courtId);
    if (!court || !court.match) return;

    // Return match back to nextUp
    const match = { ...court.match, courtId: undefined, startedAt: undefined };
    this.session.nextUp.unshift(match);

    court.match = null;
    court.status = 'idle';
  }

  // --- Costs & Expense Tracking ---

  setCosts(costs: Partial<Session['costs']>) {
    if (!this.session) return;
    this.session.costs = {
      ...this.session.costs,
      ...costs,
    };
  }

  togglePlayerPaid(playerId: string) {
    if (!this.session) return;
    const p = this.session.players.find(pl => pl.id === playerId);
    if (p) {
      p.payment.paid = !p.payment.paid;
    }
  }

  setPlayerCustomAmount(playerId: string, amount: number | null) {
    if (!this.session) return;
    const p = this.session.players.find(pl => pl.id === playerId);
    if (p) {
      p.payment.customAmount = amount === null || isNaN(amount) ? null : Math.max(0, amount);
    }
  }

  getCostSummary() {
    if (!this.session) return null;
    return calculateCosts(this.session.costs, this.session.players);
  }

  // --- Settings ---

  updateSettings(currency?: string, weights?: Partial<WandWeights>) {
    if (!this.session) return;
    if (currency) {
      this.session.settings.currency = currency;
    }
    if (weights) {
      this.session.settings.baseWeights = {
        ...this.session.settings.baseWeights,
        ...weights,
      };
    }
  }
}

export const sessionStore = new SessionStore();
