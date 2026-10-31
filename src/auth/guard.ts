import { forbidden, redirect } from "next/navigation";

export type Role = "admin" | "operator";
export type PanelUser = { id: string; email: string; role: Role };

export function hasRole(userRole: Role, required: Role): boolean {
  return userRole === "admin" || userRole === required;
}

export async function getPanelUser(): Promise<PanelUser | null> {
  const [{ headers }, { auth }] = await Promise.all([import("next/headers"), import("./auth")]);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const role = ((session.user as { role?: string }).role === "admin" ? "admin" : "operator") as Role;
  return { id: session.user.id, email: session.user.email, role };
}

export async function requireUser(required: Role = "operator"): Promise<PanelUser> {
  const user = await getPanelUser();
  if (!user) redirect("/admin/login");
  if (!hasRole(user.role, required)) forbidden();
  return user;
}
