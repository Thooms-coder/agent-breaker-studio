const STORAGE_KEY = 'breakit_user';

export interface LevelSessionStats {
  vulnerabilityId: string;
  vulnerabilityName: string;
  category: string;
  messageCount: number;
  startedAt: number;
  endedAt: number | null;
  broken: boolean;
  timeToBreakMs: number | null;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number | null;
  agentName: string;
  levels: LevelSessionStats[];
  totalMessages: number;
  brokenCount: number;
  totalLevels: number;
}

export interface UserProfile {
  username: string;
  createdAt: number;
  sessions: SessionRecord[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadUser(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted data, reset */ }
  const profile: UserProfile = {
    username: 'Guest',
    createdAt: Date.now(),
    sessions: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export function saveUser(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function renameUser(newName: string): UserProfile {
  const profile = loadUser();
  profile.username = newName.trim() || 'Guest';
  saveUser(profile);
  return profile;
}

export function createSession(agentName: string): SessionRecord {
  return {
    id: generateId(),
    startedAt: Date.now(),
    endedAt: null,
    agentName,
    levels: [],
    totalMessages: 0,
    brokenCount: 0,
    totalLevels: 0,
  };
}

export function finalizeSession(session: SessionRecord): SessionRecord {
  return {
    ...session,
    endedAt: Date.now(),
    totalMessages: session.levels.reduce((sum, l) => sum + l.messageCount, 0),
    brokenCount: session.levels.filter(l => l.broken).length,
    totalLevels: session.levels.length,
  };
}

export function saveSession(session: SessionRecord): UserProfile {
  const profile = loadUser();
  const idx = profile.sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    profile.sessions[idx] = session;
  } else {
    profile.sessions.push(session);
  }
  saveUser(profile);
  return profile;
}

// Aggregate stats derived from all sessions
export interface AggregateStats {
  totalSessions: number;
  totalLevelsPlayed: number;
  totalBroken: number;
  totalMessages: number;
  overallBreakRate: number;
  avgMessagesToBreak: number;
  avgTimeToBreakMs: number;
  fastestBreakMs: number | null;
  totalPlayTimeMs: number;
}

export function getAggregateStats(profile: UserProfile): AggregateStats {
  const allLevels = profile.sessions.flatMap(s => s.levels);
  const brokenLevels = allLevels.filter(l => l.broken && l.timeToBreakMs !== null);
  const totalMessages = allLevels.reduce((sum, l) => sum + l.messageCount, 0);
  const totalBroken = brokenLevels.length;
  const totalLevelsPlayed = allLevels.length;

  const breakTimes = brokenLevels.map(l => l.timeToBreakMs!).filter(t => t > 0);
  const breakMsgCounts = brokenLevels.map(l => l.messageCount);

  const totalPlayTimeMs = profile.sessions.reduce((sum, s) => {
    if (s.endedAt && s.startedAt) return sum + (s.endedAt - s.startedAt);
    return sum;
  }, 0);

  return {
    totalSessions: profile.sessions.length,
    totalLevelsPlayed,
    totalBroken,
    totalMessages,
    overallBreakRate: totalLevelsPlayed > 0 ? totalBroken / totalLevelsPlayed : 0,
    avgMessagesToBreak: breakMsgCounts.length > 0
      ? Math.round(breakMsgCounts.reduce((a, b) => a + b, 0) / breakMsgCounts.length * 10) / 10
      : 0,
    avgTimeToBreakMs: breakTimes.length > 0
      ? Math.round(breakTimes.reduce((a, b) => a + b, 0) / breakTimes.length)
      : 0,
    fastestBreakMs: breakTimes.length > 0 ? Math.min(...breakTimes) : null,
    totalPlayTimeMs,
  };
}
