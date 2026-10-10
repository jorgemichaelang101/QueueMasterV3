import type { Player, Match, Format, WandWeights, WandSuggestion } from '../types';

/**
 * Shuffles base weights by ±40% (multiplier between 0.6 and 1.4)
 * to introduce fresh matchmaking variety on every wand tap.
 */
export function shuffleWeights(base: WandWeights): WandWeights {
  const randomize = (val: number) => {
    // Random factor between 0.60 and 1.40
    const factor = 0.6 + Math.random() * 0.8;
    return Math.max(1, Math.round(val * factor));
  };

  return {
    waitingTime: randomize(base.waitingTime),
    gamesPlayed: randomize(base.gamesPlayed),
    repetition: randomize(base.repetition),
    skillBalance: randomize(base.skillBalance),
  };
}

/**
 * Counts how many times pair (p1, p2) have played together as partners
 * across all recorded matches (history, active courts, nextUp).
 */
export function countPartnerHistory(p1: string, p2: string, matches: Match[]): number {
  let count = 0;
  for (const m of matches) {
    if (!m) continue;
    const teamAHasBoth = m.teamA.includes(p1) && m.teamA.includes(p2);
    const teamBHasBoth = m.teamB.includes(p1) && m.teamB.includes(p2);
    if (teamAHasBoth || teamBHasBoth) {
      count++;
    }
  }
  return count;
}

/**
 * Counts how many times p1 and p2 have played against each other as opponents
 * (used primarily for singles repetition avoidance).
 */
export function countOpponentHistory(p1: string, p2: string, matches: Match[]): number {
  let count = 0;
  for (const m of matches) {
    if (!m) continue;
    const aVsB = (m.teamA.includes(p1) && m.teamB.includes(p2)) || (m.teamA.includes(p2) && m.teamB.includes(p1));
    if (aVsB) {
      count++;
    }
  }
  return count;
}

interface PlayerPriorityScore {
  player: Player;
  score: number;
}

/**
 * Calculates priority score for individual player selection.
 * Higher score = higher priority to be picked into the next match.
 */
function scorePlayerPriority(
  player: Player,
  maxWaitMs: number,
  maxGames: number,
  normWeights: { waitingTime: number; gamesPlayed: number },
  nowMs: number
): number {
  // Waiting time normalized (0 to 1). Longest wait = 1.
  const waitMs = Math.max(0, nowMs - player.waitingSince);
  const waitRatio = maxWaitMs > 0 ? Math.min(1, waitMs / maxWaitMs) : 0.5;

  // Games played inverted (0 to 1). Fewest games = 1.
  const gamesRatio = maxGames > 0 ? Math.max(0, 1 - (player.gamesPlayed / maxGames)) : 1.0;

  // Tiny jitter (±0.03) to break dead ties
  const jitter = (Math.random() - 0.5) * 0.06;

  return (waitRatio * normWeights.waitingTime) + (gamesRatio * normWeights.gamesPlayed) + jitter;
}

/**
 * Evaluates a candidate 2v2 doubles match configuration.
 * Considers team balance (skill) and partner repetition.
 */
function evaluateDoublesMatch(
  teamA: [Player, Player],
  teamB: [Player, Player],
  allMatches: Match[],
  normWeights: { skillBalance: number; repetition: number }
): number {
  // 1. Skill Balance (Difference in average skill between team A and team B)
  const avgSkillA = (teamA[0].skill + teamA[1].skill) / 2;
  const avgSkillB = (teamB[0].skill + teamB[1].skill) / 2;
  const skillDiff = Math.abs(avgSkillA - avgSkillB); // 0 (perfect) to 5 (max possible gap)
  const balanceScore = Math.max(0, 1 - (skillDiff / 4)); // 0..1

  // 2. Partner Repetition Avoidance
  const repA = countPartnerHistory(teamA[0].id, teamA[1].id, allMatches);
  const repB = countPartnerHistory(teamB[0].id, teamB[1].id, allMatches);
  const totalRep = repA + repB;
  // Penalty grows quickly with repetition: 0 rep = 1.0, 1 rep = 0.5, 2+ rep = 0.1
  const repScore = 1 / (1 + totalRep * 1.5);

  return (balanceScore * normWeights.skillBalance) + (repScore * normWeights.repetition);
}

/**
 * Evaluates a candidate 1v1 singles match configuration.
 */
function evaluateSinglesMatch(
  p1: Player,
  p2: Player,
  allMatches: Match[],
  normWeights: { skillBalance: number; repetition: number }
): number {
  const skillDiff = Math.abs(p1.skill - p2.skill);
  const balanceScore = Math.max(0, 1 - (skillDiff / 5));

  const rep = countOpponentHistory(p1.id, p2.id, allMatches);
  const repScore = 1 / (1 + rep * 1.5);

  return (balanceScore * normWeights.skillBalance) + (repScore * normWeights.repetition);
}

/**
 * Generates match suggestions using the Magic Wand algorithm.
 *
 * @param availablePlayers Players that are active, not in-court, and not already queued in nextUp
 * @param existingMatches History + active in-use matches for repetition calculation
 * @param format 'doubles' | 'singles'
 * @param baseWeights Configured base weights
 * @param maxMatches Maximum number of matches to produce (typically number of courts or available queue size)
 * @param nowMs Current timestamp for wait-time calculation
 */
