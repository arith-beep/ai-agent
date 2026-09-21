import { requireManagerAccess } from "@/lib/manager-access";
import { ManagerSidebar } from "./_components/sidebar";

// Same reasoning as apps/web/app/sales/layout.tsx: force per-request rendering
// so this never gets statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireManagerAccess();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-fg md:flex-row">
      <ManagerSidebar orgName={ctx.orgName} />
      <main className="min-w-0 flex-1 overflow-y-auto bg-sunken/40">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
