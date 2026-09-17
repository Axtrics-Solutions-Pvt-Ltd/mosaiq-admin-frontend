import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border border-border bg-card text-foreground hover:border-border-strong hover:bg-muted",
        secondary: "bg-primary-soft text-primary hover:bg-blue-100",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive text-white hover:bg-red-800",
      },
      size: { default: "h-10", sm: "h-9 min-h-9 px-3", icon: "size-10 p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({
  asChild = false,
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(buttonVariants({ className, variant, size }))}
      {...props}
    />
  );
}
export { buttonVariants };
