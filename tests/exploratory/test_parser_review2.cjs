const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('Loading HTML file...');
const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('Initializing JSDOM...');
const dom = new JSDOM(html, { url: 'https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1' });
const { window } = dom.window;
const { document } = window;

window.requestAnimationFrame = (fn) => setTimeout(fn, 0);

window.getComputedStyle = function(el) {
  let isHidden = false;
  let current = el;
  while (current) {
    if (current.hasAttribute && (current.hasAttribute('hidden') || (current.tagName === 'DETAILS' && !current.hasAttribute('open')))) {
      isHidden = true;
      break;
    }
    current = current.parentNode;
  }

  return {
    display: isHidden ? 'none' : 'block',
    visibility: 'visible',
    opacity: '1'
  };
};

let messageListener;
window.chrome = {
  runtime: {
    onMessage: {
      addListener: (fn) => {
        messageListener = fn;
      }
    }
  }
};

global.window = window;
global.document = document;
global.navigator = window.navigator;
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
global.chrome = window.chrome;
global.requestAnimationFrame = window.requestAnimationFrame;

console.log('Loading content script bundle...');
const bundlePath = path.join(__dirname, '../../dist/content.js');
const bundle = fs.readFileSync(bundlePath, 'utf8');
eval(bundle);

// Find all timeline items
const timelineItems = document.querySelectorAll('.js-timeline-item[data-gid^="PRR_"]');
console.log(`Found ${timelineItems.length} timeline items.`);

// Let's select the one that corresponds to review #2 (pullrequestreview-4394328318)
let targetItem = null;
for (let item of timelineItems) {
  if (item.querySelector('#pullrequestreview-4394328318') || item.id === 'pullrequestreview-4394328318') {
    targetItem = item;
    break;
  }
}
if (!targetItem) {
  targetItem = timelineItems[1]; // fallback to the second one
}

console.log('Selected timeline item ID:', targetItem.id, 'GID:', targetItem.getAttribute('data-gid'));

const event = new window.MouseEvent('contextmenu', { bubbles: true });
targetItem.dispatchEvent(event);

if (!messageListener) {
  console.error('Message listener was not registered!');
  process.exit(1);
}

messageListener({ action: "EXTRACT_NODE", githubAction: "copy_selected", formProtection: false }, {}, (response) => {
  console.log('Received response:', response.success ? 'SUCCESS' : 'FAILED');
  if (response.success) {
    fs.writeFileSync(path.join(__dirname, 'document_review2.json'), JSON.stringify(response.document, null, 2));
  } else {
    console.error('Error:', response.message);
  }
});
