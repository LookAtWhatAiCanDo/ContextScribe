import { Settings } from "../shared/types";
import { getSettings, saveSettings } from "../background/settings";
import { 
  OLLAMA_DEFAULT_URL, 
  OLLAMA_DEFAULT_MODEL, 
  LMSTUDIO_DEFAULT_URL, 
  LMSTUDIO_DEFAULT_MODEL 
} from "../shared/constants";

const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;
const recipeSelect = document.getElementById("recipe-select") as HTMLSelectElement;
const lensSelect = document.getElementById("lens-select") as HTMLSelectElement;
const adapterSelect = document.getElementById("adapter-select") as HTMLSelectElement;
const formProtection = document.getElementById("form-protection") as HTMLInputElement;
const logFullPrompts = document.getElementById("log-full-prompts") as HTMLInputElement;

// Section wrappers
const sectionOllama = document.getElementById("section-ollama") as HTMLDivElement;
const sectionLMStudio = document.getElementById("section-lmstudio") as HTMLDivElement;
const sectionChromeAI = document.getElementById("section-chrome-ai") as HTMLDivElement;

// Inputs
const ollamaUrl = document.getElementById("ollama-url") as HTMLInputElement;
const ollamaModel = document.getElementById("ollama-model") as HTMLInputElement;
const lmstudioUrl = document.getElementById("lmstudio-url") as HTMLInputElement;
const lmstudioModel = document.getElementById("lmstudio-model") as HTMLInputElement;

const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const toastEl = document.getElementById("toast-el") as HTMLDivElement;

function showToast(): void {
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2500);
}

function updateConditionalVisibility(): void {
  const provider = providerSelect.value;
  
  sectionOllama.classList.remove("visible");
  sectionLMStudio.classList.remove("visible");
  sectionChromeAI.classList.remove("visible");

  if (provider === "ollama") {
    sectionOllama.classList.add("visible");
  } else if (provider === "lm-studio") {
    sectionLMStudio.classList.add("visible");
  } else if (provider === "chrome-ai") {
    sectionChromeAI.classList.add("visible");
  }
}

// Load settings
async function load(): Promise<void> {
  const settings: Settings = await getSettings();

  providerSelect.value = settings.inference.provider;
  recipeSelect.value = settings.selectedRecipe;
  lensSelect.value = settings.selectedLens;
  adapterSelect.value = settings.selectedAdapter;
  formProtection.checked = settings.formProtection;
  logFullPrompts.checked = settings.logFullPrompts;

  if (settings.inference.provider === "ollama") {
    ollamaUrl.value = settings.inference.endpointUrl || OLLAMA_DEFAULT_URL;
    ollamaModel.value = settings.inference.modelName || OLLAMA_DEFAULT_MODEL;
  } else if (settings.inference.provider === "lm-studio") {
    lmstudioUrl.value = settings.inference.endpointUrl || LMSTUDIO_DEFAULT_URL;
    lmstudioModel.value = settings.inference.modelName || LMSTUDIO_DEFAULT_MODEL;
  }

  updateConditionalVisibility();
}

// Save settings
async function save(): Promise<void> {
  const providerValue = providerSelect.value as Settings["inference"]["provider"];
  
  let endpointUrl = "";
  let modelName = "";

  if (providerValue === "ollama") {
    endpointUrl = ollamaUrl.value;
    modelName = ollamaModel.value;
  } else if (providerValue === "lm-studio") {
    endpointUrl = lmstudioUrl.value;
    modelName = lmstudioModel.value;
  }

  await saveSettings({
    inference: {
      provider: providerValue,
      endpointUrl,
      modelName,
      apiKey: "" // Reserved for cloud endpoints in future releases
    },
    selectedRecipe: recipeSelect.value,
    selectedLens: lensSelect.value,
    selectedAdapter: adapterSelect.value,
    formProtection: formProtection.checked,
    logFullPrompts: logFullPrompts.checked
  });

  showToast();
}

providerSelect.addEventListener("change", updateConditionalVisibility);
btnSave.addEventListener("click", save);
document.addEventListener("DOMContentLoaded", load);
