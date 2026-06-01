import { InferenceProvider, ProviderResponse } from "../../shared/types";

export class DeterministicProvider implements InferenceProvider {
  id = "none";
  name = "Deterministic (No AI)";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(_systemPrompt: string, userPrompt: string): Promise<ProviderResponse> {
    // Simply returns the raw input context without transformation
    return { text: userPrompt };
  }
}
