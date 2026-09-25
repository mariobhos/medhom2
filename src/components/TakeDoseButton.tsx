"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";
import { ApiError, apiRequest } from "@/lib/client";
import type { TreatmentDto } from "@/lib/types";

/**
 * The single most used action in the app: one tap records the dose and
 * deducts it from the first-expiring package.
 */
export function TakeDoseButton({
  treatment,
  size = "md",
  className,
}: {
  treatment: TreatmentDto;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function takeDose() {
    setError(null);
    setState("saving");

    try {
      await apiRequest(`/api/treatments/${treatment.id}/doses`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setState("done");
      router.refresh();
      setTimeout(() => setState("idle"), 2000);
    } catch (caught) {
      setState("idle");
      setError(caught instanceof ApiError ? caught.message : "Could not record the dose.");
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size={size}
        onClick={takeDose}
        loading={state === "saving"}
        variant={state === "done" ? "secondary" : "primary"}
        className="w-full"
      >
        {state === "done" ? "Dose recorded" : `Take dose · ${treatment.doseQuantity} ${treatment.unit}`}
      </Button>
      {error && <p className="mt-1.5 text-xs font-medium text-danger-600">{error}</p>}
    </div>
  );
}
