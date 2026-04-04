import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skull, Shield, CheckCircle, XCircle, RotateCcw, Upload } from 'lucide-react';

const Summary = () => {
  const navigate = useNavigate();
  const { vulnerabilities, levelResults, resetGame } = useGame();

  useEffect(() => {
    if (vulnerabilities.length === 0) navigate('/');
  }, [vulnerabilities, navigate]);

  const brokenCount = levelResults.filter(r => r.broken).length;
  const totalCount = vulnerabilities.length;
  const score = totalCount > 0 ? Math.round(((totalCount - brokenCount) / totalCount) * 100) : 0;

  // Skull rating (0-5 skulls, more skulls = more broken = worse)
  const skullRating = totalCount > 0 ? Math.round((brokenCount / totalCount) * 5) : 0;

  const getGrade = () => {
    if (score >= 90) return { grade: 'A', color: 'text-neon-green', label: 'FORTRESS' };
    if (score >= 70) return { grade: 'B', color: 'text-neon-yellow', label: 'DECENT' };
    if (score >= 50) return { grade: 'C', color: 'text-neon-yellow', label: 'SKETCHY' };
    if (score >= 30) return { grade: 'D', color: 'text-neon-pink', label: 'SWISS CHEESE' };
    return { grade: 'F', color: 'text-neon-pink', label: 'DUMPSTER FIRE' };
  };

  const { grade, color, label } = getGrade();

  return (
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-neon-pink tracking-tighter uppercase mb-2 glitch-text" data-text="REPORT CARD">
            REPORT CARD
          </h1>
          <p className="text-muted-foreground text-sm">Here's how your agent held up</p>
        </div>

        {/* Score card */}
        <Card className="mb-8 bg-card neon-border text-center py-8 border-0">
          <CardContent>
            <div className={`text-8xl font-bold ${color} mb-2`}>{grade}</div>
            <p className={`text-sm ${color} uppercase tracking-widest mb-4`}>{label}</p>

            {/* Skull rating */}
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skull
                  key={i}
                  className={`w-6 h-6 ${i < skullRating ? 'text-neon-pink' : 'text-muted'}`}
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

        {/* Vulnerability grid */}
        <div className="space-y-4 mb-8">
          {vulnerabilities.map((vuln) => {
            const result = levelResults.find(r => r.vulnerabilityId === vuln.id);
            const isBroken = result?.broken;

            return (
              <Card
                key={vuln.id}
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
                      <span className="text-foreground">{vuln.name}</span>
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
                    <p className="text-sm text-foreground">{vuln.category.replace('_', ' ')}</p>
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
                    <p className="text-sm text-muted-foreground">{vuln.remediation}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Actions */}
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
