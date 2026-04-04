import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Skull, Lock, CheckCircle, Home, Shield, Sparkles, Trophy } from 'lucide-react';

const ROW_HEIGHT = 140;
const NODE_SIZE = 80;

type Point = { left: number; top: number };
type LevelSelectNavState = {
  focusLevel?: number;
  autoAdvanceTo?: number;
  justCompletedId?: string;
};

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
  const location = useLocation();
  const navigate = useNavigate();
  const { vulnerabilities, setCurrentLevel, setStep, levelResults } = useGame();
  const navState = location.state as LevelSelectNavState | null;
  const [selected, setSelected] = useState(() =>
    typeof navState?.focusLevel === 'number'
      ? Math.max(0, Math.min(vulnerabilities.length - 1, navState.focusLevel))
      : 0
  );
  const [recentlyCompletedId, setRecentlyCompletedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [nodeCenters, setNodeCenters] = useState<Point[]>([]);
  const [skullPosition, setSkullPosition] = useState<Point | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const completionPulseTimerRef = useRef<number | null>(null);

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

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const handleActivateLevel = useCallback((idx: number) => {
    clearAutoAdvance();
    if (idx === selected) {
      handleSelectLevel(idx);
      return;
    }
    setSelected(idx);
  }, [clearAutoAdvance, handleSelectLevel, selected]);

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

  const navStateRef = useRef(navState);
  useEffect(() => {
    const state = navStateRef.current;
    navStateRef.current = null;
    if (!state) return;

    const clampedFocus = typeof state.focusLevel === 'number'
      ? Math.max(0, Math.min(vulnerabilities.length - 1, state.focusLevel))
      : null;
    const clampedAutoAdvance = typeof state.autoAdvanceTo === 'number'
      ? Math.max(0, Math.min(vulnerabilities.length - 1, state.autoAdvanceTo))
      : null;

    if (state.justCompletedId) {
      setRecentlyCompletedId(state.justCompletedId);
      if (completionPulseTimerRef.current !== null) {
        window.clearTimeout(completionPulseTimerRef.current);
      }
      completionPulseTimerRef.current = window.setTimeout(() => {
        setRecentlyCompletedId(null);
        completionPulseTimerRef.current = null;
      }, 3200);
    }

    if (
      clampedFocus !== null
      && clampedAutoAdvance !== null
      && clampedAutoAdvance !== clampedFocus
    ) {
      clearAutoAdvance();
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        setSelected(clampedAutoAdvance);
        autoAdvanceTimerRef.current = null;
      }, 1250);
    }

    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKey = useCallback((event: KeyboardEvent) => {
    clearAutoAdvance();
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      setSelected((current) => Math.max(0, current - 1));
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      setSelected((current) => Math.min(vulnerabilities.length - 1, current + 1));
    } else if (event.key === 'Enter') {
      handleSelectLevel(selected);
    }
  }, [clearAutoAdvance, handleSelectLevel, selected, vulnerabilities.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current !== null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
      if (completionPulseTimerRef.current !== null) {
        window.clearTimeout(completionPulseTimerRef.current);
      }
    };
  }, []);

  const allDone = vulnerabilities.length > 0 && levelResults.length >= vulnerabilities.length;
  const brokenCount = levelResults.filter((r) => r.broken).length;
  const total = vulnerabilities.length;
  const containerHeight = total * ROW_HEIGHT;
  const connectorPath = buildConnectorPath(nodeCenters);

  return (
    <>
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-3xl mx-auto relative z-10">

        {/* Home button */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-neon-pink transition-colors text-sm uppercase tracking-wider"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>

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
              const isRecentlyCompleted = recentlyCompletedId === vuln.id;

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

              const handlePreview = () => {
                clearAutoAdvance();
                setSelected(idx);
              };

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
                    onMouseEnter={handlePreview}
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
                      className={`absolute -top-3 -right-3 w-9 h-9 rounded-full bg-background border-2 flex items-center justify-center text-base font-black ${textColor} ${
                        isRecentlyCompleted ? 'level-cleared-badge' : ''
                      }`}
                      style={{ borderColor: 'currentColor', boxShadow: glowColor }}
                    >
                      {idx + 1}
                    </span>
                    {isRecentlyCompleted && (
                      <div className="absolute inset-0 rounded-full border border-neon-green/60 level-cleared-ring" />
                    )}
                  </button>

                  <div className="flex-1 flex">
                    {isSelected ? (
                      <button
                        onClick={() => handleActivateLevel(idx)}
                        onMouseEnter={handlePreview}
                        className={`w-full max-w-[360px] text-left p-4 border-2 transition-all bg-card scale-[1.02] level-card-enter ${
                          isRecentlyCompleted ? 'border-neon-green/60' : cardBorder
                        }`}
                        style={{
                          boxShadow: isRecentlyCompleted
                            ? '0 0 0 1px rgba(0,255,128,0.3), 0 0 32px rgba(0,255,128,0.16)'
                            : `${glowColor}, 0 0 0 1px rgba(255,45,120,0.3)`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className={`text-xs uppercase tracking-widest mb-1 font-bold ${textColor}`}>
                              {vuln.category.replace('_', ' ')}
                            </p>
                            <p className="font-bold text-foreground">{vuln.name}</p>
                          </div>
                          {isBroken ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-neon-green/10 text-neon-green px-2 py-1 uppercase tracking-wider font-bold level-cleared-pill">
                              <CheckCircle className="w-3 h-3" /> Cleared
                            </span>
                          ) : (
                            <span className="inline-block text-xs bg-neon-pink/10 text-neon-pink px-2 py-1 uppercase tracking-wider font-bold">
                              ▶ Selected
                            </span>
                          )}
                        </div>

                        <p className={`mt-2 text-xs ${isBroken ? 'text-neon-pink/45 line-through' : 'text-muted-foreground line-clamp-2'}`}>
                          {vuln.description}
                        </p>

                        <div className="mt-3 grid gap-2">
                          <div className="rounded-sm border border-neon-yellow/20 bg-neon-yellow/5 p-2">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-neon-yellow mb-1">Break Goal</div>
                            <p className="text-xs text-foreground line-clamp-3">{vuln.successCriteria}</p>
                          </div>
                          <div className="rounded-sm border border-neon-pink/20 bg-neon-pink/5 p-2">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-neon-pink mb-1">Impact</div>
                            <p className="text-xs text-muted-foreground line-clamp-3">{vuln.impact}</p>
                          </div>
                        </div>

                        {isBroken ? (
                          <div className="mt-4 rounded-sm border border-neon-green/25 bg-neon-green/6 p-3 remediation-card">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-neon-green mb-2">
                              <Shield className="w-3.5 h-3.5" />
                              Proposed Fix
                            </div>
                            <p className="text-sm text-foreground">
                              {vuln.remediation}
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-neon-green/75">
                              <Sparkles className="w-3.5 h-3.5" />
                              Guardrail patched
                            </div>
                          </div>
                        ) : null}
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

    {allDone && (
      <div className="completion-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/96 backdrop-blur-sm">
        <div className="scanline-overlay" />
        <div className="relative z-10 text-center px-6 max-w-xl mx-auto w-full">

          <div className="completion-badge-pop flex justify-center mb-6">
            <div
              className="relative flex items-center justify-center w-28 h-28 rounded-full border-4 border-neon-green bg-neon-green/10"
              style={{ boxShadow: '0 0 40px rgba(0,255,128,0.4), 0 0 80px rgba(0,255,128,0.15)' }}
            >
              <Trophy className="w-14 h-14 text-neon-green" />
            </div>
          </div>

          <h1
            className="text-5xl md:text-6xl font-bold text-neon-green tracking-tighter uppercase mb-2 glitch-text"
            data-text="SYSTEM BREACHED"
          >
            SYSTEM BREACHED
          </h1>

          <div
            className="completion-line h-px bg-neon-green/50 mx-auto mb-6"
            style={{ maxWidth: '320px', boxShadow: '0 0 8px rgba(0,255,128,0.4)' }}
          />

          <p className="text-muted-foreground uppercase tracking-[0.2em] text-xs mb-10">
            All {total} {total === 1 ? 'vulnerability' : 'vulnerabilities'} exploited — agent compromised
          </p>

          <div className="grid grid-cols-3 gap-3 mb-10 border border-neon-green/20 bg-neon-green/5 p-4">
            <div>
              <p className="text-3xl font-bold text-neon-green">{total}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Levels</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-neon-green">{brokenCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Broken</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-neon-yellow">
                {total > 0 ? Math.round((brokenCount / total) * 100) : 0}%
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Success</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setStep('summary');
                navigate('/summary');
              }}
              className="bg-neon-green text-background px-10 py-3 font-bold uppercase tracking-wider hover:bg-neon-green/80 transition-colors"
              style={{ boxShadow: '0 0 20px rgba(0,255,128,0.3)' }}
            >
              View Report Card
            </button>
            <button
              onClick={() => navigate('/')}
              className="border border-neon-pink/50 text-neon-pink px-10 py-3 font-bold uppercase tracking-wider hover:bg-neon-pink/10 transition-colors"
            >
              New Game
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default LevelSelect;
