import { clearHighlightNow } from "./extractor/highlight";
import { cleanProgressMessage } from "../shared/utils";

/**
 * Injects a stylish glassmorphic toast notification directly into the webpage.
 */
export function showToast(message: string, type: "success" | "error" | "info" = "success"): void {
  // Remove any existing toasts first
  const existing = document.querySelectorAll(".contextscribe-toast");
  existing.forEach(el => el.remove());

  const toast = document.createElement("div");
  toast.className = `contextscribe-toast contextscribe-toast-${type}`;
  toast.textContent = message;



  document.body.appendChild(toast);

  // Force reflow
  toast.offsetHeight;

  // Slide up
  toast.classList.add("show");

  // Dismiss after delay
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


let lastLoggedText = "";

/**
 * Injects and starts an animating progress bar and status badge.
 */
export function startProgress(): void {
  // Clear any existing progress elements first
  const existingBadge = document.getElementById("contextscribe-progress-badge");
  if (existingBadge) existingBadge.remove();

  lastLoggedText = "";

  const badge = document.createElement("div");
  badge.id = "contextscribe-progress-badge";

  // Create header container
  const header = document.createElement("div");
  header.id = "contextscribe-badge-header";

  const dot = document.createElement("span");
  dot.className = "contextscribe-progress-dot";
  
  const text = document.createElement("span");
  text.id = "contextscribe-progress-text";
  const initialText = "Starting extraction...";
  text.textContent = initialText;
  
  console.log(`[ContextScribe] Progress update: ${initialText}`);
  lastLoggedText = initialText;

  // Actions container
  const actions = document.createElement("div");
  actions.id = "contextscribe-badge-actions";

  const stopBtn = document.createElement("button");
  stopBtn.id = "contextscribe-progress-stop";
  stopBtn.title = "Cancel task";
  stopBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="display: block;"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/></svg>`;
  
  stopBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("[ContextScribe] Stop button clicked. Aborting background task...");
    clearHighlightNow();
    showToast("Task cancelled.", "info");
    chrome.runtime.sendMessage({ action: "ABORT_TASK" }, (response) => {
      console.log("[ContextScribe] Abort task response:", response);
    });
    // Transition to aborted state
    showProgressError("Task cancelled.");
    stopBtn.style.display = "none";
  });

  const expandBtn = document.createElement("button");
  expandBtn.id = "contextscribe-badge-expand-btn";
  expandBtn.title = "Toggle Preview";
  expandBtn.textContent = "▲";

  const closeBtn = document.createElement("button");
  closeBtn.id = "contextscribe-badge-close-btn";
  closeBtn.title = "Dismiss";
  closeBtn.textContent = "✕";

  actions.appendChild(stopBtn);
  actions.appendChild(expandBtn);
  actions.appendChild(closeBtn);

  header.appendChild(dot);
  header.appendChild(text);
  header.appendChild(actions);

  // Content container
  const content = document.createElement("div");
  content.id = "contextscribe-badge-content";

  const textarea = document.createElement("textarea");
  textarea.id = "contextscribe-badge-textarea";
  textarea.readOnly = true;
  textarea.placeholder = "Generated text will appear here...";

  const footer = document.createElement("div");
  footer.id = "contextscribe-badge-footer";

  const copyBtn = document.createElement("button");
  copyBtn.id = "contextscribe-badge-copy-btn";
  copyBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    Copy Markdown
  `;

  const charCount = document.createElement("span");
  charCount.id = "contextscribe-badge-char-count";
  charCount.textContent = "0 chars";

  footer.appendChild(copyBtn);
  footer.appendChild(charCount);

  content.appendChild(textarea);
  content.appendChild(footer);

  // Progress bar
  const bar = document.createElement("div");
  bar.id = "contextscribe-progress-bar";

  badge.appendChild(header);
  badge.appendChild(content);
  badge.appendChild(bar);

  // Setup click event listeners
  expandBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    badge.classList.toggle("expanded");
    if (badge.classList.contains("expanded")) {
      expandBtn.textContent = "▼";
    } else {
      expandBtn.textContent = "▲";
    }
  });

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Send abort to background in case it's running
    chrome.runtime.sendMessage({ action: "ABORT_TASK" }).catch(() => {});
    clearHighlightNow();
    stopProgress();
  });

  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!textarea.value) return;
    navigator.clipboard.writeText(textarea.value).then(() => {
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
      `;
      copyBtn.style.background = "rgba(16, 185, 129, 0.25)";
      copyBtn.style.borderColor = "rgba(16, 185, 129, 0.5)";
      copyBtn.style.color = "#10b981";
      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.style.background = "";
        copyBtn.style.borderColor = "";
        copyBtn.style.color = "";
      }, 1500);
    }).catch(err => {
      console.error("[ContextScribe] Inner copy button failed:", err);
    });
  });



  document.body.appendChild(badge);
  
  // Force layout reflow
  badge.offsetHeight;
  badge.classList.add("show");
}

/**
 * Updates the floating progress badge status message.
 */
export function updateProgressStatus(message: string): void {
  const textEl = document.getElementById("contextscribe-progress-text");
  if (textEl) {
    const cleaned = cleanProgressMessage(message);
    textEl.textContent = cleaned;

    const isGeneration = cleaned.includes("Generating response") || cleaned.includes("Generating AI response") || cleaned.includes("characters)");
    if (isGeneration) {
      // Log exactly one initial generic "Generating response..." message when starting generation
      if (!lastLoggedText.includes("Generating")) {
        const initialGenLog = "Generating response...";
        console.log(`[ContextScribe] Progress update: ${initialGenLog}`);
        lastLoggedText = initialGenLog;
      }
    } else if (cleaned !== lastLoggedText) {
      console.log(`[ContextScribe] Progress update: ${cleaned}`);
      lastLoggedText = cleaned;
    }
  }
}

/**
 * Updates the preview textarea with the live streamed markdown text.
 */
export function updateProgressStreamText(text: string): void {
  const textarea = document.getElementById("contextscribe-badge-textarea") as HTMLTextAreaElement;
  const charCount = document.getElementById("contextscribe-badge-char-count");
  if (textarea) {
    textarea.value = text;
    textarea.scrollTop = textarea.scrollHeight;
  }
  if (charCount) {
    charCount.textContent = `${text.length} chars`;
  }
}

/**
 * Transitions the progress badge to a completed success state.
 */
export function showProgressSuccess(text: string, statusMessage: string): void {
  const badge = document.getElementById("contextscribe-progress-badge");
  const dot = badge?.querySelector(".contextscribe-progress-dot");
  const textEl = document.getElementById("contextscribe-progress-text");
  const stopBtn = document.getElementById("contextscribe-progress-stop") as HTMLButtonElement;
  
  if (badge) {
    badge.classList.add("completed");
  }
  if (dot) {
    dot.className = "contextscribe-progress-dot success";
  }
  if (textEl) {
    textEl.textContent = statusMessage;
  }
  if (stopBtn) {
    stopBtn.style.display = "none";
  }
  
  updateProgressStreamText(text);
}

/**
 * Transitions the progress badge to an error state.
 */
export function showProgressError(errorMessage: string): void {
  const badge = document.getElementById("contextscribe-progress-badge");
  const dot = badge?.querySelector(".contextscribe-progress-dot");
  const textEl = document.getElementById("contextscribe-progress-text");
  const stopBtn = document.getElementById("contextscribe-progress-stop") as HTMLButtonElement;
  
  if (badge) {
    badge.classList.add("completed");
  }
  if (dot) {
    dot.className = "contextscribe-progress-dot error";
  }
  if (textEl) {
    textEl.textContent = errorMessage;
  }
  if (stopBtn) {
    stopBtn.style.display = "none";
  }
}

/**
 * Fades out and removes the progress bar and status badge.
 */
export function stopProgress(): void {
  const badge = document.getElementById("contextscribe-progress-badge");

  if (badge) {
    badge.classList.remove("show");
    setTimeout(() => badge.remove(), 300);
  }
}

