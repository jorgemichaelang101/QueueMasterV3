import type { SkillTier, WandWeights } from './types';

export interface SkillInfo {
  tier: SkillTier;
  label: string;
  shortLabel: string;
  color: string;
  bgTint: string;
}

export const SKILL_TIERS: Record<SkillTier, SkillInfo> = {
  1: {
    tier: 1,
    label: 'Novice',
    shortLabel: 'NOV',
    color: '#38bdf8', // Light sky blue
    bgTint: 'rgba(56, 189, 248, 0.15)',
  },
  2: {
    tier: 2,
    label: 'Low Beginner',
    shortLabel: 'L-BEG',
    color: '#34d399', // Emerald
    bgTint: 'rgba(52, 211, 153, 0.15)',
  },
  3: {
    tier: 3,
    label: 'High Beginner',
    shortLabel: 'H-BEG',
    color: '#a3e635', // Lime
    bgTint: 'rgba(163, 230, 53, 0.15)',
  },
  4: {
    tier: 4,
    label: 'Low Intermediate',
    shortLabel: 'L-INT',
    color: '#fbbf24', // Amber
    bgTint: 'rgba(251, 191, 36, 0.15)',
  },
  5: {
    tier: 5,
    label: 'High Intermediate',
    shortLabel: 'H-INT',
    color: '#f97316', // Orange
    bgTint: 'rgba(249, 115, 22, 0.15)',
  },
  6: {
    tier: 6,
    label: 'Pro',
    shortLabel: 'PRO',
    color: '#ec4899', // Pink / Magenta
    bgTint: 'rgba(236, 72, 153, 0.18)',
  },
};

export const DEFAULT_WAND_WEIGHTS: WandWeights = {
  waitingTime: 35,
  gamesPlayed: 30,
  repetition: 20,
  skillBalance: 15,
};

export const SPORT_DEFAULTS = {
  badminton: {
    name: 'Badminton',
    equipmentName: 'Shuttlecock',
    equipmentUnitCostDefault: 90, // typical ₱90/shuttle
    targetPoints: 21,
    defaultHourlyRate: 250,
  },
  pickleball: {
    name: 'Pickleball',
    equipmentName: 'Ball',
    equipmentUnitCostDefault: 120,
    targetPoints: 11,
    defaultHourlyRate: 300,
  },
};

export const STORAGE_KEY = 'queuemaster_v3_session';
