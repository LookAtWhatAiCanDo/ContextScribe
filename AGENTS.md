# ContextScribe Agent Instructions

Welcome! You are an AI coding assistant working on **ContextScribe**—a privacy-forward, structure-aware Chrome Extension (Manifest V3) designed to capture webpage elements, text selections, or full pages, and convert them into clean Markdown or AI-optimized context.

This file acts as the primary repository context and instructions guide. Read this first to align with the codebase.

---

## 📖 Documentation Maintenance Guidelines

To ensure the project context remains accurate:
1. **Synchronized Updates:** When code structures, design decisions, parser selectors, or file paths change, you must update the relevant codebase documentation (including this file `AGENTS.md`, the root `README.md`, and architectural files under `docs/`).
2. **Definition of Done:** A task, refactoring, or feature implementation is not complete until all corresponding documentation has been updated to reflect the new state of the codebase.
3. **No Automatic Git Staging/Commits:** By default, never stage (`git add`) or commit (`git commit`) changes unless explicitly requested or prompted by the user.
4. **Relative Pathing Requirement:** Always write file paths relative to the folder they are in (e.g., `./README.md` or `./src/content/`). Never document absolute file paths.
5. **Plan Synchronization:** Any time a CLI command, parameter, file path, or configuration flag changes or is corrected during implementation, you must immediately propagate that change to the local `implementation_plan.md` in the system app data directory, as well as any architectural plan files under `docs/`.

---

## 🏗️ Codebase Directory Map

- **[public/](./public)**: Extension static assets and configuration.
  - `manifest.json`: Manifest V3 configuration, declarations of permissions, background scripts, content scripts, and web accessible resources.
- **[src/background/](./src/background)**: Chrome Extension Service Worker, running in the background.
  - `index.ts`: Service worker initialization, event routers, tab focusing, and pipeline coordination.
  - `contextMenus.ts`: Dynamic registration and layout of the ContextScribe submenus (Recipes, Lenses, Adapters, raw copy, etc.).
  - `settings.ts`: Wrapper for loading and storing settings via `chrome.storage.local`.
  - **[src/background/inference/](./src/background/inference)**: AI LLM providers and deterministic fallback runners.
    - `index.ts`: Driver router that resolves configured provider class instance.
    - `ollama.ts`: Handler that sends inference prompts to a local Ollama server endpoint.
    - `lmStudio.ts`: Handler matching OpenAI completion API structures mapping to LM Studio.
    - `chromeAI.ts`: Handler for Chrome's native on-device Gemini Nano API (`window.ai` / `ai.languageModel`).
    - `deterministic.ts`: Deterministic fallback that skips AI and returns standard serialized Markdown.
- **[src/content/](./src/content)**: Content scripts injected into user-visited webpage DOMs.
  - `index.ts`: Content script entry point, message listener, progress/toast controls, and clipboard copy operations.
  - `tracker.ts`: Global listener on the `contextmenu` event to record and yield the last clicked DOM node in memory.
  - `toast.ts`: HTML/CSS visual toast alert logic.
  - `toast.css`: CSS styling for progress badges, copy buttons, and status toasts.
  - **[src/content/dom/](./src/content/dom)**: Page DOM automation and interactive helpers.
    - `githubExpander.ts`: Expand, collapse, or toggle resolved/outdated threads on GitHub PR pages.
  - **[src/content/extractor/](./src/content/extractor)**: Parsing engines mapping raw DOM nodes to clean semantic structures.
    - `index.ts`: Routing logic between the generic and specialised engines.
    - `generic.ts`: Recursive DOM tree traversal parsing standard HTML semantic tags into Intermediate Representation (IR) blocks.
    - `github.ts`: Specialized attribute/selector queries extracting Pull Request threads, code hunks, and review statuses using target-based recursive extraction.
    - `highlight.ts`: Adds visual feedback and highlights to target elements selected for capture.
- **[src/options/](./src/options)**: Main configurations and API keys settings page.
  - `options.html`: Options UI markup.
  - `options.ts`: Settings controller reading and writing user preferences.
- **[src/popup/](./src/popup)**: Chrome browser bar quick action panel.
  - `popup.html`: Quick options panel UI markup.
  - `popup.ts`: Quick options click listener and status reporter.
- **[src/shared/](./src/shared)**: Core data models, configurations, and serializers.
  - `types.ts`: Shared TypeScript interfaces and message passing contracts.
  - `ir.ts`: Utilities for managing, appending, or validating Intermediate Representation (IR) nodes.
  - `serializer.ts`: CommonMark-compliant and custom target Markdown compilers.
  - `utils.ts`: Shared utilities (e.g. progress log cleaning).
  - `constants.ts`: Shared configuration and endpoint fallback constants.
  - **[src/shared/config/](./src/shared/config)**: System declarative extensions definitions.
    - `recipes.ts`: Defined capture recipes (e.g. AI Coding Agent Brief, Jira bug format, raw structure summaries).
    - `lenses.ts`: Defined perspective focus lenses (e.g. Developer, Security, Legal focus).
    - `adapters.ts`: Target platform serializers (e.g. Slack syntax rules, Jira markup, Cursor, Notion).

