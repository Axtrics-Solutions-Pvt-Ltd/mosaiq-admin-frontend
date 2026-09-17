"use client";

import { Button } from "@/components/ui/Button";

export default function ApplicationError({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="bg-card w-full max-w-lg rounded-lg border p-6">
        <h1 className="text-strong text-xl font-semibold">
          Application preview could not load
        </h1>
        <p className="text-muted-foreground mt-2">
          Retry the route. If the problem continues, return to the login
          preview.
        </p>
        <Button className="mt-5" onClick={retry} type="button">
          Try again
        </Button>
      </section>
    </main>
  );
}
