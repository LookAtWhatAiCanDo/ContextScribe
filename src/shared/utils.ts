/**
 * Maps background logging statements into clean, user-friendly labels.
 */
export function cleanProgressMessage(message: string): string {
  if (message.includes("Executing extraction pipeline")) return "Starting extraction pipeline...";
  if (message.includes("Sending EXTRACT_NODE")) return "Extracting webpage content...";
  if (message.includes("Successfully parsed document")) return "Parsing page structure...";
  if (message.includes("Loading Recipe")) return "Applying recipe and lens filters...";
  if (message.includes("Running AI inference")) return "Starting AI inference...";
  if (message.includes("Checking availability")) return "Connecting to AI model...";
  if (message.includes("Generating model response")) return "Generating AI response (may take a moment)...";
  if (message.includes("Model response received")) return "Finalizing response...";
  if (message.includes("Writing formatted string") || message.includes("WRITE_CLIPBOARD")) return "Writing to clipboard...";
  if (message.includes("Model download is in progress")) return "Downloading AI model...";
  
  if (message.includes("session created") || message.includes("model loaded")) return "AI model loaded...";
  
  if (message.length < 50) return message;
  return "Processing context...";
}
