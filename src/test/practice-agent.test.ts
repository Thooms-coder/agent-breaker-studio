import { describe, expect, it } from 'vitest';
import { parseAgentCode } from '@/lib/agent-parser';
import {
  PRACTICE_AGENT_SOURCE,
  PRACTICE_AGENT_SYSTEM_PROMPT,
  getPracticeAgent,
  getPracticeScenario,
  isPracticeAgent,
} from '@/lib/practice-agent';

describe('practice agent', () => {
  it('ships with a longer curated practice ladder', () => {
    const scenario = getPracticeScenario();

    expect(scenario.vulnerabilities).toHaveLength(9);
    expect(new Set(scenario.vulnerabilities.map(vulnerability => vulnerability.id)).size).toBe(9);
  });

  it('is recognizable as the built-in practice agent', () => {
    const practiceAgent = getPracticeAgent();

    expect(practiceAgent.systemPrompt).toBe(PRACTICE_AGENT_SYSTEM_PROMPT);
    expect(isPracticeAgent(practiceAgent)).toBe(true);
    expect(isPracticeAgent({ ...practiceAgent, rawCode: `${practiceAgent.rawCode}\n// changed` })).toBe(false);
  });

  it('keeps the source parseable for the upload preview', () => {
    const parsed = parseAgentCode(PRACTICE_AGENT_SOURCE);

    expect(parsed.systemPrompt).toContain('You are Penny');
    expect(parsed.tools.join('\n')).toContain('lookupOrder');
    expect(parsed.modelConfig).toContain('max_tokens');
  });
});
