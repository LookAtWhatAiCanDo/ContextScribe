/**
 * Utility to expand, collapse, or toggle GitHub PR resolved conversation threads.
 */
export function toggleGitHubResolvedThreads(action: "expand" | "collapse" | "toggle"): number {
  let count = 0;

  // 1. Target discussions hidden behind <details> elements (GitHub's standard resolved wrapper)
  const detailsElements = document.querySelectorAll<HTMLDetailsElement>("details.discussion-details");
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

  // 2. Target "Show resolved" and "Show outdated" toggle buttons that need programmatic click events
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    "button.show-resolved-button, .js-toggle-outdated-comments, button.js-show-outdated-discussion"
  );
  
  if (action === "expand" || action === "toggle") {
    buttons.forEach((btn) => {
      // Check if button text indicates it can be expanded (e.g. is not currently expanded)
      const label = btn.textContent?.toLowerCase() || "";
      if (label.includes("show") || label.includes("expand") || action === "toggle") {
        btn.click();
        count++;
      }
    });
  }

  return count;
}
