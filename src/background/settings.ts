import { Settings } from "../shared/types";

export const DEFAULT_SETTINGS: Settings = {
  inference: {
    provider: "none",
    endpointUrl: "http://localhost:11434/api/chat",
    modelName: "llama3",
    apiKey: ""
  },
  selectedRecipe: "recipe_ai_brief",
  selectedLens: "lens_dev",
  selectedAdapter: "adapter_chatgpt",
  exclusions: [],
  formProtection: true
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
