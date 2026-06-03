import fs from 'fs';
import { JSDOM } from 'jsdom';

// Load example HTML file
const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const targetComment = document.getElementById("discussion_r3328033744");

// Let's copy the code from github.ts but with logs on seenCommentIds!
const seenCommentIds = new Set();

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

function parseGitHubComment(commentEl) {
  const commentId = getCommentId(commentEl);
  console.log(`  [parseGitHubComment] ID: ${commentId}`);
  if (commentId) {
    if (seenCommentIds.has(commentId)) {
      console.log(`  [parseGitHubComment] DUPLICATE CHECK TRIGGERED: ${commentId} is already in seenCommentIds! Returning null.`);
      return null;
    }
    seenCommentIds.add(commentId);
    console.log(`  [parseGitHubComment] Added ${commentId} to seenCommentIds`);
  }
  return { type: "comment", text: commentEl.textContent.trim().substring(0, 30) };
}

function parseDiscussionThread(threadContainer) {
  console.log(`[parseDiscussionThread] Entered for container tag: ${threadContainer.tagName}, id: ${threadContainer.id}, class: ${threadContainer.className}`);
  const comments = [];
  const scriptEl = threadContainer.querySelector('script[data-target="react-partial.embeddedData"]');
  let parsedFromScript = false;

  if (scriptEl) {
    try {
      const data = JSON.parse(scriptEl.textContent || "");
      const isOverview = data.props?.isOverviewComment === true || 
                         threadContainer.id?.startsWith("pullrequestreview-");
      console.log(`  [parseDiscussionThread] isOverview: ${isOverview}`);
      if (data.props && data.props.threadComments && !isOverview) {
        parsedFromScript = true;
        console.log(`  [parseDiscussionThread] Parsing from script comments: count=${data.props.threadComments.length}`);
        data.props.threadComments.forEach((tc) => {
          const permalink = tc.permalink || "";
          const match = permalink.match(/#(discussion_r\d+)/);
          const commentId = match ? match[1] : "";
          if (!commentId) return;

          console.log(`    [parseDiscussionThread] Script comment ID: ${commentId}`);
          if (seenCommentIds.has(commentId)) {
            console.log(`    [parseDiscussionThread] DUPLICATE: ${commentId} already in seenCommentIds. Skipping.`);
            return;
          }
          seenCommentIds.add(commentId);
          console.log(`    [parseDiscussionThread] Added ${commentId} to seenCommentIds via script check`);

          const commentEl = threadContainer.querySelector(`#${commentId}`);
          if (commentEl) {
            const block = parseGitHubComment(commentEl);
            if (block) comments.push(block);
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!parsedFromScript) {
    console.log(`  [parseDiscussionThread] Falling back to DOM parsing`);
    let targets = [];
    if (
      threadContainer.classList.contains("timeline-comment") ||
      threadContainer.classList.contains("review-comment") ||
      threadContainer.classList.contains("comment")
    ) {
      targets.push(threadContainer);
    } else {
      targets = Array.from(threadContainer.querySelectorAll(".comment, .timeline-comment, .review-comment"));
    }

    console.log(`  [parseDiscussionThread] Targets found: ${targets.length}`);
    targets.forEach((commentEl) => {
      const block = parseGitHubComment(commentEl);
      if (block) comments.push(block);
    });
  }

  console.log(`[parseDiscussionThread] Finished. Comments parsed: ${comments.length}`);
  if (comments.length === 0) return null;
  return { type: "comment-thread", children: comments };
}

function parseGitHubPRNode(node) {
  if (node.nodeType !== 1) return null;
  const el = node;

  if (
    el.classList.contains("timeline-comment-group") ||
    el.classList.contains("js-comment-container") ||
    el.classList.contains("js-line-comments") ||
    el.tagName === "REVIEW-THREAD-COLLAPSIBLE"
  ) {
    return parseDiscussionThread(el);
  }

  if (
    el.classList.contains("timeline-comment") ||
    el.classList.contains("review-comment") ||
    el.classList.contains("comment")
  ) {
    return parseGitHubComment(el);
  }

  // Recurse
  const children = [];
  Array.from(el.childNodes).forEach(child => {
    const block = parseGitHubPRNode(child);
    if (block) children.push(block);
  });
  if (children.length === 0) return null;
  return { type: "root", children };
}

// Find timelineItem
let current = targetComment;
let timelineItem = null;
while (current) {
  if (current.classList.contains("js-timeline-item") && current.getAttribute("data-gid")?.startsWith("PRR_")) {
    timelineItem = current;
    break;
  }
  current = current.parentElement;
}

console.log("Starting parseGitHubPRNode on timelineItem...");
const parsed = parseGitHubPRNode(timelineItem);
console.log("Parsing finished.");
