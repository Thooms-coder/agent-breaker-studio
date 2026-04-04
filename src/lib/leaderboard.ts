/**
 * Leaderboard — local by default (localStorage), global if Supabase is configured.
 *
 * To enable global leaderboard, add to your .env:
 *   VITE_SUPABASE_URL=https://your-project.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your-anon-key
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const LOCAL_KEY = 'breakit_leaderboard';

export interface LeaderboardEntry {
  username: string;
  date: string;
  brokenCount: number;
  totalCount: number;
  timeMs: number;
  rank: number;
}

type StoredEntry = Omit<LeaderboardEntry, 'rank'>;

// ── Local storage helpers ──────────────────────────────────────────────────

function loadLocal(): StoredEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted */ }
  return [];
}

function saveLocal(entries: StoredEntry[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
}

function submitLocal(entry: StoredEntry): void {
  const all = loadLocal();
  // Replace existing entry for same username+date
  const filtered = all.filter(e => !(e.username === entry.username && e.date === entry.date));
  filtered.push(entry);
  saveLocal(filtered);
}

function getLocalForDate(date: string): StoredEntry[] {
  return loadLocal()
    .filter(e => e.date === date)
    .sort((a, b) => b.brokenCount - a.brokenCount || a.timeMs - b.timeMs)
    .slice(0, 20);
}

// ── Supabase helpers ───────────────────────────────────────────────────────

function isSupabaseEnabled(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function restFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export function isGlobalLeaderboardEnabled(): boolean {
  return isSupabaseEnabled();
}

export async function submitScore(entry: StoredEntry): Promise<void> {
  // Always save locally
  submitLocal(entry);

  // Also push to Supabase if configured
  if (isSupabaseEnabled()) {
    try {
      await restFetch('daily_scores', {
        method: 'POST',
        body: JSON.stringify({
          username: entry.username,
          date: entry.date,
          broken_count: entry.brokenCount,
          total_count: entry.totalCount,
          time_ms: entry.timeMs,
        }),
      });
    } catch { /* ignore — local copy already saved */ }
  }
}

export async function getLeaderboard(date: string): Promise<LeaderboardEntry[]> {
  if (isSupabaseEnabled()) {
    try {
      const res = await restFetch(
        `daily_scores?date=eq.${date}&order=broken_count.desc,time_ms.asc&limit=20`,
        { headers: { Prefer: 'return=representation' } },
      );
      if (res.ok) {
        const rows = await res.json() as {
          username: string; date: string;
          broken_count: number; total_count: number; time_ms: number;
        }[];
        return rows.map((r, i) => ({
          username: r.username,
          date: r.date,
          brokenCount: r.broken_count,
          totalCount: r.total_count,
          timeMs: r.time_ms,
          rank: i + 1,
        }));
      }
    } catch { /* fall through to local */ }
  }

  return getLocalForDate(date).map((e, i) => ({ ...e, rank: i + 1 }));
}
