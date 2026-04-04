import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ParsedAgent } from '@/lib/agent-parser';
import { Vulnerability, ChatMessage } from '@/lib/openrouter';

export type GameStep = 'landing' | 'upload' | 'analysis' | 'levelSelect' | 'game' | 'summary';

interface LevelResult {
  vulnerabilityId: string;
  broken: boolean;
  explanation: string;
  chatHistory: ChatMessage[];
}

interface GameState {
  step: GameStep;
  setStep: (step: GameStep) => void;
  parsedAgent: ParsedAgent | null;
  setParsedAgent: (agent: ParsedAgent | null) => void;
  vulnerabilities: Vulnerability[];
  setVulnerabilities: (vulns: Vulnerability[]) => void;
  currentLevel: number;
  setCurrentLevel: (level: number) => void;
  levelResults: LevelResult[];
  setLevelResults: (results: LevelResult[]) => void;
  addLevelResult: (result: LevelResult) => void;
  chatLogs: Record<string, ChatMessage[]>;
  setChatLog: (vulnId: string, messages: ChatMessage[]) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  resetGame: () => void;
  isDailyChallenge: boolean;
  setIsDailyChallenge: (v: boolean) => void;
  dailyChallengeDate: string | null;
  setDailyChallengeDate: (date: string | null) => void;
  dailyChallengeStartTime: number | null;
  setDailyChallengeStartTime: (t: number | null) => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<GameStep>('landing');
  const [parsedAgent, setParsedAgent] = useState<ParsedAgent | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelResults, setLevelResults] = useState<LevelResult[]>([]);
  const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>({});
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [dailyChallengeDate, setDailyChallengeDate] = useState<string | null>(null);
  const [dailyChallengeStartTime, setDailyChallengeStartTime] = useState<number | null>(null);
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
  const setApiKey = () => {}; // no-op, key comes from env

  const addLevelResult = (result: LevelResult) => {
    setLevelResults(prev => [...prev.filter(r => r.vulnerabilityId !== result.vulnerabilityId), result]);
  };

  const setChatLog = (vulnId: string, messages: ChatMessage[]) => {
    setChatLogs(prev => ({ ...prev, [vulnId]: messages }));
  };

  const resetGame = () => {
    setStep('landing');
    setParsedAgent(null);
    setVulnerabilities([]);
    setCurrentLevel(0);
    setLevelResults([]);
    setChatLogs({});
    setIsDailyChallenge(false);
    setDailyChallengeDate(null);
    setDailyChallengeStartTime(null);
  };

  return (
    <GameContext.Provider value={{
      step, setStep,
      parsedAgent, setParsedAgent,
      vulnerabilities, setVulnerabilities,
      currentLevel, setCurrentLevel,
      levelResults, setLevelResults,
      addLevelResult,
      chatLogs, setChatLog,
      apiKey, setApiKey,
      resetGame,
      isDailyChallenge, setIsDailyChallenge,
      dailyChallengeDate, setDailyChallengeDate,
      dailyChallengeStartTime, setDailyChallengeStartTime,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
