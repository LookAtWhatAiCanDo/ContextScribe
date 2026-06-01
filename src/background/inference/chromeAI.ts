import { InferenceProvider, ProviderResponse } from "../../shared/types";

// Type definitions for Chrome Prompt API (LanguageModel)
interface LMSystemPrompt {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LMParams {
  temperature?: number;
  topK?: number;
  expectedInputs?: { type: string; languages: string[] }[];
  expectedOutputs?: { type: string; languages: string[] }[];
  initialPrompts?: LMSystemPrompt[];
}

interface LMSession {
  prompt: (text: string) => Promise<string>;
  destroy: () => void;
}

declare global {
  var LanguageModel: {
    availability: (params?: LMParams) => Promise<"readily" | "after-download" | "unavailable">;
    create: (params?: LMParams) => Promise<LMSession>;
  };
}

export class ChromeAIProvider implements InferenceProvider {
  id = "chrome-ai";
  name = "Chrome Built-in AI";

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof LanguageModel !== "undefined") {
        const status = await LanguageModel.availability();
        return status === "readily" || status === "after-download";
      }
      return false;
    } catch {
      return false;
    }
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<ProviderResponse> {
    if (typeof LanguageModel === "undefined") {
      throw new Error("Chrome LanguageModel API is not supported in this browser version.");
    }

    const session = await LanguageModel.create({
      initialPrompts: [{ role: "system", content: systemPrompt }]
    });

    try {
      const responseText = await session.prompt(userPrompt);
      return { text: responseText };
    } finally {
      session.destroy();
    }
  }
}
