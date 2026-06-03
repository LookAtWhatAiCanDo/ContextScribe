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

console.log('Timeline item found!');
console.log('Tag:', timelineItem.tagName);
console.log('Classes:', timelineItem.className);
console.log('GID:', timelineItem.getAttribute('data-gid'));

function printTree(node, indent = '') {
  if (node.nodeType !== 1) return; // Only element nodes
  
  let label = `${indent}<${node.tagName.toLowerCase()}`;
  if (node.id) label += ` id="${node.id}"`;
  
  const className = node.className;
  if (className && typeof className === 'string') {
    label += ` class="${className.split(' ').slice(0, 3).join(' ')}"`;
  }
  if (node.getAttribute('data-testid')) label += ` data-testid="${node.getAttribute('data-testid')}"`;
  if (node.getAttribute('data-gid')) label += ` data-gid="${node.getAttribute('data-gid')}"`;
  label += '>';
  
  // If it's one of the comment elements, we don't need to print all its sub-children
  if (node.getAttribute('data-testid') === 'automated-review-comment') {
    console.log(`${label} [AUTOMATED COMMENT BLOCK]`);
    return;
  }
  if (node.classList.contains('timeline-comment') || node.classList.contains('review-comment')) {
    console.log(`${label} [COMMENT BLOCK]`);
    return;
  }
  
  console.log(label);
  for (let child of node.childNodes) {
    printTree(child, indent + '  ');
  }
}

printTree(timelineItem);
