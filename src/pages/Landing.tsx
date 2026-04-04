import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Shield, Skull, User } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { useUser } from '@/context/UserContext';
import { getPracticeScenario } from '@/lib/practice-agent';

const Landing = () => {
  const navigate = useNavigate();
  const {
    setParsedAgent,
    setVulnerabilities,
    setCurrentLevel,
    setLevelResults,
    setStep,
  } = useGame();
  const { profile, startSession } = useUser();

  const handleStartPractice = () => {
    const scenario = getPracticeScenario();
    setParsedAgent(scenario.parsedAgent);
    setVulnerabilities(scenario.vulnerabilities);
    setCurrentLevel(0);
    setLevelResults([]);
    setStep('levelSelect');
    startSession('Practice Agent');
    navigate('/levels');
  };

  return (
    <div className="min-h-screen noise-bg flex flex-col items-center justify-center relative overflow-hidden">
      <div className="scanline-overlay" />

      {/* User indicator */}
      <button
        onClick={() => navigate('/profile')}
        className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 border border-neon-green/30 bg-card/50 hover:bg-neon-green/10 transition-colors text-neon-green text-xs uppercase tracking-wider font-mono"
      >
        <User className="w-3 h-3" />
        {profile.username}
      </button>

      {/* Floating punk elements */}
      <div className="absolute top-20 left-10 text-neon-pink text-6xl animate-float opacity-20 select-none">✕</div>
      <div className="absolute top-40 right-20 text-neon-green text-4xl animate-float opacity-20 select-none" style={{ animationDelay: '1s' }}>⚡</div>
      <div className="absolute bottom-32 left-20 text-neon-yellow text-5xl animate-float opacity-20 select-none" style={{ animationDelay: '2s' }}>☠</div>
      <div className="absolute bottom-20 right-10 text-neon-pink text-3xl animate-float opacity-15 select-none" style={{ animationDelay: '0.5s' }}>✦</div>

      <div className="relative z-10 text-center px-4 max-w-4xl">
        {/* Title */}
        <h1
          className="glitch-text text-7xl md:text-9xl font-bold tracking-tighter mb-2 text-neon-pink"
          data-text="BREAK IT"
        >
          BREAK IT
        </h1>

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-px w-16 bg-neon-green" />
          <span className="text-neon-green text-xs tracking-[0.3em] uppercase">AI Agent Red Teaming</span>
          <div className="h-px w-16 bg-neon-green" />
        </div>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-foreground mb-2 font-mono">
          Your agent isn't as safe as you think.
        </p>
        <p className="text-muted-foreground text-sm md:text-base mb-12 max-w-lg mx-auto">
          Upload your AI agent. We'll find the cracks. You'll learn to exploit them.
          Then you'll fix them.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={() => navigate('/upload')}
            className="relative bg-neon-pink text-background hover:bg-neon-pink/80 text-lg px-10 py-6 font-bold tracking-wider uppercase animate-pulse-neon border-0 rounded-none"
            size="lg"
          >
            <Skull className="w-5 h-5 mr-2" />
            Upload Your Agent
          </Button>
          <Button
            onClick={handleStartPractice}
            variant="outline"
            className="border-neon-green text-neon-green hover:bg-neon-green/10 text-lg px-10 py-6 font-bold tracking-wider uppercase rounded-none"
            size="lg"
          >
            <Zap className="w-5 h-5 mr-2" />
            Try Practice Agent
          </Button>
        </div>

        <p className="text-muted-foreground text-xs md:text-sm mt-4 uppercase tracking-[0.2em]">
          Includes an easy built-in bot and a longer practice ladder
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-4 mt-16">
          {[
            { icon: Shield, text: 'Find Vulnerabilities', color: 'neon-pink' },
            { icon: Zap, text: 'Exploit Guardrails', color: 'neon-green' },
            { icon: Skull, text: 'Learn to Fix Them', color: 'neon-yellow' },
          ].map(({ icon: Icon, text, color }) => (
            <div
              key={text}
              className={`flex items-center gap-2 px-4 py-2 border border-${color}/30 bg-muted/30 text-${color} text-xs uppercase tracking-wider`}
            >
              <Icon className="w-3 h-3" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tape strip */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-neon-yellow/10 overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap">
          <div className="animate-[ticker-scroll_200s_linear_infinite] flex items-center">
            <span className="mx-6 text-neon-yellow text-xs tracking-widest uppercase opacity-80 leading-none">
              {"⚠ NO AGENT IS SAFE ⚠ BREAK THE RULES ⚠ RED TEAM EVERYTHING ⚠ ".repeat(20)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;