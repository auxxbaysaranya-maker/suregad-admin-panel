import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, ClipboardCheck, Crown, Download, Flag, IndianRupee, MessageCircle, Percent, ShieldCheck, ShoppingBag, Sparkles, Star, Undo2, Users, Wallet, Wrench, XCircle } from "lucide-react";
import { api, downloadFile } from "../../lib/api";
import { money, titleCase } from "../../lib/utils";
import { PageHeader } from "../../components/PanelShell";
import { Modal } from "../../components/Modal";
import { Btn, Drawer, Empty, ErrorBox, Facts, Field, Loading, Notice, Panel, Pill, SearchBox, Select, StatCard, StatusPill, Table, Tabs, TextArea, TextInput, Timeline, formatDate, formatDateTime, useAction } from "../../components/kit";

/* ================= Customers ================= */

interface Customer { id: string; name: string; city: string | null; orders: number; spentPaise: number; firstOrderAt: string | null; lastOrderAt: string | null; chats: number; lastChatAt: string | null; kind: "customer" | "repeat" | "lead" }

export function CustomersPage() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const query = useQuery({ queryKey: ["showroom-customers"], queryFn: async () => (await api.get("/showroom/customers")).data.data as Customer[] });
  const rows = (query.data || []).filter((row) => (!kind || row.kind === kind) && (!q || row.name.toLowerCase().includes(q.toLowerCase())));
  const count = (value: string) => (query.data || []).filter((row) => row.kind === value).length;
  return (
    <div>
      <PageHeader title="Customers" description="Buyers who ordered from you or chatted about your listings. Contact details stay private to protect buyers." />
      <Tabs value={kind} onChange={setKind} items={[{ value: "", label: "Everyone", count: query.data?.length }, { value: "repeat", label: "Repeat buyers", count: count("repeat") }, { value: "customer", label: "One order", count: count("customer") }, { value: "lead", label: "Chat leads", count: count("lead") }]} />
      <div className="mt-4"><SearchBox value={q} onChange={setQ} placeholder="Search by name" /></div>
      <div className="mt-4">
        <ErrorBox error={query.error} />
        {query.isLoading ? <Loading /> : !rows.length ? <Empty icon={Users} title="No customers yet" body="Buyers appear here after they order or message you." /> : (
          <Table head={["Customer", "City", "Orders", "Spent", "Last order", "Chats", "Type"]}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-semibold">{row.name}</td>
                <td className="px-4 py-3">{row.city || "—"}</td>
                <td className="px-4 py-3">{row.orders}</td>
                <td className="px-4 py-3 font-semibold">{money(row.spentPaise)}</td>
                <td className="px-4 py-3 text-[13px] text-muted">{formatDate(row.lastOrderAt)}</td>
                <td className="px-4 py-3">{row.chats}</td>
                <td className="px-4 py-3"><Pill tone={row.kind === "repeat" ? "green" : row.kind === "lead" ? "amber" : "brand"}>{titleCase(row.kind)}</Pill></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

/* ================= Inspections & partners ================= */

interface Inspection { id: string; number: string; status: string; mode: string; appointmentAt: string | null; product: { id: string; title: string; slug: string } | null; plan: string | null; partner: { id: string; name: string } | null; conversationId: string | null; coordination: { deviceReady?: boolean; preferredSlots?: string[]; meetingLink?: string; sellerNote?: string; sellerConfirmedAt?: string }; report: { score: number; verdict: string; published: boolean } | null; createdAt: string }

export function InspectionsPage({ basePath = "/seller" }: { basePath?: string }) {
  const [open, setOpen] = useState<Inspection | null>(null);
  const query = useQuery({ queryKey: ["showroom-inspections"], queryFn: async () => (await api.get("/showroom/inspections")).data.data as Inspection[], refetchInterval: 30_000 });
  return (
    <div>
      <PageHeader title="Inspections" description="Buyer-requested inspections of your devices. Coordinate access with the partner; findings are recorded only by the partner." />
      <ErrorBox error={query.error} />
      {query.isLoading ? <Loading /> : !query.data?.length ? <Empty icon={ClipboardCheck} title="No inspections yet" body="When a buyer books an inspection of one of your devices, it shows here." /> : (
        <Table head={["Request", "Device", "Type", "Partner", "Appointment", "Status", "Result"]}>
          {query.data.map((row) => (
            <tr key={row.id} onClick={() => setOpen(row)} className="cursor-pointer hover:bg-canvas">
              <td className="px-4 py-3 font-mono text-[13px] font-semibold">{row.number}</td>
              <td className="max-w-[220px] truncate px-4 py-3">{row.product?.title || "—"}</td>
              <td className="px-4 py-3"><Pill tone={row.mode === "online" ? "blue" : "violet"}>{row.mode === "online" ? "Online" : "Physical"}</Pill></td>
              <td className="px-4 py-3">{row.partner?.name || <span className="text-muted">Finding partner</span>}</td>
              <td className="px-4 py-3 text-[13px]">{formatDateTime(row.appointmentAt)}</td>
              <td className="px-4 py-3"><StatusPill status={row.status} /></td>
              <td className="px-4 py-3">{row.report ? <span className="font-semibold">{row.report.score}/100</span> : "—"}</td>
            </tr>
          ))}
        </Table>
      )}
      {open ? <InspectionDrawer row={open} basePath={basePath} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function InspectionDrawer({ row, onClose, basePath }: { row: Inspection; onClose: () => void; basePath: string }) {
  const [form, setForm] = useState({ deviceReady: Boolean(row.coordination.deviceReady), slots: (row.coordination.preferredSlots || []).join("\n"), meetingLink: row.coordination.meetingLink || "", sellerNote: row.coordination.sellerNote || "" });
  const action = useAction(["showroom-inspections"]);
  const closed = ["report_submitted", "completed", "cancelled", "expired"].includes(row.status);
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} title={`Inspection ${row.number}`} description={row.product?.title}>
      <div className="space-y-5">
        <Panel>
          <Facts items={[["Status", <StatusPill key="s" status={row.status} />], ["Type", row.mode === "online" ? "Online video inspection" : "Physical inspection"], ["Plan", row.plan], ["Partner", row.partner?.name || "Not assigned yet"], ["Appointment", formatDateTime(row.appointmentAt)], ["Requested", formatDate(row.createdAt)]]} />
          {row.conversationId ? <Link to={`${basePath}/messages/${row.conversationId}`} className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-700"><MessageCircle size={16} /> Chat with the partner</Link> : null}
        </Panel>
        {row.report ? (
          <Panel title="Partner's result">
            <Facts items={[["Score", `${row.report.score}/100`], ["Verdict", titleCase(row.report.verdict)], ["Published on listing", row.report.published ? "Yes" : "No"]]} />
            <p className="mt-3 text-[12px] text-muted">Reports are written by the partner and can't be edited by sellers. Raise a support ticket if something is wrong.</p>
          </Panel>
        ) : null}
        {!closed ? (
          <Panel title="Arrangements" description="Visible to the assigned partner.">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[14px] font-semibold"><input type="checkbox" checked={form.deviceReady} onChange={(event) => setForm({ ...form, deviceReady: event.target.checked })} className="h-4 w-4 accent-brand-600" /> Device is charged and ready</label>
              <Field label="Preferred time slots" hint="One per line, e.g. Tue 11:00–13:00"><TextArea value={form.slots} onChange={(event) => setForm({ ...form, slots: event.target.value })} className="min-h-20" /></Field>
              {row.mode === "online" ? <Field label="Video call link (Google Meet or similar)"><TextInput value={form.meetingLink} onChange={(event) => setForm({ ...form, meetingLink: event.target.value })} placeholder="https://meet.google.com/…" /></Field> : null}
              <Field label="Note for the partner"><TextArea value={form.sellerNote} onChange={(event) => setForm({ ...form, sellerNote: event.target.value })} className="min-h-20" /></Field>
              <ErrorBox error={action.error} />
              <Btn busy={action.busy === "save"} onClick={() => void action.run("save", () => api.patch(`/showroom/inspections/${row.id}/coordination`, { deviceReady: form.deviceReady, preferredSlots: form.slots.split("\n").map((slot) => slot.trim()).filter(Boolean), meetingLink: form.meetingLink || undefined, sellerNote: form.sellerNote || undefined }))}>Save arrangements</Btn>
            </div>
          </Panel>
        ) : null}
      </div>
    </Drawer>
  );
}

export function ServicePartnersPage() {
  const query = useQuery({ queryKey: ["showroom-partners"], queryFn: async () => (await api.get("/showroom/service-partners")).data.data as { id: string; name: string; city: string | null; verified: boolean; experienceYears: number; rating: number | null; completed: number; inspections: number; open: number; lastAt: string; conversationIds: string[] }[] });
  return (
    <div>
      <PageHeader title="Service partners" description="Verified inspection partners who have inspected your devices." />
      <ErrorBox error={query.error} />
      {query.isLoading ? <Loading /> : !query.data?.length ? <Empty icon={Wrench} title="No partners yet" body="Partners appear here once one is assigned to inspect your device." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.map((partner) => (
            <article key={partner.id} className="rounded-[22px] bg-white p-5 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-[17px]">{partner.name}</h3><p className="text-[13px] text-muted">{partner.city || "Kerala"} · {partner.experienceYears} yrs experience</p></div>
                {partner.verified ? <Pill tone="green"><ShieldCheck size={12} /> Verified</Pill> : null}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[13px]">
                <div className="rounded-xl bg-canvas p-2"><p className="font-display text-[18px] font-bold">{partner.inspections}</p>With you</div>
                <div className="rounded-xl bg-canvas p-2"><p className="font-display text-[18px] font-bold">{partner.open}</p>Open</div>
                <div className="rounded-xl bg-canvas p-2"><p className="font-display text-[18px] font-bold">{partner.rating ?? "—"}</p>Rating</div>
              </div>
              {partner.conversationIds[0] ? <Link to={`/seller/messages/${partner.conversationIds[0]}`} className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-700"><MessageCircle size={16} /> Open latest chat</Link> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Promotions ================= */

interface PromotionData { promotions: { id: string; name: string; kind: string; value: number; startsAt: string; endsAt: string; status: string; products: { id: string; title: string }[] }[]; featureRequests: { id: string; productId: string; title: string; days: number; status: string; note: string; adminNote: string | null; createdAt: string; featuredUntil: string | null }[] }

function useLiveListings() {
  return useQuery({ queryKey: ["showroom-products", "live-picker"], queryFn: async () => (await api.get("/showroom/products", { params: { status: "active", limit: 100 } })).data.data as { id: string; title: string; pricePaise: number }[] });
}

export function PromotionsPage() {
  const query = useQuery({ queryKey: ["showroom-promotions"], queryFn: async () => (await api.get("/showroom/promotions")).data.data as PromotionData });
  const [creating, setCreating] = useState(false);
  const [featuring, setFeaturing] = useState(false);
  const action = useAction(["showroom-promotions", "showroom-products"]);
  return (
    <div>
      <PageHeader title="Promotions" description="Run discounts now or on a schedule. Prices change and restore automatically, and every change is in price history." actions={<><Btn variant="secondary" icon={Sparkles} onClick={() => setFeaturing(true)}>Request featured spot</Btn><Btn icon={Percent} onClick={() => setCreating(true)}>New discount</Btn></>} />
      <ErrorBox error={query.error || action.error} />
      {query.isLoading ? <Loading /> : (
        <div className="space-y-5">
          <Panel title="Discounts" bodyClassName="p-0">
            {!query.data?.promotions.length ? <p className="p-5 text-[14px] text-muted">No discounts yet. To change many prices at once without an end date, use Products → select → Change price.</p> : (
              <ul className="divide-y divide-line">
                {query.data.promotions.map((promo) => (
                  <li key={promo.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{promo.name} · {promo.kind === "percent" ? `${promo.value}% off` : `${money(promo.value)} off`}</p>
                      <p className="text-[13px] text-muted">{formatDateTime(promo.startsAt)} → {formatDateTime(promo.endsAt)} · {promo.products.map((product) => product.title).join(", ")}</p>
                    </div>
                    <StatusPill status={promo.status} />
                    {["scheduled", "active"].includes(promo.status) ? <Btn size="sm" variant="danger" busy={action.busy === promo.id} onClick={() => window.confirm("End this promotion now? Prices go back to normal.") && void action.run(promo.id, () => api.post(`/showroom/promotions/${promo.id}/cancel`))}>End now</Btn> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Featured listing requests" description="SureGad reviews each request. Approved listings appear in Featured on the home page." bodyClassName="p-0">
            {!query.data?.featureRequests.length ? <p className="p-5 text-[14px] text-muted">No requests yet.</p> : (
              <ul className="divide-y divide-line">
                {query.data.featureRequests.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1"><p className="font-semibold">{row.title}</p><p className="text-[13px] text-muted">{row.days} days · requested {formatDate(row.createdAt)}{row.adminNote ? ` · ${row.adminNote}` : ""}{row.featuredUntil ? ` · featured until ${formatDate(row.featuredUntil)}` : ""}</p></div>
                    <StatusPill status={row.status} />
                    {row.status === "pending" ? <Btn size="sm" variant="secondary" busy={action.busy === row.id} onClick={() => void action.run(row.id, () => api.post(`/showroom/feature-requests/${row.id}/cancel`))}>Withdraw</Btn> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
      <PromotionModal open={creating} onClose={() => setCreating(false)} />
      <FeatureModal open={featuring} onClose={() => setFeaturing(false)} />
    </div>
  );
}

function PromotionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const listings = useLiveListings();
  const toLocal = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [form, setForm] = useState({ name: "", kind: "percent", value: "10", startsAt: "", endsAt: toLocal(new Date(Date.now() + 7 * 86400000)) });
  const [ids, setIds] = useState<string[]>([]);
  const action = useAction(["showroom-promotions", "showroom-products"]);
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()} title="New discount" size="lg">
      <div className="space-y-4">
        <Field label="Name"><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Onam sale" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Discount">
            <Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}><option value="percent">Percent off</option><option value="amount">Rupees off</option></Select>
          </Field>
          <Field label={form.kind === "percent" ? "Percent (max 90)" : "Rupees"}><TextInput inputMode="decimal" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></Field>
          <Field label="Starts" hint="Leave empty to start now"><TextInput type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field>
          <Field label="Ends"><TextInput type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></Field>
        </div>
        <Field label={`Listings (${ids.length} selected)`}>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl p-2 ring-1 ring-line">
            {(listings.data || []).map((row) => (
              <label key={row.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[14px] hover:bg-canvas">
                <input type="checkbox" checked={ids.includes(row.id)} onChange={() => setIds(ids.includes(row.id) ? ids.filter((id) => id !== row.id) : [...ids, row.id])} className="h-4 w-4 accent-brand-600" />
                <span className="min-w-0 flex-1 truncate">{row.title}</span><span className="text-muted">{money(row.pricePaise)}</span>
              </label>
            ))}
            {!listings.data?.length ? <p className="p-2 text-[13px] text-muted">No live listings.</p> : null}
          </div>
        </Field>
        <ErrorBox error={action.error} />
        <Btn className="w-full" busy={action.busy === "create"} disabled={!form.name || !ids.length} onClick={() => void action.run("create", () => api.post("/showroom/promotions", {
          name: form.name,
          kind: form.kind,
          value: form.kind === "percent" ? Number(form.value) : Math.round(Number(form.value) * 100),
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          endsAt: new Date(form.endsAt).toISOString(),
          productIds: ids,
        })).then((done) => done && onClose())}>Create discount</Btn>
      </div>
    </Modal>
  );
}

function FeatureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const listings = useLiveListings();
  const [productId, setProductId] = useState("");
  const [days, setDays] = useState("7");
  const [note, setNote] = useState("");
  const action = useAction(["showroom-promotions"]);
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()} title="Request a featured spot" size="sm">
      <div className="space-y-4">
        <Field label="Listing"><Select value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Choose…</option>{(listings.data || []).map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</Select></Field>
        <Field label="Days"><TextInput inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} /></Field>
        <Field label="Note (optional)"><TextInput value={note} onChange={(event) => setNote(event.target.value)} /></Field>
        <ErrorBox error={action.error} />
        <Btn className="w-full" busy={action.busy === "send"} disabled={!productId} onClick={() => void action.run("send", () => api.post("/showroom/feature-requests", { productId, days: Number(days), note })).then((done) => done && onClose())}>Send request</Btn>
      </div>
    </Modal>
  );
}

/* ================= Reviews ================= */

interface ReviewData { summary: { count: number; average: number | null; distribution: { star: number; count: number }[]; replyRate: number; last30: number }; reviews: { id: string; rating: number; body: string; author: string; product: string | null; verifiedPurchase: boolean; sellerReply: string | null; reported: boolean; status: string; createdAt: string }[] }

export function ReviewsPage() {
  const query = useQuery({ queryKey: ["showroom-reviews"], queryFn: async () => (await api.get("/showroom/reviews")).data.data as ReviewData });
  const [filter, setFilter] = useState("all");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const action = useAction(["showroom-reviews"]);
  const data = query.data;
  const rows = (data?.reviews || []).filter((row) => filter === "all" || (filter === "unreplied" ? !row.sellerReply : filter === "low" ? row.rating <= 2 : true));
  return (
    <div>
      <PageHeader title="Reviews" description="What buyers say about your showroom and devices. Reply publicly or report reviews that break the rules." />
      <ErrorBox error={query.error || action.error} />
      {query.isLoading || !data ? <Loading /> : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard icon={Star} label="Average rating" value={data.summary.average ?? "—"} hint={`${data.summary.count} reviews`} tone="amber" />
            <StatCard icon={MessageCircle} label="Replied" value={`${data.summary.replyRate}%`} tone="brand" />
            <StatCard icon={BarChart3} label="Last 30 days" value={data.summary.last30} tone="violet" />
            <div className="rounded-[22px] bg-white p-4 ring-1 ring-line">
              {[...data.summary.distribution].reverse().map((row) => (
                <div key={row.star} className="flex items-center gap-2 text-[12px]"><span className="w-6">{row.star}★</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas"><span className="block h-full bg-amber-400" style={{ width: `${data.summary.count ? (row.count / data.summary.count) * 100 : 0}%` }} /></span><span className="w-6 text-right">{row.count}</span></div>
              ))}
            </div>
          </div>
          <Tabs className="mt-5" value={filter} onChange={setFilter} items={[{ value: "all", label: "All" }, { value: "unreplied", label: "Needs reply" }, { value: "low", label: "1–2 stars" }]} />
          <div className="mt-4 space-y-3">
            {!rows.length ? <Empty icon={Star} title="No reviews here" /> : rows.map((row) => (
              <article key={row.id} className="rounded-[22px] bg-white p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-center gap-2"><span className="text-amber-500">{"★".repeat(row.rating)}<span className="text-line">{"★".repeat(5 - row.rating)}</span></span><span className="font-semibold">{row.author}</span>{row.verifiedPurchase ? <Pill tone="green">Verified purchase</Pill> : null}{row.status === "flagged" ? <Pill tone="red">Reported</Pill> : null}<span className="ml-auto text-[12px] text-muted">{formatDate(row.createdAt)}</span></div>
                {row.product ? <p className="mt-1 text-[13px] text-muted">{row.product}</p> : null}
                <p className="mt-2 text-[14px]">{row.body || <span className="text-muted">No comment</span>}</p>
                {row.sellerReply ? <div className="mt-3 rounded-2xl bg-brand-50 p-3 text-[14px]"><p className="text-[12px] font-semibold text-brand-700">Your reply</p>{row.sellerReply}</div> : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <TextInput value={reply[row.id] || ""} onChange={(event) => setReply({ ...reply, [row.id]: event.target.value })} placeholder="Write a public reply" className="min-w-[220px] flex-1" />
                    <Btn size="sm" className="h-11" busy={action.busy === row.id} disabled={(reply[row.id] || "").trim().length < 2} onClick={() => void action.run(row.id, () => api.post(`/showroom/reviews/${row.id}/reply`, { reply: reply[row.id] }))}>Reply</Btn>
                  </div>
                )}
                {!row.reported ? <button type="button" onClick={() => { setReporting(row.id); setReason(""); }} className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-danger"><Flag size={12} /> Report review</button> : null}
              </article>
            ))}
          </div>
        </>
      )}
      <Modal open={Boolean(reporting)} onOpenChange={(open) => !open && setReporting(null)} title="Report this review" description="SureGad checks reported reviews against the review policy. Ratings can't be removed just for being negative." size="sm">
        <div className="space-y-3">
          <TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What breaks the policy? (abusive, fake, not about this purchase…)" />
          <Btn className="w-full" busy={action.busy === "report"} disabled={reason.trim().length < 5} onClick={() => void action.run("report", () => api.post(`/showroom/reviews/${reporting}/report`, { reason })).then((done) => done && setReporting(null))}>Report</Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ================= Returns & warranty ================= */

interface ReturnRow { id: string; number: string; orderNumber: string | null; product: string | null; unitCode: string | null; buyer: string; reason: string; details: string; images: string[]; amountPaise: number; status: string; allowed: string[]; sellerNote: string | null; unitCondition: string | null; timeline: { status: string; note?: string; at: string }[]; createdAt: string }

const RETURN_LABELS: Record<string, string> = { approved: "Approve return", rejected: "Reject", pickup_scheduled: "Pickup scheduled", received: "Device received", refund_requested: "Request refund" };

export function ReturnsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "warranty" ? "warranty" : "returns";
  const returns = useQuery({ queryKey: ["showroom-returns"], queryFn: async () => (await api.get("/showroom/returns")).data.data as ReturnRow[] });
  const claims = useQuery({ queryKey: ["showroom-claims"], enabled: tab === "warranty", queryFn: async () => (await api.get("/showroom/warranty-claims")).data.data as { unitId: string; unitCode: string; title: string; claimId: string; issue: string; status: string; sellerNote: string | null; createdAt: string; warranty: { months: number; endsAt?: string } }[] });
  const [open, setOpen] = useState<ReturnRow | null>(null);
  const action = useAction(["showroom-claims"]);
  const [claimNote, setClaimNote] = useState<Record<string, string>>({});
  const exporter = useAction();
  return (
    <div>
      <PageHeader title="Returns & warranty" description="Handle buyer returns and warranty claims. Refunds are paid by SureGad through the payment gateway after you request them." actions={<Btn variant="secondary" icon={Download} busy={Boolean(exporter.busy)} onClick={() => void exporter.run("csv", () => downloadFile("/showroom/reports/returns?days=365", "returns.csv"))}>Export</Btn>} />
      <Tabs value={tab} onChange={(value) => setParams(value === "warranty" ? { tab: "warranty" } : {})} items={[{ value: "returns", label: "Returns", count: returns.data?.length }, { value: "warranty", label: "Warranty claims" }]} />
      <div className="mt-4">
        {tab === "returns" ? (
          returns.isLoading ? <Loading /> : !returns.data?.length ? <Empty icon={Undo2} title="No returns" body="Buyers can request a return within your return window after delivery." /> : (
            <Table head={["Return", "Order", "Device", "Reason", "Amount", "Status", "Opened"]}>
              {returns.data.map((row) => (
                <tr key={row.id} onClick={() => setOpen(row)} className="cursor-pointer hover:bg-canvas">
                  <td className="px-4 py-3 font-mono text-[13px] font-semibold">{row.number}</td>
                  <td className="px-4 py-3">{row.orderNumber}</td>
                  <td className="max-w-[200px] truncate px-4 py-3">{row.product}</td>
                  <td className="px-4 py-3">{titleCase(row.reason)}</td>
                  <td className="px-4 py-3 font-semibold">{money(row.amountPaise)}</td>
                  <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                  <td className="px-4 py-3 text-[13px] text-muted">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </Table>
          )
        ) : claims.isLoading ? <Loading /> : !claims.data?.length ? <Empty icon={ShieldCheck} title="No warranty claims" body="Buyers can claim on units still under your warranty." /> : (
          <div className="space-y-3">
            <ErrorBox error={action.error} />
            {claims.data.map((claim) => (
              <article key={claim.claimId} className="rounded-[22px] bg-white p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{claim.title}</span><span className="font-mono text-[12px] text-muted">{claim.unitCode}</span><StatusPill status={claim.status} /><span className="ml-auto text-[12px] text-muted">{formatDate(claim.createdAt)}</span></div>
                <p className="mt-2 text-[14px]">{claim.issue}</p>
                {claim.sellerNote ? <p className="mt-2 text-[13px] text-muted">Your note: {claim.sellerNote}</p> : null}
                {!["resolved", "rejected"].includes(claim.status) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <TextInput value={claimNote[claim.claimId] || ""} onChange={(event) => setClaimNote({ ...claimNote, [claim.claimId]: event.target.value })} placeholder="Note to the buyer" className="min-w-[200px] flex-1" />
                    {(claim.status === "open" ? ["accepted", "rejected"] : claim.status === "accepted" ? ["in_repair", "resolved"] : ["resolved"]).map((to) => (
                      <Btn key={to} size="sm" className="h-11" variant={to === "rejected" ? "danger" : "primary"} busy={action.busy === `${claim.claimId}${to}`} onClick={() => void action.run(`${claim.claimId}${to}`, () => api.post(`/showroom/warranty-claims/${claim.unitId}/${claim.claimId}`, { status: to, note: claimNote[claim.claimId] || undefined }))}>{titleCase(to)}</Btn>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
      {open ? <ReturnDrawer row={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function ReturnDrawer({ row, onClose }: { row: ReturnRow; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [condition, setCondition] = useState("resellable");
  const action = useAction(["showroom-returns", "showroom-inventory", "showroom-orders", "showroom-dashboard"]);
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} title={`Return ${row.number}`} description={`Order ${row.orderNumber}`}>
      <div className="space-y-5">
        <Panel>
          <Facts items={[["Status", <StatusPill key="s" status={row.status} />], ["Buyer", row.buyer], ["Device", `${row.product || ""}${row.unitCode ? ` (${row.unitCode})` : ""}`], ["Reason", titleCase(row.reason)], ["Amount", money(row.amountPaise)], ["Condition on arrival", row.unitCondition ? titleCase(row.unitCondition) : "—"]]} />
          {row.details ? <p className="mt-4 rounded-2xl bg-canvas p-3 text-[14px]">{row.details}</p> : null}
          {row.images.length ? <div className="mt-3 flex flex-wrap gap-2">{row.images.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="Buyer photo" className="h-20 w-20 rounded-xl object-cover ring-1 ring-line" /></a>)}</div> : null}
        </Panel>
        {row.status === "escalated" ? <Notice tone="amber">The buyer escalated this return. SureGad will decide and notify you both.</Notice> : null}
        {row.allowed.length ? (
          <Panel title="Next step">
            <div className="space-y-3">
              <TextInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note to the buyer (required to reject)" />
              {row.allowed.includes("received") ? (
                <Field label="Condition the device came back in">
                  <Select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="resellable">Resellable — back to stock as returned</option><option value="repair">Needs repair</option><option value="damaged">Damaged</option></Select>
                </Field>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {row.allowed.map((to) => (
                  <Btn key={to} size="sm" variant={to === "rejected" ? "danger" : "primary"} busy={action.busy === to} onClick={() => void action.run(to, () => api.post(`/showroom/returns/${row.id}/action`, { to, note: note || undefined, unitCondition: to === "received" ? condition : undefined })).then((done) => done && onClose())}>{RETURN_LABELS[to] || titleCase(to)}</Btn>
                ))}
              </div>
              <ErrorBox error={action.error} />
            </div>
          </Panel>
        ) : null}
        <Panel title="Timeline"><Timeline events={row.timeline} /></Panel>
      </div>
    </Drawer>
  );
}

/* ================= Payments ================= */

interface PaymentsData {
  fees: { configured: boolean; commissionPercent: number; gatewayFeePercent: number; settlementHoldDays: number };
  totals: { grossPaise: number; inProgressPaise: number; onHoldPaise: number; releasablePaise: number; settledPaise: number; payablePaise: number; refundedPaise: number };
  lines: { orderId: string; subOrderId: string; number: string; createdAt: string; status: string; paymentStatus: string; grossPaise: number; commissionPaise: number; gatewayFeePaise: number; refundedPaise: number; netPaise: number; stage: string }[];
  settlements: { id: string; amountPaise: number; reference: string; note: string; createdAt: string }[];
  bank: { accountName: string; accountNumberLast4: string; ifsc: string } | null;
}

export function PaymentsPage() {
  const query = useQuery({ queryKey: ["showroom-payments"], queryFn: async () => (await api.get("/showroom/payments")).data.data as PaymentsData });
  const [tab, setTab] = useState("ledger");
  const exporter = useAction();
  const data = query.data;
  return (
    <div>
      <PageHeader title="Payments" description="Earnings from paid orders, SureGad fees and settlements recorded by SureGad finance." actions={<Btn variant="secondary" icon={Download} busy={Boolean(exporter.busy)} onClick={() => void exporter.run("csv", () => downloadFile("/showroom/reports/payments?days=365", "payments.csv"))}>Export</Btn>} />
      <ErrorBox error={query.error} />
      {query.isLoading || !data ? <Loading /> : (
        <>
          {!data.fees.configured ? <div className="mb-4"><Notice tone="amber">SureGad hasn't published a commission rate yet, so fees show as 0%. Final payouts use the rate in force when SureGad settles.</Notice></div> : null}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard icon={IndianRupee} label="Gross sales" value={money(data.totals.grossPaise)} />
            <StatCard icon={ShoppingBag} label="Orders in progress (net)" value={money(data.totals.inProgressPaise)} tone="violet" />
            <StatCard icon={Wallet} label="Payable to you" value={money(data.totals.payablePaise)} hint={`${money(data.totals.onHoldPaise)} on ${data.fees.settlementHoldDays}-day hold`} tone="green" />
            <StatCard icon={Crown} label="Settled so far" value={money(data.totals.settledPaise)} hint={data.totals.refundedPaise ? `${money(data.totals.refundedPaise)} refunded` : undefined} tone="amber" />
          </div>
          <p className="mt-3 text-[13px] text-muted">Fees: {data.fees.commissionPercent}% SureGad commission + {data.fees.gatewayFeePercent}% payment gateway. Delivered orders become payable after {data.fees.settlementHoldDays} days. {data.bank ? `Payouts go to ${data.bank.accountName} ••${data.bank.accountNumberLast4}.` : "Add bank details in Business profile to receive payouts."}</p>
          <Tabs className="mt-5" value={tab} onChange={setTab} items={[{ value: "ledger", label: "Order ledger", count: data.lines.length }, { value: "settlements", label: "Settlements", count: data.settlements.length }]} />
          <div className="mt-4">
            {tab === "ledger" ? (
              !data.lines.length ? <Empty icon={Wallet} title="No paid orders yet" /> : (
                <Table head={["Order", "Status", "Gross", "Commission", "Gateway", "Refunded", "Net", "Stage"]}>
                  {data.lines.map((line) => (
                    <tr key={line.subOrderId}>
                      <td className="px-4 py-3"><span className="font-semibold">{line.number}</span><span className="block text-[12px] text-muted">{formatDate(line.createdAt)}</span></td>
                      <td className="px-4 py-3"><StatusPill status={line.status} /></td>
                      <td className="px-4 py-3">{money(line.grossPaise)}</td>
                      <td className="px-4 py-3 text-muted">−{money(line.commissionPaise)}</td>
                      <td className="px-4 py-3 text-muted">−{money(line.gatewayFeePaise)}</td>
                      <td className="px-4 py-3 text-muted">{line.refundedPaise ? `−${money(line.refundedPaise)}` : "—"}</td>
                      <td className="px-4 py-3 font-semibold">{money(line.netPaise)}</td>
                      <td className="px-4 py-3"><Pill tone={line.stage === "releasable" ? "green" : line.stage === "void" ? "slate" : line.stage === "on_hold" ? "amber" : "violet"}>{titleCase(line.stage)}</Pill></td>
                    </tr>
                  ))}
                </Table>
              )
            ) : !data.settlements.length ? <Empty icon={Wallet} title="No settlements yet" body="SureGad records each payout here with its bank reference." /> : (
              <Table head={["Date", "Amount", "Reference", "Note"]}>
                {data.settlements.map((row) => (
                  <tr key={row.id}><td className="px-4 py-3">{formatDate(row.createdAt)}</td><td className="px-4 py-3 font-semibold">{money(row.amountPaise)}</td><td className="px-4 py-3 font-mono text-[13px]">{row.reference}</td><td className="px-4 py-3 text-muted">{row.note || "—"}</td></tr>
                ))}
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Analytics ================= */

interface Analytics { days: number; totals: { revenuePaise: number; orders: number; averageOrderPaise: number; cancellations: number; returns: number; conversations: number; inspections: number; views: number; conversionPercent: number | null; grossMarginPaise: number | null }; daily: { date: string; revenuePaise: number; orders: number }[]; topProducts: { id: string; title: string; units: number; revenuePaise: number }[]; byCategory: { category: string; itemType: string; units: number; revenuePaise: number }[]; inventory: Record<string, { units: number; costPaise: number }> }

export function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const query = useQuery({ queryKey: ["showroom-analytics", days], queryFn: async () => (await api.get("/showroom/analytics", { params: { days } })).data.data as Analytics });
  const exporter = useAction();
  const data = query.data;
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Sales, demand and stock, calculated from your orders and listings."
        actions={
          <>
            <Select value={days} onChange={(event) => setDays(event.target.value)} className="w-auto" aria-label="Period"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></Select>
            <Btn variant="secondary" icon={Download} busy={exporter.busy === "sales"} onClick={() => void exporter.run("sales", () => downloadFile(`/showroom/reports/sales?days=${days}`, "sales.csv"))}>Sales CSV</Btn>
          </>
        }
      />
      <ErrorBox error={query.error || exporter.error} />
      {query.isLoading || !data ? <Loading rows={6} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard icon={IndianRupee} label="Revenue" value={money(data.totals.revenuePaise)} hint={`Avg order ${money(data.totals.averageOrderPaise)}`} />
            <StatCard icon={ShoppingBag} label="Orders" value={data.totals.orders} hint={`${data.totals.cancellations} cancelled or returned`} tone="violet" />
            <StatCard icon={Users} label="Listing views" value={data.totals.views} hint={data.totals.conversionPercent !== null ? `${data.totals.conversionPercent}% became orders` : undefined} tone="green" />
            <StatCard icon={Percent} label="Gross margin" value={data.totals.grossMarginPaise !== null ? money(data.totals.grossMarginPaise) : "—"} hint={data.totals.grossMarginPaise === null ? "Add unit costs to see margin" : undefined} tone="amber" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon={MessageCircle} label="New buyer chats" value={data.totals.conversations} />
            <StatCard icon={ClipboardCheck} label="Inspections booked" value={data.totals.inspections} tone="violet" />
            <StatCard icon={XCircle} label="Return requests" value={data.totals.returns} tone="red" />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Panel title="Revenue by day">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily.map((row) => ({ ...row, rupees: row.revenuePaise / 100 }))}>
                    <CartesianGrid stroke="#e8e5f4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5d5b78" }} tickLine={false} axisLine={false} tickFormatter={(value: string) => value.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: "#5d5b78" }} tickLine={false} axisLine={false} width={60} tickFormatter={(value: number) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`} />
                    <Tooltip formatter={(value) => [money(Number(value) * 100), "Revenue"]} contentStyle={{ borderRadius: 14, border: "1px solid #e8e5f4" }} />
                    <Bar dataKey="rupees" fill="#3a3fe0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {!data.daily.length ? <p className="text-center text-[13px] text-muted">No sales in this period.</p> : null}
            </Panel>
            <Panel title="By category and type">
              {!data.byCategory.length ? <p className="text-[14px] text-muted">No sales in this period.</p> : (
                <ul className="space-y-2 text-[14px]">{data.byCategory.map((row) => <li key={`${row.category}-${row.itemType}`} className="flex justify-between gap-2"><span>{titleCase(row.category)} · {titleCase(row.itemType)}</span><span className="font-semibold">{row.units} · {money(row.revenuePaise)}</span></li>)}</ul>
              )}
            </Panel>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Top products" bodyClassName="p-0">
              {!data.topProducts.length ? <p className="p-5 text-[14px] text-muted">No sales in this period.</p> : (
                <ol className="divide-y divide-line">{data.topProducts.map((row, index) => <li key={row.id} className="flex items-center gap-3 px-5 py-3 text-[14px]"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700">{index + 1}</span><span className="min-w-0 flex-1 truncate">{row.title}</span><span className="text-muted">{row.units} sold</span><span className="w-24 text-right font-semibold">{money(row.revenuePaise)}</span></li>)}</ol>
              )}
            </Panel>
            <Panel title="Stock value (at cost)">
              <ul className="space-y-2 text-[14px]">
                {Object.entries(data.inventory).map(([status, row]) => <li key={status} className="flex justify-between gap-2"><StatusPill status={status} /><span>{row.units} units · {row.costPaise ? money(row.costPaise) : "cost not set"}</span></li>)}
                {!Object.keys(data.inventory).length ? <li className="text-muted">No units in inventory.</li> : null}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Subscription ================= */

export function SubscriptionPage() {
  const query = useQuery({ queryKey: ["showroom-subscription"], queryFn: async () => (await api.get("/showroom/subscription")).data.data as { entitlements: { active: boolean; limits: { activeListings: number; monthlyListings: number; photosPerListing: number } }; subscription: { status: string; interval: string; currentPeriodEnd: string | null; plan: { code: string; name: string } | null } | null; usage: { activeListings: number; monthlyListings: number }; plans: { code: string; name: string; monthlyPricePaise: number; annualPricePaise: number; limits: { activeListings: number; monthlyListings: number; photosPerListing: number } }[] } });
  const showroomId = useQuery({ queryKey: ["showroom"], queryFn: async () => (await api.get("/showroom/me")).data.data as { id: string } });
  const action = useAction(["showroom-subscription"]);
  const [notice, setNotice] = useState("");
  const data = query.data;
  async function upgrade(code: string, interval: "monthly" | "annual") {
    const result = await action.run(code, async () => (await api.post("/subscriptions/checkout", { planCode: code, interval, businessId: showroomId.data?.id })).data.data as { payment: { gatewayOrderId: string; keyId?: string; amountPaise: number }; mock: boolean });
    if (!result) return;
    const { settlePayment } = await import("../../lib/payments");
    const paid = await action.run(`${code}-pay`, () => settlePayment(result));
    if (paid) setNotice("Payment verified. Your plan is active.");
  }
  const meter = (used: number, limit: number) => (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas"><div className={`h-full ${used / Math.max(limit, 1) > 0.9 ? "bg-danger" : "bg-brand-gradient"}`} style={{ width: `${Math.min(100, (used / Math.max(limit, 1)) * 100)}%` }} /></div>
  );
  return (
    <div>
      <PageHeader title="Subscription" description="Your plan decides how many listings you can run. Limits are enforced when you create or publish listings." />
      <ErrorBox error={query.error || action.error} />
      {notice ? <div className="mb-4"><Notice tone="green">{notice}</Notice></div> : null}
      {query.isLoading || !data ? <Loading /> : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Current plan">
              <p className="font-display text-[24px] font-bold">{data.subscription?.plan?.name || "No plan"}</p>
              <div className="mt-2 flex flex-wrap gap-2">{data.subscription ? <StatusPill status={data.subscription.status} /> : null}{data.subscription?.interval ? <Pill>{titleCase(data.subscription.interval)}</Pill> : null}</div>
              {data.subscription?.currentPeriodEnd && data.subscription.interval !== "free" ? <p className="mt-2 text-[13px] text-muted">Renews {formatDate(data.subscription.currentPeriodEnd)}</p> : null}
            </Panel>
            <Panel title="Active listings"><p className="font-display text-[24px] font-bold">{data.usage.activeListings} / {data.entitlements.limits.activeListings}</p>{meter(data.usage.activeListings, data.entitlements.limits.activeListings)}</Panel>
            <Panel title="Created this month"><p className="font-display text-[24px] font-bold">{data.usage.monthlyListings} / {data.entitlements.limits.monthlyListings}</p>{meter(data.usage.monthlyListings, data.entitlements.limits.monthlyListings)}<p className="mt-2 text-[12px] text-muted">Up to {data.entitlements.limits.photosPerListing} photos per listing</p></Panel>
          </div>
          <h2 className="mt-8 mb-3 text-[20px]">Plans</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.plans.map((plan) => {
              const current = plan.code === data.subscription?.plan?.code;
              return (
                <article key={plan.code} className={`rounded-[24px] p-5 ring-1 ${current ? "bg-brand-50 ring-brand-300" : "bg-white ring-line"}`}>
                  <div className="flex items-center justify-between"><h3 className="text-[18px]">{plan.name}</h3>{current ? <Pill tone="brand">Current</Pill> : null}</div>
                  <p className="mt-2 font-display text-[28px] font-bold">{plan.monthlyPricePaise ? money(plan.monthlyPricePaise) : "Free"}<span className="text-[14px] font-normal text-muted">{plan.monthlyPricePaise ? " / month" : ""}</span></p>
                  <ul className="mt-3 space-y-1 text-[14px] text-ink-soft"><li>{plan.limits.activeListings} active listings</li><li>{plan.limits.monthlyListings} new listings a month</li><li>{plan.limits.photosPerListing} photos per listing</li></ul>
                  {!current && plan.monthlyPricePaise > 0 ? (
                    <div className="mt-4 grid gap-2">
                      <Btn busy={action.busy === plan.code || action.busy === `${plan.code}-pay`} onClick={() => void upgrade(plan.code, "monthly")}>Choose monthly</Btn>
                      {plan.annualPricePaise ? <Btn variant="secondary" disabled={Boolean(action.busy)} onClick={() => void upgrade(plan.code, "annual")}>Annual · {money(plan.annualPricePaise)}</Btn> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export { formatDateTime };
