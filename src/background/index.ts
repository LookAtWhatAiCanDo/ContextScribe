import { setupContextMenus } from "./contextMenus";
import { getSettings, DEFAULT_SETTINGS } from "./settings";
import { resolveProvider, ChromeAIProvider } from "./inference";
import { getRecipe } from "../shared/config/recipes";
import { getLens } from "../shared/config/lenses";
import { getAdapter } from "../shared/config/adapters";
import { formatDocument } from "../shared/serializer";
import { DocumentIR, Settings } from "../shared/types";
import { cleanProgressMessage } from "../shared/utils";

async function syncContextMenuState(): Promise<void> {
  try {
    const data = await chrome.storage.local.get("backgroundTask");
    const isRunning = data.backgroundTask?.running === true;
    chrome.contextMenus.update("parent_scribe", { enabled: !isRunning });
  } catch (err) {
    console.warn("[ContextScribe SW] Failed to sync context menu state:", err);
  }
}

// Setup menus on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("settings");
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  await setupContextMenus();
  await syncContextMenuState();
});

// Setup menus on startup
chrome.runtime.onStartup.addListener(async () => {
  await setupContextMenus();
  await syncContextMenuState();
});

// Listen for background task changes to sync context menu state
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local" && changes.backgroundTask) {
    await syncContextMenuState();
  }
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
        recipeId: settings.selectedRecipe,
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

  console.log("[ContextScribe SW] Context menu action triggered:", menuId);

  if (menuId.startsWith("recipe:")) {
    targetRecipe = menuId.replace("recipe:", "");
  } else if (menuId.startsWith("lens:")) {
    targetLens = menuId.replace("lens:", "");
  } else if (menuId.startsWith("adapter:")) {
    targetAdapter = menuId.replace("adapter:", "");
  } else if (menuId === "action_copy_raw") {
    // Copy Raw completely bypasses AI and custom templates, returning raw extracted markdown
    bypassAiOverride = true;
    targetRecipe = "none";
    targetLens = "none";
    targetAdapter = "none";
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

  console.log("[ContextScribe SW] Parameters resolved:", {
    recipeId: targetRecipe,
    lensId: targetLens,
    adapterId: targetAdapter,
    bypassAi: bypassAiOverride
  });

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


async function logToTab(
  tabId: number,
  message: string,
  level: "info" | "warn" | "error" = "info"
): Promise<void> {
  const prefix = `[ContextScribe SW]`;
  if (level === "error") {
    console.error(prefix, message);
  } else if (level === "warn") {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }

  // Clean message for user-friendly UI presentation
  const cleanMsg = cleanProgressMessage(message);

  // Update storage if running
  try {
    const data = await chrome.storage.local.get("backgroundTask");
    if (data.backgroundTask && data.backgroundTask.running) {
      await chrome.storage.local.set({
        backgroundTask: {
          running: true,
          statusText: cleanMsg,
          startedAt: data.backgroundTask.startedAt
        }
      });
    }
  } catch (err) {
    console.warn("[ContextScribe SW] Failed to update backgroundTask storage status:", err);
  }

  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "LOG_PROGRESS",
      message,
      level
    });
  } catch (err) {
    // Ignore if channel is not ready
  }
}

let activeAbortController: AbortController | null = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "ABORT_TASK") {
    console.log("[ContextScribe SW] Received ABORT_TASK action from content script.");
    if (activeAbortController) {
      activeAbortController.abort();
      console.log("[ContextScribe SW] Aborted active extraction task.");
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "No active task to abort." });
    }
    return true;
  }
  return false;
});

