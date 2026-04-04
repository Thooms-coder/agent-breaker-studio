import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  UserProfile,
  SessionRecord,
  LevelSessionStats,
  loadUser,
  saveUser,
  renameUser as renameUserStore,
  createSession,
  finalizeSession,
  saveSession,
} from '@/lib/user-store';

interface UserState {
  profile: UserProfile;
  currentSession: SessionRecord | null;
  rename: (name: string) => void;
  startSession: (agentName: string) => void;
  startLevel: (vulnId: string, vulnName: string, category: string) => void;
  recordMessage: (vulnId: string) => void;
  recordBreak: (vulnId: string) => void;
  endSession: () => void;
  refreshProfile: () => void;
}

const UserContext = createContext<UserState | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(loadUser);
  const [currentSession, setCurrentSession] = useState<SessionRecord | null>(null);

  const rename = useCallback((name: string) => {
    const updated = renameUserStore(name);
    setProfile(updated);
  }, []);

  const refreshProfile = useCallback(() => {
    setProfile(loadUser());
  }, []);

  const startSession = useCallback((agentName: string) => {
    setCurrentSession(createSession(agentName));
  }, []);

  const updateLevel = useCallback((vulnId: string, updater: (level: LevelSessionStats) => LevelSessionStats) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      const levels = [...prev.levels];
      const idx = levels.findIndex(l => l.vulnerabilityId === vulnId);
      if (idx >= 0) {
        levels[idx] = updater(levels[idx]);
      }
      return { ...prev, levels };
    });
  }, []);

  const startLevel = useCallback((vulnId: string, vulnName: string, category: string) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      // Don't re-add if already started
      if (prev.levels.some(l => l.vulnerabilityId === vulnId)) return prev;
      return {
        ...prev,
        levels: [...prev.levels, {
          vulnerabilityId: vulnId,
          vulnerabilityName: vulnName,
          category,
          messageCount: 0,
          startedAt: Date.now(),
          endedAt: null,
          broken: false,
          timeToBreakMs: null,
        }],
      };
    });
  }, []);

  const recordMessage = useCallback((vulnId: string) => {
    updateLevel(vulnId, level => ({
      ...level,
      messageCount: level.messageCount + 1,
    }));
  }, [updateLevel]);

  const recordBreak = useCallback((vulnId: string) => {
    const now = Date.now();
    updateLevel(vulnId, level => ({
      ...level,
      broken: true,
      endedAt: now,
      timeToBreakMs: now - level.startedAt,
    }));
  }, [updateLevel]);

  const endSession = useCallback(() => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      const finalized = finalizeSession(prev);
      const updated = saveSession(finalized);
      setProfile(updated);
      return null;
    });
  }, []);

  return (
    <UserContext.Provider value={{
      profile,
      currentSession,
      rename,
      startSession,
      startLevel,
      recordMessage,
      recordBreak,
      endSession,
      refreshProfile,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
