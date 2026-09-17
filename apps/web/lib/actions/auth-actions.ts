"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { tenancyRepo } from "@ai-agent/storage";
import { signIn } from "@/lib/auth";

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
    throw new Error("All fields are required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const existing = await tenancyRepo.getUserByEmail(email);
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await tenancyRepo.createUserWithPassword(email, name, passwordHash);

  const baseSlug = slugify(orgName);
  const slug = `${baseSlug}-${user.id.slice(0, 8)}`;
  await tenancyRepo.createOrganization({ name: orgName, slug, ownerUserId: user.id });

  await signIn("credentials", { email, password, redirectTo: "/sales" });
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  await signIn("credentials", { email, password, redirectTo: "/sales" });
}

export async function logoutRedirect() {
  redirect("/login");
}
