import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy, Clock, Skull, CheckCircle, ArrowLeft, Zap, Shield, AlertTriangle, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGame } from '@/context/GameContext';
import { useUser } from '@/context/UserContext';
import { getPracticeAgent } from '@/lib/practice-agent';
import {
  getDailyVulnerabilities,
  getTodayString,
  getTodayRecord,
  DailyRecord,
  loadDailyRecords,
} from '@/lib/daily-challenge';
import { getLeaderboard, LeaderboardEntry } from '@/lib/leaderboard';

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  prompt_injection: Zap,
  privilege_escalation: Skull,
  data_leakage: AlertTriangle,
  guardrail_bypass: Shield,
  tool_misuse: Terminal,
};

const CATEGORY_COLORS: Record<string, string> = {
  prompt_injection: 'neon-pink',
  privilege_escalation: 'neon-yellow',
  data_leakage: 'neon-green',
  guardrail_bypass: 'neon-pink',
  tool_misuse: 'neon-yellow',
};

function formatTime(ms: number): string {
  if (ms < 1000) return '<1s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const RANK_COLORS = ['text-neon-yellow', 'text-muted-foreground', 'text-amber-600'];
const RANK_LABELS = ['#1', '#2', '#3'];

const DailyChallenge = () => {
  const navigate = useNavigate();
  const {
    setParsedAgent, setVulnerabilities, setCurrentLevel, setLevelResults,
    setStep, setIsDailyChallenge, setDailyChallengeDate, setDailyChallengeStartTime,
  } = useGame();
  const { profile, startSession } = useUser();

  const today = getTodayString();
  const dailyVulns = getDailyVulnerabilities(today);
  const todayRecord = getTodayRecord();
  const allRecords = loadDailyRecords().sort((a, b) => b.date.localeCompare(a.date));

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    setLeaderboardLoading(true);
    getLeaderboard(today).then(entries => {
      setLeaderboard(entries);
      setLeaderboardLoading(false);
    });
  }, [today]);

  const handleStart = () => {
    setParsedAgent(getPracticeAgent());
    setVulnerabilities(dailyVulns);
    setCurrentLevel(0);
    setLevelResults([]);
    setStep('levelSelect');
    setIsDailyChallenge(true);
    setDailyChallengeDate(today);
    setDailyChallengeStartTime(Date.now());
    startSession(`Daily Challenge — ${today}`);
    navigate('/levels');
  };

  return (
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-3xl mx-auto relative z-10">

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs uppercase tracking-wider mb-8 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-neon-green" />
            <h1 className="text-4xl md:text-5xl font-bold text-neon-green tracking-tighter uppercase glitch-text" data-text="DAILY CHALLENGE">
              DAILY CHALLENGE
            </h1>
          </div>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">
            {formatDate(today)}
          </p>
        </div>

        {/* Today's Challenge Card */}
        <Card className="mb-6 bg-card border border-neon-green/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-neon-green uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" /> Today's Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {dailyVulns.map((vuln, i) => {
                const CatIcon = CATEGORY_ICONS[vuln.category] ?? Shield;
                const color = CATEGORY_COLORS[vuln.category] ?? 'neon-pink';
                return (
                  <div
                    key={vuln.id}
                    className={`flex items-center gap-3 p-3 border border-${color}/20 bg-${color}/5`}
                  >
                    <span className={`text-${color} font-mono text-xs w-4`}>{i + 1}</span>
                    <CatIcon className={`w-4 h-4 text-${color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{vuln.name}</p>
                      <p className={`text-${color} text-xs uppercase tracking-wider`}>
                        {vuln.category.replace(/_/g, ' ')}
                        <span className="text-muted-foreground ml-2">· {vuln.severity}</span>
                      </p>
                    </div>
                    {todayRecord && (
                      <CheckCircle className="w-4 h-4 text-neon-green flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Completion banner or CTA */}
            <div className="mt-5">
              {todayRecord ? (
                <div className="border border-neon-green/40 bg-neon-green/5 p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-neon-green mx-auto mb-2" />
                  <p className="text-neon-green font-bold uppercase tracking-wider text-sm mb-1">
                    Challenge Complete!
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {todayRecord.brokenCount}/{todayRecord.totalCount} broken ·{' '}
                    {formatTime(todayRecord.timeMs)}
                  </p>
                  <Button
                    onClick={handleStart}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-neon-green/40 text-neon-green hover:bg-neon-green/10 rounded-none text-xs uppercase tracking-wider"
                  >
                    Play Again
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleStart}
                  className="w-full bg-neon-green text-background hover:bg-neon-green/80 font-bold uppercase tracking-wider rounded-none text-base py-6"
                >
                  <Skull className="w-5 h-5 mr-2" />
                  Start Challenge
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="mb-6 bg-card border border-neon-yellow/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-neon-yellow uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Today's Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-xs uppercase tracking-wider animate-pulse">
                  Loading...
                </p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-6">
                <Trophy className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                  No scores yet — be the first!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((entry) => (
                  <div
                    key={`${entry.username}-${entry.rank}`}
                    className={`flex items-center gap-3 px-3 py-2 ${
                      entry.username === profile.username
                        ? 'border border-neon-green/30 bg-neon-green/5'
                        : 'border border-border/30'
                    }`}
                  >
                    <span
                      className={`font-mono text-xs w-6 text-right ${
                        entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : 'text-muted-foreground'
                      }`}
                    >
                      {entry.rank <= 3 ? RANK_LABELS[entry.rank - 1] : `#${entry.rank}`}
                    </span>
                    <span className="flex-1 text-sm text-foreground truncate font-mono">
                      {entry.username}
                      {entry.username === profile.username && (
                        <span className="text-neon-green text-xs ml-2">(you)</span>
                      )}
                    </span>
                    <span className="text-neon-pink text-xs font-mono">
                      {entry.brokenCount}/{entry.totalCount}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(entry.timeMs)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal History */}
        {allRecords.length > 0 && (
          <Card className="bg-card border border-neon-pink/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-neon-pink uppercase tracking-wider flex items-center gap-2">
                <Skull className="w-4 h-4" /> Your History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {allRecords.slice(0, 14).map((r: DailyRecord) => (
                  <div key={r.date} className="flex items-center gap-3 px-3 py-2 border border-border/20">
                    <span className="text-muted-foreground text-xs font-mono w-24">{r.date}</span>
                    <div className="flex-1 flex gap-1">
                      {Array.from({ length: r.totalCount }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 ${i < r.brokenCount ? 'bg-neon-pink' : 'bg-neon-green/30'}`}
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground text-xs font-mono">
                      {r.brokenCount}/{r.totalCount} · {formatTime(r.timeMs)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DailyChallenge;
