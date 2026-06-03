const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

// 1. Look for text matching "resolved" case-insensitively in buttons, links, details
const buttons = document.querySelectorAll('button');
console.log(`Found ${buttons.length} buttons.`);
let resolvedButtonsCount = 0;
buttons.forEach((btn, idx) => {
  const text = btn.textContent.trim();
  if (text.toLowerCase().includes("resolved") || text.toLowerCase().includes("outdated")) {
    resolvedButtonsCount++;
    console.log(`Button [${idx}]: text="${text}" class="${btn.className}" id="${btn.id}"`);
  }
});
console.log(`Total resolved/outdated buttons found: ${resolvedButtonsCount}`);

// 2. Look for details elements
const details = document.querySelectorAll('details');
console.log(`\nFound ${details.length} details elements.`);
let resolvedDetailsCount = 0;
details.forEach((d, idx) => {
  const summary = d.querySelector('summary');
  const sumText = summary ? summary.textContent.trim() : "";
  if (sumText.toLowerCase().includes("resolved") || d.className.toLowerCase().includes("resolved") || d.className.toLowerCase().includes("discussion")) {
    resolvedDetailsCount++;
    console.log(`Details [${idx}]: summary="${sumText}" class="${d.className}" open=${d.hasAttribute('open')}`);
  }
});
console.log(`Total resolved details found: ${resolvedDetailsCount}`);

// 3. Look for review-thread-collapsible
const collapsibles = document.querySelectorAll('review-thread-collapsible, [class*="collapsible" i]');
console.log(`\nFound ${collapsibles.length} review-thread-collapsible / collapsible elements.`);
collapsibles.forEach((c, idx) => {
  if (idx < 10) {
    console.log(`Collapsible [${idx}]: tag=${c.tagName} class="${c.className}" data-resolved="${c.getAttribute('data-resolved')}"`);
  }
});
