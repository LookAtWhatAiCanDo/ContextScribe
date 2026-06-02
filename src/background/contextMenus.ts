import { BUILTIN_RECIPES } from "../shared/config/recipes";
import { BUILTIN_LENSES } from "../shared/config/lenses";
import { BUILTIN_ADAPTERS } from "../shared/config/adapters";

export function setupContextMenus(): Promise<void> {
  return new Promise<void>((resolve) => {
    // Clear any existing menus first to avoid duplicate ID errors
    chrome.contextMenus.removeAll(() => {
    // Root Menu
    chrome.contextMenus.create({
      id: "parent_scribe",
      title: "ContextScribe",
      contexts: ["all"]
    });

    // Core Actions
    chrome.contextMenus.create({
      id: "action_copy_raw",
      parentId: "parent_scribe",
      title: "Copy Raw Markdown",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "action_copy_clean",
      parentId: "parent_scribe",
      title: "Copy Clean Markdown",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "action_summarize",
      parentId: "parent_scribe",
      title: "Summarize with AI",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "action_copy_ai_agent",
      parentId: "parent_scribe",
      title: "Copy for AI Agent",
      contexts: ["all"]
    });

    // Separator
    chrome.contextMenus.create({
      id: "sep_1",
      parentId: "parent_scribe",
      type: "separator",
      contexts: ["all"]
    });

    // Recipes Submenu
    chrome.contextMenus.create({
      id: "sub_recipes",
      parentId: "parent_scribe",
      title: "Recipes ⚡",
      contexts: ["all"]
    });

    BUILTIN_RECIPES.forEach(recipe => {
      chrome.contextMenus.create({
        id: `recipe:${recipe.id}`,
        parentId: "sub_recipes",
        title: recipe.name,
        contexts: ["all"]
      });
    });

    // Lenses Submenu
    chrome.contextMenus.create({
      id: "sub_lenses",
      parentId: "parent_scribe",
      title: "Lenses 🔍",
      contexts: ["all"]
    });

    BUILTIN_LENSES.forEach(lens => {
      chrome.contextMenus.create({
        id: `lens:${lens.id}`,
        parentId: "sub_lenses",
        title: lens.focusArea.length > 30 ? lens.name : `${lens.name} (${lens.focusArea})`,
        contexts: ["all"]
      });
    });

    // Destination Adapters Submenu
    chrome.contextMenus.create({
      id: "sub_adapters",
      parentId: "parent_scribe",
      title: "Destination Adapters 📋",
      contexts: ["all"]
    });

    BUILTIN_ADAPTERS.forEach(adapter => {
      chrome.contextMenus.create({
        id: `adapter:${adapter.id}`,
        parentId: "sub_adapters",
        title: adapter.name,
        contexts: ["all"]
      });
    });

    // Separator for GitHub PR Tools
    chrome.contextMenus.create({
      id: "sep_github",
      parentId: "parent_scribe",
      type: "separator",
      contexts: ["all"]
    });

    // GitHub PR Tools Submenu
    chrome.contextMenus.create({
      id: "sub_github",
      parentId: "parent_scribe",
      title: "GitHub PR Tools 🐙",
      contexts: ["all"],
      // Only show context menus on GitHub URL matching pull requests if possible
      documentUrlPatterns: ["*://github.com/*/pull/*"]
    });

    chrome.contextMenus.create({
      id: "gh:copy_selected",
      parentId: "sub_github",
      title: "Copy Selected Review Thread",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "gh:copy_active",
      parentId: "sub_github",
      title: "Copy All Active Comments",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "gh:copy_unresolved",
      parentId: "sub_github",
      title: "Copy All Unresolved Comments",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "gh:copy_resolved",
      parentId: "sub_github",
      title: "Copy All Resolved Comments",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "gh:sep",
      parentId: "sub_github",
      type: "separator",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "gh:expand_resolved",
      parentId: "sub_github",
      title: "Expand Resolved Comments",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "gh:collapse_resolved",
      parentId: "sub_github",
      title: "Collapse Resolved Comments",
      contexts: ["all"]
    });

    chrome.contextMenus.create({
      id: "gh:toggle_resolved",
      parentId: "sub_github",
      title: "Toggle Resolved Comments",
      contexts: ["all"]
    });
    resolve();
    });
  });
}
