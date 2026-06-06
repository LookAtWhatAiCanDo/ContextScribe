let overlayElement: HTMLDivElement | null = null;
let activeTarget: HTMLElement | null = null;

function updateOverlayPosition() {
  if (!overlayElement || !activeTarget) return;
  
  const rect = activeTarget.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();
  
  // Calculate top and left relative to document.body
  // This handles body margins, padding, and positioning contexts perfectly
  const top = rect.top - bodyRect.top;
  const left = rect.left - bodyRect.left;
  const width = rect.width;
  const height = rect.height;
  
  overlayElement.style.top = `${top}px`;
  overlayElement.style.left = `${left}px`;
  overlayElement.style.width = `${width}px`;
  overlayElement.style.height = `${height}px`;
}

function getOrCreateOverlay(): HTMLDivElement {
  if (!overlayElement) {
    overlayElement = document.createElement("div");
    overlayElement.id = "context-scribe-highlight-overlay";
    overlayElement.style.position = "absolute"; // Absolute relative to document.body so it scrolls natively
    overlayElement.style.pointerEvents = "none"; // Make sure it doesn't block mouse interactions
    overlayElement.style.zIndex = "2147483647"; // Float above everything
    overlayElement.style.boxSizing = "border-box";
    overlayElement.style.borderRadius = "8px";
    overlayElement.style.border = "3px solid rgba(46, 164, 79, 0.85)"; // Opaque light green border
    overlayElement.style.backgroundColor = "rgba(46, 164, 79, 0.08)"; // Transparent green tint
    overlayElement.style.boxShadow = "0 0 16px rgba(46, 164, 79, 0.3)";
    // Transition opacity and transform only. Do NOT transition top/left/width/height to avoid scrolling lag.
    overlayElement.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    overlayElement.style.opacity = "0";
    overlayElement.style.transform = "scale(0.99)";
    document.body.appendChild(overlayElement);
  }
  return overlayElement;
}

export function highlightElement(el: HTMLElement) {
  activeTarget = el;
  const overlay = getOrCreateOverlay();
  
  // Set initial position and fade in
  updateOverlayPosition();
  
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    overlay.style.transform = "scale(1)";
  });
  
  // Listeners to recalculate placement on layout shifts and window resizes
  window.addEventListener("resize", updateOverlayPosition, { passive: true });
}

export function clearHighlightNow() {
  window.removeEventListener("resize", updateOverlayPosition);
  
  if (overlayElement) {
    overlayElement.style.opacity = "0";
    overlayElement.style.transform = "scale(0.99)";
  }
  activeTarget = null;
}

export function startRemoveHighlightTimer() {
  if (activeTarget) {
    setTimeout(() => {
      // Check if this target is still active before clearing
      clearHighlightNow();
    }, 5000); // 5 second delay after processing complete
  }
}
