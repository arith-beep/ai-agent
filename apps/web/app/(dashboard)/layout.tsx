import { requireCurrentContext } from "@/lib/session";
import { Sidebar } from "./_components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCurrentContext();

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar orgName={ctx.orgName} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
