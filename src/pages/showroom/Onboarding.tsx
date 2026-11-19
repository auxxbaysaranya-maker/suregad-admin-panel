import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, Check, CheckCircle2, ClipboardList, Clock3, FileText, LifeBuoy, Loader2, MapPin, ShieldAlert, Store, Trash2, Upload, User } from "lucide-react";
import { api, openPrivateFile } from "../../lib/api";
import { uploadFile } from "../../lib/upload";
import { cn, titleCase } from "../../lib/utils";
import { useSession } from "../../store/session";
import { firebaseConfigured, firebaseEmailVerified, refreshVerification, resendVerification } from "../../lib/firebase";
import { PageHeader } from "../../components/PanelShell";
import { Btn, Chips, ErrorBox, Field, Notice, Select, StatusPill, TextArea, TextInput, Timeline, Toggle, errorMessage, formatDate } from "../../components/kit";
import { MapPicker } from "../../components/MapPicker";
import { BUSINESS_TYPES, DOCUMENT_KINDS, STATUS_COPY, useShowroom, type Showroom } from "./shared";

const STEPS = [
  { title: "Owner", icon: User },
  { title: "Business", icon: Building2 },
  { title: "Address", icon: MapPin },
  { title: "Documents", icon: FileText },
  { title: "Profile", icon: Store },
  { title: "Review", icon: ClipboardList },
];

const CATEGORIES = ["smartphones", "laptops", "tablets", "smartwatches", "accessories"] as const;
const CONDITIONS = ["new", "used", "refurbished"] as const;

type Form = {
  owner: { name: string; email: string; mobile: string; alternatePhone: string };
  name: string;
  businessType: string;
  description: string;
  yearEstablished: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  registrationNumber: string;
  address: { line1: string; line2: string; city: string; district: string; state: string; pincode: string };
  location: { lat: number; lng: number } | null;
  hours: string;
  profile: { categories: string[]; brands: string; conditions: string[]; physicalShowroom: boolean };
  social: { website: string; instagram: string; facebook: string; whatsapp: string };
};

function toForm(showroom: Showroom | null | undefined, fallback: { name?: string; email?: string }): Form {
  return {
    owner: { name: showroom?.owner?.name || fallback.name || "", email: showroom?.owner?.email || fallback.email || "", mobile: showroom?.owner?.mobile || "", alternatePhone: showroom?.owner?.alternatePhone || "" },
    name: showroom?.name || "",
    businessType: showroom?.businessType || "",
    description: showroom?.description || "",
    yearEstablished: showroom?.yearEstablished ? String(showroom.yearEstablished) : "",
    email: showroom?.email || "",
    phone: showroom?.phone || "",
    gstin: showroom?.gstin || "",
    pan: showroom?.pan || "",
    registrationNumber: showroom?.registrationNumber || "",
    address: { line1: showroom?.address?.line1 || "", line2: showroom?.address?.line2 || "", city: showroom?.address?.city || "", district: showroom?.address?.district || "", state: showroom?.address?.state || "Kerala", pincode: showroom?.address?.pincode || "" },
    location: showroom?.location || null,
    hours: showroom?.hours || "",
    profile: { categories: showroom?.profile?.categories || [], brands: (showroom?.profile?.brands || []).join(", "), conditions: showroom?.profile?.conditions || [], physicalShowroom: showroom?.profile?.physicalShowroom ?? true },
    social: { website: showroom?.social?.website || "", instagram: showroom?.social?.instagram || "", facebook: showroom?.social?.facebook || "", whatsapp: showroom?.social?.whatsapp || "" },
  };
}

function payload(form: Form, step: number) {
  return {
    owner: form.owner,
    name: form.name,
    businessType: form.businessType || undefined,
    description: form.description,
    yearEstablished: form.yearEstablished ? Number(form.yearEstablished) : undefined,
    email: form.email,
    phone: form.phone,
    gstin: form.gstin,
    pan: form.pan,
    registrationNumber: form.registrationNumber,
    address: { ...form.address, coordinates: form.location || undefined },
    hours: form.hours,
    profile: { categories: form.profile.categories, brands: form.profile.brands.split(",").map((brand) => brand.trim()).filter(Boolean), conditions: form.profile.conditions, physicalShowroom: form.profile.physicalShowroom },
    social: form.social,
    onboardingStep: step,
  };
}

