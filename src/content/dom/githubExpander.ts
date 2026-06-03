import { highlightElement } from "../extractor/highlight";

/**
 * Utility to expand, collapse, or toggle GitHub PR resolved conversation threads.
 */
export async function toggleGitHubResolvedThreads(
  action: "expand" | "collapse" | "toggle",
  targetElement?: HTMLElement | null
): Promise<number> {
  let count = 0;
  const processedContainers = new Set<Element>();
  const triggeredContainers: Element[] = [];

  // Helper to determine if an element is visible in the viewport/layout
  const isElementVisible = (el: HTMLElement) => {
    if (el.offsetWidth > 0 || el.offsetHeight > 0) return true;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none") return false;
      if (style.visibility === "hidden") return false;
    } catch (e) {}
    return true;
  };

  // Determine the scope of query based on the targeted review (reusing extractor logic)
  let scope: Document | HTMLElement = document;
  if (targetElement) {
    let container: HTMLElement | null = null;
    
    // 1. Check if target lies within a Pull Request Review timeline item or outer review card
    let current: HTMLElement | null = targetElement;
    let timelineItem: HTMLElement | null = null;
    let outerReviewCard: HTMLElement | null = null;
    
    while (current) {
      if (current.classList.contains("js-timeline-item") && current.getAttribute("data-gid")?.startsWith("PRR_")) {
        timelineItem = current;
      }
      if (current.id && current.id.startsWith("pullrequestreview-")) {
        if (
          current.classList.contains("js-comment") &&
          current.classList.contains("js-minimize-container") &&
          !current.classList.contains("timeline-comment-group")
        ) {
          outerReviewCard = current;
        }
      }
      current = current.parentElement;
    }
    
    const closestComment = targetElement.closest<HTMLElement>(".timeline-comment, .review-comment, .comment");
    
    if (timelineItem || outerReviewCard) {
      container = timelineItem || outerReviewCard;
    } else if (closestComment) {
      if (closestComment.classList.contains("timeline-comment")) {
        const tItem = closestComment.closest<HTMLElement>(".js-timeline-item");
        if (tItem) {
          container = tItem;
        } else {
          container = closestComment.closest<HTMLElement>(".timeline-comment-group") || closestComment;
        }
      } else {
        container = closestComment.closest<HTMLElement>(
          ".js-comment-container, .js-line-comments, tr.inline-comments"
        ) || closestComment;
      }
    } else {
      container = targetElement.closest<HTMLElement>(
        ".timeline-comment-group, .js-comment-container, .js-line-comments, tr.inline-comments, .timeline-comment, .review-comment, .comment"
      );
    }

    if (container) {
      scope = container;
      highlightElement(container);
    }
  }

  // 0. Target and expand "Show a summary per file" details blocks
  if (action === "expand" || action === "toggle") {
    const summaries = scope.querySelectorAll<HTMLElement>("summary");
    summaries.forEach((summary) => {
      const text = summary.textContent ? summary.textContent.trim().replace(/\s+/g, ' ') : "";
      if (text.toLowerCase().includes("show a summary per file")) {
        const details = summary.closest<HTMLDetailsElement>("details");
        if (details && !details.hasAttribute("open")) {
          details.setAttribute("open", "");
          count++;
        }
      }
    });
  }

  // 1. Target AJAX forms loading hidden conversations (e.g. "6 hidden conversations" or "Load more…")
  // We run this first so they are fully loaded into the DOM before we process comments.
  if (action === "expand" || action === "toggle") {
    const hiddenForms = Array.from(scope.querySelectorAll<HTMLFormElement>("form.js-review-hidden-comment-ids"));
    const activeForms = hiddenForms.filter((form) => isElementVisible(form));

    if (activeForms.length > 0) {
      activeForms.forEach((form) => {
        const btn = form.querySelector<HTMLElement>("button[type='submit'], button");
        if (btn) {
          btn.click();
          count++;
        }
      });

      // Poll the DOM until the loader forms are detached or hidden (max 3 seconds)
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const stillLoading = activeForms.some(
          (form) => document.body.contains(form) && isElementVisible(form)
        );
        if (!stillLoading) {
          break;
        }
      }
    }
  }

  // 2. Target the modern span-based Buttons (e.g. <span class="Button-label">Show resolved</span>)
  const labels = scope.querySelectorAll<HTMLElement>("span.Button-label, .Button-label");
  labels.forEach((label) => {
    const text = label.textContent ? label.textContent.trim().replace(/\s+/g, ' ') : "";
    const isShow = text === "Show resolved";
    const isHide = text === "Hide resolved";

    if (isShow || isHide) {
      const btn = label.closest<HTMLElement>("button") || label;
      const container = label.closest("review-thread-collapsible") || label.parentElement;

      // Ensure we only process this container/button once
      if (container && processedContainers.has(container)) {
        return;
      }

      if (isShow && (action === "expand" || action === "toggle")) {
        if (isElementVisible(btn)) {
          btn.click();
          count++;
          if (container) {
            processedContainers.add(container);
            triggeredContainers.push(container);
          }
        }
      } else if (isHide && (action === "collapse" || action === "toggle")) {
        if (isElementVisible(btn)) {
          btn.click();
          count++;
          if (container) processedContainers.add(container);
        }
      }
    }
  });

  // 3. Fallback Details (GitHub's legacy resolved details container)
  const detailsElements = scope.querySelectorAll<HTMLDetailsElement>("details.discussion-details, details[class*='outdated'], details[class*='resolved']");
  detailsElements.forEach((details) => {
    const isExpanded = details.hasAttribute("open");
    if (action === "expand" && !isExpanded) {
      details.setAttribute("open", "");
      count++;
    } else if (action === "collapse" && isExpanded) {
      details.removeAttribute("open");
      count++;
    } else if (action === "toggle") {
      if (isExpanded) {
        details.removeAttribute("open");
      } else {
        details.setAttribute("open", "");
      }
      count++;
    }
  });

  // 4. Fallback Legacy Buttons (only if not already processed in step 1)
  const legacyButtons = scope.querySelectorAll<HTMLElement>(
    ".show-resolved-button, .js-toggle-outdated-comments, .js-show-outdated-discussion, [class*='toggle-outdated']"
  );
  legacyButtons.forEach((btn) => {
    // Check if this button or any of its parents are already processed
    let isProcessed = false;
    processedContainers.forEach((container) => {
      if (container.contains(btn) || btn.contains(container)) {
        isProcessed = true;
      }
    });
    if (isProcessed) return;

    const label = btn.textContent?.toLowerCase() || "";
    if (action === "expand" || action === "toggle") {
      if (label.includes("show") || label.includes("expand") || action === "toggle") {
        if (isElementVisible(btn)) {
          btn.click();
          count++;
          processedContainers.add(btn);
          triggeredContainers.push(btn);
        }
      }
    } else if (action === "collapse") {
      if (label.includes("hide") || label.includes("collapse")) {
        if (isElementVisible(btn)) {
          btn.click();
          count++;
          processedContainers.add(btn);
        }
      }
    }
  });

  // 5. Wait for the triggered resolved threads to finish expanding and populating comments (max 2.5 seconds)
  if (triggeredContainers.length > 0 && (action === "expand" || action === "toggle")) {
    for (let i = 0; i < 25; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      let allSettled = true;
      for (const container of triggeredContainers) {
        const showBtn = container.querySelector<HTMLElement>(".review-thread-show-text, [class*='show-resolved']");
        const hasShowVisible = showBtn && isElementVisible(showBtn);
        const hasComments = container.querySelectorAll(".review-comment, .timeline-comment, .comment, td.comment-body").length > 0;
        
        if (hasShowVisible || !hasComments) {
          allSettled = false;
          break;
        }
      }
      
      if (allSettled) {
        break;
      }
    }
  }

  return count;
}
