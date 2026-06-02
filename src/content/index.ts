import { getLastClickedElement } from "./tracker";
import {
  showToast,
  startProgress,
  stopProgress,
  updateProgressStatus,
  updateProgressStreamText,
  showProgressSuccess,
  showProgressError
} from "./toast";
import { toggleGitHubResolvedThreads } from "./dom/githubExpander";
import { extractContent } from "./extractor/index";
import { startRemoveHighlightTimer } from "./extractor/highlight";
import "./toast.css";

// Robust clipboard copying utility with window focusing and retries
async function copyToClipboard(text: string): Promise<boolean> {
  console.log("[ContextScribe] Attempting clipboard write. Text length:", text.length);
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      window.focus();
    } catch (e) {
      console.warn("[ContextScribe] Failed to call window.focus():", e);
    }

    // Try Navigator API first
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        console.log(`[ContextScribe] Clipboard write succeeded via Navigator API (attempt ${attempt}/3).`);
        return true;
      }
    } catch (err: any) {
      console.info(`[ContextScribe] Navigator clipboard API failed (attempt ${attempt}/3):`, err.message || err);
    }

    // Try legacy execCommand fallback
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Prevent scrolling and offscreen layout changes
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log(`[ContextScribe] Clipboard write succeeded via execCommand fallback (attempt ${attempt}/3).`);
        return true;
      }
      console.warn(`[ContextScribe] execCommand copy returned false (attempt ${attempt}/3).`);
    } catch (err: any) {
      console.error(`[ContextScribe] execCommand fallback failed (attempt ${attempt}/3):`, err.message || err);
    }

    // Pause briefly before retrying to let focus state settle
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.error("[ContextScribe] All clipboard copy attempts failed.");
  return false;
}

// Global runtime message receiver
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "LOG_PROGRESS") {
    console.log("[ContextScribe] Content script received message:", message.action);
  }

  if (message.action === "EXTRACT_NODE") {
    console.log("[ContextScribe] Initiating DOM extraction...");
    startProgress();
    (async () => {
      try {
        const target = getLastClickedElement();
        
        // Auto-expand resolved threads and load hidden conversations before extraction on GitHub PR pages
        if (window.location.hostname.includes("github.com") && window.location.pathname.includes("/pull/")) {
          console.log("[ContextScribe] GitHub PR page detected. Auto-expanding resolved threads before extraction...");
          try {
            await toggleGitHubResolvedThreads("expand", target);
          } catch (e) {
            console.warn("[ContextScribe] Thread expansion before extraction failed/timed out:", e);
          }
        }

        console.log("[ContextScribe] Extracting target element:", target ? target.tagName : "null");
        const doc = extractContent(target, {
          githubAction: message.githubAction,
          formProtection: message.formProtection
        });
        console.log("[ContextScribe] DOM extraction completed successfully.");
        sendResponse({ success: true, document: doc });
      } catch (error: any) {
        console.error("[ContextScribe] ContextScribe extraction failed:", error);
        stopProgress();
        sendResponse({ success: false, message: error.message || "DOM parsing failed." });
      }
    })();
    return true; // asynchronous response keep port open
  }

  if (message.action === "LOG_PROGRESS") {
    const swPrefix = `[ContextScribe SW]`;
    if (message.level === "error") {
      console.error(swPrefix, message.message);
    } else if (message.level === "warn") {
      console.warn(swPrefix, message.message);
    }
    updateProgressStatus(message.message);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "UPDATE_STREAM") {
    updateProgressStreamText(message.text);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "WRITE_CLIPBOARD") {
    console.log("[ContextScribe] Processing WRITE_CLIPBOARD request. Success state:", message.success);
    
    if (!message.success || !message.text) {
      console.error("[ContextScribe] Extraction failed or returned empty content:", message.message);
      showProgressError(message.message || "Failed to parse context.");
      showToast(message.message || "Failed to parse context.", "error");
      startRemoveHighlightTimer(); // Start 5s fade-out timer on failure
      sendResponse({ success: false });
      return;
    }

    copyToClipboard(message.text).then((success) => {
      startRemoveHighlightTimer(); // Start 5s fade-out timer on success
      if (success) {
        if (message.message) {
          console.log("[ContextScribe] Copy completed with warning notice:", message.message);
          showProgressSuccess(message.text, message.message);
          showToast(message.message, "info");
        } else {
          showProgressSuccess(message.text, "Markdown copied to clipboard!");
          showToast("Markdown copied to clipboard!", "success");
        }
      } else {
        console.error("[ContextScribe] Copy failed: clipboard permissions blocked.");
        showProgressSuccess(message.text, "Clipboard blocked. Copy manually below.");
        showToast("Clipboard write permission blocked.", "error");
      }
      sendResponse({ success });
    });
    return true; // asynchronous
  }

  if (message.action === "SHOW_TOAST") {
    console.log("[ContextScribe] Showing toast from background:", message.message);
    showToast(message.message, message.toastType || "info");
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "TOGGLE_RESOLVED_THREADS") {
    console.log("[ContextScribe] Toggling GitHub conversation threads. Operation:", message.operation);
    (async () => {
      try {
        const target = getLastClickedElement();
        const count = await toggleGitHubResolvedThreads(message.operation, target);
        console.log("[ContextScribe] Threads toggled count:", count);
        if (count > 0) {
          showToast(`Toggled ${count} resolved conversation threads!`, "success");
        } else {
          showToast("No resolved threads found to toggle in this review.", "info");
        }
        sendResponse({ success: true });
      } catch (error: any) {
        console.error("[ContextScribe] Thread toggle operation failed:", error);
        showToast("Failed to modify GitHub threads.", "error");
        sendResponse({ success: false, message: error.message });
      }
    })();
    return true;
  }
  return false;
});
