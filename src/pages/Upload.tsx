import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGame } from '@/context/GameContext';
import { useUser } from '@/context/UserContext';
import { parseAgentCode, parseFolderFiles } from '@/lib/agent-parser';
import { getPracticeAgent, getPracticeScenario, PRACTICE_AGENT_FILE_NAME } from '@/lib/practice-agent';
import { Upload as UploadIcon, FileText, ArrowRight, ArrowLeft, X } from 'lucide-react';

/** Recursively read all files from a dropped directory entry */
async function readDirectoryEntries(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];
  const readEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));
  const getFile = (entry: FileSystemFileEntry): Promise<File> =>
    new Promise((resolve, reject) => entry.file(resolve, reject));

  const queue: FileSystemDirectoryEntry[] = [dirEntry];
  while (queue.length) {
    const dir = queue.shift()!;
    const reader = dir.createReader();
    const entries: FileSystemEntry[] = [];

    while (true) {
      const batch = await readEntries(reader);
      if (batch.length === 0) break;
      entries.push(...batch);
    }

    for (const entry of entries) {
      if (entry.isFile) {
        const file = await getFile(entry as FileSystemFileEntry);
        // Attach the full path so parseFolderFiles can filter/prioritize
        Object.defineProperty(file, 'webkitRelativePath', { value: entry.fullPath.slice(1) });
        files.push(file);
      } else if (entry.isDirectory) {
        queue.push(entry as FileSystemDirectoryEntry);
      }
    }
  }
  return files;
}

const Upload = () => {
  const navigate = useNavigate();
  const {
    setParsedAgent,
    setVulnerabilities,
    setCurrentLevel,
    setLevelResults,
    setStep,
  } = useGame();
  const { startSession } = useUser();
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

  const [zipLoading, setZipLoading] = useState(false);

  const handleMultiFileParse = useCallback(async (files: File[], label: string) => {
    setFileName(label);
    setZipLoading(true);
    try {
      const result = await parseFolderFiles(files);
      setRawCode(result.rawCode);
      setParsed(result);
      setEditedPrompt(result.systemPrompt);
    } catch (e: any) {
      setRawCode('');
      setParsed(null);
      setEditedPrompt('Failed to parse folder: ' + (e.message || 'unknown error'));
    } finally {
      setZipLoading(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const items = e.dataTransfer.items;
    if (items?.length) {
      const firstEntry = items[0].webkitGetAsEntry?.();
      if (firstEntry?.isDirectory) {
        const files = await readDirectoryEntries(firstEntry as FileSystemDirectoryEntry);
        handleMultiFileParse(files, firstEntry.name + '/');
        return;
      }
    }

    // Single file drop — wrap it and go through the same path
    const file = e.dataTransfer.files[0];
    if (file) {
      handleMultiFileParse([file], file.name);
    }
  }, [handleMultiFileParse]);

  const isCodebaseUpload = parsed?.rawCode?.includes('=== FILE TREE ===') ?? false;

  const handleProceed = () => {
    if (!editedPrompt.trim() && !isCodebaseUpload) return;
    setParsedAgent({
      systemPrompt: editedPrompt,
      tools: parsed?.tools || [],
      modelConfig: parsed?.modelConfig || '',
      rawCode: parsed?.rawCode || rawCode,
    });
    startSession(fileName || 'Custom Agent');
    setStep('analysis');
    navigate('/analysis');
  };

  const handleLoadPracticeAgent = () => {
    const practiceAgent = getPracticeAgent();
    setFileName(PRACTICE_AGENT_FILE_NAME);
    setRawCode(practiceAgent.rawCode);
    setParsed(practiceAgent);
    setEditedPrompt(practiceAgent.systemPrompt);
  };

  const handleStartPractice = () => {
    const scenario = getPracticeScenario();
    setParsedAgent(scenario.parsedAgent);
    setVulnerabilities(scenario.vulnerabilities);
    setCurrentLevel(0);
    setLevelResults([]);
    setStep('levelSelect');
    startSession('Practice Agent');
    navigate('/levels');
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

        <Card className="mb-6 bg-card border border-neon-green/30 rounded-none">
          <CardContent className="pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-neon-green text-xs uppercase tracking-[0.25em] mb-2">Quick Start</p>
              <h2 className="text-xl font-bold uppercase tracking-wide">Practice Agent</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Load a deliberately weak demo bot or jump straight into a longer, easy practice run with curated levels.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleLoadPracticeAgent}
                variant="outline"
                className="border-neon-yellow text-neon-yellow hover:bg-neon-yellow/10 rounded-none"
              >
                Load Example Agent
              </Button>
              <Button
                onClick={handleStartPractice}
                className="bg-neon-green text-background hover:bg-neon-green/80 font-bold uppercase tracking-wider rounded-none"
              >
                Start Practice Run
              </Button>
            </div>
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
              onClick={() => document.getElementById('folder-input')?.click()}
            >
              <input
                id="folder-input"
                type="file"
                className="hidden"
                {...{ webkitdirectory: '', directory: '' } as any}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  const folderName = files[0].webkitRelativePath?.split('/')[0] || 'folder';
                  handleMultiFileParse(files, folderName + '/');
                }}
              />
              <UploadIcon className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select your agent folder — or drag it here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Select the root folder of your agent codebase
              </p>
              {fileName && (
                <div className="mt-3 flex items-center justify-center gap-2 text-neon-green text-xs">
                  <FileText className="w-3 h-3" />
                  {fileName}
                  {zipLoading && <span className="text-neon-yellow animate-pulse">parsing...</span>}
                  <button onClick={() => { setFileName(''); setRawCode(''); setParsed(null); setEditedPrompt(''); }}>
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
                  {isCodebaseUpload ? 'Codebase Loaded' : 'Detected System Prompt'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCodebaseUpload ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {parsed?.rawCode?.split('\n').filter(l => l.startsWith('=== FILE:')).length || 0} files loaded. The AI will navigate the codebase during analysis to find system prompts, tools, guardrails, and vulnerabilities.
                    </p>
                    <details className="text-xs">
                      <summary className="text-neon-green cursor-pointer hover:underline">View file tree</summary>
                      <pre className="mt-2 text-muted-foreground font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                        {parsed?.rawCode?.split('\n\n')[0]?.replace('=== FILE TREE ===\n', '') || ''}
                      </pre>
                    </details>
                    <Textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      placeholder="Optional: paste additional context or instructions for the analysis..."
                      className="min-h-[100px] bg-muted border-border font-mono text-xs mt-2"
                    />
                  </div>
                ) : (
                  <Textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    placeholder="System prompt will appear here after parsing..."
                    className="min-h-[200px] bg-muted border-border font-mono text-xs"
                  />
                )}
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
              disabled={!editedPrompt.trim() && !isCodebaseUpload}
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
