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
  if (
    tagName === "SCRIPT" ||
    tagName === "STYLE" ||
    tagName === "NOSCRIPT" ||
    tagName === "IFRAME" ||
    tagName === "TEMPLATE" ||
    tagName === "REACT-PARTIAL"
  ) {
    return false;
  }

  return true;
}

/**
 * Helper to recursively serialize inline elements to GFM markdown text.
 */
function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    const hasLeadingSpace = /^\s/.test(text);
    const hasTrailingSpace = /\s$/.test(text);
    const folded = text.replace(/\s+/g, " ").trim();
    if (!folded) {
      return text.includes(" ") ? " " : "";
    }
    return (hasLeadingSpace ? " " : "") + folded + (hasTrailingSpace ? " " : "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }
  const el = node as HTMLElement;
  if (!isElementVisible(el, true, true)) {
    return "";
  }
  const tag = el.tagName.toUpperCase();

  if (tag === "A") {
    const href = el.getAttribute("href") || "";
    const content = Array.from(el.childNodes).map(serializeInline).join("");
    if (href) {
      return `[${content.trim()}](${href})`;
    }
    return content;
  }
  if (tag === "STRONG" || tag === "B") {
    const content = Array.from(el.childNodes).map(serializeInline).join("");
    return content.trim() ? `**${content.trim()}**` : "";
  }
  if (tag === "EM" || tag === "I") {
    const content = Array.from(el.childNodes).map(serializeInline).join("");
    return content.trim() ? `*${content.trim()}*` : "";
  }
  if (tag === "CODE") {
    const content = el.textContent || "";
    return content ? `\`${content}\`` : "";
  }
  if (tag === "DEL" || tag === "S" || tag === "STRIKE") {
    const content = Array.from(el.childNodes).map(serializeInline).join("");
    return content.trim() ? `~~${content.trim()}~~` : "";
  }
  if (tag === "BR") {
    return "\n";
  }
  if (tag === "IMG") {
    const alt = el.getAttribute("alt") || "";
    const src = el.getAttribute("src") || "";
    return src ? `![${alt}](${src})` : "";
  }

  // Fallback: recursively serialize child nodes
  return Array.from(el.childNodes).map(serializeInline).join("");
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
      const cellText = Array.from(cell.childNodes).map(serializeInline).join("").trim();
      cells.push({
        type: cell.tagName === "TH" ? "table-header-cell" : "table-cell",
        text: cellText
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

  // 0. Check if this container contains ONLY inline child elements.
  // If so, we can parse it as a single paragraph block using serializeInline
  // to avoid splitting inline text/metadata across multiple lines.
  const hasBlockChildren = Array.from(el.children).some(child => 
    !["A", "STRONG", "B", "EM", "I", "CODE", "SPAN", "DEL", "S", "STRIKE", "BR", "IMG"].includes(child.tagName.toUpperCase())
  );

  const isStructuralTag = ["TABLE", "UL", "OL", "DETAILS", "PRE"].includes(tag);

  if (!hasBlockChildren && !isStructuralTag) {
    const inlineText = Array.from(el.childNodes).map(serializeInline).join("").trim();
    if (inlineText) {
      return {
        type: "paragraph",
        text: inlineText
      };
    }
    return null;
  }

  // 1. Headings
  if (/^H[1-6]$/.test(tag)) {
    const level = parseInt(tag.charAt(1), 10);
    const inlineText = Array.from(el.childNodes).map(serializeInline).join("").trim();
    return {
      type: "heading",
      level,
      text: inlineText
    };
  }

  // 2. Blockquotes
  if (tag === "BLOCKQUOTE" || tag === "Q") {
    if (hasBlockChildren) {
      const childrenBlocks: IRBlock[] = [];
      Array.from(el.childNodes).forEach(child => {
        const block = parse(child);
        if (block) childrenBlocks.push(block);
      });
      return {
        type: "blockquote",
        children: childrenBlocks
      };
    } else {
      const inlineText = Array.from(el.childNodes).map(serializeInline).join("").trim();
      return {
        type: "blockquote",
        text: inlineText
      };
    }
  }

  // 3. Pre/Code blocks
  if (tag === "PRE" || (tag === "CODE" && el.closest("pre"))) {
    const codeTag = el.querySelector("code");
    const targetEl = codeTag || el;
    return {
      type: "code-block",
      language: detectLanguage(targetEl as HTMLElement),
      text: targetEl.textContent || ""
    };
  }
  
  if (tag === "CODE") {
    return {
      type: "paragraph",
      text: `\`${el.textContent || ""}\``
    };
  }

  // 4. Tables
  if (tag === "TABLE") {
    return parseTable(el as HTMLTableElement);
  }

  // 5. Details/Collapsible
  if (tag === "DETAILS") {
    const summaryEl = el.querySelector("summary");
    const summaryText = summaryEl ? Array.from(summaryEl.childNodes).map(serializeInline).join("").trim() : "Details";
    
    const childrenBlocks: IRBlock[] = [];
    Array.from(el.childNodes).forEach(child => {
      if (child === summaryEl) return;
      const block = parse(child);
      if (block) childrenBlocks.push(block);
    });
    
    return {
      type: "details",
      text: summaryText,
      children: childrenBlocks
    };
  }

  // 6. Lists & Items
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
    if (hasBlockChildren) {
      const inlineParts: string[] = [];
      const childBlocks: IRBlock[] = [];

      Array.from(el.childNodes).forEach(child => {
        const isInline = child.nodeType === Node.TEXT_NODE || 
          (child.nodeType === Node.ELEMENT_NODE && 
           ["A", "STRONG", "B", "EM", "I", "CODE", "SPAN", "DEL", "S", "STRIKE", "BR", "IMG"].includes((child as HTMLElement).tagName.toUpperCase()));
        
        if (isInline) {
          inlineParts.push(serializeInline(child));
        } else {
          const block = parse(child);
          if (block) childBlocks.push(block);
        }
      });

      return {
        type: "list-item",
        text: inlineParts.join("").trim(),
        children: childBlocks
      };
    } else {
      const inlineText = Array.from(el.childNodes).map(serializeInline).join("").trim();
      return {
        type: "list-item",
        text: inlineText
      };
    }
  }

  // 7. Generic Paragraph/Containers
  if (tag === "P") {
    const inlineText = Array.from(el.childNodes).map(serializeInline).join("").trim();
    return {
      type: "paragraph",
      text: inlineText
    };
  }

  // 8. General Div/Section/Containers: traverse down
  const childrenBlocks: IRBlock[] = [];
  Array.from(el.childNodes).forEach(child => {
    const block = parse(child);
    if (block) {
      if (block.type === "paragraph" && block.text === "") return;
      childrenBlocks.push(block);
    }
  });

  if (childrenBlocks.length === 0) {
    return null;
  }

  const allParagraphs = childrenBlocks.every(c => c.type === "paragraph");
  if (allParagraphs && tag !== "DIV" && tag !== "SECTION" && tag !== "ARTICLE" && tag !== "MAIN" && tag !== "ASIDE") {
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
