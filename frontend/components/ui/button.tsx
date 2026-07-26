import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-[var(--sb-primary-hover)] to-[var(--sb-primary)] text-[var(--sb-primary-foreground)] shadow-[0_4px_16px_rgba(228,41,63,0.35)] hover:from-[var(--sb-primary-hover)] hover:to-[var(--sb-primary-hover)] active:to-[var(--sb-primary-active)]",
  secondary:
    "border border-[var(--sb-border-strong)] bg-transparent text-[var(--sb-text)] hover:bg-[var(--sb-bg-panel-hover)]",
  ghost: "bg-transparent text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)]",
  destructive: "bg-[var(--sb-danger)] text-white hover:brightness-110",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-sm gap-2",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-[var(--sb-radius-sm)] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClasses(variant, size, className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
