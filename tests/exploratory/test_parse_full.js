import fs from 'fs';
import { JSDOM } from 'jsdom';

// Copy functions from github.ts
function isUserAi(authorName, avatarEl) {
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

function getCommentId(commentEl) {
  if (
    commentEl.id &&
    (commentEl.id.startsWith("discussion_r") ||
     commentEl.id.startsWith("pullrequestreview-") ||
     commentEl.id.startsWith("issuecomment-"))
  ) {
    return commentEl.id;
  }
  const link = commentEl.querySelector("a[href*='#discussion_r']");
  if (link) {
    const href = link.getAttribute("href") || "";
    const match = href.match(/#(discussion_r\d+)/);
    if (match) return match[1];
  }
  return null;
}

function formatSuggestionDiff(suggestion) {
  if (!suggestion || !suggestion.diffEntries) return "";
  let diffText = "";
  suggestion.diffEntries.forEach((de) => {
    diffText += `# File: ${de.path}\n`;
    if (de.diffLines) {
      de.diffLines.forEach((line) => {
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

function parseDOMDiffTable(tableEl) {
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

function extractGenericDOM(target, shouldHighlight = true, formProtection = true, allowCollapsed = false) {
  const parsed = parseElement(target, formProtection, undefined, allowCollapsed);
  const rootBlock = parsed || { type: "root", children: [] };
  return {
    meta: {},
    root: rootBlock.type === "root" ? rootBlock : { type: "root", children: [rootBlock] }
  };
}

function isElementVisible(el, formProtection = true, allowCollapsed = false) {
  if (!el) return false;
  const tagName = el.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    const input = el;
    if (input.type === "password" || input.type === "hidden") {
      return false;
    }
  }
  if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "NOSCRIPT" || tagName === "IFRAME") {
    return false;
  }
  return true;
}

function detectLanguage(el) {
  return "";
}

function parseElement(node, formProtection = true, customParser, allowCollapsed = false) {
  const parse = (n) => customParser ? customParser(n, formProtection) : parseElement(n, formProtection, undefined, allowCollapsed);

  if (node.nodeType === 3) { // TEXT_NODE
    const content = node.textContent.trim().replace(/\s+/g, " ");
    if (!content) return null;
    return {
      type: "paragraph",
      text: content
    };
  }

  if (node.nodeType !== 1) {
    return null;
  }

  const el = node;
  if (!isElementVisible(el, formProtection, allowCollapsed)) return null;

  const tag = el.tagName.toUpperCase();

  if (tag === "PRE" || tag === "CODE") {
    const codeTag = el.querySelector("code");
    const targetEl = codeTag || el;
    return {
      type: "code-block",
      language: detectLanguage(targetEl),
      text: targetEl.textContent || ""
    };
  }

  if (tag === "P") {
    return {
      type: "paragraph",
      text: el.textContent.trim().replace(/\s+/g, " ")
    };
  }

  const childrenBlocks = [];
  Array.from(el.childNodes).forEach(child => {
    const block = parse(child);
    if (block) {
      if (block.type === "paragraph" && block.text === "") return;
      childrenBlocks.push(block);
    }
  });

  if (childrenBlocks.length === 0) {
    return null;
  }

  return {
    type: "root",
    children: childrenBlocks
  };
}

function parseGitHubComment(commentEl, formProtection = true, seenCommentIds, allowCollapsed = true, commentDetailsMap) {
  const commentId = getCommentId(commentEl);
  if (commentId && seenCommentIds) {
    if (seenCommentIds.has(commentId)) {
      return null;
    }
    seenCommentIds.add(commentId);
  }

  const authorLink = commentEl.querySelector(
    "a.author, [data-hovercard-type='user'], [data-hovercard-type='bot'], [data-hovercard-type='organization'], .author, strong > a, [class*='author' i], [class*='AuthorName'], [data-testid='avatar-name']"
  );
  const authorName = authorLink ? (authorLink.textContent || "").trim() : "Unknown";
  
  const avatarEl = commentEl.querySelector("img.avatar, .avatar-user, [class*='activityAvatar']");
  const isAi = isUserAi(authorName, avatarEl);
  
  const timeEl = commentEl.querySelector("relative-time, [datetime]");
  const timestamp = timeEl ? (timeEl.getAttribute("datetime") || timeEl.textContent || "").trim() : "";
 
  const bodyEl = commentEl.querySelector(".comment-body, td.comment-body, .markdown-body, [class*='comment-body']");
  if (!bodyEl) return null;
 
  const bodyDoc = extractGenericDOM(bodyEl, false, formProtection, allowCollapsed);
  const bodyText = (bodyEl.textContent || "").trim();

  if (!bodyDoc.root.children) {
    bodyDoc.root.children = [];
  }

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
      const diffTable = commentEl.querySelector(".diff-table, table.UnifiedDiffLines-module__unifiedDiffLines__U966b");
      if (diffTable) {
        const diffText = parseDOMDiffTable(diffTable);
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

function findFilePath(threadContainer) {
  let fileHeader = threadContainer.closest(".file-header, .file");
  if (!fileHeader) {
    fileHeader = threadContainer.querySelector(".file-header, .file, .file-info, [class*='file-header']");
  }
  if (fileHeader) {
    const pathEl = fileHeader.querySelector(".file-info a, [data-path], a.Link--primary, a");
    if (pathEl) {
      const path = (pathEl.getAttribute("data-path") || pathEl.textContent || "").trim();
      if (path && !path.includes(" ") && path.includes("/")) {
        return path;
      }
    }
  }
  const pathLinks = threadContainer.querySelectorAll("a[href*='/files'], [data-path], a.Link--primary, a");
  for (const link of Array.from(pathLinks)) {
    const path = (link.getAttribute("data-path") || link.textContent || "").trim();
    if (path && !path.includes(" ") && path.includes("/")) {
      return path;
    }
  }
  return "";
}

function parseDiscussionThread(threadContainer, formProtection = true, seenCommentIds, allowCollapsed = true, commentDetailsMap) {
  const filePath = findFilePath(threadContainer);
  const comments = [];
  const authorLink = threadContainer.querySelector(
    "a.author, [data-hovercard-type='user'], [data-hovercard-type='bot'], [data-hovercard-type='organization'], .author, strong > a, [class*='author' i], [class*='AuthorName'], [data-testid='avatar-name']"
  );
  const reviewerName = authorLink ? (authorLink.textContent || "").trim() : "Reviewer";

  const scriptEl = threadContainer.querySelector('script[data-target="react-partial.embeddedData"]');
  let parsedFromScript = false;

  if (scriptEl) {
    try {
      const data = JSON.parse(scriptEl.textContent || "");
      const isOverview = data.props?.isOverviewComment === true || 
                         threadContainer.id?.startsWith("pullrequestreview-");
      if (data.props && data.props.threadComments && !isOverview) {
        parsedFromScript = true;
        // Script parsing ...
      }
    } catch (e) {
      console.error("Script parse error", e);
    }
  }

  if (!parsedFromScript) {
    let targets = [];
    if (
      threadContainer.classList.contains("timeline-comment") ||
      threadContainer.classList.contains("review-comment") ||
      threadContainer.classList.contains("comment") ||
      threadContainer.getAttribute("data-testid") === "automated-review-comment"
    ) {
      targets.push(threadContainer);
    } else {
      const commentElements = threadContainer.querySelectorAll(
        ".review-comment, .timeline-comment, div[id^='discussion_'] div.comment, [data-testid='automated-review-comment']"
      );
      targets = commentElements.length > 0 ? Array.from(commentElements) : Array.from(threadContainer.querySelectorAll(".comment"));
    }

    targets.forEach((commentEl) => {
      const block = parseGitHubComment(commentEl, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap);
      if (block) comments.push(block);
    });
  }

  if (comments.length === 0) return null;
  return {
    type: "comment-thread",
    metadata: {
      isUnresolved: true,
      filePath
    },
    children: comments
  };
}

function parseGitHubPRNode(node, formProtection = true, seenCommentIds, allowCollapsed = true, commentDetailsMap) {
  if (node.nodeType !== 1) {
    return parseElement(node, formProtection, (n) => parseGitHubPRNode(n, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap), allowCollapsed);
  }

  const el = node;
  if (!isElementVisible(el, formProtection, allowCollapsed)) return null;

  if (
    el.classList.contains("timeline-comment-group") ||
    el.classList.contains("js-comment-container") ||
    el.classList.contains("js-line-comments") ||
    (el.tagName === "TR" && el.classList.contains("inline-comments")) ||
    el.tagName === "REVIEW-THREAD-COLLAPSIBLE"
  ) {
    return parseDiscussionThread(el, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap);
  }

  if (
    el.classList.contains("timeline-comment") ||
    el.classList.contains("review-comment") ||
    el.classList.contains("comment") ||
    el.getAttribute("data-testid") === "automated-review-comment"
  ) {
    return parseGitHubComment(el, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap);
  }

  return parseElement(node, formProtection, (n) => parseGitHubPRNode(n, formProtection, seenCommentIds, allowCollapsed, commentDetailsMap), allowCollapsed);
}

function extractGitHubPR(target, action, formProtection = true) {
  const threads = [];
  let container = null;
  const seenCommentIds = new Set();
  const commentDetailsMap = new Map();

  let current = target;
  let timelineItem = null;
  let outerReviewCard = null;
  
  while (current) {
    if (current.classList.contains("js-timeline-item") && current.getAttribute("data-gid")?.startsWith("PRR_")) {
      timelineItem = current;
    }
    if (current.id && current.id.startsWith("pullrequestreview-")) {
      if (current.classList.contains("js-comment") && current.classList.contains("js-minimize-container") && !current.classList.contains("timeline-comment-group")) {
        outerReviewCard = current;
      }
    }
    current = current.parentElement;
  }
  
  container = timelineItem || outerReviewCard;
  if (container) {
    const parsed = parseGitHubPRNode(container, formProtection, seenCommentIds, true, commentDetailsMap);
    if (parsed) {
      if (parsed.type === "root" && parsed.children) {
        threads.push(...parsed.children);
      } else {
        threads.push(parsed);
      }
    }
  }

  return {
    root: {
      type: "root",
      children: threads
    }
  };
}

// Load html & run on timelineItem
const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const targetComment = document.getElementById("discussion_r3328033744");
console.log("Extracted IR structure:");
const docIR = extractGitHubPR(targetComment, "copy_selected", true);
console.log(JSON.stringify(docIR, null, 2));
