import { InferenceProvider, ProviderResponse } from "../../shared/types";

export class OllamaProvider implements InferenceProvider {
  id = "ollama";
  name = "Local Ollama";

  constructor(private endpointUrl: string, private modelName: string) {}

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(this.endpointUrl.replace("/api/chat", "/api/tags"), {
        signal: controller.signal
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<ProviderResponse> {
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
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      text: data.message?.content || data.response || "",
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0
      }
    };
  }
}
