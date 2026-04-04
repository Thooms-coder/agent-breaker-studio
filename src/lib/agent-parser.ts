import JSZip from 'jszip';

export interface ParsedAgent {
  systemPrompt: string;
  tools: string[];
  modelConfig: string;
  rawCode: string;
}

const RELEVANT_EXTENSIONS = new Set([
  '.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml',
  '.toml', '.txt', '.md', '.env', '.cfg', '.ini', '.prompt',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', 'build',
  '.next', '.cache', 'coverage', '.tox', 'egg-info', '.mypy_cache',
]);

// Higher-signal files get sorted first so they land inside the context budget
const PRIORITY_PATTERNS = [
  /system[_-]?prompt/i, /instructions?\.(txt|md)/i, /guardrails?/i,
  /\.?env/, /prompts?\//i, /mcp/i,
  /agent/i, /config\.(json|ya?ml|toml)/i,
  /tool/i, /plugin/i, /schema/i,
];

function isRelevantPath(path: string): boolean {
  const parts = path.split('/');
  if (parts.some(p => SKIP_DIRS.has(p))) return false;
  const ext = '.' + (path.split('.').pop()?.toLowerCase() || '');
  return RELEVANT_EXTENSIONS.has(ext);
}

function priorityScore(path: string): number {
  const idx = PRIORITY_PATTERNS.findIndex(p => p.test(path));
  return idx >= 0 ? idx : PRIORITY_PATTERNS.length;
}

// --- Single-file heuristic parsing (kept for paste / single file upload) ---

export function parseAgentCode(code: string): ParsedAgent {
  const result: ParsedAgent = { systemPrompt: '', tools: [], modelConfig: '', rawCode: code };

  const systemPromptPatterns = [
    /system[_\s]?(?:prompt|message|instruction)s?\s*[:=]\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`)/gi,
    /(?:role|type)["']?\s*[:=]\s*["']system["'][\s\S]*?(?:content|text|message)["']?\s*[:=]\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`)/gi,
    /SYSTEM_PROMPT\s*=\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`)/gi,
    /system:\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`)/gi,
  ];

  for (const pattern of systemPromptPatterns) {
    for (const match of code.matchAll(pattern)) {
      const extracted = match.slice(1).find(g => g !== undefined);
      if (extracted && extracted.length > 10) { result.systemPrompt = extracted.trim(); break; }
    }
    if (result.systemPrompt) break;
  }

  const toolPatterns = [
    /tools\s*[:=]\s*\[([\s\S]*?)\]/gi,
    /functions\s*[:=]\s*\[([\s\S]*?)\]/gi,
    /(?:function_declarations|tool_definitions)\s*[:=]\s*\[([\s\S]*?)\]/gi,
    /@tool\s*\n\s*(?:def|async def)\s+(\w+)/gi,
    /\.tool\(\s*["'](\w+)["']/gi,
  ];
  for (const p of toolPatterns) {
    for (const m of code.matchAll(p)) { if (m[1]) result.tools.push(m[1].trim()); }
  }

  const modelPatterns = [
    /model\s*[:=]\s*["']([^"']+)["']/gi,
    /temperature\s*[:=]\s*([\d.]+)/gi,
    /max[_\s]?tokens\s*[:=]\s*(\d+)/gi,
    /top[_\s]?p\s*[:=]\s*([\d.]+)/gi,
  ];
  const configParts: string[] = [];
  for (const p of modelPatterns) { for (const m of code.matchAll(p)) configParts.push(m[0]); }
  result.modelConfig = configParts.join('\n');

  if (!result.systemPrompt && code.length < 5000) result.systemPrompt = code;
  return result;
}

// --- Multi-file: collect raw file contents for AI analysis ---

const MAX_FILE_SIZE = 100_000;
const MAX_TOTAL_CHARS = 800_000;

/** Collect relevant files into a single labeled document the AI can navigate */
function buildCodebaseContext(files: { path: string; content: string }[]): string {
  // Sort by priority so the most important files come first
  const sorted = [...files].sort((a, b) => priorityScore(a.path) - priorityScore(b.path));

  const parts: string[] = [];
  const omitted: string[] = [];
  let totalChars = 0;

  // First pass: build a file tree
  const tree = sorted.map(f => f.path).join('\n');
  parts.push(`=== FILE TREE ===\n${tree}\n`);
  totalChars += tree.length;

  // Second pass: include file contents, priority files first
  for (const { path, content } of sorted) {
    if (content.length > MAX_FILE_SIZE) {
      omitted.push(`${path} (skipped: file too large)`);
      continue;
    }
    if (totalChars + content.length > MAX_TOTAL_CHARS) {
      omitted.push(`${path} (skipped: context budget reached)`);
      continue;
    }
    totalChars += content.length;
    parts.push(`=== FILE: ${path} ===\n${content}`);
  }

  if (omitted.length > 0) {
    parts.push(`=== OMITTED FILES ===\n${omitted.join('\n')}`);
  }

  return parts.join('\n\n');
}

export async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function collectRelevantFiles(
  entries: AsyncIterable<{ path: string; readContent: () => Promise<string> }> | Iterable<{ path: string; readContent: () => Promise<string> }>
): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  for await (const entry of entries) {
    if (!isRelevantPath(entry.path)) continue;
    try {
      const content = await entry.readContent();
      if (content.length <= MAX_FILE_SIZE) files.push({ path: entry.path, content });
    } catch { /* skip binary/unreadable */ }
  }
  return files;
}

export async function parseZipFile(file: File): Promise<ParsedAgent> {
  const zip = await JSZip.loadAsync(file);
  const entries: { path: string; readContent: () => Promise<string> }[] = [];
  zip.forEach((path, zipEntry) => {
    if (!zipEntry.dir) entries.push({ path, readContent: () => zipEntry.async('string') });
  });

  const files = await collectRelevantFiles(entries);
  const codebaseContext = buildCodebaseContext(files);

  return {
    systemPrompt: '', // AI will extract this during analysis
    tools: [],
    modelConfig: '',
    rawCode: codebaseContext,
  };
}

export async function parseFolderFiles(fileList: File[]): Promise<ParsedAgent> {
  const entries = fileList.map(f => ({
    path: f.webkitRelativePath || f.name,
    readContent: () => f.text(),
  }));

  const files = await collectRelevantFiles(entries);
  const codebaseContext = buildCodebaseContext(files);

  return {
    systemPrompt: '',
    tools: [],
    modelConfig: '',
    rawCode: codebaseContext,
  };
}
