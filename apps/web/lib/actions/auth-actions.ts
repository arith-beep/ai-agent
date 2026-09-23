"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { tenancyRepo } from "@ai-agent/storage";
import { signIn, signOut } from "@/lib/auth";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "org"
  );
}

/**
 * Both actions below return a plain result object instead of calling
 * redirect() themselves. Two independent, unrelated-looking production
 * failures (a silent no-op, then a 500, now reported as an infinite client
 * spinner) all trace back to relying on a Server Action's own redirect —
 * whether next-auth's internal one or our own next/navigation call — to
 * finish reliably. The client (login-form.tsx / signup-form.tsx) now does
 * every navigation itself via router.push() once it receives a real result,
 * under its own timeout, so a stuck server-side redirect can no longer leave
 * the user staring at a spinner with nothing surfaced.
 */
export type AuthActionResult = { ok: true; destination: string } | { ok: false; error: string };

export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const orgName = String(formData.get("orgName") ?? "");

  if (!name || !email || !password || !orgName) {
    return { ok: false, error: "All fields are required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  try {
    const existing = await tenancyRepo.getUserByEmail(email);
    if (existing) {
      return { ok: false, error: "An account with that email already exists." };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await tenancyRepo.createUserWithPassword(email, name, passwordHash);
    const baseSlug = slugify(orgName);
    const slug = `${baseSlug}-${user.id.slice(0, 8)}`;
    await tenancyRepo.createOrganization({ name: orgName, slug, ownerUserId: user.id });
  } catch (error) {
    console.error("signupAction: failed to create account", error);
    return { ok: false, error: "We couldn't create your account — please try again in a moment." };
  }

  try {
    const destination = (await signIn("credentials", { email, password, redirect: false, redirectTo: "/sales" })) as string;
    return { ok: true, destination: destination || "/sales" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: true, destination: "/login?error=" + encodeURIComponent("Account created — please sign in.") };
    }
    console.error("signupAction: signIn threw an unexpected error", error);
    return {
      ok: true,
      destination: "/login?error=" + encodeURIComponent("Account created, but we couldn't sign you in automatically — please sign in."),
    };
  }
}

const MANAGER_ROLES = ["owner", "admin", "manager"];

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Verify credentials ourselves before calling signIn(): next-auth v5-beta's own
  // failure path for invalid Credentials throws an unrelated "headers outside request
  // scope" error under Next 15, so signIn() must only ever be called once we already
  // know the credentials are valid.
  let valid = false;
  let userId: string | undefined;
  try {
    const user = email && password ? await tenancyRepo.getUserByEmail(email) : null;
    valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    userId = user?.id;
  } catch (error) {
    console.error("loginAction: credential lookup failed", error);
    return { ok: false, error: "We couldn't reach the database. Please try again in a moment." };
  }
  if (!valid || !userId) {
    return { ok: false, error: "Incorrect email or password." };
  }

  // Land manager/admin/owner roles directly on the AI Sales Manager — that's the
  // primary demo surface for this account type. Everyone else keeps the existing
  // Sales Agent Builder destination. Matches requireCurrentContext()'s own "first
  // membership is current" rule (packages/storage tenancyRepo.listOrgsForUser).
  let defaultDestination = "/sales";
  try {
    const memberships = await tenancyRepo.listOrgsForUser(userId);
    if (MANAGER_ROLES.includes(memberships[0]?.role ?? "")) {
      defaultDestination = "/manager";
    }
  } catch (error) {
    console.error("loginAction: role lookup failed, defaulting to /sales", error);
  }

  try {
    const destination = (await signIn("credentials", { email, password, redirect: false, redirectTo: defaultDestination })) as string;
    return { ok: true, destination: destination || defaultDestination };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Something went wrong signing you in. Please try again." };
    }
    console.error("loginAction: signIn threw an unexpected error", error);
    return { ok: false, error: "Something went wrong signing you in. Please try again." };
  }
}

export async function logoutAction(): Promise<AuthActionResult> {
  try {
    const res = (await signOut({ redirect: false, redirectTo: "/login" })) as { redirect?: string } | undefined;
    return { ok: true, destination: res?.redirect || "/login" };
  } catch (error) {
    console.error("logoutAction: signOut threw an unexpected error", error);
    return { ok: true, destination: "/login" };
  }
}
