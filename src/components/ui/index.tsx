"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { FieldContext } from "./field-context";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const btn: Record<BtnVariant, string> = {
  primary: "bg-neutral-900 text-white hover:bg-neutral-800",
  secondary: "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none", btn[variant], className)}
      {...p}
    />
  );
}

const field = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 aria-[invalid=true]:border-red-500";

function useFieldProps<T extends { id?: string; name?: string; "aria-invalid"?: React.AriaAttributes["aria-invalid"] }>(p: T): T {
  const f = React.useContext(FieldContext);
  if (!f) return p;
  return { ...p, id: p.id ?? f.id, name: p.name ?? f.name, "aria-invalid": p["aria-invalid"] ?? f.invalid };
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...p }, ref) { return <input ref={ref} className={cn(field, className)} {...useFieldProps(p)} />; },
);
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...p }, ref) { return <textarea ref={ref} className={cn(field, "min-h-20", className)} {...useFieldProps(p)} />; },
);
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...p }, ref) { return <select ref={ref} className={cn(field, className)} {...useFieldProps(p)} />; },
);

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-neutral-700", className)} {...p} />;
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-neutral-200 bg-white p-4", className)} {...p} />;
}

type BadgeTone = "neutral" | "green" | "yellow" | "red" | "blue";
const badge: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700", green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800", red: "bg-red-100 text-red-800", blue: "bg-blue-100 text-blue-800",
};
export function Badge({ tone = "neutral", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium", badge[tone], className)} {...p} />;
}
