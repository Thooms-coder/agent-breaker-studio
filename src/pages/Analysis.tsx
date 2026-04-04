import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { analyzeAgent } from '@/lib/openrouter';
import { Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';

const snarkyMessages = [
  "Scanning for cracks...",
  "Finding the weak spots...",
  "Your agent is sweating...",
  "Poking at the guardrails...",
  "Looking for unlocked doors...",
  "Testing the boundaries...",
  "Reading between the lines...",
  "Shaking the foundations...",
  "Your agent can't hide...",
  "Almost got it...",
];

const Analysis = () => {
  const navigate = useNavigate();
  const { parsedAgent, setVulnerabilities, setStep } = useGame();
  const [messageIdx, setMessageIdx] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!parsedAgent) {
      navigate('/upload');
      return;
    }

    if (hasRun.current) return;
    hasRun.current = true;

    const analyze = async () => {
      try {
        const vulns = await analyzeAgent(
          parsedAgent.systemPrompt,
          parsedAgent.tools,
          parsedAgent.modelConfig
        );
        if (vulns.length === 0) {
          setError("No significant vulnerabilities detected. Your agent might actually be solid... or we need more context. Try uploading more code.");
          setLoading(false);
          return;
        }
        setVulnerabilities(vulns);
        setStep('levelSelect');
        navigate('/levels');
      } catch (e: any) {
        setError(e.message || 'Analysis failed');
        setLoading(false);
      }
    };

    analyze();
  }, [parsedAgent, navigate, setVulnerabilities, setStep]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx(prev => (prev + 1) % snarkyMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen noise-bg flex flex-col items-center justify-center">
      <div className="scanline-overlay" />
      <div className="relative z-10 text-center px-4">
        {loading && !error ? (
          <>
            {/* Glitching skull */}
            <div className="relative mb-8">
              <Skull className="w-24 h-24 mx-auto text-neon-pink animate-glitch" />
              <Skull className="w-24 h-24 mx-auto text-neon-green absolute top-0 left-1/2 -translate-x-1/2 opacity-30" style={{ animation: 'glitch 0.5s infinite reverse' }} />
            </div>

            {/* Loading message */}
            <p className="text-neon-green text-lg font-mono mb-4 neon-glow-green">
              {snarkyMessages[messageIdx]}
            </p>

            {/* Fake progress bar */}
            <div className="w-64 mx-auto h-1 bg-muted overflow-hidden">
              <div className="h-full bg-neon-pink animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '60%' }} />
            </div>

            <p className="text-muted-foreground text-xs mt-6">
              This might take a moment. The AI is analyzing your agent's defenses.
            </p>
          </>
        ) : error ? (
          <>
            <Skull className="w-16 h-16 mx-auto text-neon-yellow mb-4" />
            <p className="text-neon-yellow text-lg font-mono mb-4">Analysis Failed</p>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate('/upload')}
                variant="outline"
                className="border-neon-pink text-neon-pink hover:bg-neon-pink/10"
              >
                Try Again
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Analysis;
