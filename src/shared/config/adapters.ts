import { DestinationAdapter, CaptureMetadata } from "../types";

export const BUILTIN_ADAPTERS: DestinationAdapter[] = [
  {
    id: "adapter_chatgpt",
    name: "ChatGPT",
    flavor: "gfm",
    format: (markdown: string, meta: CaptureMetadata): string => {
      return `[Captured Context via ContextScribe]\nURL: ${meta.url}\nTitle: ${meta.title}\nTimestamp: ${meta.timestamp}\n---\n${markdown}`;
    }
  },
  {
    id: "adapter_claude",
    name: "Claude / Anthropic",
    flavor: "gfm",
    format: (markdown: string, meta: CaptureMetadata): string => {
      return `<context>\n<source url="${meta.url}" title="${meta.title}" timestamp="${meta.timestamp}" />\n${markdown}\n</context>`;
    }
  },
  {
    id: "adapter_claude_code",
    name: "Claude Code CLI",
    flavor: "commonmark",
    format: (markdown: string, meta: CaptureMetadata): string => {
      // Claude Code likes concise instructions
      return `/* ContextScribe: Captured from ${meta.url} */\n${markdown}`;
    }
  },
  {
    id: "adapter_cursor",
    name: "Cursor AI Editor",
    flavor: "gfm",
    format: (markdown: string, meta: CaptureMetadata): string => {
      return `### Context: ${meta.title}\nURL: ${meta.url}\n\n${markdown}`;
    }
  },
  {
    id: "adapter_jira",
    name: "Jira",
    flavor: "jira",
    format: (markdown: string, meta: CaptureMetadata): string => {
      return `*ContextScribe Capture*\n* *Source*: ${meta.url}\n* *Captured*: ${meta.timestamp}\n\n${markdown}`;
    }
  },
  {
    id: "adapter_slack",
    name: "Slack",
    flavor: "slack",
    maxChars: 4000,
    format: (markdown: string, meta: CaptureMetadata): string => {
      return `*ContextScribe Capture from ${meta.title}* (${meta.url})\n${markdown}`;
    }
  },
  {
    id: "adapter_obsidian",
    name: "Obsidian MD",
    flavor: "gfm",
    format: (markdown: string, meta: CaptureMetadata): string => {
      const frontmatter = `---
source: ${meta.url}
title: "${meta.title.replace(/"/g, '\\"')}"
date: ${meta.timestamp}
tags: [contextscribe, capture]
---
`;
      return `${frontmatter}\n${markdown}`;
    }
  },
  {
    id: "adapter_notion",
    name: "Notion",
    flavor: "commonmark",
    format: (markdown: string, meta: CaptureMetadata): string => {
      return `**Source**: [${meta.title}](${meta.url})\n**Captured**: ${meta.timestamp}\n\n${markdown}`;
    }
  }
];

export const DUMMY_ADAPTER: DestinationAdapter = {
  id: "none",
  name: "Raw Markdown",
  flavor: "commonmark",
  format: (markdown: string, _meta: CaptureMetadata) => markdown
};

export function getAdapter(id: string): DestinationAdapter {
  if (!id || id === "none" || id === "raw") return DUMMY_ADAPTER;
  return BUILTIN_ADAPTERS.find(a => a.id === id) || BUILTIN_ADAPTERS[0];
}

