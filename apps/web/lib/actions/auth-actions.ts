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

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await tenancyRepo.createUserWithPassword(email, name, passwordHash);

  const baseSlug = slugify(orgName);
  const slug = `${baseSlug}-${user.id.slice(0, 8)}`;
  await tenancyRepo.createOrganization({ name: orgName, slug, ownerUserId: user.id });

  try {
    await signIn("credentials", { email, password, redirectTo: "/sales" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=" + encodeURIComponent("Account created — please sign in."));
    }
    throw error;
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Verify credentials ourselves before calling signIn() — next-auth v5-beta's own
  // failure path for invalid Credentials throws an unrelated "headers outside request
  // scope" error under Next 15, so signIn() must only ever be called once we already
  // know the credentials are valid.
  const user = email && password ? await tenancyRepo.getUserByEmail(email) : null;
  const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!valid) {
    redirect("/login?error=" + encodeURIComponent("Incorrect email or password."));
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/sales" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=" + encodeURIComponent("Something went wrong signing you in. Please try again."));
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
