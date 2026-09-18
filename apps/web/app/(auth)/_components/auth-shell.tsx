import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-soft opacity-60 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-fg text-sm font-semibold text-paper">S</span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-fg">Sales Agent Builder</span>
        </Link>
        <div className="surface p-7 shadow-elevate-lg">
          <div className="mb-6 text-center">
            <h1 className="font-display text-[21px] font-semibold tracking-tight text-fg">{title}</h1>
            <p className="mt-1.5 text-[13.5px] text-fg-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
