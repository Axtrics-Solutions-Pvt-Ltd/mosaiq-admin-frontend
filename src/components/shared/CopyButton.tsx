"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { copyText } from "@/lib/utils/clipboard";

export function CopyButton({
  label,
  size = "sm",
  value,
}: {
  // The accessible name. It starts with "Copy" so it contains the visible
  // text, for example "Copy link URL".
  label: string;
  size?: "sm" | "icon";
  value: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timer = window.setTimeout(() => setIsCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [isCopied]);

  async function copy() {
    if (await copyText(value)) setIsCopied(true);
    else
      toast({
        title: "Copy failed",
        description: "Select the text and copy it manually.",
        tone: "error",
      });
  }

  const Icon = isCopied ? Check : Copy;
  return (
    <>
      <Button
        aria-label={label}
        onClick={copy}
        size={size}
        type="button"
        variant="outline"
      >
        <Icon aria-hidden className="size-4" />
        {size === "sm" && (isCopied ? "Copied" : "Copy")}
      </Button>
      <span aria-live="polite" className="sr-only">
        {isCopied ? "Copied to clipboard" : ""}
      </span>
    </>
  );
}
