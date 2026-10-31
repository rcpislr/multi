"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { Button, Card, Field, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signIn.email({ email: String(fd.get("email")), password: String(fd.get("password")) });
    setPending(false);
    if (error) { setError("E-posta veya şifre hatalı."); return; }
    router.replace("/admin/orders");
    router.refresh();
  }
  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="text-lg font-semibold">Panel Girişi</h1>
        <Field label="E-posta" htmlFor="email"><Input id="email" name="email" type="email" required autoComplete="username" /></Field>
        <Field label="Şifre" htmlFor="password"><Input id="password" name="password" type="password" required autoComplete="current-password" /></Field>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>{pending ? "Giriş yapılıyor…" : "Giriş yap"}</Button>
      </form>
    </Card>
  );
}
