import { Lens, IRBlock } from "../types";

export const BUILTIN_LENSES: Lens[] = [
  {
    id: "lens_dev",
    name: "Developer",
    focusArea: "Prioritize code blocks, terminal logs, system paths, and step-by-step instructions.",
    aiSystemPrompt: "You are a software engineer. Focus on code blocks, exceptions, database configurations, and strict programming details.",
    filter: (block: IRBlock): boolean => {
      // In developer mode, retain technical blocks
      if (block.type === "code-block") return true;
      return true;
    }
  },
  {
    id: "lens_security",
    name: "Security Engineer",
    focusArea: "Highlight access credentials, CORS configurations, network configurations, encryption logic, and vulnerability risks.",
    aiSystemPrompt: "You are an expert cybersecurity auditor. Analyze the source text for privacy leaks, weak credentials, open access ports, and code vulnerabilities.",
    filter: (_block: IRBlock): boolean => {
      return true;
    }
  },
  {
    id: "lens_legal",
    name: "Legal",
    focusArea: "Isolate license agreements, copyright declarations, compliance details, and terms of service text.",
    aiSystemPrompt: "You are a corporate legal counsel. Extract licensing agreements, liability waivers, terms of service, and regulatory declarations. Tag any potential compliance violations.",
    filter: (_block: IRBlock): boolean => {
      return true;
    }
  },
  {
    id: "lens_product",
    name: "Product Manager",
    focusArea: "Focus on user flows, feedback text, requirements, feature goals, and product specs.",
    aiSystemPrompt: "You are a product manager. Focus on usability feedback, user goals, feature requests, and visual UI structures. Ignore deep technical code traces.",
    filter: (block: IRBlock): boolean => {
      // Hide raw code blocks from executive product views if needed (optional illustration)
      return block.type !== "code-block";
    }
  },
  {
    id: "lens_support",
    name: "Customer Support",
    focusArea: "Prioritize error messages, client names, timeline of events, and contact information.",
    aiSystemPrompt: "You are a customer support manager. Focus on identifying customer friction, error dialog content, user frustrations, and helpdesk actions.",
    filter: (_block: IRBlock): boolean => {
      return true;
    }
  },
  {
    id: "lens_exec",
    name: "Executive",
    focusArea: "Prioritize timelines, resource plans, costs, and critical decisions.",
    aiSystemPrompt: "You are a company executive. Focus strictly on key decision items, timelines, deliverables, and cost impacts. Summarize details into single sentences.",
    filter: (block: IRBlock): boolean => {
      return block.type !== "code-block";
    }
  }
];

export function getLens(id: string): Lens {
  return BUILTIN_LENSES.find(l => l.id === id) || BUILTIN_LENSES[0];
}
