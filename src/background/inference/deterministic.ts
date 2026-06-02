import { InferenceProvider, ProviderResponse } from "../../shared/types";

export class DeterministicProvider implements InferenceProvider {
  id = "none";
  name = "Deterministic (No AI)";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(
    _systemPrompt: string,
    userPrompt: string,
    _onLog?: (msg: string) => void,
    onStream?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderResponse> {
    if (signal?.aborted) {
      throw new DOMException("The user aborted a request.", "AbortError");
    }
    // Simply returns the raw input context without transformation
    onStream?.(userPrompt);
    return { text: userPrompt };
  }
}
