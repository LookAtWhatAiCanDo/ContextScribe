import { InferenceProvider, ProviderResponse } from "../../shared/types";

export class OllamaProvider implements InferenceProvider {
  id = "ollama";
  name = "Local Ollama";

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
      const res = await fetch(this.endpointUrl.replace("/api/chat", "/api/tags"), {
        signal: controller.signal
      });
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
    onLog?.(`Sending request to Ollama endpoint: ${this.endpointUrl} (model: ${this.modelName})...`);
    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
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
          try {
            const parsed = JSON.parse(trimmed);
            const content = parsed.message?.content || parsed.response || "";
            fullText += content;
            if (content) {
              onStream?.(fullText);
            }
            if (parsed.prompt_eval_count) {
              promptTokens = parsed.prompt_eval_count;
            }
            if (parsed.eval_count) {
              completionTokens = parsed.eval_count;
            }
          } catch (e) {
            console.warn("Failed to parse Ollama stream line:", trimmed, e);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          const content = parsed.message?.content || parsed.response || "";
          fullText += content;
          if (content) {
            onStream?.(fullText);
          }
        } catch (e) {
          // ignore
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
