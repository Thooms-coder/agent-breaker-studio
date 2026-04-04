export interface ParsedAgent {
  systemPrompt: string;
  tools: string[];
  modelConfig: string;
  rawCode: string;
}

export function parseAgentCode(code: string): ParsedAgent {
  const result: ParsedAgent = {
    systemPrompt: '',
    tools: [],
    modelConfig: '',
    rawCode: code,
  };

  // Extract system prompts - various patterns
  const systemPromptPatterns = [
    /system[_\s]?(?:prompt|message|instruction)s?\s*[:=]\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`|f"([\s\S]*?)")/gi,
    /(?:role|type)["']?\s*[:=]\s*["']system["'][\s\S]*?(?:content|text|message)["']?\s*[:=]\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`)/gi,
    /messages\s*[:=]\s*\[[\s\S]*?\{\s*(?:["']role["']\s*[:=]\s*["']system["'][\s\S]*?["']content["']\s*[:=]\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`))/gi,
    /SYSTEM_PROMPT\s*=\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`)/gi,
    /system:\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`)/gi,
  ];

  for (const pattern of systemPromptPatterns) {
    const matches = [...code.matchAll(pattern)];
    for (const match of matches) {
      const extracted = match.slice(1).find(g => g !== undefined);
      if (extracted && extracted.length > 10) {
        result.systemPrompt = extracted.trim();
        break;
      }
    }
    if (result.systemPrompt) break;
  }

  // Extract tool definitions
  const toolPatterns = [
    /tools\s*[:=]\s*\[([\s\S]*?)\]/gi,
    /functions\s*[:=]\s*\[([\s\S]*?)\]/gi,
    /(?:function_declarations|tool_definitions)\s*[:=]\s*\[([\s\S]*?)\]/gi,
    /@tool\s*\n\s*(?:def|async def)\s+(\w+)/gi,
    /\.tool\(\s*["'](\w+)["']/gi,
  ];

  for (const pattern of toolPatterns) {
    const matches = [...code.matchAll(pattern)];
    for (const match of matches) {
      const extracted = match[1];
      if (extracted) {
        result.tools.push(extracted.trim());
      }
    }
  }

  // Extract model config
  const modelPatterns = [
    /model\s*[:=]\s*["']([^"']+)["']/gi,
    /temperature\s*[:=]\s*([\d.]+)/gi,
    /max[_\s]?tokens\s*[:=]\s*(\d+)/gi,
    /top[_\s]?p\s*[:=]\s*([\d.]+)/gi,
  ];

  const configParts: string[] = [];
  for (const pattern of modelPatterns) {
    const matches = [...code.matchAll(pattern)];
    for (const match of matches) {
      configParts.push(match[0]);
    }
  }
  result.modelConfig = configParts.join('\n');

  // If no system prompt found, use the whole text as potential prompt
  if (!result.systemPrompt && code.length < 5000) {
    result.systemPrompt = code;
  }

  return result;
}

export async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export async function readZipFile(file: File): Promise<string> {
  // For zip files, we'll read as text and combine - basic approach
  // In production you'd use JSZip
  const text = await readFileContent(file);
  return text;
}
