const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// 1. Load the HTML file
console.log('Loading HTML file...');
const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 2. Initialize JSDOM
console.log('Initializing JSDOM...');
const dom = new JSDOM(html, { url: 'https://github.com/LookAtWhatAiCanDo/Codeoba/pull/1' });
const { window } = dom;
const { document } = window;

// Mock requestAnimationFrame
window.requestAnimationFrame = (fn) => setTimeout(fn, 0);

// 3. Mock getComputedStyle to simulate collapsed/hidden elements
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

// 4. Mock chrome extension API
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

// Bind globals for eval
global.window = window;
global.document = document;
global.navigator = window.navigator;
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
global.chrome = window.chrome;
global.requestAnimationFrame = window.requestAnimationFrame;

// 5. Load the compiled content script bundle
console.log('Loading content script bundle...');
const bundlePath = path.join(__dirname, '../dist/content.js');
const bundle = fs.readFileSync(bundlePath, 'utf8');

// Eval the bundle in current context
eval(bundle);

// 6. Find a review timeline item to extract
const timelineItem = document.querySelector('.js-timeline-item[data-gid^="PRR_"]');
if (!timelineItem) {
  console.error('Could not find timeline item!');
  process.exit(1);
}
console.log('Found timeline item:', timelineItem.tagName, 'Classes:', timelineItem.className, 'GID:', timelineItem.getAttribute('data-gid'));

// Dispatch contextmenu event on the timeline item to set it as last clicked element
console.log('Dispatching contextmenu event on timelineItem...');
const event = new window.MouseEvent('contextmenu', { bubbles: true });
timelineItem.dispatchEvent(event);

// 7. Invoke the message listener to extract the node
console.log('Invoking EXTRACT_NODE message listener...');
if (!messageListener) {
  console.error('Message listener was not registered!');
  process.exit(1);
}

messageListener({ action: "EXTRACT_NODE", githubAction: "copy_selected", formProtection: false }, {}, (response) => {
  console.log('Received response:', response.success ? 'SUCCESS' : 'FAILED');
  if (response.success) {
    // We can also extract serializeToMarkdown from the window or from the package if we compile it.
    // Wait, the content script writes the serialized markdown to clipboard using `WRITE_CLIPBOARD` runtime message!
    // But since we are evaluating it in Node, how does `WRITE_CLIPBOARD` get triggered?
    // In background script or content script:
    // In background script, it receives the document, serializes it, and sends WRITE_CLIPBOARD back.
    // Wait! Let's check how the background script handles message passing!
    // Let's print the actual serialized markdown. We can do this by loading serializeToMarkdown from the compiled `dist/chunks/adapters.js` or `dist/background.js`!
    // Or we can just print the JSON IR structure and write it to scratch/document.json.
    console.log('Writing Document IR to scratch/document.json...');
    fs.writeFileSync(path.join(__dirname, 'document.json'), JSON.stringify(response.document, null, 2));
  } else {
    console.error('Error message:', response.message);
  }
});
