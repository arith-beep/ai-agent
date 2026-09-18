import { requireCurrentContext } from "@/lib/session";
import { SalesSidebar } from "./_components/sidebar";

// Always render per-request. Without this, DEMO_MODE's auth bypass (which touches no
// cookies/headers) lets Next.js statically prerender these pages at build time, freezing
// the in-memory demo data forever instead of reflecting live edits made during the demo.
export const dynamic = "force-dynamic";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCurrentContext();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-fg md:flex-row">
      <SalesSidebar orgName={ctx.orgName} />
      <main className="min-w-0 flex-1 overflow-y-auto bg-sunken/40">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
