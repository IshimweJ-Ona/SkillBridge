import { Loader2 } from "@/lib/icons";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "accent";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-[var(--sb-primary-hover)] to-[var(--sb-primary)] text-[var(--sb-primary-foreground)] shadow-[0_4px_18px_-2px_var(--sb-primary-glow)] hover:from-[var(--sb-primary-hover)] hover:to-[var(--sb-primary-hover)] hover:shadow-[0_6px_22px_-2px_var(--sb-primary-glow)] active:to-[var(--sb-primary-active)] active:scale-[0.98]",
  accent:
    "bg-gradient-to-b from-[var(--sb-accent-hover)] to-[var(--sb-accent)] text-[var(--sb-accent-foreground)] shadow-[0_4px_18px_-2px_rgba(230,165,60,0.35)] hover:brightness-105 active:scale-[0.98]",
  secondary:
    "border border-[var(--sb-border-strong)] bg-[var(--sb-bg-panel)] text-[var(--sb-text)] hover:bg-[var(--sb-bg-panel-hover)] hover:border-[var(--sb-text-faint)] active:scale-[0.98]",
  ghost: "bg-transparent text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] hover:text-[var(--sb-text)] active:scale-[0.98]",
  destructive: "bg-[var(--sb-danger)] text-white shadow-[0_4px_18px_-2px_rgba(240,67,95,0.35)] hover:brightness-110 active:scale-[0.98]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-sm gap-2",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-[var(--sb-radius-sm)] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
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
