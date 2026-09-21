"use client";

import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

type BaseProps<Option> = {
  action?: ReactNode;
  ariaDescribedBy?: string;
  disabled?: boolean;
  errorMessage?: string;
  getKey: (option: Option) => string;
  getLabel: (option: Option) => string;
  hasNextPage?: boolean;
  id: string;
  isFetchingNextPage?: boolean;
  isInvalid?: boolean;
  isLoading?: boolean;
  loadNextPage?: () => void;
  onRetry?: () => void;
  onSearchChange: (search: string) => void;
  options: readonly Option[];
  placeholder: string;
  renderOption: (option: Option) => ReactNode;
  searchPlaceholder?: string;
};

type Props<Option> =
  | (BaseProps<Option> & {
      mode: "single";
      onChange: (option: Option) => void;
      value?: Option;
    })
  | (BaseProps<Option> & {
      mode: "multiple";
      onChange: (options: Option[]) => void;
      value: readonly Option[];
    });

const PANEL_HEIGHT_ESTIMATE = 360;

export function PaginatedCombobox<Option>(props: Props<Option>) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const onSearchChange = props.onSearchChange;
  const selectedKeys = new Set(
    props.mode === "single"
      ? props.value
        ? [props.getKey(props.value)]
        : []
      : props.value.map(props.getKey),
  );
  const triggerLabel =
    props.mode === "single"
      ? props.value
        ? props.getLabel(props.value)
        : props.placeholder
      : props.value.length
        ? `${props.value.length} workspace${props.value.length === 1 ? "" : "s"} selected`
        : props.placeholder;

  useEffect(() => {
    const timeout = window.setTimeout(() => onSearchChange(search), 300);
    return () => window.clearTimeout(timeout);
  }, [onSearchChange, search]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const trigger = rootRef.current?.getBoundingClientRect();
    if (trigger) {
      const spaceBelow = window.innerHeight - trigger.bottom;
      const spaceAbove = trigger.top;
      setOpenUpward(
        spaceBelow < PANEL_HEIGHT_ESTIMATE && spaceAbove > spaceBelow,
      );
    }
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [isOpen]);

  function choose(option: Option) {
    if (props.mode === "single") {
      props.onChange(option);
      setIsOpen(false);
      setSearch("");
      props.onSearchChange("");
    } else {
      const key = props.getKey(option);
      props.onChange(
        selectedKeys.has(key)
          ? props.value.filter((entry) => props.getKey(entry) !== key)
          : [...props.value, option],
      );
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") setIsOpen(false);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, props.options.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (
      event.key === "Enter" &&
      activeIndex >= 0 &&
      props.options[activeIndex]
    ) {
      event.preventDefault();
      choose(props.options[activeIndex]);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-describedby={props.ariaDescribedBy}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="bg-card text-strong hover:border-border-strong focus-visible:ring-ring disabled:bg-muted data-[invalid=true]:border-destructive flex min-h-10 w-full items-center justify-between gap-3 rounded-sm border px-3 text-left shadow-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
        data-invalid={props.isInvalid}
        disabled={props.disabled}
        id={props.id}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span
          className={cn(
            "truncate",
            !selectedKeys.size && "text-muted-foreground",
          )}
        >
          {triggerLabel}
        </span>
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-4 shrink-0"
        />
      </button>
      {isOpen && (
        <div
          className={cn(
            "bg-card absolute z-40 w-full min-w-72 overflow-hidden rounded-lg border shadow-[var(--shadow-overlay)]",
            openUpward ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          <div className="relative border-b p-2">
            <Search
              aria-hidden
              className="text-muted-foreground absolute top-1/2 left-5 size-4 -translate-y-1/2"
            />
            <Input
              aria-label={props.searchPlaceholder ?? "Search"}
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
              }
              aria-autocomplete="list"
              aria-controls={listboxId}
              className="pl-9"
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder={props.searchPlaceholder ?? "Search"}
              ref={inputRef}
              role="combobox"
              value={search}
            />
          </div>
          <div
            aria-busy={props.isLoading || props.isFetchingNextPage}
            aria-multiselectable={props.mode === "multiple" || undefined}
            className="max-h-72 overflow-y-auto p-1.5"
            id={listboxId}
            onScroll={(event) => {
              const list = event.currentTarget;
              if (
                props.hasNextPage &&
                !props.isFetchingNextPage &&
                list.scrollHeight - list.scrollTop - list.clientHeight < 48
              )
                props.loadNextPage?.();
            }}
            role="listbox"
          >
            {props.isLoading && (
              <p className="text-muted-foreground flex items-center gap-2 px-3 py-4 text-sm">
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
                Loading...
              </p>
            )}
            {!props.isLoading && props.errorMessage && (
              <div className="space-y-2 px-3 py-3 text-sm">
                <p className="text-destructive" role="alert">
                  {props.errorMessage}
                </p>
                <Button
                  onClick={props.onRetry}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            )}
            {!props.isLoading &&
              !props.errorMessage &&
              props.options.length === 0 && (
                <p className="text-muted-foreground px-3 py-4 text-sm">
                  No results found.
                </p>
              )}
            {!props.isLoading &&
              !props.errorMessage &&
              props.options.map((option, index) => {
                const key = props.getKey(option);
                const isSelected = selectedKeys.has(key);
                return (
                  <button
                    aria-selected={isSelected}
                    className={cn(
                      "hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm focus-visible:outline-none",
                      index === activeIndex && "bg-muted",
                    )}
                    id={`${listboxId}-${index}`}
                    key={key}
                    onClick={() => choose(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      {props.renderOption(option)}
                    </span>
                    <Check
                      aria-hidden
                      className={cn(
                        "text-primary size-4",
                        !isSelected && "invisible",
                      )}
                    />
                  </button>
                );
              })}
            {props.hasNextPage && !props.errorMessage && (
              <Button
                className="mt-1 w-full"
                disabled={props.isFetchingNextPage}
                onClick={props.loadNextPage}
                size="sm"
                type="button"
                variant="ghost"
              >
                {props.isFetchingNextPage ? "Loading more..." : "Load more"}
              </Button>
            )}
          </div>
          {props.action && (
            <div className="border-t p-2" onClick={() => setIsOpen(false)}>
              {props.action}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
