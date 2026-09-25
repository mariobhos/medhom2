"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "./ui";

/** Debounced search box that keeps the query in the URL so it is shareable. */
export function SearchInput({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 220);

    return () => clearTimeout(timer);
    // `searchParams` is intentionally omitted: only user typing should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname, router]);

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-xl border border-line bg-white pr-10 pl-10 text-ink placeholder:text-muted/60 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
      />
      {pending && (
        <Spinner className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" />
      )}
    </div>
  );
}
