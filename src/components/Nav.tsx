"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cx } from "./ui";

const LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/medicines", label: "Medicines", icon: PillIcon },
  { href: "/treatments", label: "Treatments", icon: CalendarIcon },
  { href: "/expiring", label: "Expiring", icon: ClockIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">
            M
          </span>
          MedHome
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, link.href)
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted hover:bg-black/5 hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-brand-700" : "text-muted",
              )}
            >
              <Icon className={cx("h-5 w-5", active && "text-brand-600")} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}

type IconProps = { className?: string };

function base(props: IconProps) {
  return {
    className: props.className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function PillIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M8.5 8.5 15.5 15.5" />
    </svg>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function HistoryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4.5l3 1.8" />
    </svg>
  );
}
