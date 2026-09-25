// Copies text with the async clipboard API when the browser allows it, and
// falls back to a hidden textarea with `execCommand("copy")` where that API is
// missing or refused (plain-HTTP previews, older browsers).
export async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission refused; try the fallback below.
    }
  }
  return copyWithTextarea(text);
}

function copyWithTextarea(text: string) {
  if (typeof document === "undefined") return false;
  const focused = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  let isCopied = false;
  try {
    isCopied = document.execCommand("copy");
  } catch {
    isCopied = false;
  }
  textarea.remove();
  if (focused instanceof HTMLElement) focused.focus();
  return isCopied;
}
