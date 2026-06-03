import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import { serializeToMarkdown } from '../../src/shared/serializer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function run() {
  console.log('[Loss Analysis] Loading HTML fixture...');
  const htmlPath = path.join(__dirname, '../../fixtures/inputs/https_github_com_LookAtWhatAiCanDo_ContextScribe_pull_1 review.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Set up JSDOM
  const dom = new JSDOM(htmlContent, {
    url: 'https://github.com/LookAtWhatAiCanDo/ContextScribe/pull/1',
  });
  
  // Mock globals for content script
  global.window = dom.window as any;
  global.document = dom.window.document as any;
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
  global.HTMLElement = dom.window.HTMLElement as any;
  global.Node = dom.window.Node as any;
  global.requestAnimationFrame = (callback: any) => setTimeout(callback, 0);
  global.cancelAnimationFrame = (id: any) => clearTimeout(id);
  dom.window.requestAnimationFrame = global.requestAnimationFrame;
  dom.window.cancelAnimationFrame = global.cancelAnimationFrame;

  let messageListener: any = null;
  const chromeMock = {
    runtime: {
      onMessage: {
        addListener: (fn: any) => {
          messageListener = fn;
        }
      }
    }
  };
  (dom.window as any).chrome = chromeMock as any;
  global.chrome = chromeMock as any;

  // Load compiled content script bundle
  console.log('[Loss Analysis] Evaluating content script...');
  const bundlePath = path.join(__dirname, '../../dist/content.js');
  const bundleContent = fs.readFileSync(bundlePath, 'utf8');
  dom.window.eval(bundleContent);

  const target = dom.window.document.querySelector('.js-timeline-item');
  if (!target) {
    throw new Error('Could not find review container (.js-timeline-item) in HTML fixture');
  }

  // Record right-click context menu target element
  const contextMenuEvent = new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  target.dispatchEvent(contextMenuEvent);

  if (!messageListener) {
    throw new Error('Content script did not register message listener');
  }

  // Helper to determine if an element is UI noise, form clutter, or interactive widgets
  const isClutterNode = (el: HTMLElement) => {
    return (
      el.closest('.inline-comment-form') ||
      el.closest('.js-inline-comment-form-container') ||
      el.closest('.js-comment-update-form') ||
      el.closest('.previewable-comment-form') ||
      el.closest('.comment-reactions') ||
      el.closest('.js-comment-reactions-group') ||
      el.closest('.dropdown-menu') ||
      el.closest('form') ||
      el.closest('.review-thread-reply') ||
      el.closest('[class*="react-select"]') ||
      el.closest('.js-new-comment-form')
    );
  };

  // Trigger extraction
  await new Promise<void>((resolve, reject) => {
    messageListener(
      { action: 'EXTRACT_NODE', githubAction: 'copy_selected', formProtection: true },
      {},
      (response: any) => {
        if (!response || !response.success) {
          reject(new Error('Extraction failed'));
          return;
        }

        try {
          const markdown = serializeToMarkdown(response.document.root);
          
          // --- BEGIN LOSS ANALYSIS ---
          console.log('\n=============================================');
          console.log('📊 RUNNING INFORMATION LOSS ANALYSIS REPORT');
          console.log('=============================================\n');

          // 1. Gather all important links from the source HTML
          // We look for links inside comments and headers, ignoring utility links
          const htmlLinks = Array.from(target.querySelectorAll<HTMLAnchorElement>('.comment-body a'))
            .filter(a => !isClutterNode(a as HTMLElement))
            .map(a => ({
              text: (a.textContent || '').trim(),
              href: a.getAttribute('href') || ''
            }))
            .filter(link => {
              // Ignore empty/placeholder links or reaction buttons
              if (!link.href || link.href.startsWith('javascript:')) return false;
              if (link.href.includes('/reactions') || link.text === '') return false;
              return true;
            });

          console.log(`🔍 Extracted ${htmlLinks.length} primary user links from comment bodies.`);

          // Verify links exist in output markdown
          let linksRetained = 0;
          const missingLinks: typeof htmlLinks = [];

          htmlLinks.forEach(link => {
            // Check if the URL is contained in the markdown
            if (markdown.includes(link.href)) {
              linksRetained++;
            } else {
              missingLinks.push(link);
            }
          });

          const linkScore = htmlLinks.length > 0 ? (linksRetained / htmlLinks.length) * 100 : 100;
          console.log(`🔗 Link Retention Score: ${linkScore.toFixed(1)}% (${linksRetained}/${htmlLinks.length} links preserved)`);
          if (missingLinks.length > 0) {
            console.log('⚠️  Missing Links:');
            missingLinks.forEach(l => console.log(`   - "${l.text}" -> ${l.href}`));
          }

          // 2. Gather author names and bot labels
          const authors = Array.from(target.querySelectorAll('.author, strong > a, [data-testid="avatar-name"]'))
            .filter(el => !isClutterNode(el as HTMLElement))
            .map(el => (el.textContent || '').trim())
            .filter(Boolean);

          console.log(`\n🔍 Extracted ${authors.length} author names from source HTML.`);
          
          let authorsRetained = 0;
          const missingAuthors: string[] = [];
          
          authors.forEach(author => {
            if (markdown.toLowerCase().includes(author.toLowerCase())) {
              authorsRetained++;
            } else {
              missingAuthors.push(author);
            }
          });

          const authorScore = authors.length > 0 ? (authorsRetained / authors.length) * 100 : 100;
          console.log(`👤 Author Retention Score: ${authorScore.toFixed(1)}% (${authorsRetained}/${authors.length} authors preserved)`);
          if (missingAuthors.length > 0) {
            console.log('⚠️  Missing Authors:', missingAuthors);
          }

          // 3. Verify core paragraph text content (Text Coverage)
          // We extract texts inside .comment-body paragraph blocks
          const commentBodies = Array.from(target.querySelectorAll('.comment-body p, .comment-body li'))
            .filter(el => !isClutterNode(el as HTMLElement))
            .map(el => (el.textContent || '').trim().replace(/\s+/g, ' '))
            .filter(text => text.length > 15); // look for substantive sentences

          console.log(`\n🔍 Extracted ${commentBodies.length} comment body sentences/phrases.`);

          let sentencesRetained = 0;
          const missingSentences: string[] = [];

          commentBodies.forEach(sentence => {
            // Remove markdown syntax formatting to check text containment loosely
            const cleanSentence = sentence.replace(/[*_`~[\]()]/g, '').toLowerCase();
            const cleanMarkdown = markdown.replace(/[*_`~[\]()]/g, '').toLowerCase();

            // Check if sentence exists in markdown (allowing slight spacing variations)
            // We search for a 20-character substring of the sentence to allow for slight inline link splitting
            const sampleSize = Math.min(25, cleanSentence.length);
            const sample = cleanSentence.substring(0, sampleSize);

            if (cleanMarkdown.includes(sample)) {
              sentencesRetained++;
            } else {
              missingSentences.push(sentence);
            }
          });

          const sentenceScore = commentBodies.length > 0 ? (sentencesRetained / commentBodies.length) * 100 : 100;
          console.log(`📝 Substantive Text Retention Score: ${sentenceScore.toFixed(1)}% (${sentencesRetained}/${commentBodies.length} paragraphs preserved)`);
          if (missingSentences.length > 0) {
            console.log('⚠️  Missing Content Sentences:');
            missingSentences.forEach(s => console.log(`   - "${s.substring(0, 100)}..."`));
          }

          // 4. Print Overall Status
          const overallScore = (linkScore + authorScore + sentenceScore) / 3;
          console.log('\n=============================================');
          console.log(`🏆 OVERALL INFORMATION RETENTION SCORE: ${overallScore.toFixed(1)}%`);
          console.log('=============================================\n');

          if (overallScore < 95) {
            console.error('❌ Fail: Information loss exceeds 5% threshold!');
            process.exit(1);
          } else {
            console.log('✅ Pass: Information retention is within acceptable thresholds.');
            resolve();
          }
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

run().catch(err => {
  console.error('[Loss Analysis] Test runner error:', err);
  process.exit(1);
});
