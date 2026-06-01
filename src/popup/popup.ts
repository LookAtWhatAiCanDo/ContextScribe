import { getSettings } from "../background/settings";
import { getRecipe } from "../shared/config/recipes";
import { getLens } from "../shared/config/lenses";
import { getAdapter } from "../shared/config/adapters";

const activeRecipe = document.getElementById("active-recipe") as HTMLSpanElement;
const activeLens = document.getElementById("active-lens") as HTMLSpanElement;
const activeAdapter = document.getElementById("active-adapter") as HTMLSpanElement;
const aiBadge = document.getElementById("ai-badge") as HTMLSpanElement;
const statusIndicator = document.getElementById("status-indicator") as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLSpanElement;
const btnOptions = document.getElementById("btn-options") as HTMLButtonElement;

async function loadStatus(): Promise<void> {
  const settings = await getSettings();

  // Load readable text
  const recipe = getRecipe(settings.selectedRecipe);
  const lens = getLens(settings.selectedLens);
  const adapter = getAdapter(settings.selectedAdapter);

  activeRecipe.textContent = recipe.name;
  activeLens.textContent = lens.name;
  activeAdapter.textContent = adapter.name;

  const provider = settings.inference.provider;

  if (provider === "none") {
    aiBadge.textContent = "Offline";
    aiBadge.style.color = "#9ca3af";
    aiBadge.style.background = "rgba(156, 163, 175, 0.1)";
    aiBadge.style.borderColor = "rgba(156, 163, 175, 0.2)";
    
    statusIndicator.className = "status-dot";
    statusText.textContent = "Deterministic Mode (No AI)";
  } else {
    aiBadge.textContent = "AI Active";
    aiBadge.style.color = "#10b981";
    aiBadge.style.background = "rgba(16, 185, 129, 0.1)";
    aiBadge.style.borderColor = "rgba(16, 185, 129, 0.2)";

    statusIndicator.className = "status-dot active";
    
    const provName = provider === "ollama" ? "Ollama" : provider === "lm-studio" ? "LM Studio" : "Chrome AI";
    statusText.textContent = `Connected to ${provName}`;
  }
}

btnOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", loadStatus);
