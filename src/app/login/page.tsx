import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign in — MedHome",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-lg shadow-brand-600/20">
            M
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">MedHome</h1>
            <p className="mt-1 text-sm text-muted">
              Private medicine cabinet. Sign in to continue.
            </p>
          </div>
        </div>

        <Suspense fallback={<Spinner className="mx-auto text-muted" />}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-muted">
          MedHome tracks what you already have at home. It does not give medical advice.
        </p>
      </div>
    </div>
  );
}
