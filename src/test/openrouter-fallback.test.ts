import { afterEach, describe, expect, it, vi } from "vitest";
import { chatWithAgent } from "@/lib/openrouter";

describe("model fallback", () => {
  const originalEnv = { ...import.meta.env };

  const setTestEnv = (overrides: Record<string, string>) => {
    delete (import.meta.env as Record<string, string | undefined>).VITE_OPENROUTER_API_KEY;
    delete (import.meta.env as Record<string, string | undefined>).VITE_OPENROUTER_MODEL;
    delete (import.meta.env as Record<string, string | undefined>).VITE_OPENROUTER_FALLBACK_MODELS;
    delete (import.meta.env as Record<string, string | undefined>).GEMINI_API_KEY;
    delete (import.meta.env as Record<string, string | undefined>).GEMINI_MODEL;
    delete (import.meta.env as Record<string, string | undefined>).VITE_GEMINI_API_KEY;
    delete (import.meta.env as Record<string, string | undefined>).VITE_GEMINI_MODEL;
    Object.assign(import.meta.env, overrides);
  };

  afterEach(() => {
    Object.keys(import.meta.env).forEach((key) => {
      delete (import.meta.env as Record<string, string | undefined>)[key];
    });
    Object.assign(import.meta.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("falls back to Gemini when OpenRouter models are rate limited", async () => {
    setTestEnv({
      VITE_OPENROUTER_API_KEY: "openrouter-test-key",
      GEMINI_API_KEY: "gemini-test-key",
      GEMINI_MODEL: "gemini-2.5-flash",
    });

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("generativelanguage.googleapis.com")) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "ok" }],
                },
              },
            ],
          }),
        };
      }

      return {
        ok: false,
        status: 429,
        text: async () => '{"error":{"message":"rate limited"}}',
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await chatWithAgent("System instruction", [
      { role: "user", content: "reply with ok" },
    ]);

    expect(response).toBe("ok");

    const geminiCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("generativelanguage.googleapis.com")
    );
    expect(geminiCall).toBeDefined();
    expect(String(geminiCall[0])).toContain("generativelanguage.googleapis.com");

    const geminiBody = JSON.parse(String(geminiCall[1]?.body));
    expect(geminiBody.systemInstruction.parts[0].text).toContain("You are simulating a user-uploaded AI agent");
    expect(geminiBody.systemInstruction.parts[0].text).toContain("UPLOADED AGENT PROMPT:");
    expect(geminiBody.systemInstruction.parts[0].text).toContain("System instruction");
    expect(geminiBody.contents).toEqual([
      {
        role: "user",
        parts: [{ text: "reply with ok" }],
      },
    ]);
  });
});
