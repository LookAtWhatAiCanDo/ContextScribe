import fs from "fs";
import { JSDOM } from "jsdom";

console.log("Loading HTML file...");
const html = fs.readFileSync("/Users/pv/Dev/GitHub/LookAtWhatAiCanDo/ContextScribe/fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html", "utf-8");

console.log("Parsing HTML with JSDOM...");
const dom = new JSDOM(html);
const document = dom.window.document;

const groups = Array.from(document.querySelectorAll(".timeline-comment-group"));
console.log(`Found ${groups.length} elements with class timeline-comment-group.`);

groups.forEach((group, idx) => {
  console.log(`\nGroup ${idx + 1}:`);
  console.log(`- id: "${group.id}"`);
  console.log(`- class: "${group.className}"`);
  
  const header = group.querySelector(".timeline-comment-header");
  console.log(`- has header: ${header !== null}`);
  
  const body = group.querySelector(".comment-body, td.comment-body, .markdown-body");
  if (body) {
    console.log(`- body text (first 150 chars): "${body.textContent.trim().substring(0, 150).replace(/\s+/g, ' ')}"`);
  } else {
    console.log("- no body element");
  }
});
