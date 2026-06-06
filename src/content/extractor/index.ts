import { DocumentIR } from "../../shared/types";
import { extractGenericDOM } from "./generic";
import { extractGitHubPR } from "./github";

/**
 * Routes extraction requests to the correct parser based on page URL and options.
 */
export function extractContent(
  target: HTMLElement,
  options: { githubAction?: string; formProtection?: boolean } = {}
): DocumentIR {
  const url = window.location.href;

  // Detect GitHub PR Pages
  if (url.includes("github.com") && url.includes("/pull/")) {
    return extractGitHubPR(target, options.githubAction, options.formProtection);
  }

  // Fallback to generic webpage element extraction
  return extractGenericDOM(target, true, options.formProtection);
}
