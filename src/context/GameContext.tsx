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
  apiKey: string;
  setApiKey: (key: string) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<GameStep>('landing');
  const [parsedAgent, setParsedAgent] = useState<ParsedAgent | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelResults, setLevelResults] = useState<LevelResult[]>([]);
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('openrouter_api_key') || import.meta.env.VITE_OPENROUTER_API_KEY || '');

  const setApiKey = (key: string) => {
    localStorage.setItem('openrouter_api_key', key);
    setApiKeyState(key);
  };

  const addLevelResult = (result: LevelResult) => {
    setLevelResults(prev => [...prev.filter(r => r.vulnerabilityId !== result.vulnerabilityId), result]);
  };

  const resetGame = () => {
    setStep('landing');
    setParsedAgent(null);
    setVulnerabilities([]);
    setCurrentLevel(0);
    setLevelResults([]);
  };

  return (
    <GameContext.Provider value={{
      step, setStep,
      parsedAgent, setParsedAgent,
      vulnerabilities, setVulnerabilities,
      currentLevel, setCurrentLevel,
      levelResults, setLevelResults,
      addLevelResult,
      apiKey, setApiKey,
      resetGame,
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
