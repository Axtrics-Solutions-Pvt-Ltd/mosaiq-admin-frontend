"use client";

import { Button } from "@/components/ui/Button";

export default function ApplicationError({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="bg-card w-full max-w-lg rounded-lg border p-6">
        <h1 className="text-strong text-xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-2">
          This page could not load. Try again, and if the problem continues,
          sign in again.
        </p>
        <Button className="mt-5" onClick={retry} type="button">
          Try again
        </Button>
      </section>
    </main>
  );
}
