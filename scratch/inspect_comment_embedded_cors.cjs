const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
if (!fs.existsSync(htmlPath)) {
  console.log("File does not exist:", htmlPath);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
console.log("File size:", html.length);

const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const { document } = dom.window;

const scripts = document.querySelectorAll('script[data-target="react-partial.embeddedData"]');
console.log("Number of react-partial script blocks:", scripts.length);

scripts.forEach((s, idx) => {
  if (s.textContent.includes("Access-Control-Allow-Origin")) {
    console.log(`Script [${idx}] contains 'Access-Control-Allow-Origin'`);
    try {
      const data = JSON.parse(s.textContent.trim());
      console.log("- Keys:", Object.keys(data));
      if (data.props) {
        console.log("- Props keys:", Object.keys(data.props));
        if (data.props.threadComments) {
          console.log("- Found threadComments length:", data.props.threadComments.length);
          const matched = data.props.threadComments.filter(tc => tc.message.includes("Access-Control-Allow-Origin") || (tc.suggestionHtml && tc.suggestionHtml.includes("Access-Control-Allow-Origin")));
          console.log("- Matched threadComments count:", matched.length);
          matched.forEach((m, mIdx) => {
            console.log(`  Match [${mIdx}]:`);
            console.log(`    permalink: ${m.permalink}`);
            console.log(`    filename: ${m.filename}`);
            console.log(`    hasSuggestion: ${m.hasSuggestion}`);
            console.log(`    message:\n${m.message}`);
            console.log(`    suggestionHtml:\n${m.suggestionHtml}`);
          });
        }
        if (data.props.comment) {
          console.log("- Found props.comment!");
          const c = data.props.comment;
          console.log(`  permalink: ${c.permalink || c.id}`);
          console.log(`  body:\n${c.body}`);
          if (c.automatedComment) {
            console.log(`  automatedComment keys:`, Object.keys(c.automatedComment));
            console.log(`  automatedComment.suggestion:\n`, c.automatedComment.suggestion);
            console.log(`  automatedComment.suggestionState:\n`, c.automatedComment.suggestionState);
          }
        }
      }
    } catch (e) {
      console.log("- Parsing error:", e.message);
    }
  }
});
