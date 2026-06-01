import { Recipe, DocumentIR, IRBlock } from "../types";

export const BUILTIN_RECIPES: Recipe[] = [
  {
    id: "recipe_ai_brief",
    name: "AI Coding Agent Brief",
    description: "Format the parsed elements as a task brief for code generation models",
    aiTemplate: `Create an actionable technical implementation brief for an AI coding agent.
Context:
{extractedMarkdown}
Include a task summary, paths to affected files, step-by-step instructions, and open architectural questions.`,
    transform: (doc: DocumentIR): DocumentIR => {
      // Offline fallback: prepend Handoff Header
      const headerBlock: IRBlock = {
        type: "heading",
        level: 1,
        text: `AI Coding Agent Brief: ${doc.meta.title}`
      };
      const metaBlock: IRBlock = {
        type: "paragraph",
        text: `**Source**: [${doc.meta.title}](${doc.meta.url})\n**Captured**: ${doc.meta.timestamp}`
      };
      
      const originalChildren = doc.root.children || [];
      doc.root.children = [headerBlock, metaBlock, ...originalChildren];
      return doc;
    }
  },
  {
    id: "recipe_bug_report",
    name: "Jira Bug Report",
    description: "Restructure captured text as a formal QA bug ticket",
    aiTemplate: `Summarize the following content into a clean software bug report.
Context:
{extractedMarkdown}
Format with: Description, Steps to Reproduce, Expected Behavior, Actual Behavior, and Environment Details.`,
    transform: (doc: DocumentIR): DocumentIR => {
      const headerBlock: IRBlock = {
        type: "heading",
        level: 1,
        text: `Bug Report: [Issue on ${doc.meta.title}]`
      };
      const contentBlock: IRBlock = {
        type: "paragraph",
        text: `h3. Description\nCaptured from page: ${doc.meta.url}\n\nh3. Steps to Reproduce\n1. [Step 1]\n2. [Step 2]\n\nh3. Expected Result\n[Details]\n\nh3. Actual Result\n[Details]\n\nh3. Raw Captured Context:\n`
      };
      
      const originalChildren = doc.root.children || [];
      doc.root.children = [headerBlock, contentBlock, ...originalChildren];
      return doc;
    }
  },
  {
    id: "recipe_exec_summary",
    name: "Executive Summary",
    description: "Condense selection into high-level takeaways for leaders",
    aiTemplate: `Write a high-level executive summary of the following content:
{extractedMarkdown}
Focus on high-level impact, business implications, costs, and key decisions. Use brief bullet points.`,
    transform: (doc: DocumentIR): DocumentIR => {
      const headerBlock: IRBlock = {
        type: "heading",
        level: 1,
        text: `Executive Summary: ${doc.meta.title}`
      };
      
      const originalChildren = doc.root.children || [];
      doc.root.children = [headerBlock, ...originalChildren];
      return doc;
    }
  },
  {
    id: "recipe_research_notes",
    name: "Research Notes",
    description: "Preserve exact quotes, statistics, and references with links",
    aiTemplate: `Organize the following text into academic research notes.
Context:
{extractedMarkdown}
Keep direct quotes verbatim. Group definitions, statistics, and source references separately.`,
    transform: (doc: DocumentIR): DocumentIR => {
      const headerBlock: IRBlock = {
        type: "heading",
        level: 1,
        text: `Research Notes: ${doc.meta.title}`
      };
      const sourceBlock: IRBlock = {
        type: "paragraph",
        text: `*Source*: ${doc.meta.url}\n*Retrieved*: ${doc.meta.timestamp}`
      };
      
      const originalChildren = doc.root.children || [];
      doc.root.children = [headerBlock, sourceBlock, ...originalChildren];
      return doc;
    }
  },
  {
    id: "recipe_support_ticket",
    name: "Support Ticket Summary",
    description: "Format customer feedback into a service desk escalation task",
    aiTemplate: `Translate this support feedback into a structured customer support ticket.
Context:
{extractedMarkdown}
Identify Customer Name, Issue Classification, Severity, and Action Items.`,
    transform: (doc: DocumentIR): DocumentIR => {
      const headerBlock: IRBlock = {
        type: "heading",
        level: 1,
        text: `Support Ticket Handoff`
      };
      const infoBlock: IRBlock = {
        type: "paragraph",
        text: `*Source Page*: ${doc.meta.url}\n\n*Severity*: Medium\n*Ticket Context*:`
      };
      
      const originalChildren = doc.root.children || [];
      doc.root.children = [headerBlock, infoBlock, ...originalChildren];
      return doc;
    }
  }
];

export function getRecipe(id: string): Recipe {
  return BUILTIN_RECIPES.find(r => r.id === id) || BUILTIN_RECIPES[0];
}
