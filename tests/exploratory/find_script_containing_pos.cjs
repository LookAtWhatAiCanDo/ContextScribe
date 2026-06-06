const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const targetPos = 3332967;

// Find script tags and see if targetPos is within their start/end
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const { document } = dom.window;

const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
scripts.forEach((s, idx) => {
  const content = s.textContent;
  const startIdx = html.indexOf(content);
  const endIdx = startIdx + content.length;
  if (targetPos >= startIdx && targetPos <= endIdx) {
    console.log(`Position is inside Script [${idx}]!`);
    try {
      const data = JSON.parse(content.trim());
      console.log("Keys:", Object.keys(data));
      if (data.props) {
        console.log("Props keys:", Object.keys(data.props));
        if (data.props.comment) {
          console.log("props.comment.id:", data.props.comment.id);
          console.log("props.comment.databaseId:", data.props.comment.databaseId);
        }
      }
    } catch (e) {
      console.log("Parsing error:", e.message);
    }
  }
});
