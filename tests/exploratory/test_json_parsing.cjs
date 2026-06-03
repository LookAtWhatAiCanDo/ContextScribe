const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html, { url: 'https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1' });
const { document } = dom.window;

const timelineItem = document.querySelector('.js-timeline-item[data-gid^="PRR_"]');
if (!timelineItem) {
  console.log('No timeline item found!');
  process.exit(1);
}

// 1. Extract reviewer name
const authorLink = timelineItem.querySelector(
  "a.author, [data-hovercard-type='user'], [data-hovercard-type='bot'], [data-hovercard-type='organization'], .author, strong > a, [class*='author' i], [class*='AuthorName'], [data-testid='avatar-name']"
);
const reviewerName = authorLink ? (authorLink.textContent || "").trim() : "Reviewer";
console.log('Reviewer Name:', reviewerName);

// 2. Extract scripts and print threadComments
const seenCommentIds = new Set();
const commentsFromJSON = [];

const scripts = timelineItem.querySelectorAll('script[data-target="react-partial.embeddedData"]');
scripts.forEach((s) => {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.threadComments) {
      data.props.threadComments.forEach((tc) => {
        const commentId = tc.permalink.split('#')[1] || '';
        if (!seenCommentIds.has(commentId)) {
          commentsFromJSON.push({
            id: commentId,
            filename: tc.filename,
            message: tc.message
          });
        }
      });
    }
  } catch (e) {}
});

console.log(`Extracted ${commentsFromJSON.length} comments from JSON:`);
commentsFromJSON.forEach((c, idx) => {
  console.log(`[${idx}] File: ${c.filename}\n    Msg: ${c.message.substring(0, 100)}...`);
});
