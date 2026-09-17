"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-4 py-12">
          <h1 className="text-2xl font-semibold">
            MOSAIQ Admin could not load
          </h1>
          <p>Try loading the application again.</p>
          <button
            className="bg-primary text-primary-foreground rounded-sm px-4 py-2 font-medium"
            onClick={retry}
            type="button"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
