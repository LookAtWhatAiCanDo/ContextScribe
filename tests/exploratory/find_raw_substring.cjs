const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log("File exists and size is:", html.length);

const queries = ["suggested changeset", "changeset", "suggested changes", "diffentries"];
queries.forEach(q => {
  const count = (html.match(new RegExp(q, 'gi')) || []).length;
  console.log(`Query "${q}" matches: ${count}`);
});

// Let's find index of "diffEntries"
const idx = html.indexOf("diffEntries");
if (idx !== -1) {
  console.log("Substring around 'diffEntries':");
  console.log(html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 400)));
}
