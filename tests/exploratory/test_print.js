import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const targetComment = document.getElementById("discussion_r3328033744");
const threadContainer = targetComment.closest("review-thread-collapsible");

console.log("=== Checking commentElements inside threadContainer ===");
const commentElements = threadContainer.querySelectorAll(
  ".review-comment, .timeline-comment, div[id^='discussion_'] div.comment, [data-testid='automated-review-comment']"
);
console.log("commentElements.length:", commentElements.length);
commentElements.forEach((el, idx) => {
  console.log(`Element ${idx}: tag=${el.tagName} id="${el.id}" class="${el.className}"`);
});

console.log("\n=== Checking fallback .comment inside threadContainer ===");
const fallbackElements = threadContainer.querySelectorAll(".comment");
console.log("fallbackElements.length:", fallbackElements.length);
fallbackElements.forEach((el, idx) => {
  console.log(`Element ${idx}: tag=${el.tagName} id="${el.id}" class="${el.className}"`);
});