function EmailVerification() {
  const [state, setState] = useState<"idle" | "sent" | "checking">("idle");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(firebaseEmailVerified());
  if (!firebaseConfigured() || localStorage.getItem("sg_auth") !== "firebase" || verified !== false) return null;
  return (
    <Notice tone="amber" icon={AlertCircle} action={
      <div className="flex gap-2">
        <Btn size="sm" variant="secondary" onClick={() => void resendVerification().then(() => setState("sent")).catch((reason) => setError(errorMessage(reason)))}>{state === "sent" ? "Email sent" : "Resend email"}</Btn>
        <Btn size="sm" busy={state === "checking"} onClick={() => { setState("checking"); void refreshVerification().then((ok) => { setVerified(ok); setState("idle"); if (!ok) setError("Not verified yet. Open the link in the email first."); }); }}>I've verified</Btn>
      </div>
    }>
      Verify your email address before submitting. We sent a link to your inbox.
      {error ? <span className="block text-[12px] text-danger">{error}</span> : null}
    </Notice>
  );
}

function StatusScreen({ showroom }: { showroom: Showroom }) {
  const copy = STATUS_COPY[showroom.status];
  const navigate = useNavigate();
  const Icon = showroom.status === "approved" ? CheckCircle2 : ["suspended", "revoked", "rejected"].includes(showroom.status) ? ShieldAlert : Clock3;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Showroom application" description={showroom.code ? `Showroom code ${showroom.code}` : undefined} />
      <section className="overflow-hidden rounded-[28px] bg-white ring-1 ring-line">
        <div className="bg-brand-gradient p-6 text-white sm:p-8">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Icon size={28} /></span>
          <h2 className="mt-4 text-[26px] text-white">{copy.title}</h2>
          <p className="mt-1 max-w-xl text-white/85">{copy.body}</p>
        </div>
        <div className="space-y-6 p-6 sm:p-8">
          {showroom.reviewNote || showroom.rejectionReason ? (
            <Notice tone={showroom.status === "approved" ? "green" : "amber"} icon={AlertCircle}><strong>Note from SureGad:</strong> {showroom.reviewNote || showroom.rejectionReason}</Notice>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-canvas p-4"><p className="text-[12px] text-muted">Business</p><p className="font-semibold">{showroom.name}</p></div>
            <div className="rounded-2xl bg-canvas p-4"><p className="text-[12px] text-muted">Status</p><StatusPill status={showroom.status} /></div>
            <div className="rounded-2xl bg-canvas p-4"><p className="text-[12px] text-muted">Submitted</p><p className="font-semibold">{formatDate(showroom.submittedAt)}</p></div>
          </div>
          <div>
            <h3 className="mb-3 text-[16px]">Documents</h3>
            <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
              {showroom.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                  <span className="min-w-0"><span className="block truncate font-semibold">{doc.name}</span><span className="text-[12px] text-muted">{titleCase(doc.kind)}{doc.note ? ` · ${doc.note}` : ""}</span></span>
                  <StatusPill status={doc.status} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-[16px]">History</h3>
            <Timeline events={showroom.statusHistory} />
          </div>
          <div className="flex flex-wrap gap-2">
            {showroom.status === "approved" ? <Btn onClick={() => navigate("/seller/dashboard")}>Go to dashboard</Btn> : null}
            <Btn variant="secondary" icon={LifeBuoy} onClick={() => navigate("/seller/support")}>Contact support</Btn>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ShowroomOnboarding() {
  const showroom = useShowroom();
  const profile = useSession((state) => state.profile);
  const client = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Date | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [uploadKind, setUploadKind] = useState("owner_id");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (showroom.isSuccess && !form) {
      setForm(toForm(showroom.data, { name: profile?.displayName, email: profile?.email }));
      setStep(Math.min(showroom.data?.onboardingStep || 0, STEPS.length - 1));
    }
  }, [showroom.isSuccess, showroom.data, form, profile]);

  const data = showroom.data;
  const editable = !data || ["draft", "info_required", "rejected"].includes(data.status);
  const missing = useMemo(() => data?.missing || [], [data]);

  if (showroom.isLoading || (!form && editable)) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-brand-600" /></div>;
  if (data && !editable) return <StatusScreen showroom={data} />;
  if (!form) return null;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm({ ...form, [key]: value });

  async function save(nextStep: number) {
    setSaving(true);
    setError(null);
    try {
      const result = (await api.put("/showroom/application", payload(form!, nextStep))).data.data as Showroom;
      client.setQueryData(["showroom"], result);
      setSaved(new Date());
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    } catch (reason) {
      setError(reason);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      if (!data) await save(step);
      const { key } = await uploadFile(file, "business_document");
      const label = DOCUMENT_KINDS.find((kind) => kind.value === uploadKind)?.label || "Document";
      const result = (await api.post("/showroom/application/documents", { key, name: `${label} — ${file.name}`.slice(0, 120), kind: uploadKind })).data.data as Showroom;
      client.setQueryData(["showroom"], result);
    } catch (reason) {
      setError(reason);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeDoc(id: string) {
    try {
      const result = (await api.delete(`/showroom/application/documents/${id}`)).data.data as Showroom;
      client.setQueryData(["showroom"], result);
    } catch (reason) {
      setError(reason);
    }
  }

  async function submit() {
    if (!(await save(step))) return;
    setSaving(true);
    try {
      const result = (await api.post("/showroom/application/submit")).data.data as Showroom;
      client.setQueryData(["showroom"], result);
      navigate("/seller/onboarding", { replace: true });
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  }

  const docs = data?.documents || [];
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Register your showroom" description="Tell us about your business. SureGad verifies every showroom before it can sell." />
      {data?.status === "info_required" || data?.status === "rejected" ? (
        <div className="mb-5"><Notice tone="amber" icon={AlertCircle}><strong>{data.status === "rejected" ? "Rejected:" : "SureGad asked for more information:"}</strong> {data.reviewNote || data.rejectionReason}</Notice></div>
      ) : null}
      <div className="mb-5"><EmailVerification /></div>

      <ol className="mb-6 grid grid-cols-6 gap-1.5" aria-label="Application steps">
        {STEPS.map((entry, index) => (
          <li key={entry.title}>
            <button type="button" onClick={() => void save(index)} className="group w-full text-left" aria-current={index === step ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full transition", index <= step ? "bg-brand-gradient" : "bg-line")} />
              <span className={cn("mt-2 hidden items-center gap-1.5 text-[12px] font-semibold sm:flex", index === step ? "text-ink" : "text-muted group-hover:text-ink")}><entry.icon size={13} /> {entry.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <section className="rounded-[28px] bg-white p-5 ring-1 ring-line sm:p-8">
        <p className="text-[12px] font-semibold tracking-[0.14em] text-brand-600 uppercase">Step {step + 1} of {STEPS.length}</p>
        <h2 className="mt-1 mb-6 text-[24px]">{["Owner details", "Business details", "Showroom address", "Verification documents", "Business profile", "Review and submit"][step]}</h2>

        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner's full name"><TextInput value={form.owner.name} onChange={(event) => set("owner", { ...form.owner, name: event.target.value })} autoComplete="name" /></Field>
            <Field label="Owner's email"><TextInput type="email" value={form.owner.email} onChange={(event) => set("owner", { ...form.owner, email: event.target.value })} autoComplete="email" /></Field>
            <Field label="Mobile number" hint="Used by SureGad only, not shown to buyers"><TextInput inputMode="tel" value={form.owner.mobile} onChange={(event) => set("owner", { ...form.owner, mobile: event.target.value })} placeholder="+91 98xxxxxxx" /></Field>
            <Field label="Alternate phone (optional)"><TextInput inputMode="tel" value={form.owner.alternatePhone} onChange={(event) => set("owner", { ...form.owner, alternatePhone: event.target.value })} /></Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" className="sm:col-span-2"><TextInput value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="As registered" /></Field>
            <Field label="Business type">
              <Select value={form.businessType} onChange={(event) => set("businessType", event.target.value)}>
                <option value="">Choose…</option>
                {BUSINESS_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Year established"><TextInput inputMode="numeric" value={form.yearEstablished} onChange={(event) => set("yearEstablished", event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2018" /></Field>
            <Field label="Business email"><TextInput type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></Field>
            <Field label="Business phone" hint="Shown to buyers on your store page"><TextInput inputMode="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></Field>
            <Field label="GSTIN" hint="15 characters. GSTIN or PAN is required."><TextInput value={form.gstin} onChange={(event) => set("gstin", event.target.value.toUpperCase())} maxLength={15} placeholder="32ABCDE1234F1Z5" /></Field>
            <Field label="PAN"><TextInput value={form.pan} onChange={(event) => set("pan", event.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" /></Field>
            <Field label="Registration / licence number (optional)" className="sm:col-span-2"><TextInput value={form.registrationNumber} onChange={(event) => set("registrationNumber", event.target.value)} /></Field>
            <Field label="About the business" className="sm:col-span-2"><TextArea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="What you sell, how long you've been in business, what buyers can expect." /></Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" className="sm:col-span-2"><TextInput value={form.address.line1} onChange={(event) => set("address", { ...form.address, line1: event.target.value })} placeholder="Building, street" /></Field>
            <Field label="Address line 2 (optional)" className="sm:col-span-2"><TextInput value={form.address.line2} onChange={(event) => set("address", { ...form.address, line2: event.target.value })} placeholder="Landmark, area" /></Field>
            <Field label="City"><TextInput value={form.address.city} onChange={(event) => set("address", { ...form.address, city: event.target.value })} /></Field>
            <Field label="District"><TextInput value={form.address.district} onChange={(event) => set("address", { ...form.address, district: event.target.value })} /></Field>
            <Field label="State"><TextInput value={form.address.state} onChange={(event) => set("address", { ...form.address, state: event.target.value })} /></Field>
            <Field label="PIN code"><TextInput inputMode="numeric" maxLength={6} value={form.address.pincode} onChange={(event) => set("address", { ...form.address, pincode: event.target.value.replace(/\D/g, "") })} /></Field>
            <Field label="Opening hours" className="sm:col-span-2"><TextInput value={form.hours} onChange={(event) => set("hours", event.target.value)} placeholder="Mon–Sat 10:00–20:00" /></Field>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[13px] font-semibold">Location on the map</p>
              <MapPicker value={form.location} onChange={(location) => set("location", location)} />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <p className="text-[14px] text-muted">Upload clear photos or PDFs. Documents are private: only you and the SureGad review team can open them.</p>
            <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-canvas p-4 ring-1 ring-line">
              <Field label="Document type" className="min-w-[220px] flex-1">
                <Select value={uploadKind} onChange={(event) => setUploadKind(event.target.value)}>
                  {DOCUMENT_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}{kind.required ? " (required)" : ""}</option>)}
                </Select>
              </Field>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} />
              <Btn icon={Upload} busy={uploading} onClick={() => fileInput.current?.click()}>Upload file</Btn>
              <p className="w-full text-[12px] text-muted">{DOCUMENT_KINDS.find((kind) => kind.value === uploadKind)?.hint}</p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {DOCUMENT_KINDS.filter((kind) => kind.required || docs.some((doc) => doc.kind === kind.value)).map((kind) => {
                const mine = docs.filter((doc) => doc.kind === kind.value);
                return (
                  <li key={kind.value} className="rounded-2xl p-4 ring-1 ring-line">
                    <p className="flex items-center gap-2 text-[14px] font-semibold">{mine.length ? <Check size={16} className="text-success" /> : <AlertCircle size={16} className="text-warning" />} {kind.label}</p>
                    {mine.map((doc) => (
                      <div key={doc.id} className="mt-2 flex items-center gap-2 text-[13px]">
                        <button type="button" onClick={() => void openPrivateFile(`/showroom/application/documents/${doc.id}/file`)} className="min-w-0 flex-1 truncate text-left text-brand-700 hover:underline">{doc.name}</button>
                        <StatusPill status={doc.status} />
                        {doc.status !== "approved" ? <button type="button" onClick={() => void removeDoc(doc.id)} aria-label={`Remove ${doc.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-danger"><Trash2 size={14} /></button> : null}
                      </div>
                    ))}
                    {!mine.length ? <p className="mt-1 text-[12px] text-muted">{kind.hint}</p> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <Field label="What do you sell?"><Chips options={CATEGORIES} value={form.profile.categories as (typeof CATEGORIES)[number][]} onChange={(categories) => set("profile", { ...form.profile, categories })} /></Field>
            <Field label="Device conditions"><Chips options={CONDITIONS} value={form.profile.conditions as (typeof CONDITIONS)[number][]} onChange={(conditions) => set("profile", { ...form.profile, conditions })} /></Field>
            <Field label="Brands you stock" hint="Separate with commas"><TextInput value={form.profile.brands} onChange={(event) => set("profile", { ...form.profile, brands: event.target.value })} placeholder="Apple, Samsung, OnePlus, Dell" /></Field>
            <Toggle checked={form.profile.physicalShowroom} onChange={(physicalShowroom) => set("profile", { ...form.profile, physicalShowroom })} label="We have a physical showroom" hint="Buyers can visit to see devices and collect orders." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website"><TextInput value={form.social.website} onChange={(event) => set("social", { ...form.social, website: event.target.value })} placeholder="https://" /></Field>
              <Field label="Instagram"><TextInput value={form.social.instagram} onChange={(event) => set("social", { ...form.social, instagram: event.target.value })} placeholder="@handle or link" /></Field>
              <Field label="Facebook"><TextInput value={form.social.facebook} onChange={(event) => set("social", { ...form.social, facebook: event.target.value })} /></Field>
              <Field label="WhatsApp business number"><TextInput value={form.social.whatsapp} onChange={(event) => set("social", { ...form.social, whatsapp: event.target.value })} /></Field>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-5">
            {missing.length ? (
              <Notice tone="amber" icon={AlertCircle}>
                <strong>Before you submit, complete:</strong>
                <ul className="mt-1 list-disc pl-5 text-[13px]">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
              </Notice>
            ) : (
              <Notice tone="green" icon={CheckCircle2}>Everything required is filled in. Submit when you're ready.</Notice>
            )}
            <dl className="grid gap-4 rounded-2xl bg-canvas p-5 text-[14px] sm:grid-cols-2">
              {[
                ["Owner", `${form.owner.name} · ${form.owner.mobile}`],
                ["Business", `${form.name} (${BUSINESS_TYPES.find(([value]) => value === form.businessType)?.[1] || "type not set"})`],
                ["GSTIN / PAN", [form.gstin, form.pan].filter(Boolean).join(" / ") || "—"],
                ["Contact", `${form.phone} · ${form.email}`],
                ["Address", [form.address.line1, form.address.city, form.address.district, form.address.pincode].filter(Boolean).join(", ")],
                ["Map", form.location ? "Pinned" : "Not pinned"],
                ["Sells", form.profile.categories.map((item) => titleCase(item)).join(", ") || "—"],
                ["Documents", `${docs.length} uploaded`],
              ].map(([label, value]) => (
                <div key={label}><dt className="text-[12px] font-semibold text-muted uppercase">{label}</dt><dd className="mt-0.5">{value}</dd></div>
              ))}
            </dl>
            <p className="text-[13px] text-muted">By submitting you confirm the details are accurate and agree to SureGad's seller terms. Misleading information leads to rejection or suspension.</p>
          </div>
        ) : null}

        <div className="mt-6"><ErrorBox error={error} /></div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <span className="text-[12px] text-muted">{saving ? "Saving…" : saved ? `Saved ${saved.toLocaleTimeString()}` : data ? "Progress is saved when you continue" : ""}</span>
          <div className="flex gap-2">
            {step > 0 ? <Btn variant="secondary" disabled={saving} onClick={() => void save(step - 1)}>Back</Btn> : null}
            {step < STEPS.length - 1 ? (
              <Btn busy={saving} onClick={() => void save(step + 1)}>Save and continue</Btn>
            ) : (
              <Btn busy={saving} disabled={missing.length > 0} onClick={() => void submit()}>{data?.status === "draft" ? "Submit application" : "Submit again"}</Btn>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
