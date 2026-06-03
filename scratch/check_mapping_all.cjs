const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');

let threadComments = [];
scripts.forEach((s, idx) => {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.threadComments) {
      console.log(`Script [${idx}] has threadComments of length: ${data.props.threadComments.length}`);
      threadComments.push(...data.props.threadComments);
    }
  } catch (e) {}
});

const commentDetails = [];
scripts.forEach((s, idx) => {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.comment) {
      commentDetails.push({
        scriptIndex: idx,
        id: data.props.comment.id,
        databaseId: data.props.comment.databaseId,
        hasSuggestion: !!(data.props.comment.automatedComment && data.props.comment.automatedComment.suggestion)
      });
    }
  } catch (e) {}
});

console.log(`Total unique thread comments collected: ${new Set(threadComments.map(t => t.permalink)).size}`);
console.log(`Total comment details collected: ${commentDetails.length}`);

let matchedCount = 0;
threadComments.forEach((tc, idx) => {
  const match = tc.permalink.match(/#(discussion_r\d+)/);
  const dbId = match ? match[1].replace("discussion_r", "") : null;
  
  // Find matching detail
  const detail = commentDetails.find(cd => String(cd.databaseId) === String(dbId));
  if (detail) {
    matchedCount++;
    console.log(`TC [${idx}]: dbId=${dbId} -> Detail: scriptIndex=${detail.scriptIndex}, hasSuggestion=${detail.hasSuggestion}`);
  } else {
    console.log(`TC [${idx}]: dbId=${dbId} -> Detail: NONE`);
  }
});
console.log(`Matched ${matchedCount} out of ${threadComments.length}`);
