import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { chatWithAgent, judgeExploit, ChatMessage } from '@/lib/openrouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft, SkipForward, Zap, Eye, Flag, AlertTriangle, X } from 'lucide-react';

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
    setChatLog
  } = useGame();

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
  const [showIntel, setShowIntel] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parsedAgent || !vuln) navigate('/levels');
  }, [parsedAgent, vuln, navigate]);

  useEffect(() => {
    if (vuln) {
      const saved = chatLogs[vuln.id] ?? [];
      setChatHistory(saved);
      setBroken(false);
      setBreakExplanation('');
      setJudgeFailed('');
    }
  }, [currentLevel]);

  useEffect(() => {
    if (vuln && chatHistory.length > 0) {
      setChatLog(vuln.id, chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  if (!vuln || !parsedAgent) return null;

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    setJudgeFailed('');
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

      if (
        fullHistory.filter(m => m.role === 'user').length >= 3 &&
        fullHistory.filter(m => m.role === 'user').length % 2 === 0
      ) {
        setJudging(true);
        const result = await judgeExploit(parsedAgent.systemPrompt, fullHistory, vuln);
        setJudging(false);

        if (result.broken) {
          setBroken(true);

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

  const handleSubmit = async () => {
    if (chatHistory.length < 2 || judging || broken) return;

    setJudging(true);
    setJudgeFailed('');

    try {
      const result = await judgeExploit(parsedAgent.systemPrompt, chatHistory, vuln);

      if (result.broken) {
        setBroken(true);
        setBreakExplanation(result.explanation);

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
    } else {
      setStep('summary');
      navigate('/summary');
    }
  };

  return (
    <div className="h-screen noise-bg flex flex-col">
      <div className="scanline-overlay" />

      {/* TOP BAR */}
      <div className="border-b border-border px-4 py-3 flex justify-between bg-card/50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/levels')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Levels
        </Button>

        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Skip <SkipForward className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">

        {/* CHAT */}
        <div className="flex-1 flex flex-col border-r border-border">

          <ScrollArea className="flex-1 p-4 pb-32">
            <div className="space-y-4 max-w-2xl mx-auto">

              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] px-4 py-3 text-sm font-mono bg-muted border border-border">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {sending && <p className="text-sm">processing...</p>}
              {judging && <p className="text-sm">evaluating...</p>}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* INPUT (single, fixed) */}
          <div className="sticky bottom-0 w-full bg-background border-t border-border z-20">
            <div className="p-4 max-w-2xl mx-auto">

              {judgeFailed && (
                <div className="mb-3 flex gap-2 border px-3 py-2 text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="flex-1">{judgeFailed}</p>
                  <Button size="icon" variant="ghost" onClick={() => setJudgeFailed('')}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your attack..."
                  disabled={sending || broken}
                  className="flex-1"
                />

                <Button type="submit" disabled={sending || broken || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={chatHistory.length < 2 || judging || broken || sending}
                >
                  <Flag className="w-4 h-4 mr-1" /> Submit
                </Button>
              </form>
            </div>
          </div>

        </div>

        {/* INTEL PANEL unchanged */}
        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 bg-card/50 overflow-y-auto">
          <div className="p-4 space-y-4">

            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Intel Panel
              </h3>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-xs uppercase">Target</CardTitle></CardHeader>
              <CardContent>
                <p className="font-bold">{vuln.name}</p>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Game;