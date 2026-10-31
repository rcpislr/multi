import { asc } from "drizzle-orm";
import { requireUser } from "@/auth/guard";
import { db } from "@/db/client";
import { domains } from "@/db/schema";
import { createDomain, updateDomain } from "@/admin/domains/actions";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Badge, Card, Input } from "@/components/ui";

export default async function DomainsPage() {
  await requireUser("admin");
  const rows = await db.select().from(domains).orderBy(asc(domains.name));
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Domainler</h1>
      <Card>
        <h2 className="mb-3 font-medium">Yeni ana domain</h2>
        <ActionForm action={createDomain} submitLabel="Ekle">
          <FormField name="name" label="Alan adı" hint="Örn. ornek.com. Yerel geliştirme için localhost.">
            <Input placeholder="ornek.com" />
          </FormField>
        </ActionForm>
      </Card>
      {rows.map((d) => (
        <Card key={d.id}>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-medium">{d.name}</span>
            <Badge tone={d.active ? "green" : "neutral"}>{d.active ? "Aktif" : "Pasif"}</Badge>
          </div>
          <ActionForm action={updateDomain}>
            <input type="hidden" name="id" value={d.id} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={d.active} /> Aktif</label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="useOwnBusinessInfo" defaultChecked={!!d.businessInfo} /> Bu domain için farklı satıcı bilgisi kullan
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField name="businessInfo.legalName" label="Unvan"><Input name="legalName" defaultValue={d.businessInfo?.legalName ?? ""} /></FormField>
              <FormField name="businessInfo.taxNo" label="Vergi no"><Input name="taxNo" defaultValue={d.businessInfo?.taxNo ?? ""} /></FormField>
              <FormField name="businessInfo.taxOffice" label="Vergi dairesi"><Input name="taxOffice" defaultValue={d.businessInfo?.taxOffice ?? ""} /></FormField>
              <FormField name="businessInfo.phone" label="Telefon"><Input name="phone" defaultValue={d.businessInfo?.phone ?? ""} /></FormField>
              <FormField name="businessInfo.email" label="E-posta"><Input name="email" defaultValue={d.businessInfo?.email ?? ""} /></FormField>
              <FormField name="businessInfo.address" label="Adres"><Input name="address" defaultValue={d.businessInfo?.address ?? ""} /></FormField>
            </div>
          </ActionForm>
        </Card>
      ))}
    </div>
  );
}
