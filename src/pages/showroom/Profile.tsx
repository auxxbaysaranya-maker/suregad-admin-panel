import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, ShieldCheck } from "lucide-react";
import { api, openPrivateFile } from "../../lib/api";
import { marketplaceUrl } from "../../lib/config";
import { uploadFile } from "../../lib/upload";
import { titleCase } from "../../lib/utils";
import { useSession } from "../../store/session";
import { PageHeader } from "../../components/PanelShell";
import { Btn, Chips, ErrorBox, Facts, Field, Loading, Notice, Panel, Select, StatusPill, TextArea, TextInput, Timeline, Toggle, formatDate, useAction } from "../../components/kit";
import { BUSINESS_TYPES, DOCUMENT_KINDS, useShowroom, type Showroom } from "./shared";

const CATEGORIES = ["smartphones", "laptops", "tablets", "smartwatches", "accessories"] as const;
const CONDITIONS = ["new", "used", "refurbished"] as const;

function ImageField({ label, url, purpose, onUploaded }: { label: string; url: string | null; purpose: string; onUploaded: (key: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [preview, setPreview] = useState(url);
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold">{label}</p>
      <button type="button" onClick={() => input.current?.click()} className={`relative grid w-full place-items-center overflow-hidden rounded-2xl bg-canvas ring-1 ring-line hover:ring-brand-300 ${purpose === "business_logo" ? "h-28 max-w-[112px]" : "h-28"}`}>
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="text-brand-300" />}
        {busy ? <span className="absolute inset-0 grid place-items-center bg-white/70 text-[12px] font-semibold">Uploading…</span> : null}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
        const picked = event.target.files?.[0];
        if (!picked) return;
        setBusy(true);
        setPreview(URL.createObjectURL(picked));
        void uploadFile(picked, purpose).then(({ key }) => onUploaded(key)).catch(setError).finally(() => setBusy(false));
      }} />
      <ErrorBox error={error} />
    </div>
  );
}

export function BusinessProfilePage() {
  const showroom = useShowroom();
  const data = showroom.data;
  if (showroom.isLoading || !data) return <Loading rows={5} />;
  return <ProfileForm data={data} />;
}

