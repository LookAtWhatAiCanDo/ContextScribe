// Intermediate Representation (IR) Types
export type IRBlockType =
  | "root"
  | "heading"
  | "paragraph"
  | "list"
  | "list-item"
  | "code-block"
  | "blockquote"
  | "table"
  | "table-row"
  | "table-header-cell"
  | "table-cell"
  | "comment-thread"
  | "comment";

export interface IRBlock {
  type: IRBlockType;
  text?: string;
  level?: number;             // Heading level (1-6)
  language?: string;          // Code language (e.g., typescript, python)
  metadata?: {
    author?: string;
    authorAvatar?: string;
    timestamp?: string;
    isUnresolved?: boolean;
    isAiGenerated?: boolean;
    filePath?: string;
    lineRange?: string;
    [key: string]: unknown;
  };
  children?: IRBlock[];
}

export interface CaptureMetadata {
  title: string;
  url: string;
  timestamp: string;
  selectorPath?: string;
}

export interface DocumentIR {
  meta: CaptureMetadata;
  root: IRBlock;
}

// Recipes, Lenses, Destination Adapters
export interface Recipe {
  id: string;
  name: string;
  description: string;
  aiTemplate?: string;
  transform: (doc: DocumentIR) => DocumentIR;
}

export interface Lens {
  id: string;
  name: string;
  focusArea: string;
  aiSystemPrompt?: string;
  filter: (block: IRBlock) => boolean;
}

export interface DestinationAdapter {
  id: string;
  name: string;
  flavor: "commonmark" | "gfm" | "slack" | "jira" | "notion";
  maxChars?: number;
  format: (markdown: string, meta: CaptureMetadata) => string;
}

// AI Configuration
export interface InferenceConfig {
  provider: "none" | "ollama" | "chrome-ai" | "lm-studio";
  endpointUrl?: string;
  modelName?: string;
  apiKey?: string;
}

export interface Settings {
  inference: InferenceConfig;
  selectedRecipe: string;
  selectedLens: string;
  selectedAdapter: string;
  exclusions: string[]; // Domain list
  formProtection: boolean; // Protect inputs/password fields
  logFullPrompts: boolean; // Log full prompts instead of first/last 100 characters
}

// Message Protocols
export type ExtensionMessage =
  | {
      action: "EXTRACT_NODE";
      recipeId: string;
      lensId: string;
      adapterId: string;
    }
  | {
      action: "WRITE_CLIPBOARD";
      text: string;
      success: boolean;
      message?: string;
    }
  | {
      action: "TOGGLE_RESOLVED_THREADS";
      operation: "expand" | "collapse" | "toggle";
    }
  | {
      action: "UPDATE_STREAM";
      text: string;
    }
  | {
      action: "ABORT_TASK";
    };

export interface ProviderResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface InferenceProvider {
  id: string;
  name: string;
  isAvailable: () => Promise<boolean>;
  generate: (
    systemPrompt: string,
    userPrompt: string,
    onLog?: (msg: string) => void,
    onStream?: (text: string) => void,
    signal?: AbortSignal
  ) => Promise<ProviderResponse>;
}

export interface BackgroundTaskState {
  running: boolean;
  statusText?: string;
  startedAt?: number;
}


