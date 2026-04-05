import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useUser } from '@/context/UserContext';
import { chatWithAgent, judgeExploit, ChatMessage } from '@/lib/openrouter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft, SkipForward, Zap, Eye, AlertTriangle, X, Shield, CheckCircle, Flag, RotateCcw } from 'lucide-react';

const Game = () => {
  const navigate = useNavigate();
  const {
    parsedAgent,
    vulnerabilities,
    currentLevel,
    addLevelResult,
    setStep,
    setCurrentLevel,
    chatLogs,
    setChatLog,
  } = useGame();
  const { startLevel, recordMessage, recordBreak } = useUser();

  const vuln = vulnerabilities[currentLevel];
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(
    () => (vuln ? chatLogs[vuln.id] ?? [] : [])
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [judging, setJudging] = useState(false);
  const [broken, setBroken] = useState(false);
  const [breakExplanation, setBreakExplanation] = useState('');
  const [judgeFailed, setJudgeFailed] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const completionTimerRef = useRef<number | null>(null);
  const brokenLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (!parsedAgent || !vuln) {
      navigate('/levels');
      return;
    }

    startLevel(vuln.id, vuln.name, vuln.category);
  }, [navigate, parsedAgent, startLevel, vuln]);

  useEffect(() => {
    if (!vuln) return;

    setChatHistory(chatLogs[vuln.id] ?? []);
    setBroken(false);
    setBreakExplanation('');
    setJudgeFailed('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel, vuln?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const returnToLevelSelect = useCallback(() => {
    const level = brokenLevelRef.current ?? currentLevel;
    const v = vulnerabilities[level];
    if (!v) return;

    const nextLevel = level < vulnerabilities.length - 1 ? level + 1 : undefined;
    setStep('levelSelect');
    navigate('/levels', {
      state: {
        focusLevel: level,
        autoAdvanceTo: nextLevel,
        justCompletedId: v.id,
      },
    });
  }, [currentLevel, navigate, setStep, vulnerabilities]);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  if (!vuln || !parsedAgent) return null;

  const handleSend = async () => {
    if (!input.trim() || sending || broken) return;

    setJudgeFailed('');

    const userMsg: ChatMessage = { role: 'user', content: input };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatLog(vuln.id, newHistory);
    setInput('');
    setSending(true);
    recordMessage(vuln.id);

    let fullHistory: ChatMessage[] = newHistory;

    try {
      const response = await chatWithAgent(parsedAgent.systemPrompt, newHistory);
      const assistantMsg: ChatMessage = { role: 'assistant', content: response };
      fullHistory = [...newHistory, assistantMsg];
      setChatHistory(fullHistory);
      setChatLog(vuln.id, fullHistory);
    } catch (error: any) {
      const errorHistory: ChatMessage[] = [
        ...newHistory,
        { role: 'assistant', content: `[Error: ${error.message}]` },
      ];
      setChatHistory(errorHistory);
      setChatLog(vuln.id, errorHistory);
      setSending(false);
      return;
    }

    const userTurnCount = fullHistory.filter(message => message.role === 'user').length;
    if (userTurnCount >= 3 && userTurnCount % 2 === 0) {
      try {
        setJudging(true);
        const result = await judgeExploit(parsedAgent.systemPrompt, fullHistory, vuln);
        setJudging(false);

        if (result.broken) {
          brokenLevelRef.current = currentLevel;
          setBroken(true);
          setBreakExplanation(result.explanation);
          recordBreak(vuln.id);
          addLevelResult({
            vulnerabilityId: vuln.id,
            broken: true,
            explanation: result.explanation,
            chatHistory: fullHistory,
          });
        }
      } catch {
        setJudging(false);
        // auto-judge failed silently — user can still manually submit
      }
    }

    setSending(false);
  };

  const handleSubmit = async () => {
    if (chatHistory.length < 2 || judging || broken) return;

    setJudging(true);
    setJudgeFailed('');

    try {
      const result = await judgeExploit(parsedAgent.systemPrompt, chatHistory, vuln);
      if (result.broken) {
        brokenLevelRef.current = currentLevel;
        setBroken(true);
        setBreakExplanation(result.explanation);
        recordBreak(vuln.id);
        addLevelResult({
          vulnerabilityId: vuln.id,
          broken: true,
          explanation: result.explanation,
          chatHistory,
        });
      } else {
        setJudgeFailed(result.explanation || 'The agent was not broken yet. Keep trying!');
      }
    } catch {
      setJudgeFailed('Judging failed — try again.');
    }

    setJudging(false);
  };

  const handleReset = () => {
    if (sending || broken) return;
    setChatHistory([]);
    setChatLog(vuln.id, []);
    setJudgeFailed('');
  };

  const handleSkip = () => {
    addLevelResult({
      vulnerabilityId: vuln.id,
      broken: false,
      skipped: true,
      explanation: 'Skipped',
      chatHistory,
    });

    if (currentLevel < vulnerabilities.length - 1) {
      setCurrentLevel(currentLevel + 1);
      return;
    }

    setStep('summary');
    navigate('/summary');
  };

  const handleNextLevel = () => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    returnToLevelSelect();
  };

  return (
    <div className="h-screen noise-bg flex flex-col">
      <div className="scanline-overlay" />

      <div className="relative z-10 border-b border-border px-4 py-3 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/levels')} className="text-muted-foreground hover:text-neon-pink">
            <ArrowLeft className="w-4 h-4 mr-1" /> Levels
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={sending || broken || chatHistory.length === 0} className="text-muted-foreground hover:text-neon-yellow">
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Level</span>
          <div className="flex gap-1">
            {vulnerabilities.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentLevel ? 'bg-neon-pink animate-pulse-neon' : index < currentLevel ? 'bg-neon-green' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground hover:text-neon-yellow">
          Skip <SkipForward className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        <div className="flex-1 flex flex-col border-r border-border">
          <ScrollArea className="flex-1 p-4 pb-32">
            <div className="space-y-4 max-w-2xl mx-auto">
              {chatHistory.length === 0 && (
                <div className="text-center py-12">
                  <Zap className="w-8 h-8 mx-auto text-neon-pink mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Start chatting with the agent. Your goal is to trigger the exact break condition in the intel panel.
                  </p>
                </div>
              )}

              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 text-sm font-mono ${
                      message.role === 'user'
                        ? 'bg-neon-pink/10 border border-neon-pink/30 text-foreground'
                        : 'bg-muted border border-border text-foreground'
                    }`}
                  >
                    <span className={`text-xs block mb-1 ${message.role === 'user' ? 'text-neon-pink' : 'text-neon-green'}`}>
                      {message.role === 'user' ? '› YOU' : '› AGENT'}
                    </span>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted border border-border px-4 py-3 text-sm">
                    <span className="text-neon-green text-xs block mb-1">{'>'} AGENT</span>
                    <span className="animate-pulse text-muted-foreground">processing...</span>
                  </div>
                </div>
              )}

              {judging && (
                <div className="text-center py-2">
                  <span className="text-neon-yellow text-xs animate-pulse">evaluating...</span>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {broken && (
            <div className="absolute inset-0 bg-background/90 z-20 flex items-start justify-center pt-12 animate-explode">
              <div className="text-center p-8 max-w-md">
                <div className="text-6xl mb-4 animate-glitch">💥</div>
                <h2 className="text-3xl font-bold text-neon-green neon-glow-green mb-2 uppercase tracking-wider">
                  Level Cleared!
                </h2>
                <p className="text-foreground mb-4">{breakExplanation}</p>

                <Card className="bg-card border border-neon-green/30 text-left mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-neon-yellow uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4" /> How to Fix This
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{vuln.remediation}</p>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleNextLevel}
                  className="bg-neon-pink text-background hover:bg-neon-pink/80 font-bold uppercase tracking-wider rounded-none"
                >
                  {currentLevel < vulnerabilities.length - 1 ? 'Open Mission Map' : 'View Cleared Map'}
                </Button>
              </div>
            </div>
          )}

          <div className="sticky bottom-0 w-full bg-background/95 backdrop-blur border-t border-border z-20">
            <div className="p-4 max-w-2xl mx-auto">
              {judgeFailed && (
                <div className="mb-3 flex gap-2 border border-neon-yellow/40 bg-neon-yellow/10 px-3 py-2 text-neon-yellow">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="flex-1 text-xs">{judgeFailed}</p>
                  <Button size="icon" variant="ghost" onClick={() => setJudgeFailed('')}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Type your attack... (Ctrl/⌘ + Enter to send)"
                  disabled={sending || broken}
                  rows={4}
                  className="flex-1 font-mono"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                />

                <Button type="submit" disabled={sending || broken || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={chatHistory.length < 2 || judging || broken || sending}
                  className="bg-neon-green text-background hover:bg-neon-green/80 rounded-none font-bold uppercase tracking-wider text-xs"
                >
                  <Flag className="w-4 h-4 mr-1" /> Submit
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 bg-card/50 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-neon-yellow" />
              <h3 className="text-sm font-bold text-neon-yellow uppercase tracking-wider">Intel Panel</h3>
            </div>

            <Card className="bg-muted/50 border-neon-pink/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-neon-pink uppercase tracking-wider">
                  Vulnerability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground font-bold text-lg">{vuln.name}</p>
                <span className="inline-block mt-1 text-xs bg-neon-pink/10 text-neon-pink px-2 py-0.5 uppercase tracking-wider">
                  {vuln.category.replace('_', ' ')}
                </span>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Severity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className={`text-sm font-bold uppercase ${
                  vuln.severity === 'critical' ? 'text-neon-pink' :
                  vuln.severity === 'high' ? 'text-neon-yellow' : 'text-foreground'
                }`}>
                  {vuln.severity}
                </span>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{vuln.description}</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-neon-yellow/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-neon-yellow uppercase tracking-wider flex items-center gap-2">
                  <Flag className="w-3 h-3" /> Break Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{vuln.successCriteria}</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-neon-pink/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-neon-pink uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Expected Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{vuln.impact}</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 neon-border-yellow border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-neon-yellow uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Hint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neon-yellow/80 italic">"{vuln.hint}"</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-neon-green uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" /> Exploit Guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{vuln.exploitGuidance}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
