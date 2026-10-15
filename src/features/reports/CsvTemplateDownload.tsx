"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

import type { CsvTemplateFormat } from "./csv-import";

const formatButtons: Record<
  CsvTemplateFormat,
  { label: string; title: string }
> = {
  csv: {
    label: "Download as one file",
    title:
      "Every card in one CSV. Keep the lines that start with # as they are.",
  },
  zip: {
    label: "Download as zip",
    title: "One CSV per card, in a folder per tab.",
  },
};

// The template links for a CSV import scope. Templates are blank (header rows
// only) unless the admin asks for the example rows. With more than one
// format, each gets its own button; with one, a single "Download template".
export function CsvTemplateDownload({
  templateHref,
  formats = ["csv"],
  variant = "outline",
}: {
  templateHref: (isSample: boolean, format: CsvTemplateFormat) => string;
  formats?: readonly CsvTemplateFormat[];
  variant?: "outline" | "ghost";
}) {
  const [isSample, setIsSample] = useState(false);
  const isSingle = formats.length === 1;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {formats.map((format) => (
        <Button asChild key={format} size="sm" variant={variant}>
          <a
            download
            href={templateHref(isSample, format)}
            title={isSingle ? undefined : formatButtons[format].title}
          >
            <Download aria-hidden className="size-4" />{" "}
            {isSingle ? "Download template" : formatButtons[format].label}
          </a>
        </Button>
      ))}
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
