import fs from 'fs';
import { JSDOM } from 'jsdom';

// Load example HTML file
console.log("Loading HTML file...");
const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');

console.log("Creating JSDOM...");
const dom = new JSDOM(html);
const document = dom.window.document;

// 1. Let's find discussion_r3328033744
const targetComment = document.getElementById("discussion_r3328033744");
if (!targetComment) {
  console.error("Could not find target comment discussion_r3328033744");
  process.exit(1);
}
console.log("Found discussion_r3328033744!");

// 2. Run the while(current) loop to find timelineItem / outerReviewCard
let current = targetComment;
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

console.log("Results from walking up from discussion_r3328033744:");
console.log("timelineItem found:", timelineItem ? `${timelineItem.className} (data-gid: ${timelineItem.getAttribute("data-gid")})` : "null");
console.log("outerReviewCard found:", outerReviewCard ? `${outerReviewCard.className} (id: ${outerReviewCard.id})` : "null");

// Let's print the child elements of timelineItem to see their structure
if (timelineItem) {
  console.log("\nChildren of timelineItem:");
  const children = Array.from(timelineItem.children);
  children.forEach((child, index) => {
    console.log(`Child ${index}: tag=${child.tagName}, id=${child.id}, class=${child.className}`);
    // Print its children recursively up to 2 levels
    Array.from(child.children).forEach((c2, idx2) => {
      console.log(`  Child ${index}.${idx2}: tag=${c2.tagName}, id=${c2.id}, class=${c2.className}`);
      Array.from(c2.children).forEach((c3, idx3) => {
        console.log(`    Child ${index}.${idx2}.${idx3}: tag=${c3.tagName}, id=${c3.id}, class=${c3.className}`);
      });
    });
  });
}
