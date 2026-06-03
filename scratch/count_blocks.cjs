const fs = require('fs');
const path = require('path');

const doc = JSON.parse(fs.readFileSync(path.join(__dirname, 'document.json'), 'utf8'));

let counts = {};
function countBlockTypes(block) {
  counts[block.type] = (counts[block.type] || 0) + 1;
  if (block.children) {
    block.children.forEach(countBlockTypes);
  }
}

countBlockTypes(doc.root);
console.log('Block counts:', counts);
