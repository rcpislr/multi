"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button variant="ghost" className="px-0" onClick={async () => { await authClient.signOut(); router.replace("/admin/login"); }}>
      Çıkış yap
    </Button>
  );
}
