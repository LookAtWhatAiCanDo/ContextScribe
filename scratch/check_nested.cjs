const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html, { url: 'https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1' });
const { document } = dom.window;

const timelineItem = document.querySelector('.js-timeline-item[data-gid^="PRR_"]');
if (!timelineItem) {
  console.log('No timeline item found!');
  process.exit(1);
}

const allCommentsOnPage = document.querySelectorAll(
  '.review-comment, .timeline-comment, [data-testid="automated-review-comment"]'
);
const nestedComments = timelineItem.querySelectorAll(
  '.review-comment, .timeline-comment, [data-testid="automated-review-comment"]'
);

console.log(`Total comment elements on page: ${allCommentsOnPage.length}`);
console.log(`Nested comment elements inside timelineItem: ${nestedComments.length}`);

nestedComments.forEach((c, idx) => {
  console.log(`[${idx}] Tag: ${c.tagName}, TestId: ${c.getAttribute('data-testid')}, Classes: ${c.className}`);
});
