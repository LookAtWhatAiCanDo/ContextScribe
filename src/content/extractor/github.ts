import { DocumentIR, IRBlock, CaptureMetadata } from "../../shared/types";
import { extractGenericDOM, parseElement, isElementVisible } from "./generic";
import { highlightElement } from "./highlight";




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
 * Resolves comment discussion IDs (e.g. discussion_r3327932730) from a comment element.
 */
function getCommentId(commentEl: HTMLElement): string | null {
  if (
    commentEl.id &&
    (commentEl.id.startsWith("discussion_r") ||
     commentEl.id.startsWith("pullrequestreview-") ||
     commentEl.id.startsWith("issuecomment-"))
  ) {
    return commentEl.id;
  }
  const link = commentEl.querySelector<HTMLAnchorElement>("a[href*='#discussion_r']");
  if (link) {
    const href = link.getAttribute("href") || "";
    const match = href.match(/#(discussion_r\d+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Formats a JSON suggestion object into a standard unified diff string.
 */
function formatSuggestionDiff(suggestion: any): string {
  if (!suggestion || !suggestion.diffEntries) return "";
  let diffText = "";
  suggestion.diffEntries.forEach((de: any) => {
    diffText += `# File: ${de.path}\n`;
    if (de.diffLines) {
      de.diffLines.forEach((line: any) => {
        if (line.type === "HUNK") {
          diffText += `${line.text}\n`;
        } else if (line.type === "DELETION") {
          diffText += `-${line.text}\n`;
        } else if (line.type === "ADDITION") {
          diffText += `+${line.text}\n`;
        } else {
          diffText += ` ${line.text}\n`;
        }
      });
    }
  });
  return diffText.trimEnd();
}

/**
 * Parses a DOM diff table element into a unified diff string.
 */
function parseDOMDiffTable(tableEl: HTMLElement): string {
  const rows = tableEl.querySelectorAll("tr");
  let diffText = "";
  rows.forEach(row => {
    const hunkCell = row.querySelector(".blob-num-hunk, .blob-code-hunk");
    if (hunkCell) {
      diffText += `${hunkCell.textContent?.trim()}\n`;
      return;
    }

    const codeCell = row.querySelector(".blob-code");
    if (!codeCell) return;

    const text = codeCell.textContent || "";
    let codeLine = text.replace(/\r?\n/g, "").trimEnd();

    let prefix = " ";
    if (codeCell.classList.contains("blob-code-addition") || row.querySelector(".blob-code-addition")) {
      prefix = "+";
    } else if (codeCell.classList.contains("blob-code-deletion") || row.querySelector(".blob-code-deletion")) {
      prefix = "-";
    }

    if (codeLine.startsWith("+") || codeLine.startsWith("-")) {
      codeLine = codeLine.substring(1);
    }
    diffText += `${prefix}${codeLine}\n`;
  });
  
  return diffText.trimEnd();
}

/**
 * Extracts severity label from an automated-review-comment element.
 */
function extractSeverityLabel(commentEl: HTMLElement): string {
  // The severity label in React-rendered automated-review-comment uses prc-Label
  const labelEl = commentEl.querySelector<HTMLElement>(
    ".prc-Label-Label-qG-Zu, [data-component='Label'][data-variant='danger'], [data-component='Label'][data-variant='warning']"
  );
  if (labelEl) {
    const text = (labelEl.textContent || "").trim();
    // Only return if it looks like a severity label (short, capitalized)
    if (text && text.length < 20 && /^[A-Z]/.test(text)) {
      return text;
    }
  }
  return "";
}

/**
 * Parses an individual GitHub review comment element.
 */
function parseGitHubComment(
  commentEl: HTMLElement,
  formProtection = true,
  seenCommentIds?: Set<string>,
  allowCollapsed = true,
  commentDetailsMap?: Map<string, any>
): IRBlock | null {
  // Prevent duplicate comment extraction
  const commentId = getCommentId(commentEl);
  if (commentId && seenCommentIds) {
    if (seenCommentIds.has(commentId)) {
      return null;
    }
    seenCommentIds.add(commentId);
  }

  // Skip if commentEl itself or its ancestors are forms/reply forms we want to ignore
  if (
    commentEl.classList.contains("inline-comment-form") ||
    commentEl.classList.contains("js-inline-comment-form-container") ||
    commentEl.classList.contains("js-comment-update-form") ||
    commentEl.classList.contains("previewable-comment-form") ||
    commentEl.classList.contains("comment-reactions") ||
    commentEl.classList.contains("js-comment-reactions-group") ||
    commentEl.closest(".inline-comment-form") ||
    commentEl.closest(".js-inline-comment-form-container")
  ) {
    return null;
  }

  const closestForm = commentEl.closest("form");
  if (closestForm && !closestForm.classList.contains("js-resolvable-thread-form")) {
    return null;
  }

  const authorLink = commentEl.querySelector<HTMLElement>(
    "a.author, [data-hovercard-type='user'], [data-hovercard-type='bot'], [data-hovercard-type='organization'], .author, strong > a, [class*='author' i], [class*='AuthorName'], [data-testid='avatar-name']"
  );
  const authorName = authorLink ? (authorLink.textContent || "").trim() : "Unknown";

  const avatarEl = commentEl.querySelector<HTMLImageElement>("img.avatar, .avatar-user, [class*='activityAvatar']");
  const isAi = isUserAi(authorName, avatarEl);

  const timeEl = commentEl.querySelector<HTMLElement>("relative-time, [datetime]");
  const timestamp = timeEl ? (timeEl.getAttribute("datetime") || timeEl.textContent || "").trim() : "";

  // Comment text body (contains the markdown text rendered as HTML)
  const bodyEl = commentEl.querySelector<HTMLElement>(".comment-body, td.comment-body, .markdown-body, [class*='comment-body']");
  if (!bodyEl) return null;

  // Use generic extraction on body to maintain markdown tags like bold, lists, tables
  const bodyDoc = extractGenericDOM(bodyEl, false, formProtection, allowCollapsed);
  const bodyText = (bodyEl.textContent || "").trim();

  // Initialize children if not present
  if (!bodyDoc.root.children) {
    bodyDoc.root.children = [];
  }

  // Try to find suggestion
  if (commentId) {
    const dbId = commentId.replace("discussion_r", "");
    const details = commentDetailsMap?.get(dbId);
    const suggestion = details?.automatedComment?.suggestion;
    if (suggestion) {
      const diffText = formatSuggestionDiff(suggestion);
      if (diffText) {
        bodyDoc.root.children.push({
          type: "code-block",
          language: "diff",
          text: diffText
        });
      }
    } else {
      // Fallback: parse suggestion from DOM diff-table if exists
      const diffTable = commentEl.querySelector(".diff-table, table.UnifiedDiffLines-module__unifiedDiffLines__U966b");
      if (diffTable) {
        const diffText = parseDOMDiffTable(diffTable as HTMLElement);
        if (diffText) {
          bodyDoc.root.children.push({
            type: "code-block",
            language: "diff",
            text: diffText
          });
        }
      }
    }
  }

  // Extract severity label for automated-review-comment elements
  const severity = extractSeverityLabel(commentEl);

  return {
    type: "comment",
    text: bodyText,
    metadata: {
      author: authorName,
      timestamp,
      isAiGenerated: isAi,
      severity: severity || undefined
    },
    children: bodyDoc.root.children
  };
}

/**
 * Helper to robustly extract a file path from a thread container or its ancestors/descendants.
 */
function findFilePath(threadContainer: HTMLElement): string {
  // 1. Try finding closest file-header or file element (standard in files tab)
  let fileHeader = threadContainer.closest<HTMLElement>(".file-header, .file");
  
  // 2. If not found, try finding file-header or file-info inside/descendant (common in conversation tab)
  if (!fileHeader) {
    fileHeader = threadContainer.querySelector<HTMLElement>(".file-header, .file, .file-info, [class*='file-header']");
  }
  
  if (fileHeader) {
    const pathEl = fileHeader.querySelector<HTMLElement>(".file-info a, [data-path], a.Link--primary, a");
    if (pathEl) {
      const path = (pathEl.getAttribute("data-path") || pathEl.textContent || "").trim();
      if (path && !path.includes(" ") && path.includes("/")) {
        return path;
      }
    }
  }
  
  // 3. Fallback: search for any link inside the thread container that looks like a path
  const pathLinks = threadContainer.querySelectorAll<HTMLElement>("a[href*='/files'], [data-path], a.Link--primary, a");
  for (const link of Array.from(pathLinks)) {
    const path = (link.getAttribute("data-path") || link.textContent || "").trim();
    if (path && !path.includes(" ") && path.includes("/")) {
      return path;
    }
  }
  
  return "";
}

/**
 * Extracts the line reference and code context from a review thread container.
 * Handles both review-thread-collapsible (conversation tab) and
 * js-line-comments/js-inline-comments-container (files tab) structures.
 * Returns IR blocks to prepend to comment children.
 */
function extractThreadCodeContext(threadContainer: HTMLElement): IRBlock[] {
  const contextBlocks: IRBlock[] = [];

  // "Comment on lines +X to +Y" reference
  const lineStartEl = threadContainer.querySelector<HTMLElement>(".js-multi-line-preview-start");
  const lineEndEl = threadContainer.querySelector<HTMLElement>(".js-multi-line-preview-end");
  if (lineStartEl || lineEndEl) {
    const start = lineStartEl?.textContent?.trim() || "";
    const end = lineEndEl?.textContent?.trim() || "";
    if (start || end) {
      contextBlocks.push({
        type: "paragraph",
        text: `Comment on lines ${start} to ${end}`
      });
    }
  }

  // Code snippet: first try within the container (review-thread-collapsible style)
  let diffTableEl = threadContainer.querySelector<HTMLElement>(".diff-table");

  // If not found inside, look for it as a sibling of the js-inline-comments-container
  // (used in the files-changed tab and some conversation-tab structures)
  if (!diffTableEl) {
    const inlineContainer = threadContainer.closest<HTMLElement>(".js-inline-comments-container");
    if (inlineContainer) {
      let sibling = inlineContainer.previousElementSibling as HTMLElement | null;
      while (sibling) {
        diffTableEl = sibling.querySelector<HTMLElement>(".diff-table") ||
                      (sibling.classList.contains("diff-table") ? sibling : null);
        if (diffTableEl) break;
        sibling = sibling.previousElementSibling as HTMLElement | null;
      }
    }
  }

  if (diffTableEl) {
    const diffText = parseDOMDiffTable(diffTableEl);
    if (diffText) {
      contextBlocks.push({
        type: "code-block",
        language: "",
        text: diffText
      });
    }
  }

  return contextBlocks;
}

/**
 * Parses a conversation thread containing one or more comments.
 */
function parseDiscussionThread(
  threadContainer: HTMLElement,
  formProtection = true,
  seenCommentIds?: Set<string>,
  allowCollapsed = true,
  commentDetailsMap?: Map<string, any>
): IRBlock | null {
  // Check if thread is unresolved (resolved threads are wrapped in a details block or collapsed)
  const detailsEl = threadContainer.closest("details.discussion-details");
  const collapsibleEl = threadContainer.closest("review-thread-collapsible") || threadContainer.querySelector("review-thread-collapsible");

  let isUnresolved = true;
  if (detailsEl) {
    isUnresolved = !detailsEl.hasAttribute("open");
  } else if (collapsibleEl) {
    isUnresolved = collapsibleEl.getAttribute("data-resolved") !== "true";
  }

  // Track the file path for this thread using our robust helper
  const filePath = findFilePath(threadContainer);

  const comments: IRBlock[] = [];

  // Resolve reviewer name & bot/AI status
  const authorLink = threadContainer.querySelector<HTMLElement>(
    "a.author, [data-hovercard-type='user'], [data-hovercard-type='bot'], [data-hovercard-type='organization'], .author, strong > a, [class*='author' i], [class*='AuthorName'], [data-testid='avatar-name']"
  );
  const reviewerName = authorLink ? (authorLink.textContent || "").trim() : "Reviewer";

  // Extract code context blocks (line reference + diff snippet) for inline threads
  const codeContextBlocks = extractThreadCodeContext(threadContainer);

  // 1. Try to find the script tag containing threadComments inside threadContainer
  const scriptEl = threadContainer.querySelector<HTMLElement>('script[data-target="react-partial.embeddedData"]');
  let parsedFromScript = false;

  if (scriptEl) {
    try {
      const data = JSON.parse(scriptEl.textContent || "");
      const isOverview = data.props?.isOverviewComment === true ||
                         threadContainer.id?.startsWith("pullrequestreview-");

      // For overview comments (Copilot PR review summary), extract the overview body explicitly
      if (isOverview) {
        const overviewBodyEl = threadContainer.querySelector<HTMLElement>(".comment-body.js-comment-body");
        if (overviewBodyEl) {
          const overviewBodyDoc = extractGenericDOM(overviewBodyEl, false, formProtection, allowCollapsed);
          // Filter to only valid content blocks to avoid including react-partial noise
          const overviewChildren: IRBlock[] = (overviewBodyDoc.root.children || []).filter(
            (c: IRBlock) => [
              "heading",
              "paragraph",
              "list",
              "list-item",
              "code-block",
              "blockquote",
              "table",
              "details"
            ].includes(c.type)
          );
          const overviewText = overviewChildren.map(c => c.text || "").filter(Boolean).join("\n");
          if (overviewChildren.length > 0 || overviewText) {
            const overviewAuthorLink = threadContainer.querySelector<HTMLElement>(
              "a.author, [data-hovercard-type='copilot'], [class*='author' i]"
            );
            const overviewAuthor = overviewAuthorLink ? (overviewAuthorLink.textContent || "").trim() : reviewerName;
            comments.push({
              type: "comment",
              text: overviewText,
              metadata: {
                author: overviewAuthor || reviewerName,
                timestamp: "",
                isAiGenerated: true
              },
              children: overviewChildren
            });
            parsedFromScript = true; // Mark as handled so DOM fallback only adds inline comments
          }
        }
      }

      if (data.props && data.props.threadComments && !isOverview) {
        parsedFromScript = true;
        data.props.threadComments.forEach((tc: any) => {
          const permalink = tc.permalink || "";
          const match = permalink.match(/#(discussion_r\d+)/);
          const commentId = match ? match[1] : "";
          if (!commentId) return;

          if (seenCommentIds && seenCommentIds.has(commentId)) {
            return; // already processed
          }
          if (seenCommentIds) {
            seenCommentIds.add(commentId);
          }

          // Locate the comment element in the DOM inside threadContainer
          const commentEl = threadContainer.querySelector<HTMLElement>(`#${commentId}`);
          if (commentEl) {
            const block = parseGitHubComment(commentEl, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap);
            if (block) comments.push(block);
          } else {
            // It's collapsed/hidden and not in the DOM! Parse from JSON!
            const dbId = commentId.replace("discussion_r", "");
            const details = commentDetailsMap?.get(dbId);
            const author = details?.author?.login || reviewerName;
            const isAi = isUserAi(author, null);
            const timestamp = details?.createdAt || "";

            const children: IRBlock[] = [
              {
                type: "paragraph",
                text: tc.message || ""
              }
            ];

            // Add suggestion if present in details
            const suggestion = details?.automatedComment?.suggestion;
            if (suggestion) {
              const diffText = formatSuggestionDiff(suggestion);
              if (diffText) {
                children.push({
                  type: "code-block",
                  language: "diff",
                  text: diffText
                });
              }
            }

            comments.push({
              type: "comment",
              text: tc.message || "",
              metadata: {
                author,
                timestamp,
                isAiGenerated: isAi
              },
              children
            });
          }
        });
      }
    } catch (e) {
      console.error("[ContextScribe] Error parsing thread script JSON:", e);
    }
  }

  // 2. If not parsed from script (or only overview was parsed), fall back to DOM targets
  if (!parsedFromScript) {
    let targets: HTMLElement[] = [];

    if (
      threadContainer.classList.contains("timeline-comment") ||
      threadContainer.classList.contains("review-comment") ||
      threadContainer.classList.contains("comment") ||
      threadContainer.getAttribute("data-testid") === "automated-review-comment"
    ) {
      targets.push(threadContainer);
    } else {
      const commentElements = threadContainer.querySelectorAll<HTMLElement>(
        ".review-comment, .timeline-comment, div[id^='discussion_'] div.comment, [data-testid='automated-review-comment']"
      );
      targets = commentElements.length > 0
        ? Array.from(commentElements)
        : Array.from(threadContainer.querySelectorAll<HTMLElement>(".comment"));
    }

    // Filter targets to remove reply/edit forms
    targets = targets.filter(targetEl => {
      if (
        targetEl.classList.contains("inline-comment-form") ||
        targetEl.classList.contains("js-inline-comment-form-container") ||
        targetEl.classList.contains("js-comment-update-form") ||
        targetEl.classList.contains("previewable-comment-form") ||
        targetEl.classList.contains("comment-reactions") ||
        targetEl.classList.contains("js-comment-reactions-group") ||
        targetEl.closest(".inline-comment-form") ||
        targetEl.closest(".js-inline-comment-form-container")
      ) {
        return false;
      }
      const closestForm = targetEl.closest("form");
      if (closestForm && !closestForm.closest(".js-resolvable-thread-form") && !closestForm.classList.contains("js-resolvable-thread-form")) {
        return false;
      }
      return true;
    });

    targets.forEach((commentEl) => {
      const block = parseGitHubComment(commentEl, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap);
      if (block) {
        // Prepend code context blocks (line reference + diff) to the comment children
        if (codeContextBlocks.length > 0) {
          if (!block.children) block.children = [];
          block.children = [...codeContextBlocks, ...block.children];
        }
        comments.push(block);
      }
    });
  } else if (parsedFromScript && codeContextBlocks.length > 0) {
    // Prepend code context to script-parsed comments as well
    comments.forEach(comment => {
      if (!comment.children) comment.children = [];
      comment.children = [...codeContextBlocks, ...comment.children];
    });
  }

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
export function extractGitHubPR(target: HTMLElement, action?: string, formProtection = true): DocumentIR {
  const metadata: CaptureMetadata = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };

  const threads: IRBlock[] = [];
  let container: HTMLElement | null = null;
  const seenCommentIds = new Set<string>();

  // Build a global commentDetailsMap from react-partial script tags
  const commentDetailsMap = new Map<string, any>();
  const allScripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
  allScripts.forEach(s => {
    try {
      const data = JSON.parse(s.textContent || "");
      if (data.props && data.props.comment) {
        const c = data.props.comment;
        if (c.databaseId) {
          commentDetailsMap.set(String(c.databaseId), c);
        }
      }
    } catch (e) {}
  });

  // Determine what threads we need to capture
  if (!action || action === "copy_selected") {
    // 1. Check if target lies within a Pull Request Review timeline item or outer review card
    let current: HTMLElement | null = target;
    let timelineItem: HTMLElement | null = null;
    let outerReviewCard: HTMLElement | null = null;
    
    while (current) {
      if (current.classList.contains("js-timeline-item") && current.getAttribute("data-gid")?.startsWith("PRR_")) {
        timelineItem = current;
      }
      if (current.id && current.id.startsWith("pullrequestreview-")) {
        // Make sure it is the outer review card (parent of TimelineItem-body or containing timeline-comment-group)
        if (current.classList.contains("js-comment") && current.classList.contains("js-minimize-container") && !current.classList.contains("timeline-comment-group")) {
          outerReviewCard = current;
        }
      }
      current = current.parentElement;
    }
    
    console.log("[ContextScribe] target:", target.tagName, target.className, "id:", target.id);
    console.log("[ContextScribe] timelineItem found:", timelineItem ? `${timelineItem.className} (data-gid: ${timelineItem.getAttribute("data-gid")})` : "null");
    console.log("[ContextScribe] outerReviewCard found:", outerReviewCard ? `${outerReviewCard.className} (id: ${outerReviewCard.id})` : "null");

    let isReviewSession = false;
    if (timelineItem || outerReviewCard) {
      isReviewSession = true;
    }

    // 2. Find the closest comment element first to detect context type (fallback)
    const closestComment = target.closest<HTMLElement>(".timeline-comment, .review-comment, .comment");
    let highlightTarget: HTMLElement | null = null;
    
    if (isReviewSession) {
      highlightTarget = timelineItem || outerReviewCard;
      container = timelineItem || outerReviewCard;
      console.log("[ContextScribe] Resolved review session highlightTarget:", highlightTarget ? highlightTarget.className : "null");
    } else if (closestComment) {
      if (closestComment.classList.contains("timeline-comment")) {
        // For timeline/overview comments, capture the entire review session timeline item
        const tItem = closestComment.closest<HTMLElement>(".js-timeline-item");
        if (tItem) {
          container = tItem;
        } else {
          container = closestComment.closest<HTMLElement>(".timeline-comment-group") || closestComment;
        }
        highlightTarget = container;
      } else {
        // For inline diff comments, capture only the thread on that specific line
        container = closestComment.closest<HTMLElement>(
          ".js-comment-container, .js-line-comments, tr.inline-comments"
        ) || closestComment;
        highlightTarget = container;
      }
    } else {
      // Fallback selector
      container = target.closest<HTMLElement>(
        ".timeline-comment-group, .js-comment-container, .js-line-comments, tr.inline-comments, .timeline-comment, .review-comment, .comment"
      );
      highlightTarget = container;
    }

    if (container) {
      const finalHighlight = highlightTarget || container;
      console.log("[ContextScribe] Directing highlightElement to:", finalHighlight.className, "ID:", finalHighlight.id);
      highlightElement(finalHighlight);
      
      const parsed = parseGitHubPRNode(container, formProtection, seenCommentIds, true, commentDetailsMap);
      if (parsed) {
        if (parsed.type === "root" && parsed.children) {
          threads.push(...parsed.children);
        } else {
          threads.push(parsed);
        }
      }

      // Check for collapsed comments inside embedded JSON data (fallback for any missed ones)
      const scripts = container.querySelectorAll<HTMLElement>('script[data-target="react-partial.embeddedData"]');
      
      // Resolve reviewer name & bot/AI status
      const authorLink = container.querySelector<HTMLElement>(
        "a.author, [data-hovercard-type='user'], [data-hovercard-type='bot'], [data-hovercard-type='organization'], .author, strong > a, [class*='author' i], [class*='AuthorName'], [data-testid='avatar-name']"
      );
      const reviewerName = authorLink ? (authorLink.textContent || "").trim() : "Reviewer";

      scripts.forEach((s) => {
        try {
          const data = JSON.parse(s.textContent || "");
          if (data.props && data.props.threadComments) {
            data.props.threadComments.forEach((tc: any) => {
              const permalink = tc.permalink || "";
              const match = permalink.match(/#(discussion_r\d+)/);
              const commentId = match ? match[1] : "";
              if (!commentId) return;

              if (seenCommentIds.has(commentId)) {
                return; // already processed from DOM or thread script
              }
              seenCommentIds.add(commentId);

              const dbId = commentId.replace("discussion_r", "");
              const details = commentDetailsMap.get(dbId);
              const author = details?.author?.login || reviewerName;
              const isAi = isUserAi(author, null);
              const timestamp = details?.createdAt || "";

              // Try to find the corresponding DOM element for richer context
              const discussionEl = container!.querySelector<HTMLElement>(`#${commentId}`);
              const threadCollapsible = discussionEl?.closest<HTMLElement>("review-thread-collapsible");

              // Extract code context (line reference + diff) from the review-thread-collapsible
              const contextBlocks: IRBlock[] = threadCollapsible
                ? extractThreadCodeContext(threadCollapsible)
                : [];

              // Extract severity from the automated-review-comment inside
              const automatedCommentEl = discussionEl?.querySelector<HTMLElement>(
                "[data-testid='automated-review-comment']"
              );
              const severity = automatedCommentEl ? extractSeverityLabel(automatedCommentEl) : "";

              // Extract file path from the thread collapsible if available
              const domFilePath = threadCollapsible ? findFilePath(threadCollapsible) : "";
              const filePath = domFilePath || tc.filename || "";

              const children: IRBlock[] = [
                ...contextBlocks,
                {
                  type: "paragraph",
                  text: tc.message || ""
                }
              ];

              const suggestion = details?.automatedComment?.suggestion;
              if (suggestion) {
                const diffText = formatSuggestionDiff(suggestion);
                if (diffText) {
                  children.push({
                    type: "code-block",
                    language: "diff",
                    text: diffText
                  });
                }
              }

              const commentBlock: IRBlock = {
                type: "comment",
                text: tc.message || "",
                metadata: {
                  author,
                  timestamp,
                  isAiGenerated: isAi,
                  severity: severity || undefined
                },
                children
              };

              const threadBlock: IRBlock = {
                type: "comment-thread",
                metadata: {
                  isUnresolved: true,
                  filePath
                },
                children: [commentBlock]
              };

              threads.push(threadBlock);
            });
          }
        } catch (e) {
          // ignore parsing error
        }
      });
    }
  } else {
    // 2. Scan all thread containers on the page
    const containers = document.querySelectorAll<HTMLElement>(".js-comment-container, tr.inline-comments");
    containers.forEach((container) => {
      const parsed = parseDiscussionThread(container, formProtection, seenCommentIds, true, commentDetailsMap);
      if (parsed) {
        const isUnresolved = parsed.metadata?.isUnresolved;

        // Apply filters based on the selected GitHub action
        let shouldPush = false;
        if (action === "copy_active" || action === "copy_unresolved") {
          if (isUnresolved) shouldPush = true;
        } else if (action === "copy_resolved") {
          if (!isUnresolved) shouldPush = true;
        } else {
          shouldPush = true;
        }

        if (shouldPush) {
          highlightElement(container);
          threads.push(parsed);
        }
      }
    });
  }

  // Fallback to generic DOM extraction if we couldn't parse any comment threads
  if (threads.length === 0) {
    return extractGenericDOM(container || target, true, formProtection);
  }

  return {
    meta: metadata,
    root: {
      type: "root",
      children: threads
    }
  };
}

/**
 * Recursively parses a DOM subtree on GitHub PR pages, specializing comments and threads.
 */
function parseGitHubPRNode(
  node: Node,
  formProtection = true,
  seenCommentIds?: Set<string>,
  allowCollapsed = true,
  commentDetailsMap?: Map<string, any>
): IRBlock | null {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return parseElement(
      node,
      formProtection,
      (n, fp) => parseGitHubPRNode(n, fp, seenCommentIds, allowCollapsed, commentDetailsMap),
      allowCollapsed
    );
  }

  const el = node as HTMLElement;
  if (!isElementVisible(el, formProtection, allowCollapsed)) return null;

  // Skip forms, reply inputs, update comment forms, reaction groups, and feedback menus
  if (
    (el.tagName === "FORM" && !el.classList.contains("js-resolvable-thread-form")) ||
    el.classList.contains("js-inline-comment-form-container") ||
    el.classList.contains("inline-comment-form") ||
    el.classList.contains("js-comment-update-form") ||
    el.classList.contains("previewable-comment-form") ||
    el.classList.contains("comment-reactions") ||
    el.classList.contains("js-comment-reactions-group")
  ) {
    return null;
  }

  // Check if this element is a comment thread container
  if (
    el.classList.contains("timeline-comment-group") ||
    el.classList.contains("js-comment-container") ||
    el.classList.contains("js-line-comments") ||
    (el.tagName === "TR" && el.classList.contains("inline-comments")) ||
    el.tagName === "REVIEW-THREAD-COLLAPSIBLE"
  ) {
    return parseDiscussionThread(el, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap);
  }

  // Check if this element is an individual comment
  if (
    el.classList.contains("timeline-comment") ||
    el.classList.contains("review-comment") ||
    el.classList.contains("comment") ||
    el.getAttribute("data-testid") === "automated-review-comment"
  ) {
    return parseGitHubComment(el, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap);
  }

  // Fallback to standard parsing, but passing ourselves as the custom parser
  return parseElement(
    node,
    formProtection,
    (n, fp) => parseGitHubPRNode(n, fp, seenCommentIds, allowCollapsed, commentDetailsMap),
    allowCollapsed
  );
}
