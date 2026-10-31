import * as React from "react";
import { Button, Card } from "@/components/ui";

export function FormShell({ title, onSubmit, action, children, submitLabel = "Kaydet", error, pending }: {
  title: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  action?: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  submitLabel?: string;
  error?: string;
  pending?: boolean;
}) {
  return (
    <Card>
      <form onSubmit={onSubmit} action={action} className="space-y-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {children}
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
