# ContextScribe GitHub Copilot Instructions

This repository is **ContextScribe**, a Chrome Extension (Manifest V3) built with Vite and TypeScript. 

When generating code suggestions, refactorings, or explanations, follow these conventions:

## Codebase Map & Responsibilities
- **Background SW (`src/background/`)**: Manages extension life cycles, context menu layout, storage syncing, and hosts all network fetch functions to avoid CORS restrictions on pages.
- **Content Scripts (`src/content/`)**: Injected into pages to capture the targeted elements and execute clipboards writes. Contains the glassmorphic Toast overlay.
- **Popup UI (`src/popup/`)**: Browser action popup interface for quick settings checks.
- **Options UI (`src/options/`)**: Dedicated settings page for provider URLs, keys, and default profiles.
- **Shared Utils (`src/shared/`)**: Types contracts, structural Intermediate Representation (IR), and serializers formatting documents.

## Critical Manifest V3 Rules
- **No Background DOM Access**: Service workers have no `window` or `document`. Never import or run DOM-interacting code inside `src/background/`.
- **Clipboard Isolation**: Background scripts cannot execute clipboard operations. All writes must be handled in the content script under `src/content/` by sending it a `WRITE_CLIPBOARD` message.
- **API Network Requests**: Content scripts cannot directly contact external model servers (like Ollama or LM Studio) due to CORS. Background scripts must receive details and proxy the request.
- **Manifest Permissions**: Do not add unnecessary permissions to `public/manifest.json`. Only request minimum required permissions (`contextMenus`, `storage`, `scripting`, `tabs`, `<all_urls>`).

## Coding Conventions
- **TypeScript**: Always provide typed definitions. Ensure types resolve correctly via `./src/shared/types.ts`.
- **Vanilla CSS styling**: Write raw CSS for custom interfaces (Popup, Options, and content Toasts) using contemporary layout methods (Flexbox, Grid), HSL colors, CSS variables, and modern visual tokens (e.g. glassmorphism).
- **DOM Parsers**: Prioritize attribute-based stability. Avoid depending solely on ephemeral layout CSS classes on major platforms (like GitHub PR comment boards).
- **Form Safety**: Never scrape inputs where `type="password"`, `type="hidden"`, or containing sensitive token variables.
- **Vite Bundler Config**: Do not modify Vite's configurations in `vite.config.ts` to minify or change output entry structures, as readable scripts are needed for review.
