import { InferenceProvider, ProviderResponse } from "../../shared/types";

export class LMStudioProvider implements InferenceProvider {
  id = "lm-studio";
  name = "LM Studio";

  constructor(private endpointUrl: string, private modelName: string) {}

  private lastChecked = 0;
  private cachedAvailability = false;

  async isAvailable(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastChecked < 120000) {
      return this.cachedAvailability;
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000);
      // LM Studio usually exposes /v1/models
      const url = this.endpointUrl.replace("/chat/completions", "/models");
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      this.cachedAvailability = res.ok;
    } catch {
      this.cachedAvailability = false;
    }
    this.lastChecked = Date.now();
    return this.cachedAvailability;
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    onLog?: (msg: string) => void,
    onStream?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderResponse> {
    onLog?.(`Sending request to LM Studio endpoint: ${this.endpointUrl} (model: ${this.modelName || "meta-llama-3-8b-instruct"})...`);
    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.modelName || "meta-llama-3-8b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body to read stream");
    }

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      while (true) {
        if (signal?.aborted) {
          throw new DOMException("The user aborted a request.", "AbortError");
        }
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (!trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content || "";
            fullText += content;
            if (content) {
              onStream?.(fullText);
            }
            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens || promptTokens;
              completionTokens = parsed.usage.completion_tokens || completionTokens;
            }
          } catch (e) {
            console.warn("Failed to parse LM Studio stream line:", trimmed, e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      text: fullText,
      usage: {
        promptTokens,
        completionTokens
      }
    };
  }
}
