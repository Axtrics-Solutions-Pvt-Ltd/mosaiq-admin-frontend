import type { ReactNode } from "react";
export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="bg-strong pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 rounded-sm px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg group-focus-within:block group-hover:block"
      >
        {content}
      </span>
    </span>
  );
}
