import type { PlayerStats, DailyState } from '@/types/game';

const STATS_KEY = 'bbb_stats';
const DAILY_PREFIX = 'bbb_daily_';
const LAST_SEEN_KEY = 'bbb_lastSeen';

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

export function defaultStats(): PlayerStats {
  return {
    totalPlayed: 0,
    totalWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    attemptDistribution: [0, 0, 0, 0, 0, 0],
    lastPlayedDate: '',
  };
}

export function loadStats(): PlayerStats {
  return safeGet<PlayerStats>(STATS_KEY) ?? defaultStats();
}

export function saveStats(stats: PlayerStats): void {
  safeSet(STATS_KEY, stats);
}

export function loadDailyState(date: string): DailyState | null {
  return safeGet<DailyState>(DAILY_PREFIX + date);
}

export function saveDailyState(state: DailyState): void {
  safeSet(DAILY_PREFIX + state.date, state);
}

export function getLastSeen(): string {
  try {
    return localStorage.getItem(LAST_SEEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setLastSeen(date: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, date);
  } catch {
    // ignore
  }
}

export function cleanOldDailyStates(currentDate: string): void {
  try {
    const cutoff = Date.parse(currentDate) - 30 * 86400000;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DAILY_PREFIX)) keys.push(key);
    }
    for (const key of keys) {
      const dateStr = key.replace(DAILY_PREFIX, '');
      if (Date.parse(dateStr) < cutoff) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

export function updateStatsAfterGame(
  stats: PlayerStats,
  won: boolean,
  attemptNumber: number,
  todayDate: string,
  yesterdayDate: string
): PlayerStats {
  const updated = { ...stats };
  updated.totalPlayed++;

  if (won) {
    updated.totalWon++;
    updated.attemptDistribution = [...updated.attemptDistribution] as PlayerStats['attemptDistribution'];
    updated.attemptDistribution[attemptNumber - 1]++;

    if (updated.lastPlayedDate === yesterdayDate || updated.lastPlayedDate === '') {
      updated.currentStreak++;
    } else if (updated.lastPlayedDate !== todayDate) {
      updated.currentStreak = 1;
    }
    updated.maxStreak = Math.max(updated.maxStreak, updated.currentStreak);
  } else {
    if (updated.lastPlayedDate !== todayDate) {
      updated.currentStreak = 0;
    }
  }

  updated.lastPlayedDate = todayDate;
  return updated;
}
