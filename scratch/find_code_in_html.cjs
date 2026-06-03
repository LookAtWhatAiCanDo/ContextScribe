const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const query = "allowedOrigins = setOf";
const idx = html.indexOf(query);
if (idx !== -1) {
  console.log(`Found "${query}" at position ${idx}!`);
  console.log("Context:\n", html.substring(idx - 200, idx + 400));
} else {
  console.log(`Could not find "${query}" in the HTML file!`);
}
