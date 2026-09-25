"use client";

import { useSyncExternalStore } from "react";

function supportsMatchMedia() {
  return (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
  );
}

// Whether a CSS media query matches. It is false on the server and wherever
// matchMedia is missing, so layouts start from their narrow form.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      if (!supportsMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => supportsMatchMedia() && window.matchMedia(query).matches,
    () => false,
  );
}
