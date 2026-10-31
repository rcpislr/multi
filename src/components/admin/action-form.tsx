"use client";
import * as React from "react";
import { Button } from "@/components/ui";
import { FieldContext } from "@/components/ui/field-context";
import type { ActionResult } from "@/admin/validation";

const FieldErrorsContext = React.createContext<Record<string, string>>({});
export const useFieldError = (name: string) => React.useContext(FieldErrorsContext)[name];

export function ActionForm({ action, children, submitLabel = "Kaydet", className }: {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction, pending] = React.useActionState(action, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <FieldErrorsContext.Provider value={fieldErrors}>
      <form action={formAction} className={className ?? "space-y-4"}>
        {children}
        {state && !state.ok && (state.error || Object.keys(fieldErrors).length > 0) && (
          <p className="rounded bg-red-50 p-2 text-sm text-red-700" role="alert">{state.error ?? "Lütfen işaretli alanları düzeltin."}</p>
        )}
        {state?.ok && state.message && <p className="rounded bg-green-50 p-2 text-sm text-green-700" role="status">{state.message}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : submitLabel}</Button>
        </div>
      </form>
    </FieldErrorsContext.Provider>
  );
}

/** Labeled input wired to the surrounding ActionForm's field errors. */
export function FormField({ name, label, hint, children }: { name: string; label: string; hint?: string; children: React.ReactNode }) {
  const error = useFieldError(name);
  const id = `f-${name.replace(/\W/g, "-")}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">{label}</label>
      <FieldContext.Provider value={{ id, name, invalid: !!error }}>{children}</FieldContext.Provider>
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
