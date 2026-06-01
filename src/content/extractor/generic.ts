import { DocumentIR, IRBlock, CaptureMetadata } from "../../shared/types";

/**
 * Checks if a DOM element is visible to the user.
 */
function isElementVisible(el: HTMLElement): boolean {
  if (!el) return false;
  
  // Guard against hidden inputs, password fields
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (input.type === "password" || input.type === "hidden") {
      return false;
    }
  }

  // Basic styling visibility checks
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  // Ignore structural elements that are usually invisible noise
  const tagName = el.tagName;
  if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "NOSCRIPT" || tagName === "IFRAME") {
    return false;
  }

  return true;
}

/**
 * Tries to detect language of a pre/code container based on class names.
 */
function detectLanguage(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  for (const cls of classes) {
    if (cls.startsWith("language-")) {
      return cls.replace("language-", "");
    }
    if (cls.startsWith("lang-")) {
      return cls.replace("lang-", "");
    }
  }
  
  // Check parent class as well (common in markdown rendering engines)
  if (el.parentElement) {
    const parentClasses = Array.from(el.parentElement.classList);
    for (const cls of parentClasses) {
      if (cls.startsWith("language-")) {
        return cls.replace("language-", "");
      }
    }
  }
  return "";
}

/**
 * Extracts and maps a table element to the IR format.
 */
function parseTable(tableEl: HTMLTableElement): IRBlock {
  const rows: IRBlock[] = [];
  
  const trs = Array.from(tableEl.querySelectorAll("tr"));
  trs.forEach(tr => {
    const cells: IRBlock[] = [];
    const tdThs = Array.from(tr.querySelectorAll("th, td"));
    
    tdThs.forEach(cell => {
      cells.push({
        type: cell.tagName === "TH" ? "table-header-cell" : "table-cell",
        text: (cell.textContent || "").trim()
      });
    });
    
    if (cells.length > 0) {
      rows.push({
        type: "table-row",
        children: cells
      });
    }
  });

  return {
    type: "table",
    children: rows
  };
}

/**
 * Recursively parses a DOM subtree into IR blocks.
 */
function parseElement(node: Node): IRBlock | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const content = (node.textContent || "").trim();
    if (!content) return null;
    return {
      type: "paragraph",
      text: content
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  if (!isElementVisible(el)) return null;

  const tag = el.tagName.toUpperCase();

  // 1. Headings
  if (/^H[1-6]$/.test(tag)) {
    const level = parseInt(tag.charAt(1), 10);
    return {
      type: "heading",
      level,
      text: (el.textContent || "").trim()
    };
  }

  // 2. Blockquotes
  if (tag === "BLOCKQUOTE" || tag === "Q") {
    const blockQuoteText = (el.textContent || "").trim();
    return {
      type: "blockquote",
      text: blockQuoteText
    };
  }

  // 3. Pre/Code blocks
  if (tag === "PRE" || tag === "CODE") {
    // If it's a code block inside pre, parse nested
    const codeTag = el.querySelector("code");
    const targetEl = codeTag || el;
    return {
      type: "code-block",
      language: detectLanguage(targetEl as HTMLElement),
      text: targetEl.textContent || ""
    };
  }

  // 4. Tables
  if (tag === "TABLE") {
    return parseTable(el as HTMLTableElement);
  }

  // 5. Lists & Items
  if (tag === "UL" || tag === "OL") {
    const items: IRBlock[] = [];
    const lis = Array.from(el.children).filter(child => child.tagName === "LI");
    lis.forEach(li => {
      const parsedLi = parseElement(li);
      if (parsedLi) items.push(parsedLi);
    });

    return {
      type: "list",
      children: items
    };
  }

  if (tag === "LI") {
    // Collect direct text and child nodes
    const directText: string[] = [];
    const childBlocks: IRBlock[] = [];

    Array.from(el.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        directText.push(child.textContent || "");
      } else {
        const block = parseElement(child);
        if (block) childBlocks.push(block);
      }
    });

    return {
      type: "list-item",
      text: directText.join("").trim(),
      children: childBlocks
    };
  }

  // 6. Generic Paragraph/Containers
  if (tag === "P") {
    return {
      type: "paragraph",
      text: (el.textContent || "").trim()
    };
  }

  // 7. General Div/Section/Containers: traverse down
  const childrenBlocks: IRBlock[] = [];
  Array.from(el.childNodes).forEach(child => {
    const block = parseElement(child);
    if (block) {
      // Inline children consolidation
      if (block.type === "paragraph" && block.text === "") return;
      childrenBlocks.push(block);
    }
  });

  if (childrenBlocks.length === 0) {
    return null;
  }

  // If container only contains inline paragraph text blocks, merge them
  const allParagraphs = childrenBlocks.every(c => c.type === "paragraph");
  if (allParagraphs && tag !== "DIV" && tag !== "SECTION" && tag !== "ARTICLE") {
    return {
      type: "paragraph",
      text: childrenBlocks.map(c => c.text).join(" ").trim()
    };
  }

  return {
    type: "root",
    children: childrenBlocks
  };
}

/**
 * Extracts element tree to Document IR format from target node.
 */
export function extractGenericDOM(target: HTMLElement): DocumentIR {
  const parsed = parseElement(target);
  const rootBlock = parsed || { type: "root", children: [] };

  const metadata: CaptureMetadata = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };

  return {
    meta: metadata,
    root: rootBlock.type === "root" ? rootBlock : { type: "root", children: [rootBlock] }
  };
}
