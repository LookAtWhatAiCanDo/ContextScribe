import { DocumentIR, IRBlock, DestinationAdapter } from "./types";

/**
 * Serializes an IR block to standard CommonMark/GFM markdown.
 */
export function serializeToMarkdown(
  block: IRBlock,
  depth: number = 0
): string {
  let result = "";

  const indent = "  ".repeat(depth);

  switch (block.type) {
    case "root":
      if (block.children) {
        result += block.children.map(child => serializeToMarkdown(child, depth)).join("\n\n");
      }
      break;

    case "heading":
      const prefix = "#".repeat(block.level || 1);
      result += `${prefix} ${block.text || ""}`;
      break;

    case "paragraph":
      result += block.text || "";
      break;

    case "blockquote":
      if (block.text) {
        result += block.text
          .split("\n")
          .map(line => `> ${line}`)
          .join("\n");
      } else if (block.children) {
        result += block.children
          .map(child => {
            const childMarkdown = serializeToMarkdown(child, depth);
            if (child.type === "code-block") {
              return childMarkdown;
            }
            return childMarkdown
              .split("\n")
              .map(line => `> ${line}`)
              .join("\n");
          })
          .join("\n\n");
      }
      break;

    case "list":
      if (block.children) {
        result += block.children.map(child => serializeToMarkdown(child, depth)).join("\n");
      }
      break;

    case "list-item":
      const listMarker = "- ";
      if (block.children && block.children.length > 0) {
        const itemText = block.text || "";
        const childrenText = block.children
          .map(child => serializeToMarkdown(child, depth + 1))
          .join("\n");
        result += `${indent}${listMarker}${itemText}\n${childrenText}`;
      } else {
        result += `${indent}${listMarker}${block.text || ""}`;
      }
      break;

    case "code-block":
      const lang = block.language || "";
      const rawText = block.text || "";
      const dedentedText = lang === "diff" ? dedentDiff(rawText) : dedentCode(rawText);
      result += `\`\`\`${lang}\n${dedentedText}\n\`\`\``;
      break;

    case "table":
      if (block.children && block.children.length > 0) {
        const rows = block.children;
        const headerRow = rows[0];
        const bodyRows = rows.slice(1);

        const serializeRow = (rowBlock: IRBlock) => {
          if (!rowBlock.children) return "";
          return "| " + rowBlock.children.map(cell => cell.text || "").join(" | ") + " |";
        };

        const headerStr = serializeRow(headerRow);
        const separatorStr =
          "| " +
          (headerRow.children || []).map(() => "---").join(" | ") +
          " |";
        const bodyStr = bodyRows.map(serializeRow).join("\n");

        result += `${headerStr}\n${separatorStr}\n${bodyStr}`;
      }
      break;

    case "comment-thread":
      if (block.children) {
        let filePath = block.metadata?.filePath || "";
        if (filePath) {
          const relPath = filePath.replace(/^\/+/, "");
          filePath = `### File: [${filePath}](./${relPath})\n`;
        }
        const threads = block.children.map(child => serializeToMarkdown(child, depth)).join("\n\n");
        result += `${filePath}${threads}`;
      }
      break;

    case "comment":
      const author = block.metadata?.author ? `**${block.metadata.author}**` : "**User**";
      const botLabel = block.metadata?.isAiGenerated ? " (AI)" : "";
      const unresolvedLabel = block.metadata?.isUnresolved ? " (Unresolved)" : "";
      const timestamp = block.metadata?.timestamp ? ` _(${block.metadata.timestamp})_` : "";
      const severityLabel = block.metadata?.severity ? ` [${block.metadata.severity}]` : "";

      const headerLine = `${author}${botLabel}${unresolvedLabel}${timestamp}${severityLabel}:\n`;
      let commentContent = "";
      if (block.children && block.children.length > 0) {
        commentContent = block.children
          .map(child => {
            const childMarkdown = serializeToMarkdown(child, depth);
            if (child.type === "code-block") {
              return childMarkdown;
            }
            return childMarkdown
              .split("\n")
              .map(line => `> ${line}`)
              .join("\n");
          })
          .join("\n\n");
      } else if (block.text) {
        commentContent = block.text
          .split("\n")
          .map(line => `> ${line}`)
          .join("\n");
      }

      result += `${headerLine}${commentContent}`;
      break;

    case "details":
      const summaryText = block.text ? `<summary>${block.text}</summary>\n` : "";
      let detailsContent = "";
      if (block.children && block.children.length > 0) {
        detailsContent = block.children.map(child => serializeToMarkdown(child, depth)).join("\n\n");
      }
      result += `<details>\n${summaryText}${detailsContent}\n</details>`;
      break;

    default:
      if (block.text) {
        result += block.text;
      }
      break;
  }

  return result;
}

