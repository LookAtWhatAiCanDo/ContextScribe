const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html, { url: 'https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1' });
const { document } = dom.window;

// Find all comment targets
const comments = document.querySelectorAll(
  '.review-comment, .timeline-comment, [data-testid="automated-review-comment"]'
);

console.log(`Found ${comments.length} comment elements.`);

comments.forEach((c, idx) => {
  const form = c.closest('form');
  if (form) {
    console.log(`Comment [${idx}] (Tag: ${c.tagName}, TestId: ${c.getAttribute('data-testid')}, Class: ${c.className.substring(0, 50)})`);
    console.log(`  - Wrapped in form: tag="${form.tagName}", id="${form.id}", class="${form.className}"`);
  } else {
    // console.log(`Comment [${idx}] has NO wrapping form.`);
  }
});
