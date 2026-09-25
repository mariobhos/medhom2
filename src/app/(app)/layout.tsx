import { BottomNav, TopNav } from "@/components/Nav";
import { requirePageSession } from "@/lib/session";

/**
 * Layout for every authenticated page. The session check here runs on the
 * server for all nested routes, in addition to the middleware check.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePageSession();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
