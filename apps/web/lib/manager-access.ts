import { redirect } from "next/navigation";
import { requireCurrentContext, type CurrentContext } from "./session";

const MANAGER_ROLES: CurrentContext["role"][] = ["owner", "admin", "manager"];

/** Gate for the AI Sales Manager surface: any authenticated org role can view /sales, but managing a human team is restricted to owner/admin/manager. Org isolation itself comes from every managerRepo call being scoped to ctx.orgId. */
export async function requireManagerAccess(): Promise<CurrentContext> {
  const ctx = await requireCurrentContext();
  if (!MANAGER_ROLES.includes(ctx.role)) redirect("/sales");
  return ctx;
}
