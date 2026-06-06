**[Copilot](https://github.com/apps/copilot-pull-request-reviewer) AI** reviewed  [Jun 2, 2026](https://github.com/LookAtWhatAiCanDo/ContextScribe/pull/1#pullrequestreview-4407922544)

[View reviewed changes](https://github.com/LookAtWhatAiCanDo/ContextScribe/pull/1/files/86e6074ab54104603850c5df40f5513adec7ccca)

**Copilot** (AI):
> Pull request overview

> This PR expands ContextScribe’s extension infrastructure and user-facing capture pipeline by adding a custom build orchestrator, richer extraction progress/streaming UX, new cancellation/task-state plumbing, and foundational repo documentation for contributors/agents.

> **Changes:**

> Added a two-phase Vite build (`build.js`) to produce MV3-compatible outputs (extension pages + SW as ESM, content script as IIFE) and updated package metadata.
> Implemented live progress + streaming preview UI in the content script, plus background task state tracking and abort support wired through shared message types/settings.
> Added/updated project documentation (README, agent/copilot/cursor rules) and expanded GitHub PR parsing/highlighting/expander behavior.

> Reviewed changes

> Copilot reviewed 35 out of 37 changed files in this pull request and generated 7 comments.

> <details>
> <summary>Show a summary per file</summary>
> | File | Description |
> | --- | --- |
> | src/shared/utils.ts | Adds progress-log message normalization for UI. |
> | src/shared/types.ts | Extends settings and message protocol; adds abort/stream actions and task state type. |
> | src/shared/serializer.ts | Enhances comment serialization to include severity and prefer structured children. |
> | src/shared/constants.ts | Introduces shared defaults for Ollama/LM Studio endpoints/models. |
> | src/shared/config/recipes.ts | Adds “No Recipe” dummy passthrough and ID handling. |
> | src/shared/config/lenses.ts | Adds “No Lens” dummy passthrough and ID handling. |
> | src/shared/config/adapters.ts | Adds “Raw Markdown” dummy adapter and ID handling. |
> | src/popup/popup.ts | Reads background task state and disables options while running; reacts to storage changes. |
> | src/popup/popup.html | UI styling update (Inter font, running indicator, disabled button styles). |
> | src/options/options.ts | Adds `logFullPrompts` setting and uses shared endpoint/model defaults. |
> | src/options/options.html | Adds `logFullPrompts` checkbox and updates displayed version; Inter font import. |
> | src/content/toast.ts | Adds progress badge with cancel/expand/copy and stream/status updates. |
> | src/content/toast.css | New stylesheet for toast/progress badge UI. |
> | src/content/index.ts | Adds progress lifecycle, streaming updates, improved clipboard copy robustness, and GitHub expand-before-extract behavior. |
> | src/content/extractor/index.ts | Threads `formProtection` through extraction routing. |
> | src/content/extractor/highlight.ts | Adds visual highlight overlay for extraction targets. |
> | src/content/extractor/github.ts | Major expansion of GitHub PR thread parsing (severity, suggestions, collapsed threads, code context). |
> | src/content/extractor/generic.ts | Adds whitespace folding, form-safety expansion, optional collapsed parsing, and highlight integration. |
> | src/content/dom/githubExpander.ts | Makes thread toggling async, scoped to target review/thread, with loading waits. |
> | src/background/settings.ts | Adds `logFullPrompts` default and shared constants for default provider config. |
> | src/background/inference/ollama.ts | Adds cached availability, streaming generation, and abort support. |
> | src/background/inference/lmStudio.ts | Adds cached availability, streaming generation, and abort support. |
> | src/background/inference/index.ts | Passes `logFullPrompts` into Chrome AI provider. |
> | src/background/inference/deterministic.ts | Adds streaming callback and abort support. |
> | src/background/inference/chromeAI.ts | Adds richer API detection, streaming, timeout/abort handling, and optional full prompt logging. |
> | src/background/index.ts | Adds task-state storage, context menu enable/disable sync, progress logging to tab, streaming relay, and abort controller wiring. |
> | src/background/contextMenus.ts | Makes menu setup awaitable to support state syncing. |
> | public/manifest.json | Broadens host permissions, adds clipboard permission, and injects content CSS. |
> | package.json | Updates version, adds `jsdom`, and switches build to `node build.js`. |
> | package-lock.json | Locks updated deps including jsdom and its Node engine requirements. |
> | docs/initial_implementation_plan.md | Updates permission/version guidance (but currently inconsistent vs manifest). |
> | build.js | New build orchestrator for multi-entry extension output formats. |
> | README.md | Adds full project overview, structure, setup, and usage documentation. |
> | AGENTS.md | Adds detailed contributor/agent guidance and architectural constraints. |
> | .gitignore | Normalizes ignore patterns and adds common ignores. |
> | .github/copilot-instructions.md | Adds repo-specific Copilot guidance. |
> | .cursorrules | Adds Cursor-specific repo conventions and constraints. |
> </details>

**Copilot** (AI) _(2026-06-02T08:27:16.000Z)_ [AI]:
> Comment on lines +52 to +54

```diff
+### Prerequisites
+* [Node.js](https://nodejs.org/)                              (v18 or higher recommended)
+* [Google                              Chrome](https://www.google.com/chrome/) (Chrome 138+ required if testing the Chrome                              Built-in AI feature)
```

> `jsdom@28.1.0` requires Node.js `^20.19.0 || ^22.12.0 || >=24.0.0` (per package-lock), so the prerequisites here claiming Node 18+ will lead to install/runtime failures for contributors on Node 18. Update the documented Node requirement (or downgrade jsdom to a Node 18-compatible version).

```diff
# File: README.md
@@ -50,7 +50,7 @@
 ## 📦 Installation & Setup
 
 ### Prerequisites
-* [Node.js](https://nodejs.org/) (v18 or higher recommended)
+* [Node.js](https://nodejs.org/) (v20.19.0 or higher recommended)
 * [Google Chrome](https://www.google.com/chrome/) (Chrome 138+ required if testing the Chrome Built-in AI feature)
 
 ### 1. Build the Extension
```

### File: [src/popup/popup.html](./src/popup/popup.html)
**Copilot** (AI) _(2026-06-02T08:27:16.000Z)_ [AI]:
> Comment on lines +7 to +9

```diff
+<link rel="preconnect"                              href="https://fonts.googleapis.com">
+<link rel="preconnect"                              href="https://fonts.gstatic.com" crossorigin>
+<link                              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"                              rel="stylesheet">
```

> Chrome extension pages are blocked by a restrictive default CSP, so linking to Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) will typically be refused and can generate console errors. Prefer bundling fonts locally or rely on the existing system-font fallbacks.

```diff
# File: src/popup/popup.html
@@ -4,9 +4,6 @@
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>ContextScribe</title>
-<link rel="preconnect" href="https://fonts.googleapis.com">
-<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
-<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
 <style>
   :root {
     --bg-color: #0b0f19;
```

### File: [src/options/options.html](./src/options/options.html)
**Copilot** (AI) _(2026-06-02T08:27:17.000Z)_ [AI]:
> Comment on lines +7 to +9

```diff
+<link rel="preconnect"                              href="https://fonts.googleapis.com">
+<link rel="preconnect"                              href="https://fonts.gstatic.com" crossorigin>
+<link                              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"                              rel="stylesheet">
```

> Chrome extension pages are blocked by a restrictive default CSP, so linking to Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) will typically be refused and can generate console errors. Prefer bundling fonts locally or rely on the existing system-font fallbacks.

