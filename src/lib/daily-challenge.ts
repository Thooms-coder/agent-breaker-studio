import { Vulnerability } from '@/lib/openrouter';
import { getPracticeVulnerabilities } from '@/lib/practice-agent';

const DAILY_STORE_KEY = 'breakit_daily';

export interface DailyRecord {
  date: string;        // YYYY-MM-DD (UTC)
  brokenCount: number;
  totalCount: number;
  timeMs: number;
  completedAt: number;
}

/** Deterministic seeded RNG from any string */
function seededRng(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  }
  h = h ^ (h >>> 16);
  return function () {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  };
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Returns the 3 vulnerabilities for a given date (same for everyone on the same day).
 *  Always includes the tool_misuse level, plus 2 randomly chosen others. */
export function getDailyVulnerabilities(date?: string): Vulnerability[] {
  const dateStr = date ?? getTodayString();
  const all = getPracticeVulnerabilities();
  const toolLevel = all.find(v => v.category === 'tool_misuse');
  const rest = all.filter(v => v.category !== 'tool_misuse');
  const rng = seededRng(dateStr);
  const shuffled = [...rest].sort(() => rng() - 0.5);
  const picked = shuffled.slice(0, 2);
  if (toolLevel) picked.push(toolLevel);
  return picked;
}

export function loadDailyRecords(): DailyRecord[] {
  try {
    const raw = localStorage.getItem(DAILY_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted */ }
  return [];
}

export function saveDailyRecord(record: DailyRecord): void {
  const records = loadDailyRecords().filter(r => r.date !== record.date);
  records.push(record);
  localStorage.setItem(DAILY_STORE_KEY, JSON.stringify(records));
}

export function getTodayRecord(): DailyRecord | null {
  const today = getTodayString();
  return loadDailyRecords().find(r => r.date === today) ?? null;
}
