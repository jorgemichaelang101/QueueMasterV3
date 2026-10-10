export type Sport = 'badminton' | 'pickleball';
export type Format = 'singles' | 'doubles';

/**
 * Skill tiers:
 * 1: Novice
 * 2: Low Beginner
 * 3: High Beginner
 * 4: Low Intermediate
 * 5: High Intermediate
 * 6: Pro
 */
export type SkillTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface Player {
  id: string;
  name: string;
  skill: SkillTier;
  status: 'active' | 'sitting_out';
  waitingSince: number; // Unix timestamp in ms
  gamesPlayed: number;
  wins: number;
  payment: {
    paid: boolean;
    customAmount: number | null; // null = use standard split; number = override (e.g. 0 for guest)
  };
}

export interface Match {
  id: string;
  teamA: string[]; // Player IDs (length 1 for singles, 2 for doubles)
  teamB: string[]; // Player IDs
  courtId?: string;
  startedAt?: number;
  endedAt?: number;
  winner?: 'A' | 'B' | null;
  scoreA?: number | null;
  scoreB?: number | null;
}

export interface Court {
  id: string;
  courtNumber: number; // 1, 2, 3...
  status: 'idle' | 'ready' | 'in_use';
  match: Match | null;
}

export interface WandWeights {
  waitingTime: number; // Default 35
  gamesPlayed: number; // Default 30 (prefers players with fewer games)
  repetition: number;  // Default 20 (avoids repeat partners in doubles, repeat opponents in singles)
  skillBalance: number;// Default 15 (balances team average skill)
}

export interface SessionCosts {
  hourlyRate: number;
  totalCourtHours: number; // Decimal hours, e.g. 2.5
  shuttleUnitCost: number;
  shuttlesUsed: number;
}

export interface SessionSettings {
  currency: string;      // e.g. '₱', '$', '€', '¥'
  baseWeights: WandWeights;
}

export interface Session {
  id: string;
  sport: Sport;
  format: Format;
  startedAt: number;
  endedAt?: number;
  players: Player[];
  courts: Court[];
  nextUp: Match[];
  history: Match[];
  costs: SessionCosts;
  settings: SessionSettings;
}

export interface WandSuggestion {
  matches: Match[];
  shuffledWeights: WandWeights;
}
