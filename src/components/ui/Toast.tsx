"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils/cn";

const icons = { info: Info, success: CheckCircle2, error: XCircle };

export function Toast({
  children,
  title,
  tone = "info",
  onDismiss,
  isClosing = false,
}: {
  children?: ReactNode;
  title: string;
  tone?: "info" | "success" | "error";
  onDismiss?: () => void;
  isClosing?: boolean;
}) {
  const Icon = icons[tone];
  return (
    <div
      className={cn(
        "bg-card flex gap-3 rounded-lg border p-4 shadow-lg",
        isClosing ? "animate-toast-out" : "animate-toast-in",
        tone === "success" && "border-green-200",
        tone === "error" && "border-red-200",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon
        aria-hidden
        className={cn(
          "text-info mt-0.5 size-5 shrink-0",
          tone === "success" && "text-success",
          tone === "error" && "text-destructive",
        )}
      />
      <div className="flex-1">
        <p className="text-strong font-medium">{title}</p>
        {children && (
          <div className="text-muted-foreground mt-1 text-sm">{children}</div>
        )}
      </div>
      {onDismiss && (
        <button
          aria-label="Dismiss notification"
          className="text-muted-foreground hover:text-foreground -m-1 shrink-0 rounded-sm p-1"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}

type ToastTone = "info" | "success" | "error";

type ToastOptions = {
  title: string;
  description?: ReactNode;
  tone?: ToastTone;
  duration?: number;
};

type ToastRecord = ToastOptions & { id: string; isClosing: boolean };

const DEFAULT_DURATION = 5000;

let nextId = 0;
function generateToastId() {
  nextId += 1;
  return `toast-${nextId}`;
}

let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

const emptyToasts: ToastRecord[] = [];
function getServerSnapshot(): ToastRecord[] {
  return emptyToasts;
}

function isClientRendered() {
  return true;
}

function isServerRendered() {
  return false;
}

function removeToast(id: string) {
  const timeout = timeouts.get(id);
  if (timeout) {
    clearTimeout(timeout);
    timeouts.delete(id);
  }
  toasts = toasts.filter((entry) => entry.id !== id);
  notify();
}

export function dismissToast(id: string) {
  toasts = toasts.map((entry) =>
    entry.id === id ? { ...entry, isClosing: true } : entry,
  );
  notify();
  setTimeout(() => removeToast(id), 150);
}

export function toast({
  title,
  description,
  tone = "info",
  duration = DEFAULT_DURATION,
}: ToastOptions) {
  const id = generateToastId();
  toasts = [...toasts, { id, title, description, tone, isClosing: false }];
  notify();
  timeouts.set(
    id,
    setTimeout(() => dismissToast(id), duration),
  );
  return id;
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isMounted = useSyncExternalStore(
    () => () => {},
    isClientRendered,
    isServerRendered,
  );

  if (!isMounted) return null;

  return createPortal(
    <div
      aria-atomic="false"
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
    >
      {items.map((item) => (
        <div className="pointer-events-auto" key={item.id}>
          <Toast
            isClosing={item.isClosing}
            onDismiss={() => dismissToast(item.id)}
            title={item.title}
            tone={item.tone}
          >
            {item.description}
          </Toast>
        </div>
      ))}
    </div>,
    document.body,
  );
}
