import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { routes } from "@/config/routes";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-4 py-12">
      <p className="text-primary font-medium">404</p>
      <h1 className="text-strong text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        The requested MOSAIQ Admin page does not exist.
      </p>
      <Button asChild>
        <Link href={routes.login}>Return to login preview</Link>
      </Button>
    </main>
  );
}
