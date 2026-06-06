import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const targetComment = document.getElementById("discussion_r3328033744");
let current = targetComment;
let timelineItem = null;

while (current) {
  if (current.classList.contains("js-timeline-item") && current.getAttribute("data-gid")?.startsWith("PRR_")) {
    timelineItem = current;
  }
  current = current.parentElement;
}

if (!timelineItem) {
  console.error("No timeline item found!");
  process.exit(1);
}

// Find comments inside the timelineItem
console.log("=== Searching for .comment-body inside timelineItem ===");
const commentBodies = timelineItem.querySelectorAll('.comment-body, td.comment-body, .markdown-body, [class*="comment-body"]');
console.log(`Found ${commentBodies.length} comment bodies:`);
commentBodies.forEach((cb, idx) => {
  const commentEl = cb.closest('.comment, .timeline-comment, .review-comment');
  const commentId = commentEl ? commentEl.id : 'none';
  const commentClass = commentEl ? commentEl.className : 'none';
  console.log(`Body ${idx}: ID="${commentId}" Class="${commentClass}"`);
  console.log(`  Preview text: ${cb.textContent.trim().substring(0, 120)}...`);
});

console.log("\n=== Searching for .timeline-comment-group or comment thread elements ===");
const commentGroups = timelineItem.querySelectorAll('.timeline-comment-group, .js-comment-container, .js-line-comments');
commentGroups.forEach((cg, idx) => {
  console.log(`Group ${idx}: tag=${cg.tagName} id="${cg.id}" class="${cg.className}"`);
});

