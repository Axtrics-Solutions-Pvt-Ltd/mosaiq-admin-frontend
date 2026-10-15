"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

// The template link for a CSV import scope. Templates are blank (header rows
// only) unless the admin asks for the example rows.
export function CsvTemplateDownload({
  templateHref,
  variant = "outline",
}: {
  templateHref: (isSample: boolean) => string;
  variant?: "outline" | "ghost";
}) {
  const [isSample, setIsSample] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild size="sm" variant={variant}>
        <a download href={templateHref(isSample)}>
          <Download aria-hidden className="size-4" /> Download template
        </a>
      </Button>
      <label className="text-muted-foreground flex items-center gap-2 text-xs">
        <Checkbox
          checked={isSample}
          onChange={(event) => setIsSample(event.target.checked)}
        />
        Include example rows
      </label>
    </div>
  );
}
