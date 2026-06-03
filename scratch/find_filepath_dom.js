import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('fixtures/inputs/https_github.com_LookAtWhatAiCanDo_Codeoba_pull_1.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

// Find the first review-thread-collapsible element
const collapsible = document.querySelector("review-thread-collapsible");
if (collapsible) {
  console.log("Found review-thread-collapsible! tag:", collapsible.tagName, "class:", collapsible.className);
  
  // Let's print its parent elements up to 4 levels
  let current = collapsible;
  for (let i = 0; i < 4; i++) {
    current = current.parentElement;
    if (!current) break;
    console.log(`Parent ${i+1}: tag=${current.tagName}, id=${current.id || ''}, class=${current.className || ''}`);
  }
  
  // Let's search for the file path link: we know it contains "LocalAuthServer.kt"
  let pathNode = null;
  const allElements = document.getElementsByTagName("*");
  for (const el of allElements) {
    if (el.textContent && el.textContent.includes("LocalAuthServer.kt")) {
      let childHasText = false;
      for (const child of Array.from(el.children)) {
        if (child.textContent && child.textContent.includes("LocalAuthServer.kt")) {
          childHasText = true;
          break;
        }
      }
      if (!childHasText) {
        pathNode = el;
        break;
      }
    }
  }
  
  if (pathNode) {
    console.log("\nFound file path node! Tag:", pathNode.tagName, "class:", pathNode.className, "text:", pathNode.textContent.trim());
    // Let's print its path to the root or check its relationship to the collapsible element
    let isDescendant = collapsible.contains(pathNode);
    let isAncestor = pathNode.contains(collapsible);
    console.log(`Is file path node a descendant of collapsible? ${isDescendant}`);
    console.log(`Is file path node an ancestor of collapsible? ${isAncestor}`);
    
    // Find their lowest common ancestor
    let lca = collapsible;
    while (lca && !lca.contains(pathNode)) {
      lca = lca.parentElement;
    }
    console.log(`Lowest common ancestor: tag=${lca ? lca.tagName : 'null'}, id=${lca ? lca.id : ''}, class=${lca ? lca.className : ''}`);
    
    // If not descendant, let's trace where it is inside the LCA
    if (lca) {
      console.log("LCA contains pathNode and collapsible. Let's see if we can find file paths from collapsible's context.");
    }
  } else {
    console.log("Could not find file path node containing 'LocalAuthServer.kt'");
  }
} else {
  console.log("Could not find any review-thread-collapsible element.");
}
