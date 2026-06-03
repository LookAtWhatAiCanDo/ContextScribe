const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html);
const { document } = dom.window;

const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
for (let s of scripts) {
  try {
    const data = JSON.parse(s.textContent.trim());
    if (data.props && data.props.comment) {
      console.log("Full props.comment object keys:", Object.keys(data.props.comment));
      console.log("automatedComment:", data.props.comment.automatedComment ? Object.keys(data.props.comment.automatedComment) : "null");
      console.log("Sample comment fields:", {
        id: data.props.comment.id,
        databaseId: data.props.comment.databaseId,
        path: data.props.comment.path,
        position: data.props.comment.position,
        originalPosition: data.props.comment.originalPosition,
        diffHunk: data.props.comment.diffHunk,
        createdAt: data.props.comment.createdAt,
        currentDiffPosition: data.props.comment.currentDiffPosition
      });
      break;
    }
  } catch (e) {}
}
