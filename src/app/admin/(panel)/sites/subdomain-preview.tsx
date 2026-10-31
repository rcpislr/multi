"use client";
import * as React from "react";
import { FormField } from "@/components/admin/action-form";
import { Input, Select } from "@/components/ui";

export function SubdomainPreview({ domains }: { domains: Array<{ id: number; name: string }> }) {
  const [domainId, setDomainId] = React.useState(String(domains[0]?.id ?? ""));
  const [sub, setSub] = React.useState("");
  const domain = domains.find((d) => String(d.id) === domainId);
  return (
    <>
      <FormField name="domainId" label="Ana domain">
        <Select value={domainId} onChange={(e) => setDomainId(e.target.value)}>{domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
      </FormField>
      <FormField name="subdomain" label="Subdomain" hint={sub ? `Adres: ${sub.toLowerCase()}.${domain?.name}` : "Örn. poset"}>
        <Input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="poset" />
      </FormField>
    </>
  );
}
