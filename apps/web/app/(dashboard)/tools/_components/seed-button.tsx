"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedToolsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    await fetch("/api/tools/seed", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="btn-primary" onClick={seed} disabled={busy}>
      {busy ? "Syncing..." : "Sync built-in tools"}
    </button>
  );
}
