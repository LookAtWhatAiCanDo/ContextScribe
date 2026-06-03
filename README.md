# ContextScribe

ContextScribe is a privacy-forward, structure-aware Chrome Extension (Manifest V3) designed to capture webpage elements, text selections, or full pages, and convert them into clean Markdown or AI-optimized context. 

By applying configurable **Recipes** (what context to extract), **Lenses** (audience/perspective framing), and **Destination Adapters** (formatting quirks for downstream apps like Slack, Jira, or Claude), ContextScribe ensures the clipboard copy is formatted exactly where it needs to be pasted.

---

## 🚀 Key Features

* **Structure-Aware Capture**: Preserves DOM tree hierarchies (headings, nested lists, blockquotes, code blocks, tables) instead of copy-pasting flattened text.
* **Specialized GitHub PR Support**: Automatically parses Pull Request review comment threads, tracks author roles (e.g. human vs. Copilot AI reviews), identifies resolution states, and supports programmatic thread expansion.
* **Transformative Architecture**:
  * **Recipes**: High-level templates (e.g., AI Coding Agent Brief, Jira Bug Report, Executive Summary, Research Notes).
  * **Lenses**: Perspective shifts (e.g., Developer, Security, Legal, Product, Executive).
  * **Destination Adapters**: Outputs tailored to specific paste targets (e.g., ChatGPT, Claude, Claude Code, Cursor, Jira, Slack, Obsidian, Notion).
* **Multi-Backend Inference**: Integrates with local Ollama, local LM Studio, Chrome's Built-in Prompt API (`LanguageModel`), or runs entirely offline in deterministic mode.
* **Privacy-First Design**: Zero external telemetry. No web requests are made to third-party servers unless you explicitly configure a remote LLM API. Skips password and hidden input fields automatically.

---

## 🛠️ Project Structure

```
ContextScribe/
├── public/
│   └── manifest.json         # Extension permissions & runtime definitions
├── src/
│   ├── background/
│   │   ├── index.ts          # Extension service worker
│   │   ├── contextMenus.ts   # Dynamic context menus definition
│   │   ├── settings.ts       # Storage configuration
│   │   └── inference/        # AI provider integrations (Ollama, Chrome AI, etc.)
│   ├── content/
│   │   ├── index.ts          # Content script entry & event listener routing
│   │   ├── tracker.ts        # Context menu DOM-target tracker
│   │   ├── toast.ts          # Glassmorphic UI notifications
│   │   ├── extractor/        # Generic and GitHub DOM-parsing engines
│   │   └── dom/              # Page DOM automation tools (resolved comment toggling)
│   ├── popup/                # Popup actions UI
│   └── options/              # Settings & API keys UI
└── shared/
    ├── types.ts              # System types
    ├── ir.ts                 # Intermediate representation tools
    └── serializer.ts         # Platform-specific Markdown exporter
```

---

## 📦 Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v20.19.0 or higher recommended)
* [Google Chrome](https://www.google.com/chrome/) (Chrome 138+ required if testing the Chrome Built-in AI feature)

### 1. Build the Extension
Clone this repository, install dependencies, and compile the distribution bundle:

```bash
# Install dependencies
npm install

# Compile TypeScript and bundle with Vite
npm run build
```

This compiles all entries and copies assets into the `dist/` directory.

### 2. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the upper-right corner.
3. Click the **Load unpacked** button in the upper-left.
4. Select the **`dist`** folder inside this project directory.

---

## 📖 How to Use

### Core Copy Action
1. Right-click any element on a webpage (e.g., a header, code box, comments thread, or active selection).
2. Hover over **ContextScribe** in the context menu.
3. Select an option:
   * **Copy Raw Markdown**: Performs deterministic extraction with no formatting or AI rewrites.
   * **Copy Clean Markdown**: Applies the active Recipe and Lens offline without AI.
   * **Summarize with AI**: Sends the extracted context to your selected local AI engine.
   * **Recipes / Lenses / Destination Adapters**: Click any specific item to instantly parse and copy using those options.
4. Paste the formatted context directly into your destination tool (Jira, Slack, Claude Code, Cursor, etc.).

### GitHub PR Automation
When on a GitHub Pull Request page (`*://github.com/*/pull/*`), ContextScribe exposes a specialized **GitHub PR Tools** submenu allowing you to:
* Extract only the right-clicked comment discussion.
* Copy all active or unresolved review comments.
* Programmatically **Expand**, **Collapse**, or **Toggle** resolved outdated conversation threads on the page directly from the right-click menu.

---

## ⚙️ Configuring Local AI

To connect ContextScribe to a local LLM:
1. Click the **ContextScribe** icon in the extensions bar, or right-click the extension icon and select **Options** (Configure Settings).
2. Set the **Inference Provider** to your chosen backend:
   * **Local Ollama**: Ensure Ollama is running (`ollama serve`) and the default endpoint (`http://localhost:11434/api/chat`) is accessible.
   * **LM Studio**: Run your local model server inside LM Studio on port `1234`.
   * **Chrome Built-in AI**: Enable **Gemini Nano** under `chrome://flags` (`#optimization-guide-on-device-model` and `#prompt-api-for-sharing`).
3. Select your default transformation profiles and click **Save Settings**.
