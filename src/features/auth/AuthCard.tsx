import type { ReactNode } from "react";

export function AuthCard({
  children,
  description,
  eyebrow = "MOSAIQ Admin",
  footer,
  isPreview = true,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  footer?: ReactNode;
  isPreview?: boolean;
  title: string;
}) {
  return (
    <div>
      <p className="text-primary text-sm font-semibold">{eyebrow}</p>
      <h1 className="text-strong mt-2 text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground mt-3 leading-6">{description}</p>
      <div className="bg-card mt-7 rounded-xl border p-5 shadow-sm sm:p-7">
        {children}
      </div>
      {footer && (
        <div className="text-muted-foreground mt-5 text-center text-sm">
          {footer}
        </div>
      )}
      {isPreview && (
        <p className="text-muted-foreground mt-6 text-center text-xs">
          UI preview &middot; No account, email, or session operation occurs
        </p>
      )}
    </div>
  );
}
