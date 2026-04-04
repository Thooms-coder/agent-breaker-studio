import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Skull, Lock, CheckCircle } from 'lucide-react';

const ROW_HEIGHT = 140;
const NODE_SIZE = 80;

type Point = { left: number; top: number };

function buildConnectorPath(points: Point[]) {
  if (points.length < 2) return '';

  const segments: string[] = [`M ${points[0].left} ${points[0].top}`];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const controlOffset = Math.min(120, Math.abs(current.left - previous.left) * 0.45 + 28);
    const controlA = previous.left < current.left ? previous.left + controlOffset : previous.left - controlOffset;
    const controlB = previous.left < current.left ? current.left - controlOffset : current.left + controlOffset;

    segments.push(
      `C ${controlA} ${previous.top}, ${controlB} ${current.top}, ${current.left} ${current.top}`,
    );
  }

  return segments.join(' ');
}

const LevelSelect = () => {
  const navigate = useNavigate();
  const { vulnerabilities, setCurrentLevel, setStep, levelResults } = useGame();
  const [selected, setSelected] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [nodeCenters, setNodeCenters] = useState<Point[]>([]);
  const [skullPosition, setSkullPosition] = useState<Point | null>(null);

  useEffect(() => {
    if (vulnerabilities.length === 0) navigate('/upload');
  }, [vulnerabilities, navigate]);

  useEffect(() => {
    setSelected((current) => Math.min(current, Math.max(vulnerabilities.length - 1, 0)));
  }, [vulnerabilities.length]);

  const handleSelectLevel = useCallback((idx: number) => {
    setCurrentLevel(idx);
    setStep('game');
    navigate('/game');
  }, [navigate, setCurrentLevel, setStep]);

  const handleActivateLevel = useCallback((idx: number) => {
    if (idx === selected) {
      handleSelectLevel(idx);
      return;
    }
    setSelected(idx);
  }, [handleSelectLevel, selected]);

  const updateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const centers = nodeRefs.current
      .slice(0, vulnerabilities.length)
      .map((node) => {
        if (!node) return null;
        const nodeRect = node.getBoundingClientRect();
        return {
          left: nodeRect.left - containerRect.left + nodeRect.width / 2,
          top: nodeRect.top - containerRect.top + nodeRect.height / 2,
        };
      })
      .filter((point): point is Point => point !== null);

    setNodeCenters(centers);

    const selectedCenter = centers[selected];
    if (selectedCenter) {
      setSkullPosition(selectedCenter);
    }
  }, [selected, vulnerabilities.length]);

  useEffect(() => {
    updateLayout();
  }, [updateLayout, vulnerabilities.length, levelResults.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => updateLayout());
    resizeObserver.observe(container);
    window.addEventListener('resize', updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  }, [updateLayout]);

  const handleKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      setSelected((current) => Math.max(0, current - 1));
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      setSelected((current) => Math.min(vulnerabilities.length - 1, current + 1));
    } else if (event.key === 'Enter') {
      handleSelectLevel(selected);
    }
  }, [handleSelectLevel, selected, vulnerabilities.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const allDone = vulnerabilities.length > 0 && levelResults.length === vulnerabilities.length;
  const total = vulnerabilities.length;
  const containerHeight = total * ROW_HEIGHT;
  const connectorPath = buildConnectorPath(nodeCenters);

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
          <p className="text-muted-foreground text-xs mt-1">
            Arrow keys move linearly through levels. Press Enter or click the selected level to play.
          </p>
        </div>

        <div ref={containerRef} className="relative" style={{ minHeight: containerHeight }}>
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden
            style={{ zIndex: 0 }}
          >
            {connectorPath && (
              <path
                d={connectorPath}
                fill="none"
                stroke="hsl(var(--neon-pink) / 0.72)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="7 12"
              />
            )}
          </svg>

          <div className="relative" style={{ zIndex: 1 }}>
            {vulnerabilities.map((vuln, idx) => {
              const result = levelResults.find((entry) => entry.vulnerabilityId === vuln.id);
              const isBroken = result?.broken;
              const isAttempted = !!result;
              const isSelected = idx === selected;
              const isEven = idx % 2 === 0;

              const nodeColor = isBroken
                ? 'border-neon-green bg-neon-green/20'
                : isAttempted
                ? 'border-yellow-400 bg-yellow-400/12'
                : 'border-neon-pink bg-neon-pink/12 animate-pulse-neon';

              const textColor = isBroken
                ? 'text-neon-green'
                : isAttempted
                ? 'text-yellow-400'
                : 'text-neon-pink';

              const glowColor = isBroken
                ? '0 0 24px rgba(0,255,128,0.5)'
                : isAttempted
                ? '0 0 24px rgba(255,220,0,0.35)'
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
                  <button
                    ref={(element) => {
                      nodeRefs.current[idx] = element;
                    }}
                    onClick={() => handleActivateLevel(idx)}
                    onMouseEnter={() => setSelected(idx)}
                    className={`relative flex-shrink-0 rounded-full border-4 flex items-center justify-center transition-all hover:scale-110 ${
                      isSelected ? 'scale-110' : ''
                    } ${nodeColor}`}
                    style={{
                      width: NODE_SIZE,
                      height: NODE_SIZE,
                      boxShadow: glowColor,
                    }}
                  >
                    {isBroken ? (
                      <CheckCircle className="w-9 h-9 text-neon-green" />
                    ) : isAttempted ? (
                      <Lock className="w-9 h-9 text-yellow-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-current text-neon-pink opacity-65" />
                    )}
                    <span
                      className={`absolute -top-3 -right-3 w-9 h-9 rounded-full bg-background border-2 flex items-center justify-center text-base font-black ${textColor}`}
                      style={{ borderColor: 'currentColor', boxShadow: glowColor }}
                    >
                      {idx + 1}
                    </span>
                  </button>

                  <div className="flex-1 flex">
                    {isSelected ? (
                      <button
                        onClick={() => handleActivateLevel(idx)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full max-w-[360px] text-left p-4 border-2 transition-all bg-card scale-[1.02] ${cardBorder}`}
                        style={{
                          boxShadow: `${glowColor}, 0 0 0 1px rgba(255,45,120,0.3)`,
                        }}
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
                        {!isBroken && (
                          <span className="inline-block mt-2 text-xs bg-neon-pink/10 text-neon-pink px-2 py-0.5 uppercase tracking-wider font-bold">
                            ▶ Selected
                          </span>
                        )}
                      </button>
                    ) : (
                      <div className="hidden md:block w-full max-w-[360px]" />
                    )}
                  </div>

                  <div className="flex-1 hidden md:block" />
                </div>
              );
            })}
          </div>

          {skullPosition && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: skullPosition.left,
                top: skullPosition.top,
                transform: 'translate(-50%, -50%)',
                transition: 'left 0.45s cubic-bezier(.4,0,.2,1), top 0.45s cubic-bezier(.4,0,.2,1)',
                animation: 'skull-dance 0.8s ease-in-out infinite',
                filter: 'drop-shadow(0 0 10px hsl(var(--neon-pink))) drop-shadow(0 0 24px hsl(var(--neon-pink) / 0.5))',
              }}
            >
              <Skull className="w-14 h-14 text-neon-pink opacity-90" />
            </div>
          )}
        </div>

        {allDone && (
          <div className="text-center mt-12">
            <button
              onClick={() => {
                setStep('summary');
                navigate('/summary');
              }}
              className="bg-neon-green text-background px-8 py-3 font-bold uppercase tracking-wider hover:bg-neon-green/80 transition-colors"
            >
              View Report Card
            </button>
          </div>
        )}

        {levelResults.length > 0 && !allDone && (
          <div className="text-center mt-8">
            <button
              onClick={() => {
                setStep('summary');
                navigate('/summary');
              }}
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
