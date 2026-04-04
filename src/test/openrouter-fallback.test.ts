import { afterEach, describe, expect, it, vi } from "vitest";
import { chatWithAgent } from "@/lib/openrouter";

describe("model fallback", () => {
  const originalEnv = { ...import.meta.env };

  afterEach(() => {
    Object.keys(import.meta.env).forEach((key) => {
      delete (import.meta.env as Record<string, string | undefined>)[key];
    });
    Object.assign(import.meta.env, originalEnv);
    vi.restoreAllMocks();
  });

  it("falls back to Gemini when OpenRouter models are rate limited", async () => {
    Object.assign(import.meta.env, {
      VITE_OPENROUTER_API_KEY: "openrouter-test-key",
      GEMINI_API_KEY: "gemini-test-key",
      GEMINI_MODEL: "gemini-2.5-flash",
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => '{"error":{"message":"qwen rate limited"}}',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => '{"error":{"message":"gemma rate limited"}}',
      })
      .mockResolvedValueOnce({
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
      });

    vi.stubGlobal("fetch", fetchMock);

    const response = await chatWithAgent("System instruction", [
      { role: "user", content: "reply with ok" },
    ]);

    expect(response).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const geminiCall = fetchMock.mock.calls[2];
    expect(String(geminiCall[0])).toContain("generativelanguage.googleapis.com");

    const geminiBody = JSON.parse(String(geminiCall[1]?.body));
    expect(geminiBody.systemInstruction.parts[0].text).toBe("System instruction");
    expect(geminiBody.contents).toEqual([
      {
        role: "user",
        parts: [{ text: "reply with ok" }],
      },
    ]);
  });
});
