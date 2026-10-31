import { requireUser } from "@/auth/guard";
import { getSettings } from "@/admin/settings/store";
import { saveSettings } from "@/admin/settings/actions";
import { ActionForm, FormField } from "@/components/admin/action-form";
import { Card, Input } from "@/components/ui";
import { minorToInput } from "@/lib/format";

export default async function SettingsPage() {
  await requireUser("admin");
  const s = await getSettings();
  const b = s.businessInfo;
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Ayarlar</h1>
      <Card>
        <ActionForm action={saveSettings}>
          <h2 className="font-medium">İşletme bilgileri</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField name="businessInfo.legalName" label="Unvan"><Input name="legalName" defaultValue={b.legalName ?? ""} /></FormField>
            <FormField name="businessInfo.taxNo" label="Vergi no"><Input name="taxNo" defaultValue={b.taxNo ?? ""} /></FormField>
            <FormField name="businessInfo.taxOffice" label="Vergi dairesi"><Input name="taxOffice" defaultValue={b.taxOffice ?? ""} /></FormField>
            <FormField name="businessInfo.mersisNo" label="MERSİS no"><Input name="mersisNo" defaultValue={b.mersisNo ?? ""} /></FormField>
            <FormField name="businessInfo.phone" label="Telefon"><Input name="phone" defaultValue={b.phone ?? ""} /></FormField>
            <FormField name="businessInfo.email" label="E-posta"><Input name="email" defaultValue={b.email ?? ""} /></FormField>
            <div className="sm:col-span-2"><FormField name="businessInfo.address" label="Adres"><Input name="address" defaultValue={b.address ?? ""} /></FormField></div>
          </div>
          <h2 className="pt-2 font-medium">Kargo</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField name="shippingFeeMinor" label="Kargo ücreti (TL)"><Input name="shippingFee" defaultValue={minorToInput(s.shippingFeeMinor)} inputMode="decimal" /></FormField>
            <FormField name="freeShippingThresholdMinor" label="Ücretsiz kargo eşiği (TL)" hint="Boş bırakılırsa eşik yok.">
              <Input name="freeShippingThreshold" defaultValue={minorToInput(s.freeShippingThresholdMinor)} inputMode="decimal" />
            </FormField>
            <FormField name="shippingVatRate" label="Kargo KDV (%)"><Input type="number" defaultValue={s.shippingVatRate} min={0} max={100} /></FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cookieBannerEnabled" defaultChecked={s.cookieBannerEnabled} /> Çerez onay bandını göster
          </label>
        </ActionForm>
      </Card>
    </div>
  );
}
