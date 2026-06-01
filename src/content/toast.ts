/**
 * Injects a stylish glassmorphic toast notification directly into the webpage.
 */
export function showToast(message: string, type: "success" | "error" | "info" = "success"): void {
  // Remove any existing toasts first
  const existing = document.querySelectorAll(".contextscribe-toast");
  existing.forEach(el => el.remove());

  const toast = document.createElement("div");
  toast.className = `contextscribe-toast contextscribe-toast-${type}`;
  toast.textContent = message;

  // Add styles dynamically to avoid requiring separate file injection permissions in manifest
  const styleId = "contextscribe-toast-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .contextscribe-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        padding: 14px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: #ffffff !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.18);
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
      }
      
      .contextscribe-toast-success {
        background: rgba(16, 185, 129, 0.85); /* Vibrant green glass */
      }
      
      .contextscribe-toast-error {
        background: rgba(239, 68, 68, 0.85); /* Vibrant red glass */
      }
      
      .contextscribe-toast-info {
        background: rgba(59, 130, 246, 0.85); /* Vibrant blue glass */
      }
      
      .contextscribe-toast.show {
        transform: translateY(0);
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Force reflow
  toast.offsetHeight;

  // Slide up
  toast.classList.add("show");

  // Dismiss after delay
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
