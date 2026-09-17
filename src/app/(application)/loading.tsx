export default function ApplicationLoading() {
  return (
    <main className="min-h-screen p-4 sm:p-6" aria-busy="true">
      <p className="sr-only">Loading application preview</p>
      <div className="bg-card mx-auto h-44 max-w-5xl animate-pulse rounded-lg border" />
    </main>
  );
}
