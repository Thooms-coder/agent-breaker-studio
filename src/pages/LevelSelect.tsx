import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Skull, CheckCircle, ChevronRight } from 'lucide-react';

const NODE_SPACING_Y = 120;
const SNAKE_PADDING_X = 80;
const NODE_RADIUS = 28;

function getNodePositions(count: number, containerWidth: number) {
  const leftX = SNAKE_PADDING_X;
  const rightX = containerWidth - SNAKE_PADDING_X;
  return Array.from({ length: count }, (_, i) => ({
    x: i % 2 === 0 ? leftX : rightX,
    y: 60 + i * NODE_SPACING_Y,
  }));
}

function buildPathD(positions: { x: number; y: number }[]) {
  if (positions.length < 2) return '';
  let d = `M ${positions[0].x} ${positions[0].y}`;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}

const LevelSelect = () => {
  const navigate = useNavigate();
  const { vulnerabilities, setCurrentLevel, setStep, levelResults } = useGame();
  const [selected, setSelected] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);

  useEffect(() => {
    if (vulnerabilities.length === 0) navigate('/upload');
  }, [vulnerabilities, navigate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const handleSelectLevel = useCallback((idx: number) => {
    setCurrentLevel(idx);
    setStep('game');
    navigate('/game');
  }, [setCurrentLevel, setStep, navigate]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      setSelected(s => Math.max(0, s - 1));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      setSelected(s => Math.min(vulnerabilities.length - 1, s + 1));
    } else if (e.key === 'Enter') {
      handleSelectLevel(selected);
    }
  }, [vulnerabilities.length, selected, handleSelectLevel]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const positions = getNodePositions(vulnerabilities.length, width);
  const svgHeight = vulnerabilities.length > 0 ? positions[positions.length - 1].y + 80 : 200;
  const pathD = buildPathD(positions);
  const allDone = vulnerabilities.length > 0 && levelResults.length === vulnerabilities.length;

  const getStatus = (id: string) => {
    const r = levelResults.find(r => r.vulnerabilityId === id);
    if (r?.broken) return 'broken';
    if (r) return 'attempted';
    return 'open';
  };

  return (
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-neon-pink tracking-tighter uppercase mb-2 glitch-text" data-text="SELECT LEVEL">
            SELECT LEVEL
          </h1>
          <p className="text-muted-foreground text-sm">
            {vulnerabilities.length} vulnerabilities detected. Break them all.
          </p>
          <p className="text-muted-foreground text-xs mt-1">Use arrow keys or click to navigate</p>
        </div>

        <div ref={containerRef} className="relative w-full">
          <svg width={width} height={svgHeight} className="absolute inset-0" aria-hidden>
            {/* Trail line */}
            {pathD && (
              <path d={pathD} fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeDasharray="8 6" />
            )}
            {/* Completed trail overlay */}
            {positions.map((pos, i) => {
              if (i === 0) return null;
              const prev = positions[i - 1];
              const status = getStatus(vulnerabilities[i - 1]?.id);
              if (status !== 'broken') return null;
              const midY = (prev.y + pos.y) / 2;
              return (
                <path
                  key={`trail-${i}`}
                  d={`M ${prev.x} ${prev.y} C ${prev.x} ${midY}, ${pos.x} ${midY}, ${pos.x} ${pos.y}`}
                  fill="none"
                  stroke="hsl(var(--neon-green))"
                  strokeWidth="3"
                  opacity={0.5}
                />
              );
            })}
          </svg>

          <div style={{ height: svgHeight }} className="relative">
            {vulnerabilities.map((vuln, idx) => {
              const pos = positions[idx];
              const status = getStatus(vuln.id);
              const isSelected = idx === selected;

              const colors = {
                broken: { ring: 'border-neon-green', bg: 'bg-neon-green/20', glow: '0 0 12px hsl(var(--neon-green))', icon: 'text-neon-green' },
                attempted: { ring: 'border-neon-yellow', bg: 'bg-neon-yellow/20', glow: '0 0 12px hsl(var(--neon-yellow))', icon: 'text-neon-yellow' },
                open: { ring: 'border-neon-pink', bg: 'bg-neon-pink/20', glow: '0 0 12px hsl(var(--neon-pink))', icon: 'text-neon-pink' },
              }[status];

              return (
                <button
                  key={vuln.id}
                  onClick={() => { setSelected(idx); handleSelectLevel(idx); }}
                  onMouseEnter={() => setSelected(idx)}
                  className="absolute group focus:outline-none"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Node circle */}
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${colors.ring} ${colors.bg} ${status === 'open' ? 'animate-pulse-neon' : ''}`}
                    style={{
                      boxShadow: isSelected ? colors.glow : 'none',
                      transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    {status === 'broken' ? (
                      <CheckCircle className={`w-6 h-6 ${colors.icon}`} />
                    ) : (
                      <Skull className={`w-6 h-6 ${colors.icon} ${status === 'open' ? 'animate-float' : ''}`} />
                    )}
                  </div>
                  {/* Level number */}
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
                    {idx + 1}
                  </span>
                  {/* Tooltip card */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-48 p-3 bg-card border transition-all duration-150 pointer-events-none ${
                      isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    } ${status === 'broken' ? 'border-neon-green/40' : 'border-border'}`}
                    style={{
                      [idx % 2 === 0 ? 'left' : 'right']: '100%',
                      marginLeft: idx % 2 === 0 ? '16px' : undefined,
                      marginRight: idx % 2 !== 0 ? '16px' : undefined,
                    }}
                  >
                    <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${status === 'broken' ? 'text-neon-green' : 'text-neon-pink'}`}>
                      {vuln.category.replace('_', ' ')}
                    </p>
                    <p className="font-bold text-foreground text-sm leading-tight">{vuln.name}</p>
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{vuln.description}</p>
                    {status === 'broken' && (
                      <span className="inline-block mt-1.5 text-[10px] bg-neon-green/10 text-neon-green px-1.5 py-0.5 uppercase tracking-wider">✓ Broken</span>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 text-muted-foreground text-[10px]">
                      <span>Enter to play</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {allDone && (
          <div className="text-center mt-8">
            <button
              onClick={() => { setStep('summary'); navigate('/summary'); }}
              className="bg-neon-green text-background px-8 py-3 font-bold uppercase tracking-wider hover:bg-neon-green/80 transition-colors"
            >
              View Report Card
            </button>
          </div>
        )}
        {levelResults.length > 0 && !allDone && (
          <div className="text-center mt-6">
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
