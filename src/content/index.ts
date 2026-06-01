import { getLastClickedElement } from "./tracker";
import { showToast } from "./toast";
import { toggleGitHubResolvedThreads } from "./dom/githubExpander";
import { extractContent } from "./extractor/index";

// Fallback clipboard copying utility
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Navigator clipboard API failed, trying fallback textarea method...", err);
  }

  // Fallback: execCommand copy method
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
    return successful;
  } catch (err) {
    console.error("Fallback copy text failed:", err);
    return false;
  }
}

// Global runtime message receiver
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "EXTRACT_NODE") {
    try {
      const target = getLastClickedElement();
      const doc = extractContent(target, {
        githubAction: message.githubAction
      });
      sendResponse({ success: true, document: doc });
    } catch (error: any) {
      console.error("ContextScribe extraction failed:", error);
      sendResponse({ success: false, message: error.message || "DOM parsing failed." });
    }
    return true; // asynchronous response keep port open
  }

  if (message.action === "WRITE_CLIPBOARD") {
    if (!message.success || !message.text) {
      showToast(message.message || "Failed to parse context.", "error");
      sendResponse({ success: false });
      return;
    }

    copyToClipboard(message.text).then((success) => {
      if (success) {
        showToast("Markdown copied to clipboard!", "success");
      } else {
        showToast("Clipboard write permission blocked.", "error");
      }
      sendResponse({ success });
    });
    return true; // asynchronous
  }

  if (message.action === "TOGGLE_RESOLVED_THREADS") {
    try {
      const count = toggleGitHubResolvedThreads(message.operation);
      if (count > 0) {
        showToast(`Toggled ${count} resolved conversation threads!`, "success");
      } else {
        showToast("No resolved threads found to toggle.", "info");
      }
      sendResponse({ success: true });
    } catch (error: any) {
      showToast("Failed to modify GitHub threads.", "error");
      sendResponse({ success: false, message: error.message });
    }
    return true;
  }
  return false;
});
