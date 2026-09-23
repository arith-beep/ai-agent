"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth-actions";

const TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function LogoutButton({ className, title }: { className?: string; title?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const result = await withTimeout(logoutAction(), TIMEOUT_MS);
      router.push(result.ok ? result.destination : "/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} title={title} className={className}>
      <LogOut size={12} strokeWidth={1.75} />
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