export function generateWandQueue(
  availablePlayers: Player[],
  existingMatches: Match[],
  format: Format,
  baseWeights: WandWeights,
  maxMatches = 1,
  nowMs = Date.now()
): WandSuggestion {
  const shuffled = shuffleWeights(baseWeights);
  const totalWeight = (shuffled.waitingTime + shuffled.gamesPlayed + shuffled.repetition + shuffled.skillBalance) || 1;

  const normWeights = {
    waitingTime: shuffled.waitingTime / totalWeight,
    gamesPlayed: shuffled.gamesPlayed / totalWeight,
    repetition: shuffled.repetition / totalWeight,
    skillBalance: shuffled.skillBalance / totalWeight,
  };

  const playersNeeded = format === 'doubles' ? 4 : 2;
  const matches: Match[] = [];
  const trackingMatches = [...existingMatches];

  // Working pool of players
  let remainingPlayers = availablePlayers.filter(p => p.status === 'active');

  for (let matchIdx = 0; matchIdx < maxMatches; matchIdx++) {
    if (remainingPlayers.length < playersNeeded) {
      break;
    }

    // 1. Calculate max wait and max games in current pool
    let maxWaitMs = 0;
    let maxGames = 0;
    for (const p of remainingPlayers) {
      const wait = Math.max(0, nowMs - p.waitingSince);
      if (wait > maxWaitMs) maxWaitMs = wait;
      if (p.gamesPlayed > maxGames) maxGames = p.gamesPlayed;
    }

    // 2. Score priority for all remaining players
    const scoredPlayers: PlayerPriorityScore[] = remainingPlayers.map(p => ({
      player: p,
      score: scorePlayerPriority(p, maxWaitMs, maxGames, normWeights, nowMs),
    }));

    // Sort descending by priority score
    scoredPlayers.sort((a, b) => b.score - a.score);

    if (format === 'singles') {
      // Pick top candidate pool (e.g. top 6 players) to find best balanced / least repeated 1v1
      const poolSize = Math.min(6, scoredPlayers.length);
      const pool = scoredPlayers.slice(0, poolSize).map(sp => sp.player);

      let bestPair: [Player, Player] | null = null;
      let bestScore = -Infinity;

      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const pA = pool[i];
          const pB = pool[j];
          // Sum of individual priority + match synergy
          const pScoreA = scoredPlayers.find(s => s.player.id === pA.id)?.score || 0;
          const pScoreB = scoredPlayers.find(s => s.player.id === pB.id)?.score || 0;
          const matchSynergy = evaluateSinglesMatch(pA, pB, trackingMatches, normWeights);
          const combined = (pScoreA + pScoreB) + matchSynergy;

          if (combined > bestScore) {
            bestScore = combined;
            bestPair = [pA, pB];
          }
        }
      }

      if (bestPair) {
        const match: Match = {
          id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          teamA: [bestPair[0].id],
          teamB: [bestPair[1].id],
        };
        matches.push(match);
        trackingMatches.push(match);
        remainingPlayers = remainingPlayers.filter(p => p.id !== bestPair![0].id && p.id !== bestPair![1].id);
      }
    } else {
      // Doubles (4 players)
      // Pick top candidate pool (up to top 8 highest priority players)
      const poolSize = Math.min(8, scoredPlayers.length);
      const pool = scoredPlayers.slice(0, poolSize).map(sp => sp.player);

      let bestMatch: { teamA: [Player, Player]; teamB: [Player, Player] } | null = null;
      let bestScore = -Infinity;

      // Enumerate all 4-player combinations from the candidate pool
      for (let i = 0; i < pool.length - 3; i++) {
        for (let j = i + 1; j < pool.length - 2; j++) {
          for (let k = j + 1; k < pool.length - 1; k++) {
            for (let l = k + 1; l < pool.length; l++) {
              const four = [pool[i], pool[j], pool[k], pool[l]];
              const groupPriority = four.reduce((acc, p) => {
                const sp = scoredPlayers.find(s => s.player.id === p.id);
                return acc + (sp?.score || 0);
              }, 0) / 4;

              // The 3 possible team pairings for these 4 players:
              // Combo 1: (0, 1) vs (2, 3)
              // Combo 2: (0, 2) vs (1, 3)
              // Combo 3: (0, 3) vs (1, 2)
              const combos: Array<{ teamA: [Player, Player]; teamB: [Player, Player] }> = [
                { teamA: [four[0], four[1]], teamB: [four[2], four[3]] },
                { teamA: [four[0], four[2]], teamB: [four[1], four[3]] },
                { teamA: [four[0], four[3]], teamB: [four[1], four[2]] },
              ];

              for (const combo of combos) {
                const synergy = evaluateDoublesMatch(combo.teamA, combo.teamB, trackingMatches, normWeights);
                const totalScore = groupPriority + synergy;
                if (totalScore > bestScore) {
                  bestScore = totalScore;
                  bestMatch = combo;
                }
              }
            }
          }
        }
      }

      if (bestMatch) {
        const match: Match = {
          id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          teamA: [bestMatch.teamA[0].id, bestMatch.teamA[1].id],
          teamB: [bestMatch.teamB[0].id, bestMatch.teamB[1].id],
        };
        matches.push(match);
        trackingMatches.push(match);

        const usedIds = new Set([...match.teamA, ...match.teamB]);
        remainingPlayers = remainingPlayers.filter(p => !usedIds.has(p.id));
      }
    }
  }

  return {
    matches,
    shuffledWeights: shuffled,
  };
}
