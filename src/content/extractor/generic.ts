import { DocumentIR, IRBlock, CaptureMetadata } from "../../shared/types";
import { highlightElement } from "./highlight";

/**
 * Folds sequential newlines, carriage returns, tabs, and spaces into a single space.
 */
function foldWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}


/**
 * Checks if a DOM element is visible to the user and not a protected input field.
 */
export function isElementVisible(el: HTMLElement, formProtection = true, allowCollapsed = false): boolean {
  if (!el) return false;
  
  // Guard against inputs, password fields and sensitive credential selectors
  const tagName = el.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    const input = el as HTMLInputElement;
    if (input.type === "password" || input.type === "hidden") {
      return false;
    }

    if (formProtection) {
      const name = (input.name || "").toLowerCase();
      const id = (input.id || "").toLowerCase();
      const className = (input.className || "").toLowerCase();
      const placeholder = (input.placeholder || "").toLowerCase();
      const type = (input.type || "").toLowerCase();

      const sensitiveKeywords = [
        "key", "token", "secret", "password", "credential", 
        "auth", "api", "pwd", "card", "cvv", "security", "pass"
      ];
      
      const isSensitive = sensitiveKeywords.some(keyword => 
        name.includes(keyword) || 
        id.includes(keyword) || 
        className.includes(keyword) || 
        placeholder.includes(keyword) ||
        type.includes(keyword)
      );

      if (isSensitive) {
        return false;
      }
    }
  }

  // Basic styling visibility checks
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  if (!allowCollapsed) {
    if (style.display === "none") {
      return false;
    }
  }

  // Ignore structural elements that are usually invisible noise
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
export function parseElement(
  node: Node,
  formProtection = true,
  customParser?: (node: Node, formProtection: boolean) => IRBlock | null,
  allowCollapsed = false
): IRBlock | null {
  const parse = (n: Node) => customParser ? customParser(n, formProtection) : parseElement(n, formProtection, undefined, allowCollapsed);

  if (node.nodeType === Node.TEXT_NODE) {
    const content = foldWhitespace(node.textContent || "");
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
  if (!isElementVisible(el, formProtection, allowCollapsed)) return null;

  const tag = el.tagName.toUpperCase();

  // 1. Headings
  if (/^H[1-6]$/.test(tag)) {
    const level = parseInt(tag.charAt(1), 10);
    return {
      type: "heading",
      level,
      text: foldWhitespace(el.textContent || "")
    };
  }

  // 2. Blockquotes
  if (tag === "BLOCKQUOTE" || tag === "Q") {
    const blockQuoteText = foldWhitespace(el.textContent || "");
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
      const parsedLi = parse(li);
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
        const block = parse(child);
        if (block) childBlocks.push(block);
      }
    });

    return {
      type: "list-item",
      text: foldWhitespace(directText.join("")),
      children: childBlocks
    };
  }

  // 6. Generic Paragraph/Containers
  if (tag === "P") {
    return {
      type: "paragraph",
      text: foldWhitespace(el.textContent || "")
    };
  }

  // 7. General Div/Section/Containers: traverse down
  const childrenBlocks: IRBlock[] = [];
  Array.from(el.childNodes).forEach(child => {
    const block = parse(child);
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
export function extractGenericDOM(
  target: HTMLElement, 
  shouldHighlight = true, 
  formProtection = true,
  allowCollapsed = false
): DocumentIR {
  if (shouldHighlight) {
    highlightElement(target);
  }
  const parsed = parseElement(target, formProtection, undefined, allowCollapsed);
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