```diff
# File: src/options/options.html
@@ -4,9 +4,6 @@
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>ContextScribe Settings</title>
-<link rel="preconnect" href="https://fonts.googleapis.com">
-<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
-<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
 <style>
   :root {
     --bg-color: #0b0f19;
```

### File: [src/content/toast.css](./src/content/toast.css)
**Copilot** (AI) _(2026-06-02T08:27:17.000Z)_ [AI]:
> Comment on lines +1 to +2

```diff
+/* Import Inter Google Font directly                              within stylesheet */
+@import                              url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

> Loading Google Fonts via `@import` from a content-script stylesheet triggers an external request on every page and is frequently blocked by site CSP, which can cause noisy console errors and undermines the extension's “privacy-first” positioning. Prefer bundling the font locally or rely on the existing system fallback stack.

```diff
# File: src/content/toast.css
@@ -1,5 +1,4 @@
-/* Import Inter Google Font directly within stylesheet */
-@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
+/* Use system font stack; avoid remote @import which can be blocked by page/extension CSP */
 
 .contextscribe-toast {
   position: fixed;
```

### File: [src/background/index.ts](./src/background/index.ts)
**Copilot** (AI) _(2026-06-02T08:27:18.000Z)_ [AI]:
> Comment on lines 390 to +394

```diff
 } catch (error: any) {
-console.error("Error executing                              extraction flow:", error);
-await sendClipboardWrite(tabId, "",                              false, error.message || "An unexpected error occurred during extraction.");
+if (error.name === "AbortError" ||                              error.message?.includes("aborted")) {
+console.log("[ContextScribe SW]                              Extraction flow aborted by user.");
+await logToTab(tabId, "Task                              cancelled.", "warn");
+} else {
```

> When an extraction is aborted (`AbortError`), the service worker logs and clears `backgroundTask`, but it doesn't notify the content script to transition the progress badge out of the “running” state. This can leave the in-page progress UI stuck (especially for non-user aborts like provider timeouts). Consider sending an explicit completion/cancellation message to the tab so the content script can call `showProgressError(...)` / `stopProgress()` and clear UI state.

### File: [docs/initial_implementation_plan.md](./docs/initial_implementation_plan.md)
**Copilot** (AI) _(2026-06-02T08:27:18.000Z)_ [AI]:
> Comment on lines +161 to 167

```diff
+"version": "0.0.1",
 "permissions": [
 "contextMenus",
 "storage",
 "scripting",
 "tabs"
 ],
```

> The manifest example in this plan is out of sync with the repo: the extension is version 0.0.2 and now requests `clipboardWrite`, but this snippet still shows 0.0.1 and omits `clipboardWrite`. Also, the justification section below still references `host_permissions: ["https://github.com/*"]` even though the manifest is now `<all_urls>`.

### File: [public/manifest.json](./public/manifest.json)
**Copilot** (AI) _(2026-06-02T08:27:18.000Z)_ [AI]:
> Comment on lines 3 to 5

```diff
 "name": "ContextScribe",
-"version": "0.1.0",
+"version": "0.0.2",
 "description": "Structure-aware                              context capture and clean Markdown conversion",
```

> PR description mentions aligning versions to `0.0.1`, but the manifest/package/options UI in this PR are set to `0.0.2` (and the implementation plan snippet was updated to `0.0.1`). Please reconcile which version is intended and update the PR description/docs or the version fields accordingly to avoid confusion.