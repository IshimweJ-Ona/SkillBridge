import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leadingIcon, trailing, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--sb-text-muted)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 flex text-[var(--sb-text-faint)]">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={cn(
              "h-10 w-full rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 text-sm text-[var(--sb-text)] placeholder:text-[var(--sb-text-faint)] transition-colors focus:border-[var(--sb-primary)] focus:outline-none",
              leadingIcon && "pl-9",
              trailing && "pr-9",
              error && "border-[var(--sb-danger)]",
              className,
            )}
            {...props}
          />
          {trailing && <span className="absolute right-3 flex items-center">{trailing}</span>}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--sb-danger)]">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--sb-text-faint)]">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--sb-text-muted)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            "min-h-24 w-full resize-y rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 py-2 text-sm text-[var(--sb-text)] placeholder:text-[var(--sb-text-faint)] transition-colors focus:border-[var(--sb-primary)] focus:outline-none",
            error && "border-[var(--sb-danger)]",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--sb-danger)]">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
