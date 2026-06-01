import { InferenceProvider, ProviderResponse } from "../../shared/types";

export class LMStudioProvider implements InferenceProvider {
  id = "lm-studio";
  name = "LM Studio";

  constructor(private endpointUrl: string, private modelName: string) {}

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000);
      // LM Studio usually exposes /v1/models
      const url = this.endpointUrl.replace("/chat/completions", "/models");
      const res = await fetch(url, { signal: controller.signal });
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
        model: this.modelName || "meta-llama-3-8b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0
      }
    };
  }
}
