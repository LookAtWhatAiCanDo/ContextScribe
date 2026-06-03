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

const scripts = timelineItem.querySelectorAll('script[data-target="react-partial.embeddedData"]');
console.log(`Found ${scripts.length} embedded scripts inside timelineItem.`);

scripts.forEach((s, idx) => {
  try {
    const data = JSON.parse(s.textContent.trim());
    console.log(`\nScript [${idx}]:`);
    console.log(`- Keys:`, Object.keys(data));
    if (data.props) {
      console.log(`- Props keys:`, Object.keys(data.props));
      if (data.props.commentPermalink) console.log(`  - commentPermalink:`, data.props.commentPermalink);
      if (data.props.commentCount) console.log(`  - commentCount:`, data.props.commentCount);
      if (data.props.threadComments) {
        console.log(`  - threadComments length:`, data.props.threadComments.length);
        console.log(`  - First threadComment sample:`, JSON.stringify(data.props.threadComments[0], null, 2).substring(0, 300));
      }
      if (data.props.comment) {
        console.log(`  - comment author:`, data.props.comment.author?.login);
        if (data.props.comment.automatedComment) {
          console.log(`  - comment automatedComment keys:`, Object.keys(data.props.comment.automatedComment));
          console.log(`  - comment body:`, data.props.comment.body);
        }
      }
    }
  } catch (err) {
    console.log(`Script [${idx}] failed to parse:`, err.message);
  }
});
