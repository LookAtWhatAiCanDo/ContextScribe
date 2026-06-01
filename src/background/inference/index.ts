import { InferenceProvider, Settings } from "../../shared/types";
import { OllamaProvider } from "./ollama";
import { ChromeAIProvider } from "./chromeAI";
import { LMStudioProvider } from "./lmStudio";
import { DeterministicProvider } from "./deterministic";

export function resolveProvider(settings: Settings): InferenceProvider {
  const cfg = settings.inference;

  switch (cfg.provider) {
    case "ollama":
      return new OllamaProvider(
        cfg.endpointUrl || "http://localhost:11434/api/chat",
        cfg.modelName || "llama3"
      );
    case "chrome-ai":
      return new ChromeAIProvider();
    case "lm-studio":
      return new LMStudioProvider(
        cfg.endpointUrl || "http://localhost:1234/v1/chat/completions",
        cfg.modelName || ""
      );
    case "none":
    default:
      return new DeterministicProvider();
  }
}
export { DeterministicProvider, OllamaProvider, ChromeAIProvider, LMStudioProvider };
