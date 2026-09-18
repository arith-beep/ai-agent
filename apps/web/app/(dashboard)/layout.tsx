import { requireCurrentContext } from "@/lib/session";
import { Sidebar } from "./_components/sidebar";

// Same reasoning as apps/web/app/sales/layout.tsx: DEMO_MODE's auth bypass touches no
// cookies/headers, so without this Next.js statically prerenders these pages at build
// time — including their DB reads, which fail the whole build if DATABASE_URL is bad.
export const dynamic = "force-dynamic";

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
