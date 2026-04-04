import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { chatWithAgent, judgeExploit, ChatMessage } from '@/lib/openrouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft, SkipForward, Zap, Eye, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const Game = () => {
  const navigate = useNavigate();
  const { parsedAgent, vulnerabilities, currentLevel, addLevelResult, setStep, setCurrentLevel } = useGame();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [judging, setJudging] = useState(false);
  const [broken, setBroken] = useState(false);
  const [breakExplanation, setBreakExplanation] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const vuln = vulnerabilities[currentLevel];

  useEffect(() => {
    if (!parsedAgent || !vuln) navigate('/levels');
  }, [parsedAgent, vuln, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  if (!vuln || !parsedAgent) return null;

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setInput('');
    setSending(true);

    try {
      const response = await chatWithAgent(parsedAgent.systemPrompt, newHistory);
      const assistantMsg: ChatMessage = { role: 'assistant', content: response };
      const fullHistory = [...newHistory, assistantMsg];
      setChatHistory(fullHistory);

      // Auto-judge every 3 messages or if response seems suspicious
      if (fullHistory.filter(m => m.role === 'user').length % 2 === 0 || fullHistory.length >= 4) {
        setJudging(true);
        const result = await judgeExploit(parsedAgent.systemPrompt, fullHistory, vuln);
        setJudging(false);
        if (result.broken) {
          setBroken(true);
          setBreakExplanation(result.explanation);
          addLevelResult({
            vulnerabilityId: vuln.id,
            broken: true,
            explanation: result.explanation,
            chatHistory: fullHistory,
          });
        }
      }
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `[Error: ${e.message}]` }]);
    }
    setSending(false);
  };

  const handleSkip = () => {
    addLevelResult({
      vulnerabilityId: vuln.id,
      broken: false,
      explanation: 'Skipped',
      chatHistory,
    });
    goNext();
  };

  const goNext = () => {
    if (currentLevel < vulnerabilities.length - 1) {
      setCurrentLevel(currentLevel + 1);
      setChatHistory([]);
      setBroken(false);
      setBreakExplanation('');
    } else {
      setStep('summary');
      navigate('/summary');
    }
  };

  const handleNextLevel = () => {
    goNext();
  };

  return (
    <div className="h-screen noise-bg flex flex-col">
      <div className="scanline-overlay" />

      {/* Top bar */}
      <div className="relative z-10 border-b border-border px-4 py-3 flex items-center justify-between bg-card/50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/levels')} className="text-muted-foreground hover:text-neon-pink">
          <ArrowLeft className="w-4 h-4 mr-1" /> Levels
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Level</span>
          <div className="flex gap-1">
            {vulnerabilities.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i === currentLevel ? 'bg-neon-pink animate-pulse-neon' : i < currentLevel ? 'bg-neon-green' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground hover:text-neon-yellow">
          Skip <SkipForward className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Chat panel */}
        <div className="flex-1 flex flex-col border-r border-border">
          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              {chatHistory.length === 0 && (
                <div className="text-center py-12">
                  <Zap className="w-8 h-8 mx-auto text-neon-pink mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Start chatting with your agent. Try to break its guardrails.
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Check the Intel Panel for hints →
                  </p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 text-sm font-mono ${
                      msg.role === 'user'
                        ? 'bg-neon-pink/10 border border-neon-pink/30 text-foreground'
                        : 'bg-muted border border-border text-foreground'
                    }`}
                  >
                    <span className={`text-xs block mb-1 ${msg.role === 'user' ? 'text-neon-pink' : 'text-neon-green'}`}>
                      {msg.role === 'user' ? '› YOU' : '› AGENT'}
                    </span>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted border border-border px-4 py-3 text-sm">
                    <span className="text-neon-green text-xs block mb-1">{'>'} AGENT</span>
                    <span className="animate-pulse text-muted-foreground">thinking...</span>
                  </div>
                </div>
              )}
              {judging && (
                <div className="text-center py-2">
                  <span className="text-neon-yellow text-xs animate-pulse">⚡ Analyzing response...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Success overlay */}
          {broken && (
            <div className="absolute inset-0 bg-background/90 z-20 flex items-center justify-center animate-explode">
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
                  {currentLevel < vulnerabilities.length - 1 ? 'Next Level' : 'View Summary'}
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2 max-w-2xl mx-auto"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your attack..."
                disabled={sending || broken}
                className="bg-muted border-border font-mono text-sm flex-1"
              />
              <Button
                type="submit"
                disabled={sending || broken || !input.trim()}
                className="bg-neon-pink text-background hover:bg-neon-pink/80 rounded-none"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Intel panel */}
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
