import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

// Copy functions from github.ts but with console.logs!
function getCommentId(commentEl) {
  if (
    commentEl.id &&
    (commentEl.id.startsWith("discussion_r") ||
     commentEl.id.startsWith("pullrequestreview-") ||
     commentEl.id.startsWith("issuecomment-"))
  ) {
    return commentEl.id;
  }
  return null;
}

function parseGitHubComment(commentEl, seenCommentIds) {
  const commentId = getCommentId(commentEl);
  console.log(`[parseGitHubComment] commentEl ID: "${commentEl.id}", commentId: "${commentId}"`);
  if (commentId && seenCommentIds) {
    console.log(`[parseGitHubComment] seenCommentIds has ${commentId}? ${seenCommentIds.has(commentId)}`);
    if (seenCommentIds.has(commentId)) {
      console.log(`[parseGitHubComment] Duplicate comment ID ${commentId}! Returning null.`);
      return null;
    }
    seenCommentIds.add(commentId);
  }
  return { type: "comment", text: commentEl.textContent.trim().substring(0, 50) };
}

function parseDiscussionThread(threadContainer, seenCommentIds) {
  console.log(`\n[parseDiscussionThread] threadContainer tag: ${threadContainer.tagName}, class: ${threadContainer.className}`);
  const scriptEl = threadContainer.querySelector('script[data-target="react-partial.embeddedData"]');
  
  if (scriptEl) {
    const data = JSON.parse(scriptEl.textContent || "");
    const isOverview = data.props?.isOverviewComment === true || 
                       threadContainer.id?.startsWith("pullrequestreview-");
    console.log(`[parseDiscussionThread] has script, isOverview = ${isOverview}, threadComments length = ${data.props?.threadComments?.length}`);
    
    if (data.props && data.props.threadComments && !isOverview) {
      console.log("[parseDiscussionThread] Processing script threadComments");
      data.props.threadComments.forEach((tc) => {
        const permalink = tc.permalink || "";
        const match = permalink.match(/#(discussion_r\d+)/);
        const commentId = match ? match[1] : "";
        if (!commentId) return;

        console.log(`[parseDiscussionThread] tc commentId: "${commentId}"`);
        if (seenCommentIds && seenCommentIds.has(commentId)) {
          console.log(`[parseDiscussionThread] commentId ${commentId} already in seenCommentIds! Skipping tc.`);
          return;
        }
        if (seenCommentIds) {
          seenCommentIds.add(commentId);
          console.log(`[parseDiscussionThread] Added ${commentId} to seenCommentIds`);
        }

        const commentEl = threadContainer.querySelector(`#${commentId}`);
        console.log(`[parseDiscussionThread] found commentEl inside threadContainer? ${!!commentEl}`);
        if (commentEl) {
          const block = parseGitHubComment(commentEl, seenCommentIds);
          console.log(`[parseDiscussionThread] parseGitHubComment result:`, block);
        }
      });
    }
  }
}

// Find review-thread-collapsible container for discussion_r3328033744
const target = document.getElementById("discussion_r3328033744");
const container = target.closest("review-thread-collapsible");
const seenCommentIds = new Set();
parseDiscussionThread(container, seenCommentIds);
