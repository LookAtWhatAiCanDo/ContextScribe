const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

// Find threadComments
let threadComments = [];
const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
for (let s of scripts) {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.threadComments) {
      threadComments = data.props.threadComments;
      console.log(`Found threadComments array with ${threadComments.length} items.`);
      break;
    }
  } catch (e) {}
}

// Map comment ID / permalink -> suggestion
const commentsMap = new Map();
scripts.forEach((s, idx) => {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.comment) {
      const c = data.props.comment;
      // We can find commentId in props or c.id or parse from permalink
      const commentId = c.id;
      const permalink = c.permalink;
      console.log(`Script [${idx}] has comment. ID: ${commentId}, permalink: ${permalink}`);
      if (c.automatedComment && c.automatedComment.suggestion) {
        commentsMap.set(commentId, c.automatedComment.suggestion);
        console.log(`  -> Has suggestion!`);
      }
    }
  } catch (e) {}
});

// Let's try matching threadComments to commentsMap
threadComments.forEach((tc, idx) => {
  const permalink = tc.permalink;
  const match = permalink.match(/#(discussion_r\d+)/);
  const idFromPermalink = match ? match[1] : null;
  console.log(`\ntc [${idx}]: permalink: ${permalink}, resolved ID: ${idFromPermalink}`);
  
  // Let's see if we have a match in the commentsMap
  // Wait, does commentsMap have keys like PRRC_... or discussion_r... ?
  // Let's find any suggestion in commentsMap that matches
  let foundSuggestion = null;
  for (let [key, sug] of commentsMap.entries()) {
    // If the suggestion has diffEntries, let's see if the path matches or anything
    // Or does the key itself map to tc.permalink/id?
    // Let's print the key of commentsMap
    if (key.includes(idFromPermalink) || idFromPermalink.includes(key)) {
      foundSuggestion = sug;
      console.log(`  Matched by key similarity! key: ${key}`);
    }
  }
  if (!foundSuggestion) {
    console.log(`  No suggestion matched by key.`);
  }
});
