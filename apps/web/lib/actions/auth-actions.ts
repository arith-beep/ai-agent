"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
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

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const orgName = String(formData.get("orgName") ?? "");

  if (!name || !email || !password || !orgName) {
    redirect("/signup?error=" + encodeURIComponent("All fields are required."));
  }
  if (password.length < 8) {
    redirect("/signup?error=" + encodeURIComponent("Password must be at least 8 characters."));
  }

  const existing = await tenancyRepo.getUserByEmail(email);
  if (existing) {
    redirect("/signup?error=" + encodeURIComponent("An account with that email already exists."));
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await tenancyRepo.createUserWithPassword(email, name, passwordHash);
    const baseSlug = slugify(orgName);
    const slug = `${baseSlug}-${user.id.slice(0, 8)}`;
    await tenancyRepo.createOrganization({ name: orgName, slug, ownerUserId: user.id });
  } catch (error) {
    console.error("signupAction: failed to create account", error);
    redirect("/signup?error=" + encodeURIComponent("We couldn't create your account — please try again in a moment."));
  }

  // redirect: false avoids signIn()'s own internal redirect() call, which has been
  // observed to fail silently (no error, no redirect) when invoked from inside a
  // Server Action under this Next 15 / next-auth v5-beta combination — see loginAction
  // below, where the same pattern was confirmed against production. We perform the
  // redirect ourselves instead, from a normal top-level Server Action return path.
  let destination: string;
  try {
    destination = (await signIn("credentials", { email, password, redirect: false, redirectTo: "/sales" })) as string;
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=" + encodeURIComponent("Account created — please sign in."));
    }
    console.error("signupAction: signIn threw an unexpected error", error);
    redirect("/login?error=" + encodeURIComponent("Account created, but we couldn't sign you in automatically — please sign in."));
  }
  redirect(destination || "/sales");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Verify credentials ourselves before calling signIn(): next-auth v5-beta's own
  // failure path for invalid Credentials throws an unrelated "headers outside request
  // scope" error under Next 15, so signIn() must only ever be called once we already
  // know the credentials are valid. Any failure here (including a database error) must
  // produce a visible message — never leave the user staring at an unchanged page.
  let valid = false;
  try {
    const user = email && password ? await tenancyRepo.getUserByEmail(email) : null;
    valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  } catch (error) {
    console.error("loginAction: credential lookup failed", error);
    redirect("/login?error=" + encodeURIComponent("We couldn't reach the database. Please try again in a moment."));
  }
  if (!valid) {
    redirect("/login?error=" + encodeURIComponent("Incorrect email or password."));
  }

  // redirect: false avoids signIn()'s own internal redirect() call — confirmed against
  // production that calling signIn() with its default auto-redirect from inside this
  // Server Action silently swallows a successful sign-in (session cookie and redirect
  // both fail to reach the browser, with no error surfaced). Hitting next-auth's own
  // /api/auth/callback/credentials route directly works correctly and returns a real
  // redirect with a session cookie, so the credential-checking and session-issuing logic
  // itself is fine — only the Server-Action-internal auto-redirect path was broken.
  // Requesting the URL instead and redirecting ourselves sidesteps that broken path.
  let destination: string;
  try {
    destination = (await signIn("credentials", { email, password, redirect: false, redirectTo: "/sales" })) as string;
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=" + encodeURIComponent("Something went wrong signing you in. Please try again."));
    }
    console.error("loginAction: signIn threw an unexpected error", error);
    redirect("/login?error=" + encodeURIComponent("Something went wrong signing you in. Please try again."));
  }
  redirect(destination || "/sales");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
