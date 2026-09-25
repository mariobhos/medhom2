"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MedicineForm } from "./MedicineForm";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

/**
 * "Standing in front of the cabinet" flow: name, strength, quantity and expiry
 * in one sheet, then straight to the medicine.
 */
export function AddMedicineButton({
  label = "Add medicine",
  full = false,
}: {
  label?: string;
  full?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="md" className={full ? "w-full" : undefined} onClick={() => setOpen(true)}>
        <PlusIcon />
        {label}
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add medicine"
        description="Add the package you are holding — you can add more packages later."
      >
        <MedicineForm
          withFirstPackage
          onDone={(medicineId) => {
            setOpen(false);
            router.push(`/medicines/${medicineId}`);
          }}
          onCancel={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