function ProfileForm({ data }: { data: Showroom }) {
  const client = useQueryClient();
  const [form, setForm] = useState({
    description: data.description,
    tagline: data.tagline,
    hours: data.hours,
    phone: data.phone,
    email: data.email,
    mobile: data.owner.mobile || "",
    alternatePhone: data.owner.alternatePhone || "",
    categories: data.profile.categories,
    brands: data.profile.brands.join(", "),
    conditions: data.profile.conditions,
    physicalShowroom: data.profile.physicalShowroom,
    website: data.social.website || "",
    instagram: data.social.instagram || "",
    facebook: data.social.facebook || "",
    youtube: data.social.youtube || "",
    whatsapp: data.social.whatsapp || "",
    warranty: data.policies.warranty || "",
    returns: data.policies.returns || "",
    delivery: data.policies.delivery || "",
    returnWindowDays: String(data.policies.returnWindowDays ?? 7),
    logoKey: data.logoKey,
    bannerKey: data.bannerKey,
  });
  const [change, setChange] = useState({ name: "", businessType: "", gstin: "", pan: "", registrationNumber: "", ownerName: "", accountName: "", accountNumber: "", ifsc: "" });
  const [docKind, setDocKind] = useState("other");
  const docInput = useRef<HTMLInputElement>(null);
  const action = useAction(["showroom", "showroom-dashboard"]);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (saved) { const timer = setTimeout(() => setSaved(false), 3000); return () => clearTimeout(timer); } }, [saved]);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });

  async function save() {
    const result = await action.run("save", async () => (await api.patch("/showroom/profile", {
      description: form.description,
      tagline: form.tagline,
      hours: form.hours,
      phone: form.phone || undefined,
      email: form.email || undefined,
      logoKey: form.logoKey,
      bannerKey: form.bannerKey,
      owner: { mobile: form.mobile || undefined, alternatePhone: form.alternatePhone },
      profile: { categories: form.categories, brands: form.brands.split(",").map((brand) => brand.trim()).filter(Boolean), conditions: form.conditions, physicalShowroom: form.physicalShowroom },
      social: { website: form.website, instagram: form.instagram, facebook: form.facebook, youtube: form.youtube, whatsapp: form.whatsapp },
      policies: { warranty: form.warranty, returns: form.returns, delivery: form.delivery, returnWindowDays: Number(form.returnWindowDays) || 0 },
    })).data.data as Showroom);
    if (result) { client.setQueryData(["showroom"], result); setSaved(true); }
  }

  async function requestChange() {
    const body: Record<string, unknown> = {};
    for (const key of ["name", "businessType", "gstin", "pan", "registrationNumber", "ownerName"] as const) if (change[key].trim()) body[key] = change[key].trim();
    if (change.accountNumber || change.accountName || change.ifsc) body.bank = { accountName: change.accountName, accountNumber: change.accountNumber, ifsc: change.ifsc };
    const result = await action.run("change", async () => (await api.post("/showroom/profile/changes", body)).data.data as Showroom);
    if (result) client.setQueryData(["showroom"], result);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Business profile" description="How buyers see your showroom. Legal and bank details are re-verified by SureGad when they change." actions={<a href={marketplaceUrl(`store/${data.slug}`)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold ring-1 ring-line hover:ring-brand-300"><ExternalLink size={16} /> View store page</a>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel title="Store page">
            <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
              <ImageField label="Logo" url={data.logoUrl} purpose="business_logo" onUploaded={(key) => setForm((current) => ({ ...current, logoKey: key }))} />
              <ImageField label="Banner" url={data.bannerUrl} purpose="business_banner" onUploaded={(key) => setForm((current) => ({ ...current, bannerKey: key }))} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Tagline" className="sm:col-span-2"><TextInput value={form.tagline} onChange={set("tagline")} maxLength={120} /></Field>
              <Field label="About" className="sm:col-span-2"><TextArea value={form.description} onChange={set("description")} /></Field>
              <Field label="Opening hours"><TextInput value={form.hours} onChange={set("hours")} /></Field>
              <Field label="Business phone"><TextInput value={form.phone} onChange={set("phone")} /></Field>
              <Field label="Business email"><TextInput type="email" value={form.email} onChange={set("email")} /></Field>
              <Field label="Owner mobile (private)"><TextInput value={form.mobile} onChange={set("mobile")} /></Field>
            </div>
          </Panel>
          <Panel title="What you sell">
            <div className="space-y-4">
              <Chips options={CATEGORIES} value={form.categories as (typeof CATEGORIES)[number][]} onChange={(categories) => setForm({ ...form, categories })} />
              <Chips options={CONDITIONS} value={form.conditions as (typeof CONDITIONS)[number][]} onChange={(conditions) => setForm({ ...form, conditions })} />
              <Field label="Brands"><TextInput value={form.brands} onChange={set("brands")} /></Field>
              <Toggle checked={form.physicalShowroom} onChange={(physicalShowroom) => setForm({ ...form, physicalShowroom })} label="Physical showroom" hint="Buyers can visit and collect orders." />
            </div>
          </Panel>
          <Panel title="Policies" description="Shown on your store page and used for returns.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Warranty policy" className="sm:col-span-2"><TextArea value={form.warranty} onChange={set("warranty")} className="min-h-20" /></Field>
              <Field label="Return policy" className="sm:col-span-2"><TextArea value={form.returns} onChange={set("returns")} className="min-h-20" /></Field>
              <Field label="Delivery policy" className="sm:col-span-2"><TextArea value={form.delivery} onChange={set("delivery")} className="min-h-20" /></Field>
              <Field label="Default return window (days)"><TextInput inputMode="numeric" value={form.returnWindowDays} onChange={set("returnWindowDays")} /></Field>
            </div>
          </Panel>
          <Panel title="Social links">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website"><TextInput value={form.website} onChange={set("website")} /></Field>
              <Field label="Instagram"><TextInput value={form.instagram} onChange={set("instagram")} /></Field>
              <Field label="Facebook"><TextInput value={form.facebook} onChange={set("facebook")} /></Field>
              <Field label="YouTube"><TextInput value={form.youtube} onChange={set("youtube")} /></Field>
              <Field label="WhatsApp"><TextInput value={form.whatsapp} onChange={set("whatsapp")} /></Field>
            </div>
          </Panel>
          <ErrorBox error={action.error} />
          <div className="flex items-center gap-3"><Btn busy={action.busy === "save"} onClick={() => void save()}>Save profile</Btn>{saved ? <span className="text-[13px] font-semibold text-success">Saved</span> : null}</div>

          <Panel title={<span className="flex items-center gap-2"><ShieldCheck size={17} /> Legal & bank details</span>} description="Changes here are sent to SureGad and applied only after verification.">
            {data.pendingChanges?.status === "pending" ? <Notice tone="amber">A change request is with SureGad (sent {formatDate(data.pendingChanges.requestedAt)}).</Notice> : data.pendingChanges?.status === "rejected" ? <Notice tone="red">Your last change request was declined{data.pendingChanges.note ? `: ${data.pendingChanges.note}` : "."}</Notice> : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Legal business name"><TextInput value={change.name} onChange={(event) => setChange({ ...change, name: event.target.value })} placeholder={data.name} /></Field>
              <Field label="Business type"><Select value={change.businessType} onChange={(event) => setChange({ ...change, businessType: event.target.value })}><option value="">{titleCase(data.businessType || "Unchanged")}</option>{BUSINESS_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <Field label="GSTIN"><TextInput value={change.gstin} onChange={(event) => setChange({ ...change, gstin: event.target.value.toUpperCase() })} placeholder={data.gstin || "—"} maxLength={15} /></Field>
              <Field label="PAN"><TextInput value={change.pan} onChange={(event) => setChange({ ...change, pan: event.target.value.toUpperCase() })} placeholder={data.pan || "—"} maxLength={10} /></Field>
              <Field label="Registration number"><TextInput value={change.registrationNumber} onChange={(event) => setChange({ ...change, registrationNumber: event.target.value })} placeholder={data.registrationNumber || "—"} /></Field>
              <Field label="Owner name"><TextInput value={change.ownerName} onChange={(event) => setChange({ ...change, ownerName: event.target.value })} placeholder={data.owner.name} /></Field>
              <Field label="Account holder"><TextInput value={change.accountName} onChange={(event) => setChange({ ...change, accountName: event.target.value })} placeholder={data.bank?.accountName || "Bank account name"} /></Field>
              <Field label="Account number"><TextInput inputMode="numeric" value={change.accountNumber} onChange={(event) => setChange({ ...change, accountNumber: event.target.value.replace(/\D/g, "") })} placeholder={data.bank ? `••••${data.bank.accountNumberLast4}` : ""} /></Field>
              <Field label="IFSC"><TextInput value={change.ifsc} onChange={(event) => setChange({ ...change, ifsc: event.target.value.toUpperCase() })} placeholder={data.bank?.ifsc || ""} maxLength={11} /></Field>
            </div>
            <Btn className="mt-4" variant="secondary" busy={action.busy === "change"} disabled={data.pendingChanges?.status === "pending" || !Object.values(change).some((value) => value.trim())} onClick={() => void requestChange()}>Send for verification</Btn>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Verification">
            <div className="mb-3 flex items-center gap-2"><StatusPill status={data.status} />{data.code ? <span className="font-mono text-[13px]">{data.code}</span> : null}</div>
            <Facts items={[["Business", data.name], ["Type", titleCase(data.businessType || "")], ["GSTIN", data.gstin], ["PAN", data.pan], ["Bank", data.bank ? `${data.bank.accountName} ••${data.bank.accountNumberLast4}` : "Not added"]]} />
          </Panel>
          <Panel title="Documents">
            <ul className="space-y-2 text-[13px]">
              {data.documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-2"><button type="button" onClick={() => void openPrivateFile(`/showroom/application/documents/${doc.id}/file`)} className="min-w-0 flex-1 truncate text-left text-brand-700 hover:underline">{doc.name}</button><StatusPill status={doc.status} /></li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Select value={docKind} onChange={(event) => setDocKind(event.target.value)} aria-label="Document type">{DOCUMENT_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</Select>
              <input ref={docInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => {
                const picked = event.target.files?.[0];
                if (!picked) return;
                void action.run("doc", async () => {
                  const { key } = await uploadFile(picked, "business_document");
                  client.setQueryData(["showroom"], (await api.post("/showroom/application/documents", { key, name: picked.name.slice(0, 120), kind: docKind })).data.data);
                });
                event.target.value = "";
              }} />
              <Btn size="sm" className="h-11" variant="secondary" busy={action.busy === "doc"} onClick={() => docInput.current?.click()}>Add</Btn>
            </div>
          </Panel>
          <Panel title="History"><Timeline events={data.statusHistory} /></Panel>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const showroom = useShowroom();
  const profile = useSession((state) => state.profile);
  const setProfile = useSession((state) => state.setProfile);
  const client = useQueryClient();
  const action = useAction(["showroom"]);
  const data = showroom.data;
  const [threshold, setThreshold] = useState("");
  useEffect(() => { if (data) setThreshold(String(data.settings.lowStockThreshold ?? 2)); }, [data]);
  if (!data) return <Loading />;
  const update = (body: Record<string, unknown>) => void action.run(JSON.stringify(body), async () => client.setQueryData(["showroom"], (await api.patch("/showroom/settings", body)).data.data));
  const prefs = (profile as { notificationPreferences?: Record<string, boolean> } | null)?.notificationPreferences || {};
  const setPref = (key: string, value: boolean) => void action.run(`pref-${key}`, async () => setProfile((await api.patch("/auth/me", { notificationPreferences: { [key]: value } })).data.data));
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="How your showroom handles orders, stock and notifications." />
      <div className="space-y-5">
        <Panel title="Orders & fulfilment">
          <div className="space-y-3">
            <Toggle checked={Boolean(data.settings.autoAcceptOrders)} onChange={(value) => update({ autoAcceptOrders: value })} label="Accept paid orders automatically" hint="Skip the manual accept step. You can still cancel with a reason." />
            <Toggle checked={data.settings.deliveryAvailable !== false} onChange={(value) => update({ deliveryAvailable: value })} label="Home delivery" />
            <Toggle checked={data.settings.pickupAvailable !== false} onChange={(value) => update({ pickupAvailable: value })} label="Showroom pickup" />
          </div>
        </Panel>
        <Panel title="Stock alerts">
          <Field label="Alert when a listing has this many units or fewer" hint="Listings can override this."><div className="flex gap-2"><TextInput inputMode="numeric" value={threshold} onChange={(event) => setThreshold(event.target.value.replace(/\D/g, ""))} className="max-w-[140px]" /><Btn variant="secondary" onClick={() => update({ lowStockThreshold: Number(threshold) || 0 })}>Save</Btn></div></Field>
        </Panel>
        <Panel title="Notifications" description="In-app notifications are always shown in the bell. Email, SMS and push need those providers to be configured by SureGad.">
          <div className="space-y-3">
            {(["inApp", "email", "sms", "whatsapp", "push"] as const).map((key) => <Toggle key={key} checked={prefs[key] !== false && (key === "inApp" || Boolean(prefs[key]))} onChange={(value) => setPref(key, value)} label={key === "inApp" ? "In-app" : titleCase(key)} />)}
          </div>
        </Panel>
        <ErrorBox error={action.error} />
      </div>
    </div>
  );
}
