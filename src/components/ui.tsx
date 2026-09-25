import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700 shadow-sm disabled:bg-brand-600/50",
  secondary:
    "bg-white text-ink border border-line hover:bg-canvas active:bg-canvas disabled:opacity-60",
  ghost: "bg-transparent text-muted hover:bg-black/5 active:bg-black/10 disabled:opacity-60",
  danger:
    "bg-danger-50 text-danger-700 border border-danger-100 hover:bg-danger-100 disabled:opacity-60",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-[15px] rounded-xl",
  lg: "h-13 px-5 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("h-4 w-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface shadow-sm", className)}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  action,
  count,
}: {
  title: string;
  action?: ReactNode;
  count?: number;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
        {title}
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-muted">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      {icon && <div className="text-2xl">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

const CONTROL_BASE =
  "w-full rounded-xl border border-line bg-white px-3.5 text-ink placeholder:text-muted/60 " +
  "focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 " +
  "disabled:bg-canvas disabled:text-muted transition";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1 text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger-500">*</span>}
        {hint && <span className="ml-auto text-xs font-normal text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-danger-600">{error}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(CONTROL_BASE, "h-12", className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(CONTROL_BASE, "min-h-20 py-3", className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(CONTROL_BASE, "h-12 appearance-none pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235b6b7a' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        backgroundSize: "18px",
      }}
    >
      {children}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3.5 py-3 text-sm font-medium text-danger-700"
    >
      <span aria-hidden="true">!</span>
      <span>{message}</span>
    </div>
  );
}

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "brand" | "danger" | "warn" | "info";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-black/5 text-muted",
    brand: "bg-brand-50 text-brand-700",
    danger: "bg-danger-50 text-danger-700",
    warn: "bg-warn-50 text-warn-700",
    info: "bg-info-50 text-info-700",
  } as const;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SkeletonRow() {
  return <div className="h-14 animate-pulse rounded-xl bg-black/5" />;
}