/**
 * Converts Jira formatting strings for code block, panel, bold and headings.
 */
function convertToJira(markdown: string): string {
  let jira = markdown
    // Convert code blocks
    .replace(/```(\w*)\n([\s\S]*?)\n```/g, (_match, lang, code) => {
      const codeType = lang ? `:${lang}` : "";
      return `{code${codeType}}\n${code}\n{code}`;
    })
    // Convert bold
    .replace(/\*\*(.*?)\*\*/g, "*$1*")
    // Convert headings
    .replace(/^# (.*?)$/gm, "h1. $1")
    .replace(/^## (.*?)$/gm, "h2. $1")
    .replace(/^### (.*?)$/gm, "h3. $1")
    .replace(/^#### (.*?)$/gm, "h4. $1")
    // Convert lists
    .replace(/^\- (.*?)$/gm, "* $1")
    // Convert quotes
    .replace(/^> (.*?)$/gm, "{quote}$1{quote}");
  return jira;
}

/**
 * Converts Slack styling tags (*bold*, `code`, etc).
 */
function convertToSlack(markdown: string): string {
  let slack = markdown
    // Convert bold
    .replace(/\*\*(.*?)\*\*/g, "*$1*")
    // Convert links
    .replace(/\[(.*?)\]\((.*?)\)/g, "<$2|$1>");
  return slack;
}

/**
 * Orchestrates formatting a Document IR using the configured Destination Adapter.
 */
export function formatDocument(doc: DocumentIR, adapter: DestinationAdapter): string {
  const rawMarkdown = serializeToMarkdown(doc.root, 0);

  switch (adapter.flavor) {
    case "jira":
      const jiraBody = convertToJira(rawMarkdown);
      return adapter.format(jiraBody, doc.meta);
    case "slack":
      const slackBody = convertToSlack(rawMarkdown);
      return adapter.format(slackBody, doc.meta);
    case "commonmark":
    case "gfm":
    case "notion":
    default:
      return adapter.format(rawMarkdown, doc.meta);
  }
}

/**
 * Removes common leading indentation from a block of code.
 */
function dedentCode(text: string): string {
  const lines = text.split("\n");
  let minIndent = Infinity;
  
  lines.forEach(line => {
    if (line.trim().length === 0) return; // skip empty lines
    const match = line.match(/^(\s*)/);
    if (match) {
      minIndent = Math.min(minIndent, match[1].length);
    }
  });

  if (minIndent === Infinity || minIndent === 0) {
    return text;
  }

  return lines
    .map(line => (line.length >= minIndent ? line.substring(minIndent) : line.trim()))
    .join("\n");
}

/**
 * Removes common leading indentation from a unified diff, skipping metadata/headers
 * and preserving diff prefix markers (+, -, space).
 */
function dedentDiff(text: string): string {
  const lines = text.split("\n");
  let minIndent = Infinity;

  lines.forEach(line => {
    if (line.trim().length === 0) return;
    // Skip diff header/metadata lines
    if (
      line.startsWith("@@") ||
      line.startsWith("diff") ||
      line.startsWith("index") ||
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("# File:")
    ) {
      return;
    }
    const prefix = line.charAt(0);
    if (prefix === "+" || prefix === "-" || prefix === " ") {
      const remaining = line.substring(1);
      const match = remaining.match(/^(\s*)/);
      if (match) {
        minIndent = Math.min(minIndent, match[1].length);
      }
    }
  });

  if (minIndent === Infinity || minIndent === 0) {
    return text;
  }

  return lines
    .map(line => {
      if (
        line.startsWith("@@") ||
        line.startsWith("diff") ||
        line.startsWith("index") ||
        line.startsWith("---") ||
        line.startsWith("+++") ||
        line.startsWith("# File:")
      ) {
        return line;
      }
      const prefix = line.charAt(0);
      if (prefix === "+" || prefix === "-" || prefix === " ") {
        const remaining = line.substring(1);
        if (remaining.length >= minIndent) {
          return prefix + remaining.substring(minIndent);
        } else {
          return prefix + remaining.trim();
        }
      }
      return line;
    })
    .join("\n");
}