---

## 🎨 UI Style Guidelines & Constraints

When modifying the Options or Popup pages, or the Content Script Toasts, follow these constraints:

1. **Aesthetics & Colors**:
   - Do not use generic CSS styling. Utilize modern design languages including CSS variables, HSL color tokens, dark mode preferences, glassmorphism (`backdrop-filter`), and thin border radii (`4px` to `8px`).
   - Highlight accents should map to premium variations (such as glowing cyan/teal for successes, deep indigo/purple for information, and vibrant coral/red for errors).
2. **Typography**:
   - Prohibit raw browser default fonts. Import and utilize modern web fonts (like `Inter`, `Outfit`, or `Roboto`) inside your stylesheets.
3. **Animations**:
   - Use CSS animations for micro-interactions: visual fading timers, loading progress spinners, and slide-in notifications for UI Toast elements.

---

## ⚙️ Core Extension Architecture Patterns

1. **Service Worker vs. Content Script Clipboard Isolation**:
   - **Constraint**: Chrome extension Service Workers (background scripts) do not have direct access to the DOM or clipboard write functions.
   - **Rule**: Never attempt to write to the clipboard (`navigator.clipboard` or `execCommand`) inside `src/background/`. Always trigger the write operation by posting a `WRITE_CLIPBOARD` runtime message back to the active tab's content script (`src/content/index.ts`).
2. **CORS and API Requests**:
   - **Constraint**: Accessing external endpoints (e.g., local Ollama `http://localhost:11434` or LM Studio `http://localhost:1234`) inside a content script will fail due to Cross-Origin Resource Sharing (CORS) security policies enforced by the webpage's host.
   - **Rule**: Route all remote API requests and network fetches through the background script's inference module (`src/background/inference/`). The service worker acts as a secure network proxy.
3. **Right-Click Element Tracking**:
   - **Constraint**: The `chrome.contextMenus.onClicked` listener in the background script does not receive a DOM node parameter.
   - **Rule**: `src/content/tracker.ts` registers a capturing listener for the global `contextmenu` event. It caches a weak reference to the target element (`event.target`). When `EXTRACT_NODE` is received, it extracts details starting from this cached element.
4. **Form and Password Field Protection**:
   - **Constraint**: Extensions must avoid capturing sensitive credentials or secrets.
   - **Rule**: The DOM parsers in `src/content/extractor/` must automatically detect and skip parsing for password input elements (`input[type="password"]`), hidden input elements, and elements matching common API key or credential field identifiers.
5. **Progress Feedback & Live Preview**:
   - When a long-running AI inference execution is initiated, the service worker dispatches `LOG_PROGRESS` and `UPDATE_STREAM` messages to the content script.
   - The content script displays these progress logs in a bottom-right floating glassmorphic badge.
   - The badge features an expand button, which reveals a monospace preview textarea. As `UPDATE_STREAM` messages arrive, the live generated text is streamed directly into this textarea in real time.
   - Once completed, the badge transitions to a finished state showing copy/dismiss controls instead of disappearing immediately.
6. **Active Background Task State Tracking**:
   - **Constraint**: The extension popup menu must not allow trigger actions or configuration changes while a background task (like AI summarization) is running.
   - **Rule**: Set `backgroundTask` state containing `running: true` and active `statusText` in `chrome.storage.local` at the start of pipeline execution in `src/background/index.ts`. Reset it in a `finally` block when complete. The popup menu (`src/popup/popup.ts`) uses `chrome.storage.onChanged` to reactively disable inputs and show the active status.
7. **Task Aborting & Cancellation**:
   - **Constraint**: Users must be able to cancel long-running background tasks (such as slow AI inference).
   - **Rule**: Maintain a module-level `activeAbortController` in the background script. When the user clicks the stop button in the content script progress badge, dispatch an `ABORT_TASK` runtime message to the service worker. The service worker triggers `.abort()` on the active controller, propagating the signal to active network fetches or Chrome Prompt API calls, and catches the resulting `AbortError` to clean up state without clipboard writes.
8. **Target-Based Recursive PR Extraction**:
   - **Constraint**: Under GitHub PR pages, simply querying comment thread elements would discard non-comment children inside the highlighted green border element (e.g. file lists, headers).
   - **Rule**: All extraction actions must operate recursively on the selected element including all of its child elements. The PR extractor (`src/content/extractor/github.ts`) utilizes a custom-parser callback to recursively traverse the DOM subtree of the selected element, resolving comments to specialized structures and other elements to generic structures.

---

## 🛠️ Build and Development Commands

- Install dependencies:
  ```bash
  npm install
  ```
- Build distribution files (`dist/` folder containing compiled assets):
  ```bash
  npm run build
  ```
- Run local hot-rebuilding server:
  ```bash
  npm run dev
  ```
- Load Extension:
  1. Open Chrome and navigate to `chrome://extensions/`.
  2. Toggle **Developer mode** in the upper right.
  3. Click **Load unpacked** and select the **`dist/`** output directory.
