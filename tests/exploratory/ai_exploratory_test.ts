import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import { serializeToMarkdown } from '../../src/shared/serializer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Configuration for local AI evaluation judge
const BACKEND = 'ollama'; // 'ollama' or 'lm-studio'
const OLLAMA_URL = 'http://localhost:11434/api/chat';
const LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions';
const MODEL = 'llama3'; // Adjust to whatever model is running locally

async function evaluateWithAI(sourceText: string, markdownText: string): Promise<any> {
  const prompt = `
You are an AI quality assurance judge evaluating the output of a webpage-to-markdown content capture tool (ContextScribe).

Your task is to compare the Raw Source text (extracted directly from the page DOM) with the Compiled Markdown output.
Check for the following:
1. **Information Loss**: Was any important data (author names, comments, suggestions, code blocks, file names, timestamps) present in the source but missing or truncated in the markdown? (Note: Ignore interactive form buttons, editor inputs, and UI clutter).
2. **Hallucinations**: Is there any information in the markdown that was NOT present in the source text?
3. **Syntax / Formatting Issues**: Are there any broken markdown tags, unclosed fences, or formatting bugs?

Here is the data:
---
### RAW SOURCE TEXT:
${sourceText}

### COMPILED MARKDOWN:
${markdownText}
---

Respond strictly in JSON format. Do not write any conversational preamble or markdown code blocks (e.g. do not write \`\`\`json). Return exactly this JSON structure:
{
  "retention_score": 100, // Score from 0 to 100 representing how well source details were preserved
  "information_loss": [
    // Array of objects describing missing items:
    { "item": "Describe what is missing", "impact": "high/medium/low" }
  ],
  "hallucinations": [
    // Array of string descriptions of hallucinated content:
    "Describe any hallucinated item"
  ],
  "formatting_issues": [
    // Array of string descriptions of formatting bugs:
    "Describe any formatting issues found"
  ],
  "reasoning": "Brief explanation of your scoring and findings"
}
`;

  console.log(`[AI Test] Sending evaluation payload to local ${BACKEND} backend...`);

  let response: Response;
  if (BACKEND === 'ollama') {
    response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json'
      })
    });
  } else {
    response = await fetch(LM_STUDIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });
  }

  if (!response.ok) {
    throw new Error(`AI Request failed with status ${response.status}: ${await response.text()}`);
  }

  const resData = await response.json();
  const textContent = BACKEND === 'ollama' ? resData.message.content : resData.choices[0].message.content;

  try {
    return JSON.parse(textContent.trim());
  } catch (e) {
    console.error('[AI Test] Failed to parse JSON response from LLM:', textContent);
    throw new Error('LLM output was not valid JSON');
  }
}

async function run() {
  console.log('[AI Test] Loading HTML fixture...');
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
  console.log('[AI Test] Evaluating content script...');
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

  // Retrieve raw source text from DOM (excluding known UI script tags/clutter)
  // We clean the scripts and interactive forms from our source text
  const cleanTarget = target.cloneNode(true) as HTMLElement;
  const clutterElements = cleanTarget.querySelectorAll(
    'script, style, form, .inline-comment-form, .js-inline-comment-form-container, .dropdown-menu, .comment-reactions'
  );
  clutterElements.forEach(el => el.remove());
  const rawSourceText = (cleanTarget.textContent || '').trim().replace(/\s+/g, ' ');

  // Trigger extraction
  await new Promise<void>((resolve, reject) => {
    messageListener(
      { action: 'EXTRACT_NODE', githubAction: 'copy_selected', formProtection: true },
      {},
      async (response: any) => {
        if (!response || !response.success) {
          reject(new Error('Extraction failed'));
          return;
        }

        try {
          const markdown = serializeToMarkdown(response.document.root);
          
          console.log('\n--- EXTRACTED MARKDOWN PREVIEW ---');
          console.log(markdown.substring(0, 300) + '...\n');

          // Run LLM Evaluation
          const report = await evaluateWithAI(rawSourceText, markdown);

          console.log('\n=============================================');
          console.log('🤖 AI EVALUATION REPORT (LLM-AS-A-JUDGE)');
          console.log('=============================================');
          console.log(`🏆 Retention Score: ${report.retention_score}/100`);
          console.log(`📝 Reasoning: ${report.reasoning}`);
          
          if (report.information_loss.length > 0) {
            console.log('\n⚠️  Information Loss Details:');
            console.dir(report.information_loss, { depth: null });
          }
          if (report.hallucinations.length > 0) {
            console.log('\n⚠️  Hallucinations detected:');
            console.dir(report.hallucinations, { depth: null });
          }
          if (report.formatting_issues.length > 0) {
            console.log('\n⚠️  Formatting Issues:');
            console.dir(report.formatting_issues, { depth: null });
          }
          console.log('=============================================\n');

          if (report.retention_score < 90) {
            console.error('❌ Fail: AI retention score is below 90%!');
            process.exit(1);
          } else {
            console.log('✅ Pass: AI evaluation succeeded.');
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
  console.error('[AI Test] Runner error (is Ollama / LM Studio running?):', err);
  process.exit(1);
});
