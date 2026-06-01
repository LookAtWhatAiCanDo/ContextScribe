import { setupContextMenus } from "./contextMenus";
import { getSettings, DEFAULT_SETTINGS } from "./settings";
import { resolveProvider } from "./inference";
import { getRecipe } from "../shared/config/recipes";
import { getLens } from "../shared/config/lenses";
import { getAdapter } from "../shared/config/adapters";
import { formatDocument } from "../shared/serializer";
import { DocumentIR, Settings } from "../shared/types";

// Setup menus on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("settings");
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  setupContextMenus();
});

// Setup menus on startup
chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

// Listener for context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  const menuId = String(info.menuItemId);
  const settings = await getSettings();

  // 1. Check if this is a GitHub DOM action
  if (menuId.startsWith("gh:")) {
    if (menuId === "gh:expand_resolved") {
      await chrome.tabs.sendMessage(tab.id, {
        action: "TOGGLE_RESOLVED_THREADS",
        operation: "expand"
      });
    } else if (menuId === "gh:collapse_resolved") {
      await chrome.tabs.sendMessage(tab.id, {
        action: "TOGGLE_RESOLVED_THREADS",
        operation: "collapse"
      });
    } else if (menuId === "gh:toggle_resolved") {
      await chrome.tabs.sendMessage(tab.id, {
        action: "TOGGLE_RESOLVED_THREADS",
        operation: "toggle"
      });
    } else {
      // It's a GitHub Copy Action (e.g. gh:copy_selected, gh:copy_active, etc.)
      // We will route it with specialized parameters
      await executeExtraction(tab.id, settings, {
        recipeId: "recipe_ai_brief", // Use coding brief by default for GitHub comments
        lensId: settings.selectedLens,
        adapterId: settings.selectedAdapter,
        githubAction: menuId.replace("gh:", "")
      });
    }
    return;
  }

  // 2. Check if a specific Recipe, Lens, or Adapter was clicked
  let targetRecipe = settings.selectedRecipe;
  let targetLens = settings.selectedLens;
  let targetAdapter = settings.selectedAdapter;
  let bypassAiOverride = false;

  if (menuId.startsWith("recipe:")) {
    targetRecipe = menuId.replace("recipe:", "");
  } else if (menuId.startsWith("lens:")) {
    targetLens = menuId.replace("lens:", "");
  } else if (menuId.startsWith("adapter:")) {
    targetAdapter = menuId.replace("adapter:", "");
  } else if (menuId === "action_copy_raw") {
    // Copy Raw completely bypasses AI and custom transformation templates
    bypassAiOverride = true;
    targetRecipe = ""; // bypass
  } else if (menuId === "action_copy_clean") {
    // Copy Clean runs recipes/lenses but forces offline deterministic transformation
    bypassAiOverride = true;
  } else if (menuId === "action_summarize") {
    // Summarize forces AI run
    bypassAiOverride = false;
  } else if (menuId === "action_copy_ai_agent") {
    targetRecipe = "recipe_ai_brief";
    targetLens = "lens_dev";
  }

  await executeExtraction(tab.id, settings, {
    recipeId: targetRecipe,
    lensId: targetLens,
    adapterId: targetAdapter,
    bypassAi: bypassAiOverride
  });
});

interface ExtractionOptions {
  recipeId: string;
  lensId: string;
  adapterId: string;
  bypassAi?: boolean;
  githubAction?: string;
}

async function executeExtraction(
  tabId: number,
  settings: Settings,
  options: ExtractionOptions
): Promise<void> {
  try {
    // Send extract request to Content Script
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "EXTRACT_NODE",
      recipeId: options.recipeId,
      lensId: options.lensId,
      adapterId: options.adapterId,
      githubAction: options.githubAction
    });

    if (!response || !response.success || !response.document) {
      await sendClipboardWrite(tabId, "", false, response?.message || "Failed to extract elements from webpage.");
      return;
    }

    let doc = response.document as DocumentIR;

    // Apply Offline Recipes and Lens filtering to IR Document first
    const recipe = getRecipe(options.recipeId);
    const lens = getLens(options.lensId);
    const adapter = getAdapter(options.adapterId);

    // Apply Offline filters
    if (doc.root.children) {
      doc.root.children = doc.root.children.filter(lens.filter);
    }
    doc = recipe.transform(doc);

    const rawMarkdown = formatDocument(doc, {
      ...adapter,
      flavor: "commonmark" // Get raw CommonMark for prompt context
    });

    const isAiBypassed = options.bypassAi || settings.inference.provider === "none";
    let finalOutput = "";

    if (isAiBypassed) {
      // 1. Deterministic output
      finalOutput = formatDocument(doc, adapter);
    } else {
      // 2. AI Summarized output
      const provider = resolveProvider(settings);
      const isAvailable = await provider.isAvailable();

      if (!isAvailable) {
        // Log warning and fallback
        console.warn(`AI Provider ${provider.name} not available. Falling back to deterministic copy.`);
        finalOutput = formatDocument(doc, adapter);
      } else {
        const systemPrompt = lens.aiSystemPrompt || "Format content cleanly as Markdown.";
        const userPrompt = (recipe.aiTemplate || "Summarize:\n{extractedMarkdown}")
          .replace("{extractedMarkdown}", rawMarkdown)
          .replace("{lensFocus}", lens.focusArea)
          .replace("{adapterFlavor}", adapter.flavor);

        const aiResponse = await provider.generate(systemPrompt, userPrompt);
        finalOutput = adapter.format(aiResponse.text, doc.meta);
      }
    }

    // Command Content Script to write formatted string to Clipboard
    await sendClipboardWrite(tabId, finalOutput, true);
  } catch (error: any) {
    console.error("Error executing extraction flow:", error);
    await sendClipboardWrite(tabId, "", false, error.message || "An unexpected error occurred during extraction.");
  }
}

async function sendClipboardWrite(
  tabId: number,
  text: string,
  success: boolean,
  message?: string
): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "WRITE_CLIPBOARD",
      text,
      success,
      message
    });
  } catch (err) {
    console.error("Failed to communicate completion to tab:", err);
  }
}
