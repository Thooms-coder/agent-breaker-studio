import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useUser } from '@/context/UserContext';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skull, Shield, CheckCircle, XCircle, RotateCcw, Upload, Clock, MessageSquare, Zap, Timer } from 'lucide-react';

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

const Summary = () => {
  const navigate = useNavigate();
  const { vulnerabilities, levelResults, resetGame } = useGame();
  const { currentSession, endSession } = useUser();
  const sessionEnded = useRef(false);

  useEffect(() => {
    if (vulnerabilities.length === 0) navigate('/');
  }, [navigate, vulnerabilities]);

  useEffect(() => {
    if (currentSession && !sessionEnded.current) {
      sessionEnded.current = true;
      endSession();
    }
  }, [currentSession, endSession]);

  const brokenCount = levelResults.filter((result) => result.broken).length;
  const totalCount = vulnerabilities.length;
  const score = totalCount > 0 ? Math.round(((totalCount - brokenCount) / totalCount) * 100) : 0;
  const skullRating = totalCount > 0 ? Math.round((brokenCount / totalCount) * 5) : 0;

  const getGrade = () => {
    if (score >= 90) return { grade: 'A', color: 'text-neon-green', label: 'FORTRESS' };
    if (score >= 70) return { grade: 'B', color: 'text-neon-yellow', label: 'DECENT' };
    if (score >= 50) return { grade: 'C', color: 'text-neon-yellow', label: 'SKETCHY' };
    if (score >= 30) return { grade: 'D', color: 'text-neon-pink', label: 'SWISS CHEESE' };
    return { grade: 'F', color: 'text-neon-pink', label: 'DUMPSTER FIRE' };
  };

  const { grade, color, label } = getGrade();
  const sessionLevels = currentSession?.levels ?? [];
  const totalMessages = sessionLevels.reduce((sum, level) => sum + level.messageCount, 0);
  const brokenLevels = sessionLevels.filter((level) => level.broken && level.timeToBreakMs !== null);
  const avgMsgsToBreak = brokenLevels.length > 0
    ? Math.round((brokenLevels.reduce((sum, level) => sum + level.messageCount, 0) / brokenLevels.length) * 10) / 10
    : null;
  const fastestBreak = brokenLevels.length > 0
    ? Math.min(...brokenLevels.map((level) => level.timeToBreakMs!))
    : null;
  const sessionDuration = currentSession ? Date.now() - currentSession.startedAt : null;

  return (
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-neon-pink tracking-tighter uppercase mb-2 glitch-text" data-text="REPORT CARD">
            REPORT CARD
          </h1>
          <p className="text-muted-foreground text-sm">Here's how your agent held up</p>
        </div>

        <Card className="mb-8 bg-card neon-border text-center py-8 border-0">
          <CardContent>
            <div className={`text-8xl font-bold ${color} mb-2`}>{grade}</div>
            <p className={`text-sm ${color} uppercase tracking-widest mb-4`}>{label}</p>

            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skull
                  key={index}
                  className={`w-6 h-6 ${index < skullRating ? 'text-neon-pink' : 'text-muted'}`}
                />
              ))}
            </div>

            <div className="flex justify-center gap-8 text-sm">
              <div>
                <p className="text-neon-pink text-2xl font-bold">{brokenCount}</p>
                <p className="text-muted-foreground text-xs uppercase">Broken</p>
              </div>
              <div>
                <p className="text-neon-green text-2xl font-bold">{totalCount - brokenCount}</p>
                <p className="text-muted-foreground text-xs uppercase">Held</p>
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold">{score}%</p>
                <p className="text-muted-foreground text-xs uppercase">Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-card border border-neon-yellow/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neon-yellow uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" /> Session Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3 text-neon-green" />
                </div>
                <p className="text-foreground text-xl font-bold">{totalMessages}</p>
                <p className="text-muted-foreground text-xs uppercase">Total Messages</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3 text-neon-pink" />
                </div>
                <p className="text-foreground text-xl font-bold">{avgMsgsToBreak ?? '—'}</p>
                <p className="text-muted-foreground text-xs uppercase">Avg Msgs to Break</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Timer className="w-3 h-3 text-neon-green" />
                </div>
                <p className="text-foreground text-xl font-bold">
                  {fastestBreak !== null ? formatDuration(fastestBreak) : '—'}
                </p>
                <p className="text-muted-foreground text-xs uppercase">Fastest Break</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-neon-yellow" />
                </div>
                <p className="text-foreground text-xl font-bold">
                  {sessionDuration !== null ? formatDuration(sessionDuration) : '—'}
                </p>
                <p className="text-muted-foreground text-xs uppercase">Session Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 mb-8">
          {vulnerabilities.map((vulnerability) => {
            const result = levelResults.find((entry) => entry.vulnerabilityId === vulnerability.id);
            const isBroken = result?.broken;
            const levelStat = sessionLevels.find((level) => level.vulnerabilityId === vulnerability.id);

            return (
              <Card
                key={vulnerability.id}
                className={`bg-card border ${isBroken ? 'border-neon-pink/30' : 'border-neon-green/30'}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {isBroken ? (
                        <XCircle className="w-5 h-5 text-neon-pink flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0" />
                      )}
                      <span className="text-foreground">{vulnerability.name}</span>
                    </CardTitle>
                    <span className={`text-xs uppercase tracking-wider px-2 py-0.5 ${
                      isBroken ? 'bg-neon-pink/10 text-neon-pink' : 'bg-neon-green/10 text-neon-green'
                    }`}>
                      {isBroken ? 'BROKEN' : result ? 'HELD' : 'NOT TESTED'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                    <p className="text-sm text-foreground">{vulnerability.category.replace('_', ' ')}</p>
                  </div>

                  {levelStat && (
                    <div className="flex gap-4 text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {levelStat.messageCount} msgs
                      </span>
                      {levelStat.broken && levelStat.timeToBreakMs !== null && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(levelStat.timeToBreakMs)}
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Break Goal</p>
                    <p className="text-sm text-foreground">{vulnerability.successCriteria}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expected Impact</p>
                    <p className="text-sm text-muted-foreground">{vulnerability.impact}</p>
                  </div>

                  {result?.explanation && result.explanation !== 'Skipped' && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">What Happened</p>
                      <p className="text-sm text-foreground">{result.explanation}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-neon-yellow uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Remediation
                    </p>
                    <p className="text-sm text-muted-foreground">{vulnerability.remediation}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/levels')}
            variant="outline"
            className="border-neon-yellow text-neon-yellow hover:bg-neon-yellow/10 rounded-none"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry Levels
          </Button>
          <Button
            onClick={() => navigate('/profile')}
            variant="outline"
            className="border-neon-green text-neon-green hover:bg-neon-green/10 rounded-none"
          >
            <Zap className="w-4 h-4 mr-2" />
            View Profile
          </Button>
          <Button
            onClick={() => { resetGame(); navigate('/'); }}
            className="bg-neon-pink text-background hover:bg-neon-pink/80 font-bold uppercase tracking-wider rounded-none"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload New Agent
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Summary;
