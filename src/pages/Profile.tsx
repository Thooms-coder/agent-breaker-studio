import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { getAggregateStats } from '@/lib/user-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Pencil, Check, Skull, MessageSquare, Clock, Timer,
  Zap, Target, TrendingUp,
} from 'lucide-react';

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

const Profile = () => {
  const navigate = useNavigate();
  const { profile, rename } = useUser();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.username);

  const stats = getAggregateStats(profile);

  const handleRename = () => {
    if (editing) {
      rename(nameInput);
      setEditing(false);
    } else {
      setNameInput(profile.username);
      setEditing(true);
    }
  };

  return (
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-neon-pink mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {/* Username */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            {editing ? (
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="max-w-[240px] bg-muted border-neon-pink/30 text-center text-2xl font-bold font-mono"
                autoFocus
              />
            ) : (
              <h1
                className="text-4xl md:text-5xl font-bold text-neon-pink tracking-tighter uppercase glitch-text cursor-pointer"
                data-text={profile.username}
                onClick={handleRename}
              >
                {profile.username}
              </h1>
            )}
            <button
              onClick={handleRename}
              className="text-muted-foreground hover:text-neon-yellow transition-colors"
            >
              {editing ? <Check className="w-5 h-5 text-neon-green" /> : <Pencil className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {editing ? 'Press Enter or click ✓ to save' : 'Click name or pencil to rename'}
          </p>
        </div>

        {/* Aggregate stats */}
        <Card className="mb-8 bg-card neon-border border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neon-yellow uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Lifetime Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatBlock icon={<Target className="w-3 h-3 text-neon-pink" />} value={stats.totalSessions} label="Sessions" />
              <StatBlock icon={<Skull className="w-3 h-3 text-neon-pink" />} value={stats.totalBroken} label="Total Breaks" />
              <StatBlock icon={<Zap className="w-3 h-3 text-neon-green" />} value={stats.totalLevelsPlayed} label="Levels Played" />
              <StatBlock icon={<MessageSquare className="w-3 h-3 text-neon-green" />} value={stats.totalMessages} label="Total Messages" />
              <StatBlock
                icon={<Target className="w-3 h-3 text-neon-yellow" />}
                value={`${Math.round(stats.overallBreakRate * 100)}%`}
                label="Break Rate"
              />
              <StatBlock
                icon={<MessageSquare className="w-3 h-3 text-neon-yellow" />}
                value={stats.avgMessagesToBreak || '—'}
                label="Avg Msgs/Break"
              />
              <StatBlock
                icon={<Timer className="w-3 h-3 text-neon-green" />}
                value={stats.fastestBreakMs !== null ? formatDuration(stats.fastestBreakMs) : '—'}
                label="Fastest Break"
              />
              <StatBlock
                icon={<Clock className="w-3 h-3 text-neon-yellow" />}
                value={formatDuration(stats.totalPlayTimeMs)}
                label="Total Play Time"
              />
            </div>
          </CardContent>
        </Card>

        {/* Session history */}
        <h2 className="text-sm text-neon-green uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Session History
        </h2>

        {profile.sessions.length === 0 ? (
          <Card className="bg-card border border-border">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No sessions yet. Go break some agents!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 mb-8">
            {[...profile.sessions].reverse().map((session) => {
              const brokenInSession = session.levels.filter(l => l.broken).length;
              const totalInSession = session.levels.length;
              const duration = session.endedAt ? session.endedAt - session.startedAt : null;

              return (
                <Card key={session.id} className="bg-card border border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-foreground font-bold">
                        {session.agentName}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.startedAt).toLocaleDateString()} {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6 text-xs">
                      <span className="text-neon-pink font-bold">{brokenInSession}/{totalInSession} broken</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {session.totalMessages} msgs
                      </span>
                      {duration !== null && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(duration)}
                        </span>
                      )}
                    </div>

                    {/* Per-level breakdown */}
                    <div className="mt-3 space-y-1">
                      {session.levels.map((level) => (
                        <div key={level.vulnerabilityId} className="flex items-center justify-between text-xs py-1 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            {level.broken ? (
                              <Skull className="w-3 h-3 text-neon-pink" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-neon-green" />
                            )}
                            <span className="text-foreground">{level.vulnerabilityName}</span>
                          </div>
                          <div className="flex gap-3 text-muted-foreground">
                            <span>{level.messageCount} msgs</span>
                            {level.broken && level.timeToBreakMs !== null && (
                              <span className="text-neon-pink">{formatDuration(level.timeToBreakMs)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function StatBlock({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
      <p className="text-foreground text-xl font-bold">{value}</p>
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
    </div>
  );
}

export default Profile;
