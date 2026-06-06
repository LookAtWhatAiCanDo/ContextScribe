import { InferenceProvider, ProviderResponse } from "../../shared/types";

interface AICapabilities {
  available: "readily" | "after-download" | "no";
  [key: string]: unknown;
}

interface AILanguageModel {
  capabilities: () => Promise<AICapabilities>;
  availability: () => Promise<string>;
  create: (options?: {
    systemPrompt?: string;
    initialPrompts?: Array<{ role: string; content: string }>;
  }) => Promise<LMSession>;
}

interface LMSession {
  prompt: (text: string, options?: { signal?: AbortSignal }) => Promise<string>;
  promptStreaming?: (text: string, options?: { signal?: AbortSignal }) => any; // AsyncIterable chunk stream
  destroy: () => void;
}

// Function to resolve Chrome's Language Model / Prompt API namespace
async function getChromeLMApi(): Promise<AILanguageModel | null> {
  try {
    const globalObj = typeof self !== "undefined" ? self : (typeof window !== "undefined" ? window : {} as any);
    
    // 1. Try global LanguageModel (older experimental / polyfill)
    if (typeof globalObj.LanguageModel !== "undefined") {
      return globalObj.LanguageModel;
    }
    
    // 2. Try standard: self.ai.languageModel
    if (globalObj.ai && globalObj.ai.languageModel) {
      return globalObj.ai.languageModel;
    }

    // 3. Try global ai.assistant (older API name)
    if (globalObj.ai && globalObj.ai.assistant) {
      return globalObj.ai.assistant;
    }
  } catch (err) {
    console.error("[ContextScribe ChromeAI] Error resolving API namespace:", err);
  }
  return null;
}

// Helper to determine status from API capabilities or availability
async function checkApiAvailability(api: AILanguageModel): Promise<string> {
  // Check for capabilities() (standard)
  if (typeof api.capabilities === "function") {
    try {
      const caps = await api.capabilities();
      return caps.available || "unavailable";
    } catch (e) {
      console.warn("api.capabilities() failed:", e);
    }
  }

  // Check for availability()
  if (typeof api.availability === "function") {
    try {
      return await api.availability();
    } catch (e) {
      console.warn("api.availability() failed:", e);
    }
  }

  return "unavailable";
}

export class ChromeAIProvider implements InferenceProvider {
  id = "chrome-ai";
  name = "Chrome Built-in AI";
  private lastStatus = "unknown";
  private logFullPrompts = false;

  constructor(logFullPrompts = false) {
    this.logFullPrompts = logFullPrompts;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const api = await getChromeLMApi();
      if (api) {
        const status = await checkApiAvailability(api);
        this.lastStatus = status;
        // Accept readily, available, or other positive states
        return status === "available" || status === "readily";
      }
      this.lastStatus = "unsupported";
      return false;
    } catch (err) {
      console.error("Chrome AI availability check failed:", err);
      this.lastStatus = "error";
      return false;
    }
  }

  getLastStatus(): string {
    return this.lastStatus;
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    onLog?: (msg: string) => void,
    onStream?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderResponse> {
    if (this.logFullPrompts) {
      console.log(`[ContextScribe ChromeAI] systemPrompt: ${systemPrompt}`);
      console.log(`[ContextScribe ChromeAI] userPrompt: ${userPrompt}`);
    } else {
      console.log(`[ContextScribe ChromeAI] systemPrompt (first 100): ${systemPrompt.slice(0, 100)}`);
      console.log(`[ContextScribe ChromeAI] systemPrompt (last 100): ${systemPrompt.slice(-100)}`);
      console.log(`[ContextScribe ChromeAI] userPrompt (first 100): ${userPrompt.slice(0, 100)}`);
      console.log(`[ContextScribe ChromeAI] userPrompt (last 100): ${userPrompt.slice(-100)}`);
    }

    onLog?.("Initializing local AI session (warmup)...");
    const api = await getChromeLMApi();
    if (!api) {
      throw new Error("Chrome Built-in AI API is not supported in this browser version.");
    }

    let session: LMSession | null = null;
    
    // Attempt session creation with different parameter variations to prevent parameter-based hangs or failures
    try {
      session = await api.create({
        systemPrompt: systemPrompt,
        initialPrompts: [{ role: "system", content: systemPrompt }]
      });
    } catch (err) {
      console.warn("[ContextScribe ChromeAI] Failed with initialPrompts parameter, retrying with systemPrompt only:", err);
      try {
        session = await api.create({
          systemPrompt: systemPrompt
        });
      } catch (err2) {
        console.warn("[ContextScribe ChromeAI] Failed with systemPrompt parameter, retrying with no parameters:", err2);
        try {
          session = await api.create();
        } catch (err3: any) {
          console.error("[ContextScribe ChromeAI] Failed to create session completely:", err3);
          throw new Error(`Failed to create Chrome AI session: ${err3.message || err3}`);
        }
      }
    }

    if (!session) {
      throw new Error("Chrome Built-in AI session could not be initialized.");
    }

    // Set up AbortController combining user cancel signal and 90-second timeout
    const timeoutDuration = 90000; // 90 seconds
    const internalController = new AbortController();
    
    if (signal?.aborted) {
      internalController.abort();
    }
    
    const timeoutId = setTimeout(() => {
      console.warn("[ContextScribe ChromeAI] Prompt execution exceeded 90-second timeout limit. Aborting.");
      internalController.abort();
    }, timeoutDuration);
    
    const abortHandler = () => {
      internalController.abort();
    };
    
    if (signal) {
      signal.addEventListener("abort", abortHandler);
    }

    try {
      console.log("[ContextScribe ChromeAI] Prompting session...");
      let responseText = "";
      
      if (typeof session.promptStreaming === "function") {
        onLog?.("Generating response...");
        try {
          const stream = session.promptStreaming(userPrompt, { signal: internalController.signal });
          let lastLoggedLength = 0;
          for await (const chunk of stream) {
            if (internalController.signal.aborted) {
              throw new DOMException("The user aborted a request.", "AbortError");
            }
            if (chunk.length > responseText.length && chunk.startsWith(responseText)) {
              responseText = chunk;
            } else {
              responseText += chunk;
            }
            onStream?.(responseText);
            // Log periodically to prevent console spam while keeping Service Worker alive
            if (responseText.length - lastLoggedLength >= 250) {
              onLog?.(`Generating response... (${responseText.length} characters)`);
              lastLoggedLength = responseText.length;
            }
          }
        } catch (streamErr: any) {
          if (streamErr.name === "AbortError" || internalController.signal.aborted) {
            throw streamErr;
          }
          console.warn("[ContextScribe ChromeAI] Streaming failed, falling back to standard prompt:", streamErr);
          responseText = await session.prompt(userPrompt, { signal: internalController.signal });
          onStream?.(responseText);
        }
      } else {
        onLog?.("Generating response...");
        responseText = await session.prompt(userPrompt, { signal: internalController.signal });
        onStream?.(responseText);
      }

      onLog?.("Response generated successfully.");
      console.log("[ContextScribe ChromeAI] Response received from session.");
      return { text: responseText };
    } catch (err: any) {
      if (err.name === "AbortError" || internalController.signal.aborted) {
        console.warn("[ContextScribe ChromeAI] Prompt request was aborted.");
      } else {
        console.error("[ContextScribe ChromeAI] Error during prompting:", err);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      if (session && typeof session.destroy === "function") {
        session.destroy();
      }
    }
  }
}
