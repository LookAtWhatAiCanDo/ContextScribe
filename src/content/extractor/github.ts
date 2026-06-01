import { DocumentIR, IRBlock, CaptureMetadata } from "../../shared/types";
import { extractGenericDOM } from "./generic";

/**
 * Checks if a user is AI-generated (e.g. Copilot, security bots).
 */
function isUserAi(authorName: string, avatarEl: HTMLImageElement | null): boolean {
  const name = authorName.toLowerCase();
  if (name.includes("copilot") || name.includes("ghostwriter") || name.includes("code-agent")) {
    return true;
  }
  if (avatarEl) {
    const altText = (avatarEl.alt || "").toLowerCase();
    const srcText = (avatarEl.src || "").toLowerCase();
    if (altText.includes("copilot") || srcText.includes("copilot")) {
      return true;
    }
  }
  return false;
}

/**
 * Parses an individual GitHub review comment element.
 */
function parseGitHubComment(commentEl: HTMLElement): IRBlock | null {
  const authorLink = commentEl.querySelector<HTMLAnchorElement>("a.author, [data-hovercard-type='user']");
  const authorName = authorLink ? (authorLink.textContent || "").trim() : "Unknown";
  
  const avatarEl = commentEl.querySelector<HTMLImageElement>("img.avatar, .avatar-user");
  const isAi = isUserAi(authorName, avatarEl);

  const timeEl = commentEl.querySelector<HTMLElement>("relative-time, [datetime]");
  const timestamp = timeEl ? (timeEl.getAttribute("datetime") || timeEl.textContent || "").trim() : "";

  // Comment text body (contains the markdown text rendered as HTML)
  const bodyEl = commentEl.querySelector<HTMLElement>(".comment-body, td.comment-body");
  if (!bodyEl) return null;

  // Use generic extraction on body to maintain markdown tags like bold, lists, tables
  const bodyDoc = extractGenericDOM(bodyEl);
  const bodyText = (bodyEl.textContent || "").trim();

  return {
    type: "comment",
    text: bodyText,
    metadata: {
      author: authorName,
      timestamp,
      isAiGenerated: isAi
    },
    children: bodyDoc.root.children
  };
}

/**
 * Parses a conversation thread containing one or more comments.
 */
function parseDiscussionThread(threadContainer: HTMLElement): IRBlock | null {
  // Check if thread is unresolved (resolved threads are wrapped in a details block or collapsed)
  const detailsEl = threadContainer.closest("details.discussion-details");
  const isUnresolved = detailsEl ? !detailsEl.hasAttribute("open") : true;

  // Track the file path for this thread (often in a header context)
  let filePath = "";
  const fileHeader = threadContainer.closest(".file-header, .file");
  if (fileHeader) {
    const pathEl = fileHeader.querySelector<HTMLElement>(".file-info a, [data-path]");
    if (pathEl) {
      filePath = (pathEl.getAttribute("data-path") || pathEl.textContent || "").trim();
    }
  }

  const comments: IRBlock[] = [];
  const commentElements = threadContainer.querySelectorAll<HTMLElement>(
    ".review-comment, .timeline-comment, div[id^='discussion_'] div.comment"
  );
  
  // If no review-comment class, look for any comment class inside the container
  const targets = commentElements.length > 0 
    ? Array.from(commentElements) 
    : Array.from(threadContainer.querySelectorAll<HTMLElement>(".comment"));

  targets.forEach((commentEl) => {
    const block = parseGitHubComment(commentEl);
    if (block) comments.push(block);
  });

  if (comments.length === 0) return null;

  return {
    type: "comment-thread",
    metadata: {
      isUnresolved,
      filePath
    },
    children: comments
  };
}

/**
 * Extracts GitHub PR specific comment structures.
 */
export function extractGitHubPR(target: HTMLElement, action?: string): DocumentIR {
  const metadata: CaptureMetadata = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };

  const threads: IRBlock[] = [];

  // Determine what threads we need to capture
  if (action === "copy_selected") {
    // 1. Capture only the clicked thread container
    const threadContainer = target.closest<HTMLElement>(
      ".js-comment-container, .js-line-comments, tr.inline-comments"
    );
    if (threadContainer) {
      const parsed = parseDiscussionThread(threadContainer);
      if (parsed) threads.push(parsed);
    }
  } else {
    // 2. Scan all thread containers on the page
    const containers = document.querySelectorAll<HTMLElement>(".js-comment-container, tr.inline-comments");
    containers.forEach((container) => {
      const parsed = parseDiscussionThread(container);
      if (parsed) {
        const isUnresolved = parsed.metadata?.isUnresolved;

        // Apply filters based on the selected GitHub action
        if (action === "copy_active" || action === "copy_unresolved") {
          if (isUnresolved) threads.push(parsed);
        } else if (action === "copy_resolved") {
          if (!isUnresolved) threads.push(parsed);
        } else {
          // Default: Copy all visible/resolved/unresolved comments
          threads.push(parsed);
        }
      }
    });
  }

  // Fallback to generic DOM extraction if we couldn't parse any comment threads
  if (threads.length === 0) {
    return extractGenericDOM(target);
  }

  return {
    meta: metadata,
    root: {
      type: "root",
      children: threads
    }
  };
}
