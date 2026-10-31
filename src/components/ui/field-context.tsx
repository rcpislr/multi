"use client";
import * as React from "react";

/** Set by FormField; inputs inside it pick up id, name and invalid state without cloneElement. */
export const FieldContext = React.createContext<{ id: string; name: string; invalid: boolean } | null>(null);
