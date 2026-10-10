import type { Player, SessionCosts } from '../types';

export interface PlayerCostBreakdown {
  playerId: string;
  amountDue: number;
  isOverride: boolean;
  paid: boolean;
}

export interface CostSummary {
  courtTotal: number;
  equipmentTotal: number;
  grandTotal: number;
  totalAttendees: number;
  standardPerPlayer: number;
  breakdown: PlayerCostBreakdown[];
  totalCollected: number;
  totalOutstanding: number;
}

/**
 * Computes session cost totals and distributes expenses among players.
 * Supports custom amount overrides (e.g. 0 for guests) with automatic
 * re-splitting of the remainder among regular attendees.
 */
export function calculateCosts(
  costs: SessionCosts,
  players: Player[]
): CostSummary {
  const courtTotal = Math.max(0, (costs.hourlyRate || 0) * (costs.totalCourtHours || 0));
  const equipmentTotal = Math.max(0, (costs.shuttleUnitCost || 0) * (costs.shuttlesUsed || 0));
  const grandTotal = Math.round((courtTotal + equipmentTotal) * 100) / 100;

  const totalAttendees = players.length;

  if (totalAttendees === 0) {
    return {
      courtTotal,
      equipmentTotal,
      grandTotal,
      totalAttendees: 0,
      standardPerPlayer: 0,
      breakdown: [],
      totalCollected: 0,
      totalOutstanding: grandTotal,
    };
  }

  // Identify players with custom overrides vs standard split
  let overriddenSum = 0;
  let standardCount = 0;

  for (const player of players) {
    if (player.payment.customAmount !== null && player.payment.customAmount !== undefined) {
      overriddenSum += Math.max(0, player.payment.customAmount);
    } else {
      standardCount++;
    }
  }

  const remainingToSplit = Math.max(0, grandTotal - overriddenSum);
  const standardPerPlayer = standardCount > 0
    ? Math.round((remainingToSplit / standardCount) * 100) / 100
    : 0;

  const breakdown: PlayerCostBreakdown[] = [];
  let totalCollected = 0;
  let totalOutstanding = 0;

  for (const player of players) {
    const isOverride = player.payment.customAmount !== null && player.payment.customAmount !== undefined;
    const amountDue = isOverride ? Math.max(0, player.payment.customAmount!) : standardPerPlayer;

    if (player.payment.paid) {
      totalCollected += amountDue;
    } else {
      totalOutstanding += amountDue;
    }

    breakdown.push({
      playerId: player.id,
      amountDue,
      isOverride,
      paid: player.payment.paid,
    });
  }

  return {
    courtTotal: Math.round(courtTotal * 100) / 100,
    equipmentTotal: Math.round(equipmentTotal * 100) / 100,
    grandTotal,
    totalAttendees,
    standardPerPlayer,
    breakdown,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
  };
}
