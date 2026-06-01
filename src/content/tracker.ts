let lastClickedElement: HTMLElement | null = null;

// Track the element that was right-clicked
document.addEventListener(
  "contextmenu",
  (event: MouseEvent) => {
    lastClickedElement = event.target as HTMLElement;
  },
  { capture: true, passive: true }
);

/**
 * Returns the last right-clicked element, falling back to selection common containers,
 * active inputs, or the document body if nothing is tracked.
 */
export function getLastClickedElement(): HTMLElement {
  if (lastClickedElement && document.body.contains(lastClickedElement)) {
    return lastClickedElement;
  }

  // Fallback 1: Text Selection container
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    return (
      container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement
    ) as HTMLElement;
  }

  // Fallback 2: Active input element
  if (document.activeElement && document.activeElement instanceof HTMLElement) {
    return document.activeElement;
  }

  // Fallback 3: Page body
  return document.body;
}
