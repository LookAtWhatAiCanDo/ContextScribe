const fs = require('fs');
const path = require('path');

const doc = JSON.parse(fs.readFileSync(path.join(__dirname, 'document_review2.json'), 'utf8'));

// Copy serializeToMarkdown function from serialize_document.cjs
const serializeScript = fs.readFileSync(path.join(__dirname, 'serialize_document.cjs'), 'utf8');
// Evaluate it or extract the function
// Since it's a simple function, we can just require or construct it:
const serializeToMarkdown = eval(`
(function() {
  ${serializeScript.substring(serializeScript.indexOf('function serializeToMarkdown'), serializeScript.indexOf('const md ='))}
  return serializeToMarkdown;
})()
`);

const md = serializeToMarkdown(doc.root);
fs.writeFileSync(path.join(__dirname, 'output_review2.md'), md);
console.log('Markdown output written to scratch/output_review2.md.');

// Print the output details
console.log('\n--- PREVIEW ---');
console.log(md.substring(0, 1500));
console.log('--- END PREVIEW ---');
