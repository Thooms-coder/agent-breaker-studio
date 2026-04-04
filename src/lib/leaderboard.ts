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

// ── Dummy seed entries (shown on every day's leaderboard) ─────────────────

const DUMMY_PLAYERS: Omit<StoredEntry, 'date'>[] = [
  { username: 'xpl0itqu33n',     brokenCount: 3, totalCount: 3, timeMs: 213_000 },
  { username: 'h4ck_th3_plan3t', brokenCount: 3, totalCount: 3, timeMs: 287_000 },
  { username: 'red_panda_42',    brokenCount: 2, totalCount: 3, timeMs: 195_000 },
  { username: 'promptlord',      brokenCount: 2, totalCount: 3, timeMs: 342_000 },
  { username: 'zer0c00l',        brokenCount: 2, totalCount: 3, timeMs: 408_000 },
  { username: 'cipher_shark',    brokenCount: 1, totalCount: 3, timeMs: 261_000 },
  { username: 'null_byte_99',    brokenCount: 1, totalCount: 3, timeMs: 374_000 },
  { username: 'darkflux',        brokenCount: 0, totalCount: 3, timeMs: 455_000 },
];

function getDummyEntries(date: string): StoredEntry[] {
  return DUMMY_PLAYERS.map(p => ({ ...p, date }));
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

  // Merge local scores with dummy seed entries (real players override dummies by username)
  const local = getLocalForDate(date);
  const dummy = getDummyEntries(date);
  const realUsernames = new Set(local.map(e => e.username));
  const merged = [...local, ...dummy.filter(d => !realUsernames.has(d.username))]
    .sort((a, b) => b.brokenCount - a.brokenCount || a.timeMs - b.timeMs)
    .slice(0, 20);

  return merged.map((e, i) => ({ ...e, rank: i + 1 }));
}
