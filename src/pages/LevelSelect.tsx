import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useEffect } from 'react';
import { Skull, Lock, CheckCircle } from 'lucide-react';

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
  const total = vulnerabilities.length;

  const ROW_HEIGHT = 140;
  const LEFT_X = 80;
  const RIGHT_X = 520;
  const NODE_Y_OFFSET = 50;

  const buildSnakePath = () => {
    if (total < 2) return '';
    let d = '';
    for (let i = 0; i < total - 1; i++) {
      const isEven = i % 2 === 0;
      const fromX = isEven ? LEFT_X : RIGHT_X;
      const toX = isEven ? RIGHT_X : LEFT_X;
      const fromY = i * ROW_HEIGHT + NODE_Y_OFFSET;
      const toY = (i + 1) * ROW_HEIGHT + NODE_Y_OFFSET;
      const midY = (fromY + toY) / 2;

      if (i === 0) d += `M ${fromX} ${fromY} `;
      d += `C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY} `;
    }
    return d;
  };

  const svgHeight = total * ROW_HEIGHT + 40;

  return (
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-3xl mx-auto relative z-10">

        <div className="text-center mb-8">
          <h1
            className="text-4xl md:text-5xl font-bold text-neon-pink tracking-tighter uppercase mb-2 glitch-text"
            data-text="SELECT LEVEL"
          >
            SELECT LEVEL
          </h1>
          <p className="text-muted-foreground text-sm">
            {total} vulnerabilities detected. Break them all.
          </p>
        </div>

        <div className="relative" style={{ minHeight: svgHeight }}>

          {/* SVG snake path */}
          <svg
            className="absolute inset-0 w-full hidden md:block pointer-events-none"
            style={{ height: svgHeight, zIndex: 0 }}
            viewBox={`0 0 600 ${svgHeight}`}
            preserveAspectRatio="none"
            fill="none"
          >
            {/* Glow layer */}
            <path
              d={buildSnakePath()}
              stroke="#ff2d78"
              strokeWidth="10"
              strokeDasharray="16 10"
              strokeLinecap="round"
              opacity="0.15"
              fill="none"
            />
            {/* Main path */}
            <path
              d={buildSnakePath()}
              stroke="#ff2d78"
              strokeWidth="4"
              strokeDasharray="16 10"
              strokeLinecap="round"
              opacity="0.9"
              fill="none"
            />
          </svg>

          {/* Level nodes */}
          <div className="relative" style={{ zIndex: 1 }}>
            {vulnerabilities.map((vuln, idx) => {
              const result = levelResults.find(r => r.vulnerabilityId === vuln.id);
              const isBroken = result?.broken;
              const isAttempted = !!result;
              const isEven = idx % 2 === 0;

              const nodeColor = isBroken
                ? 'border-neon-green bg-neon-green/20'
                : isAttempted
                ? 'border-yellow-400 bg-yellow-400/20'
                : 'border-neon-pink bg-neon-pink/20 animate-pulse-neon';

              const textColor = isBroken
                ? 'text-neon-green'
                : isAttempted
                ? 'text-yellow-400'
                : 'text-neon-pink';

              const glowColor = isBroken
                ? '0 0 24px rgba(0,255,128,0.5)'
                : isAttempted
                ? '0 0 24px rgba(255,220,0,0.5)'
                : '0 0 24px rgba(255,45,120,0.5)';

              const cardBorder = isBroken
                ? 'border-neon-green/40'
                : isAttempted
                ? 'border-yellow-400/40'
                : 'border-border';

              return (
                <div
                  key={vuln.id}
                  className={`flex items-center gap-6 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Big circular node */}
                  <button
                    onClick={() => handleSelectLevel(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all hover:scale-110 ${nodeColor}`}
                    style={{ boxShadow: glowColor }}
                  >
                    {isBroken ? (
                      <CheckCircle className="w-9 h-9 text-neon-green" />
                    ) : isAttempted ? (
                      <Lock className="w-9 h-9 text-yellow-400" />
                    ) : (
                      <Skull className="w-9 h-9 text-neon-pink" />
                    )}
                    {/* Bold level number badge */}
                    <span
                      className={`absolute -top-3 -right-3 w-9 h-9 rounded-full bg-background border-2 flex items-center justify-center text-base font-black ${textColor}`}
                      style={{ borderColor: 'currentColor', boxShadow: glowColor }}
                    >
                      {idx + 1}
                    </span>
                  </button>

                  {/* Info card */}
                  <button
                    onClick={() => handleSelectLevel(idx)}
                    className={`flex-1 text-left p-4 border-2 transition-all hover:scale-[1.02] bg-card ${cardBorder}`}
                    style={{ maxWidth: '360px', boxShadow: glowColor }}
                  >
                    <p className={`text-xs uppercase tracking-widest mb-1 font-bold ${textColor}`}>
                      {vuln.category.replace('_', ' ')}
                    </p>
                    <p className="font-bold text-foreground">{vuln.name}</p>
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{vuln.description}</p>
                    {isBroken && (
                      <span className="inline-block mt-2 text-xs bg-neon-green/10 text-neon-green px-2 py-0.5 uppercase tracking-wider font-bold">
                        ✓ Broken
                      </span>
                    )}
                  </button>

                  <div className="flex-1 hidden md:block" />
                </div>
              );
            })}
          </div>
        </div>

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