async function executeExtraction(
  tabId: number,
  settings: Settings,
  options: ExtractionOptions
): Promise<void> {
  // Prevent concurrent extractions
  try {
    const data = await chrome.storage.local.get("backgroundTask");
    if (data.backgroundTask && data.backgroundTask.running) {
      console.warn("[ContextScribe SW] An extraction task is already running. Ignoring new request.");
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: "SHOW_TOAST",
          message: "An extraction task is already running. Please wait.",
          toastType: "info"
        });
      } catch (err) {
        // ignore
      }
      return;
    }
  } catch (err) {
    console.error("[ContextScribe SW] Error checking backgroundTask status:", err);
  }

  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  await logToTab(tabId, `Executing extraction pipeline for options: ${JSON.stringify(options)}`);
  try {
    await chrome.storage.local.set({
      backgroundTask: {
        running: true,
        statusText: "Starting extraction...",
        startedAt: Date.now()
      }
    });

    if (signal.aborted) throw new DOMException("The user aborted a request.", "AbortError");

    await logToTab(tabId, "Sending EXTRACT_NODE message to content script...");
    // Send extract request to Content Script
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "EXTRACT_NODE",
      recipeId: options.recipeId,
      lensId: options.lensId,
      adapterId: options.adapterId,
      githubAction: options.githubAction,
      formProtection: settings.formProtection
    });

    if (signal.aborted) throw new DOMException("The user aborted a request.", "AbortError");

    await logToTab(tabId, `Content script extraction response: ${response ? "success" : "null/undefined"}`);

    if (!response || !response.success || !response.document) {
      await logToTab(tabId, `Content script failed to extract elements. Error: ${response?.message}`, "error");
      await sendClipboardWrite(tabId, "", false, response?.message || "Failed to extract elements from webpage.");
      return;
    }

    let doc = response.document as DocumentIR;
    await logToTab(tabId, `Successfully parsed document metadata. URL: ${doc.meta?.url} | Nodes: ${doc.root?.children?.length}`);

    // Apply Offline Recipes and Lens filtering to IR Document first
    const recipe = getRecipe(options.recipeId);
    const lens = getLens(options.lensId);
    const adapter = getAdapter(options.adapterId);

    await logToTab(tabId, `Loading Recipe: ${recipe.name} | Lens: ${lens.name} | Adapter: ${adapter.name}`);

    // Apply Offline filters
    if (doc.root.children) {
      const beforeFilter = doc.root.children.length;
      doc.root.children = doc.root.children.filter(lens.filter);
      await logToTab(tabId, `Filtered children via Lens: ${beforeFilter} -> ${doc.root.children.length}`);
    }
    
    doc = recipe.transform(doc);
    await logToTab(tabId, "Applied Recipe transformations to IR Document.");

    const rawMarkdown = formatDocument(doc, {
      ...adapter,
      flavor: "commonmark" // Get raw CommonMark for prompt context
    });

    const isAiBypassed = options.bypassAi || settings.inference.provider === "none";
    let finalOutput = "";
    let warningMessage: string | undefined = undefined;

    if (options.bypassAi === false && settings.inference.provider === "none") {
      warningMessage = "AI Provider is set to 'None'. Copied clean Markdown instead.";
      await logToTab(tabId, "AI execution requested but provider is 'none'. Setting fallback notice.", "warn");
    }

    if (isAiBypassed) {
      if (signal.aborted) throw new DOMException("The user aborted a request.", "AbortError");
      await logToTab(tabId, "Running offline deterministic serialization...");
      finalOutput = formatDocument(doc, adapter);
      chrome.tabs.sendMessage(tabId, {
        action: "UPDATE_STREAM",
        text: finalOutput
      }).catch(() => {});
    } else {
      if (signal.aborted) throw new DOMException("The user aborted a request.", "AbortError");
      await logToTab(tabId, "Running AI inference generation...");
      const provider = resolveProvider(settings);
      
      await logToTab(tabId, `Checking availability of provider: ${provider.name}...`);
      let isAvailable = false;
      try {
        let timeoutId: any;
        const isAvailablePromise = provider.isAvailable();
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Availability check timed out")), 3000);
        });
        isAvailable = await Promise.race([isAvailablePromise, timeoutPromise]);
        clearTimeout(timeoutId);
      } catch (err: any) {
        await logToTab(tabId, `Provider availability check failed or timed out: ${err.message || err}`, "warn");
        isAvailable = false;
      }
      
      if (signal.aborted) throw new DOMException("The user aborted a request.", "AbortError");
      await logToTab(tabId, `Provider availability result: ${isAvailable}`);

      if (!isAvailable) {
        let details = "";
        if (provider instanceof ChromeAIProvider) {
          const status = provider.getLastStatus();
          if (status === "downloadable" || status === "after-download") {
            details = " Model needs to be downloaded (see chrome://flags or components).";
          } else if (status === "downloading") {
            details = " Model download is in progress.";
          } else if (status === "unsupported") {
            details = " LanguageModel API is not supported in this browser version.";
          } else {
            details = ` Status: ${status}.`;
          }
        }
        warningMessage = `AI Provider '${provider.name}' is not ready.${details} Copied clean Markdown instead.`;
        await logToTab(tabId, `AI Provider ${provider.name} is not ready. Falling back to deterministic copy. Details: ${details}`, "warn");
        finalOutput = formatDocument(doc, adapter);
        chrome.tabs.sendMessage(tabId, {
          action: "UPDATE_STREAM",
          text: finalOutput
        }).catch(() => {});
      } else {
        const systemPrompt = (lens.aiSystemPrompt || "Format content cleanly as Markdown.") + ` Current Date is ${new Date().toDateString()}.`;
        const userPrompt = (recipe.aiTemplate || "Summarize:\n{extractedMarkdown}")
          .replace("{extractedMarkdown}", rawMarkdown)
          .replace("{lensFocus}", lens.focusArea)
          .replace("{adapterFlavor}", adapter.flavor);

        await logToTab(tabId, `System prompt length: ${systemPrompt.length} | User prompt length: ${userPrompt.length}`);
        await logToTab(tabId, "Generating model response (this may take several seconds)...");
        
        try {
          if (signal.aborted) throw new DOMException("The user aborted a request.", "AbortError");
          const aiResponse = await provider.generate(
            systemPrompt,
            userPrompt,
            (msg) => logToTab(tabId, msg),
            (text) => {
              const formattedStream = adapter.format(text, doc.meta);
              chrome.tabs.sendMessage(tabId, {
                action: "UPDATE_STREAM",
                text: formattedStream
              }).catch(() => {});
            },
            signal
          );
          if (signal.aborted) throw new DOMException("The user aborted a request.", "AbortError");
          await logToTab(tabId, "Model response received successfully.");
          finalOutput = adapter.format(aiResponse.text, doc.meta);
        } catch (aiError: any) {
          if (aiError.name === "AbortError" || signal.aborted) {
            throw aiError;
          }
          await logToTab(tabId, `AI Generation failed, falling back to clean Markdown: ${aiError.message || aiError}`, "error");
          warningMessage = `AI generation failed (${aiError.message || "error"}). Copied clean Markdown instead.`;
          finalOutput = formatDocument(doc, adapter);
        }
      }
    }

    if (signal.aborted) throw new DOMException("The user aborted a request.", "AbortError");

    // Ensure tab/window are active and focused
    await focusTab(tabId);

    // Command Content Script to write formatted string to Clipboard
    await sendClipboardWrite(tabId, finalOutput, true, warningMessage);
  } catch (error: any) {
    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      console.log("[ContextScribe SW] Extraction flow aborted by user.");
      await logToTab(tabId, "Task cancelled.", "warn");
    } else {
      await logToTab(tabId, `Error executing extraction flow: ${error.message || error}`, "error");
      await focusTab(tabId);
      await sendClipboardWrite(tabId, "", false, error.message || "An unexpected error occurred during extraction.");
    }
  } finally {
    activeAbortController = null;
    try {
      await chrome.storage.local.set({
        backgroundTask: {
          running: false
        }
      });
    } catch (err) {
      console.error("[ContextScribe SW] Failed to clear backgroundTask storage status:", err);
    }
  }
}

async function focusTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    await chrome.tabs.update(tabId, { active: true });
  } catch (err) {
    console.warn("[ContextScribe SW] Failed to focus tab/window before clipboard write:", err);
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
    console.error("[ContextScribe SW] Failed to communicate completion to tab:", err);
  }
}
