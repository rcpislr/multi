import { redirect } from "next/navigation";
import { getPanelUser } from "@/auth/guard";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getPanelUser()) redirect("/admin/orders");
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <LoginForm />
    </main>
  );
}
