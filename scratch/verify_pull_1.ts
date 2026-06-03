import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import { serializeToMarkdown } from '../src/shared/serializer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function run() {
  console.log('[Test] Loading HTML fixture...');
  const htmlPath = path.join(__dirname, '../fixtures/inputs/https_github_com_LookAtWhatAiCanDo_ContextScribe_pull_1 review.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Set up JSDOM
  const dom = new JSDOM(htmlContent, {
    url: 'https://github.com/LookAtWhatAiCanDo/ContextScribe/pull/1',
  });
  
  // Set up globals needed by the content script
  global.window = dom.window as any;
  global.document = dom.window.document as any;
  global.navigator = dom.window.navigator as any;
  global.HTMLElement = dom.window.HTMLElement as any;
  global.Node = dom.window.Node as any;

  // Mock chrome APIs
  let messageListener: any = null;
  global.chrome = {
    runtime: {
      onMessage: {
        addListener: (fn: any) => {
          messageListener = fn;
        }
      }
    }
  } as any;

  // Import the content script to register the onMessage listener
  console.log('[Test] Importing content script...');
  await import('../src/content/index');

  // Find the target timeline item review container
  const target = dom.window.document.querySelector('.js-timeline-item');
  if (!target) {
    throw new Error('Could not find review container (.js-timeline-item) in HTML fixture');
  }

  console.log('[Test] Dispatching contextmenu event on target...');
  // Simulate right click to cache the target element
  const contextMenuEvent = new dom.window.MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true
  });
  target.dispatchEvent(contextMenuEvent);

  if (!messageListener) {
    throw new Error('Content script did not register an onMessage listener');
  }

  console.log('[Test] Triggering extraction message...');
  // Call the registered message listener
  await new Promise<void>((resolve, reject) => {
    messageListener(
      { action: 'EXTRACT_NODE', githubAction: 'copy_selected', formProtection: true },
      {},
      (response: any) => {
        if (!response) {
          reject(new Error('No response returned from listener'));
          return;
        }
        if (!response.success) {
          reject(new Error(`Extraction failed: ${response.message}`));
          return;
        }

        console.log('[Test] Extraction succeeded! Serializing IR to markdown...');
        try {
          const markdown = serializeToMarkdown(response.document.root);
          const outputPath = path.join(__dirname, 'verify_output.md');
          fs.writeFileSync(outputPath, markdown, 'utf8');
          console.log(`[Test] Success! Markdown written to ${outputPath}`);
          
          // Print first 1000 characters of the output
          console.log('\n--- Markdown Preview (First 1000 chars) ---');
          console.log(markdown.substring(0, 1000));
          console.log('-------------------------------------------\n');
          
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

run().catch(err => {
  console.error('[Test] Verification failed:', err);
  process.exit(1);
});
