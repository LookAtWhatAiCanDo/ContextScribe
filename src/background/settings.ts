import { Settings } from "../shared/types";
import { OLLAMA_DEFAULT_URL, OLLAMA_DEFAULT_MODEL } from "../shared/constants";

export const DEFAULT_SETTINGS: Settings = {
  inference: {
    provider: "none",
    endpointUrl: OLLAMA_DEFAULT_URL,
    modelName: OLLAMA_DEFAULT_MODEL,
    apiKey: ""
  },
  selectedRecipe: "recipe_ai_brief",
  selectedLens: "lens_dev",
  selectedAdapter: "adapter_chatgpt",
  exclusions: [],
  formProtection: true,
  logFullPrompts: false
};

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get("settings");
  if (data.settings) {
    return { ...DEFAULT_SETTINGS, ...data.settings };
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ settings: updated });
}
