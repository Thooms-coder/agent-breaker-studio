import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGame } from '@/context/GameContext';
import { parseAgentCode, readFileContent } from '@/lib/agent-parser';
import { Upload as UploadIcon, FileText, ArrowRight, ArrowLeft, X } from 'lucide-react';

const Upload = () => {
  const navigate = useNavigate();
  const { setParsedAgent, setStep } = useGame();
  const [rawCode, setRawCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseAgentCode> | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleParse = useCallback((code: string) => {
    const result = parseAgentCode(code);
    setParsed(result);
    setEditedPrompt(result.systemPrompt);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    const content = await readFileContent(file);
    setRawCode(content);
    handleParse(content);
  }, [handleParse]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleProceed = () => {
    if (!editedPrompt.trim()) return;
    setApiKey(localApiKey);
    setParsedAgent({
      systemPrompt: editedPrompt,
      tools: parsed?.tools || [],
      modelConfig: parsed?.modelConfig || '',
      rawCode: rawCode,
    });
    setStep('analysis');
    navigate('/analysis');
  };

  return (
    <div className="min-h-screen noise-bg p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-neon-pink"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-neon-pink tracking-wider uppercase">Upload Agent</h1>
          <div className="w-20" />
        </div>

        {/* API Key */}
        <Card className="mb-6 neon-border bg-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-neon-yellow flex items-center gap-2 uppercase tracking-wider">
              <Key className="w-4 h-4" />
              OpenRouter API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="password"
              placeholder="sk-or-v1-..."
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              className="bg-muted border-border font-mono text-sm"
            />
            <p className="text-muted-foreground text-xs mt-2">
              Get your free key at{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-neon-green hover:underline">
                openrouter.ai/keys
              </a>
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            {/* File drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed p-8 text-center cursor-pointer transition-all rounded-sm ${
                dragOver ? 'border-neon-green bg-neon-green/5' : 'border-border hover:border-neon-pink/50'
              }`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".py,.js,.ts,.txt,.json,.yaml,.yml,.md"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <UploadIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop your agent file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                .py, .js, .ts, .txt, .json, .yaml
              </p>
              {fileName && (
                <div className="mt-3 flex items-center justify-center gap-2 text-neon-green text-xs">
                  <FileText className="w-3 h-3" />
                  {fileName}
                  <button onClick={(e) => { e.stopPropagation(); setFileName(''); setRawCode(''); setParsed(null); }}>
                    <X className="w-3 h-3 text-muted-foreground hover:text-neon-pink" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-center text-muted-foreground text-xs uppercase tracking-widest">— or paste code —</div>

            <Textarea
              placeholder="Paste your agent code, system prompt, or configuration here..."
              value={rawCode}
              onChange={(e) => setRawCode(e.target.value)}
              className="min-h-[300px] bg-muted border-border font-mono text-xs"
            />

            <Button
              onClick={() => handleParse(rawCode)}
              disabled={!rawCode.trim()}
              variant="outline"
              className="w-full border-neon-green text-neon-green hover:bg-neon-green/10"
            >
              Parse Code
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="bg-card neon-border-green border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-neon-green uppercase tracking-wider">
                  Detected System Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  placeholder="System prompt will appear here after parsing..."
                  className="min-h-[200px] bg-muted border-border font-mono text-xs"
                />
              </CardContent>
            </Card>

            {parsed && parsed.tools.length > 0 && (
              <Card className="bg-card neon-border-yellow border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-neon-yellow uppercase tracking-wider">
                    Detected Tools ({parsed.tools.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-muted-foreground font-mono overflow-auto max-h-32">
                    {parsed.tools.join('\n\n')}
                  </pre>
                </CardContent>
              </Card>
            )}

            {parsed?.modelConfig && (
              <Card className="bg-card border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                    Model Config
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-muted-foreground font-mono">{parsed.modelConfig}</pre>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handleProceed}
              disabled={!editedPrompt.trim() || !localApiKey.trim()}
              className="w-full bg-neon-pink text-background hover:bg-neon-pink/80 font-bold uppercase tracking-wider rounded-none"
            >
              Analyze Agent
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
