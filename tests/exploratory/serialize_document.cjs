const fs = require('fs');
const path = require('path');

const doc = JSON.parse(fs.readFileSync(path.join(__dirname, 'document.json'), 'utf8'));

function serializeToMarkdown(block, depth = 0) {
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
        const inner = block.children.map(child => serializeToMarkdown(child, depth)).join("\n\n");
        result += inner
          .split("\n")
          .map(line => `> ${line}`)
          .join("\n");
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
      result += `\`\`\`${lang}\n${block.text || ""}\n\`\`\``;
      break;

    case "table":
      if (block.children && block.children.length > 0) {
        const rows = block.children;
        const headerRow = rows[0];
        const bodyRows = rows.slice(1);

        const serializeRow = (rowBlock) => {
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
        const filePath = block.metadata?.filePath ? `### File: \`${block.metadata.filePath}\`\n` : "";
        const threads = block.children.map(child => serializeToMarkdown(child, depth)).join("\n\n");
        result += `${filePath}${threads}`;
      }
      break;

    case "comment":
      const author = block.metadata?.author ? `**${block.metadata.author}**` : "**User**";
      const botLabel = block.metadata?.isAiGenerated ? " (AI)" : "";
      const unresolvedLabel = block.metadata?.isUnresolved ? " (Unresolved)" : "";
      const timestamp = block.metadata?.timestamp ? ` _(${block.metadata.timestamp})_` : "";

      const headerLine = `${author}${botLabel}${unresolvedLabel}${timestamp}:\n`;
      let commentContent = "";
      if (block.children && block.children.length > 0) {
        commentContent = block.children.map(child => serializeToMarkdown(child, depth)).join("\n\n");
      } else if (block.text) {
        commentContent = block.text;
      }

      const bodyLines = commentContent
        ? commentContent.split("\n").map(l => `> ${l}`).join("\n")
        : "";
      result += `${headerLine}${bodyLines}`;
      break;

    default:
      if (block.text) {
        result += block.text;
      }
      break;
  }

  return result;
}

const md = serializeToMarkdown(doc.root);
fs.writeFileSync(path.join(__dirname, 'output.md'), md);
console.log('Markdown output written to scratch/output.md.');
console.log('\n--- PREVIEW ---');
console.log(md.substring(0, 1000));
console.log('--- END PREVIEW ---');
