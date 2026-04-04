import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useEffect } from 'react';
import { Skull, Lock, CheckCircle, ChevronRight } from 'lucide-react';

const LevelSelect = () => {
  const navigate = useNavigate();
  const { vulnerabilities, setCurrentLevel, setStep, levelResults } = useGame();

  useEffect(() => {
    if (vulnerabilities.length === 0) navigate('/upload');
  }, [vulnerabilities, navigate]);

  const handleSelectLevel = (idx: number) => {
    setCurrentLevel(idx);
    setStep('game');
    navigate('/game');
  };

  const allDone = vulnerabilities.length > 0 && levelResults.length === vulnerabilities.length;

  return (
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-neon-pink tracking-tighter uppercase mb-2 glitch-text" data-text="SELECT LEVEL">
            SELECT LEVEL
          </h1>
          <p className="text-muted-foreground text-sm">
            {vulnerabilities.length} vulnerabilities detected. Break them all.
          </p>
        </div>

        {/* Mario-style level path */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2 hidden md:block" />

          <div className="space-y-6">
            {vulnerabilities.map((vuln, idx) => {
              const result = levelResults.find(r => r.vulnerabilityId === vuln.id);
              const isBroken = result?.broken;
              const isAttempted = !!result;
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={vuln.id}
                  className={`flex items-center gap-4 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  {/* Spacer for zigzag */}
                  <div className="hidden md:block flex-1" />

                  {/* Level node */}
                  <button
                    onClick={() => handleSelectLevel(idx)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                      isBroken
                        ? 'bg-neon-green/20 border-2 border-neon-green'
                        : isAttempted
                        ? 'bg-neon-yellow/20 border-2 border-neon-yellow'
                        : 'bg-neon-pink/20 border-2 border-neon-pink animate-pulse-neon'
                    }`}
                  >
                    {isBroken ? (
                      <CheckCircle className="w-7 h-7 text-neon-green" />
                    ) : isAttempted ? (
                      <Lock className="w-7 h-7 text-neon-yellow" />
                    ) : (
                      <Skull className="w-7 h-7 text-neon-pink" />
                    )}
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-foreground">
                      {idx + 1}
                    </span>
                  </button>

                  {/* Level info card */}
                  <button
                    onClick={() => handleSelectLevel(idx)}
                    className={`flex-1 text-left p-4 border transition-all hover:border-neon-pink/50 bg-card ${
                      isBroken ? 'border-neon-green/30' : isAttempted ? 'border-neon-yellow/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs uppercase tracking-wider mb-1 ${
                          isBroken ? 'text-neon-green' : 'text-neon-pink'
                        }`}>
                          {vuln.category.replace('_', ' ')}
                        </p>
                        <p className="font-bold text-foreground">{vuln.name}</p>
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{vuln.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                    {isBroken && (
                      <span className="inline-block mt-2 text-xs bg-neon-green/10 text-neon-green px-2 py-0.5 uppercase tracking-wider">
                        ✓ Broken
                      </span>
                    )}
                  </button>

                  <div className="hidden md:block flex-1" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary button */}
        {allDone && (
          <div className="text-center mt-12">
            <button
              onClick={() => { setStep('summary'); navigate('/summary'); }}
              className="bg-neon-green text-background px-8 py-3 font-bold uppercase tracking-wider hover:bg-neon-green/80 transition-colors"
            >
              View Report Card
            </button>
          </div>
        )}

        {levelResults.length > 0 && !allDone && (
          <div className="text-center mt-8">
            <button
              onClick={() => { setStep('summary'); navigate('/summary'); }}
              className="text-muted-foreground text-xs hover:text-neon-yellow underline"
            >
              Skip to Summary →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelSelect;
