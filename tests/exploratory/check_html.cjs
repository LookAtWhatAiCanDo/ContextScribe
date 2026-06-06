const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const content = fs.readFileSync(filePath, 'utf8');

const regex = /<script[^>]*data-target="react-partial\.embeddedData"[^>]*>([\s\S]*?)<\/script>/g;
let match;
let count = 0;

while ((match = regex.exec(content)) !== null) {
  try {
    const jsonStr = match[1].trim();
    const data = JSON.parse(jsonStr);
    if (data.props && data.props.comment && data.props.comment.automatedComment) {
      count++;
      const ac = data.props.comment.automatedComment;
      console.log(`Automated Comment ${count}:`);
      console.log(`- ID: ${ac.id}`);
      console.log(`- Author: ${data.props.comment.author.login}`);
      console.log(`- Message: ${ac.message.substring(0, 150)}...`);
    } else if (data.props && data.props.threadComments) {
      count++;
      console.log(`Thread Comments block ${count}:`);
      data.props.threadComments.forEach((tc, idx) => {
        console.log(`  [${idx}] ${tc.filename}: ${tc.message.substring(0, 100)}...`);
      });
    }
  } catch (err) {
    // Ignore invalid JSON or non-props scripts
  }
}
console.log(`Total blocks matched: ${count}`);
