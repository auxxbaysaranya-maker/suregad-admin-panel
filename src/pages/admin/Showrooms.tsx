import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, ExternalLink, FileText, HeadphonesIcon, Sparkles } from "lucide-react";
import { api, openPrivateFile } from "../../lib/api";
import { marketplaceUrl } from "../../lib/config";
import { titleCase } from "../../lib/utils";
import { PageHeader } from "../../components/PanelShell";
import { Btn, Empty, ErrorBox, Facts, Field, Loading, Notice, Panel, Pill, SearchBox, Select, StatusPill, Table, Tabs, TextArea, TextInput, Timeline, formatDate, formatDateTime, useAction } from "../../components/kit";
import type { Showroom } from "../showroom/shared";
import type { Ticket } from "../shared/Support";

interface Row { id: string; code: string | null; name: string; status: string; city: string | null; gstin: string | null; owner: string | null; documents: number; pendingChange: boolean; submittedAt: string | null; createdAt: string }

const ACTION_COPY: Record<string, { label: string; tone: "primary" | "secondary" | "danger" }> = {
  start_review: { label: "Start review", tone: "secondary" },
  approve: { label: "Approve showroom", tone: "primary" },
  request_info: { label: "Request more information", tone: "secondary" },
  reject: { label: "Reject", tone: "danger" },
  suspend: { label: "Suspend", tone: "danger" },
  restore: { label: "Restore", tone: "primary" },
  revoke: { label: "Revoke access", tone: "danger" },
};

export function AdminShowrooms() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("submitted");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => { const timer = setTimeout(() => setSearch(q), 300); return () => clearTimeout(timer); }, [q]);
  const query = useQuery({ queryKey: ["admin-showrooms", status, search], queryFn: async () => (await api.get("/admin/showrooms", { params: { status, q: search } })).data.data as { counts: Record<string, number>; items: Row[] }, refetchInterval: 30_000 });
  const counts = query.data?.counts || {};
  return (
    <div>
      <PageHeader title="Showrooms" description="Review showroom applications, documents and profile changes. Only approved showrooms can list and sell." />
      <Tabs value={status} onChange={setStatus} items={[
        { value: "submitted", label: "New", count: counts.submitted || 0 },
        { value: "under_review", label: "In review", count: counts.under_review || 0 },
        { value: "info_required", label: "Waiting on seller", count: counts.info_required || 0 },
        { value: "changes", label: "Profile changes", count: counts.changes || 0 },
        { value: "approved", label: "Approved", count: counts.approved || 0 },
        { value: "suspended", label: "Suspended", count: counts.suspended || 0 },
        { value: "rejected", label: "Rejected", count: counts.rejected || 0 },
        { value: "draft", label: "Drafts", count: counts.draft || 0 },
        { value: "", label: "All" },
      ]} />
      <div className="mt-4"><SearchBox value={q} onChange={setQ} placeholder="Name, SG-SH code, GSTIN, email or city" /></div>
      <div className="mt-4">
        <ErrorBox error={query.error} />
        {query.isLoading ? <Loading /> : !query.data?.items.length ? <Empty icon={Building2} title="Nothing here" body="Showroom applications in this state appear here." /> : (
          <Table head={["Showroom", "Code", "Owner", "City", "GSTIN", "Docs", "Submitted", "Status"]}>
            {query.data.items.map((row) => (
              <tr key={row.id} onClick={() => navigate(`/admin/showrooms/${row.id}`)} className="cursor-pointer hover:bg-canvas">
                <td className="px-4 py-3 font-semibold">{row.name}{row.pendingChange ? <Pill tone="amber" className="ml-2">Change request</Pill> : null}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{row.code || "—"}</td>
                <td className="px-4 py-3">{row.owner || "—"}</td>
                <td className="px-4 py-3">{row.city || "—"}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{row.gstin || "—"}</td>
                <td className="px-4 py-3">{row.documents}</td>
                <td className="px-4 py-3 text-[13px] text-muted">{formatDate(row.submittedAt)}</td>
                <td className="px-4 py-3"><StatusPill status={row.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

type Detail = Showroom & { ownerAccount: { id: string; name: string; email: string; status: string; since: string } | null; stats: { listings: Record<string, number>; units: number; orders: number; returns: number; rating: { average: number; count: number } | null }; actions: { action: string; to: string; needsNote: boolean }[] };

export function AdminShowroomDetail() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ["admin-showroom", id], queryFn: async () => (await api.get(`/admin/showrooms/${id}`)).data.data as Detail });
  const [note, setNote] = useState("");
  const [docNote, setDocNote] = useState<Record<string, string>>({});
  const action = useAction(["admin-showrooms", "admin-showroom"]);
  const data = query.data;
  if (query.isLoading) return <Loading rows={6} />;
  if (!data) return <ErrorBox error={query.error} />;
  const run = (key: string, task: () => Promise<unknown>) => void action.run(key, task).then((done) => { if (done !== undefined) { setNote(""); void query.refetch(); } });
  return (
    <div>
      <PageHeader back="/admin/showrooms" title={data.name} description={`${data.code || "No code yet"} · applied ${formatDate(data.submittedAt || data.createdAt)}`} actions={<>{data.status === "approved" ? <a href={marketplaceUrl(`store/${data.slug}`)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold ring-1 ring-line"><ExternalLink size={16} /> Store page</a> : null}<StatusPill status={data.status} /></>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel title="Owner">
            <Facts items={[["Name", data.owner.name], ["Email", data.owner.email], ["Mobile", data.owner.mobile], ["Alternate phone", data.owner.alternatePhone], ["Account", data.ownerAccount ? `${data.ownerAccount.email} · ${data.ownerAccount.status}` : "—"], ["Member since", formatDate(data.ownerAccount?.since)]]} />
          </Panel>
          <Panel title="Business">
            <Facts items={[["Legal name", data.name], ["Type", titleCase(data.businessType || "")], ["Established", data.yearEstablished], ["GSTIN", data.gstin], ["PAN", data.pan], ["Registration no.", data.registrationNumber], ["Phone", data.phone], ["Email", data.email], ["Address", [data.address.line1, data.address.line2, data.address.city, data.address.district, data.address.state, data.address.pincode].filter(Boolean).join(", ")], ["Map", data.location ? <a key="m" className="text-brand-700 underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${data.location.lat}&mlon=${data.location.lng}#map=17/${data.location.lat}/${data.location.lng}`}>Open pin</a> : "Not set"], ["Hours", data.hours], ["Sells", `${data.profile.categories.map(titleCase).join(", ")} · ${data.profile.conditions.map(titleCase).join(", ")}`], ["Brands", data.profile.brands.join(", ")], ["Physical showroom", data.profile.physicalShowroom ? "Yes" : "No"]]} />
            {data.description ? <p className="mt-4 rounded-2xl bg-canvas p-3 text-[14px]">{data.description}</p> : null}
          </Panel>
          <Panel title={<span className="flex items-center gap-2"><FileText size={17} /> Documents</span>} bodyClassName="p-0">
            {!data.documents.length ? <p className="p-5 text-[14px] text-muted">No documents uploaded.</p> : (
              <ul className="divide-y divide-line">
                {data.documents.map((doc) => (
                  <li key={doc.id} className="space-y-2 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => void action.run(`open${doc.id}`, () => openPrivateFile(`/files?key=${encodeURIComponent(doc.key || "")}`))} className="min-w-0 flex-1 truncate text-left font-semibold text-brand-700 hover:underline">{doc.name}</button>
                      <Pill>{titleCase(doc.kind)}</Pill>
                      <StatusPill status={doc.status} />
                    </div>
                    {doc.note ? <p className="text-[13px] text-muted">Note: {doc.note}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <TextInput value={docNote[doc.id] || ""} onChange={(event) => setDocNote({ ...docNote, [doc.id]: event.target.value })} placeholder="Note (required to reject)" className="h-9 min-w-[180px] flex-1 py-1.5" />
                      <Btn size="sm" busy={action.busy === `ok${doc.id}`} onClick={() => run(`ok${doc.id}`, () => api.patch(`/admin/showrooms/${data.id}/documents/${doc.id}`, { status: "approved", note: docNote[doc.id] || undefined }))}>Verify</Btn>
                      <Btn size="sm" variant="danger" busy={action.busy === `no${doc.id}`} onClick={() => run(`no${doc.id}`, () => api.patch(`/admin/showrooms/${data.id}/documents/${doc.id}`, { status: "rejected", note: docNote[doc.id] }))}>Reject</Btn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {data.pendingChanges?.status === "pending" ? (
            <Panel title="Requested profile change" description={`Sent ${formatDateTime(data.pendingChanges.requestedAt)}`}>
              <Facts items={Object.entries(data.pendingChanges.fields || {}).map(([key, value]) => [titleCase(key), typeof value === "object" && value ? Object.entries(value as Record<string, string>).filter(([field]) => field !== "cipher").map(([field, entry]) => `${field}: ${entry}`).join(" · ") : String(value)])} />
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn busy={action.busy === "chg-yes"} onClick={() => run("chg-yes", () => api.post(`/admin/showrooms/${data.id}/changes`, { approve: true, note: note || undefined }))}>Approve change</Btn>
                <Btn variant="danger" busy={action.busy === "chg-no"} onClick={() => run("chg-no", () => api.post(`/admin/showrooms/${data.id}/changes`, { approve: false, note: note || undefined }))}>Decline</Btn>
              </div>
            </Panel>
          ) : null}
        </div>
        <div className="space-y-5">
          <Panel title="Decision">
            {data.missing.length ? <div className="mb-3"><Notice tone="amber">Incomplete: {data.missing.join(", ")}</Notice></div> : null}
            {data.actions.length ? (
              <div className="space-y-3">
                <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note to the showroom (required to reject, suspend, revoke or ask for information)" className="min-h-24" />
                <div className="grid gap-2">
                  {data.actions.map((entry) => (
                    <Btn key={entry.action} variant={ACTION_COPY[entry.action]?.tone || "secondary"} busy={action.busy === entry.action} disabled={entry.needsNote && !note.trim()} onClick={() => {
                      if (["reject", "suspend", "revoke"].includes(entry.action) && !window.confirm(`${ACTION_COPY[entry.action]?.label}? The owner is notified immediately.`)) return;
                      run(entry.action, () => api.post(`/admin/showrooms/${data.id}/review`, { action: entry.action, note: note || undefined }));
                    }}>{ACTION_COPY[entry.action]?.label || titleCase(entry.action)}</Btn>
                  ))}
                </div>
              </div>
            ) : <p className="text-[14px] text-muted">No actions available in this state.</p>}
            <ErrorBox error={action.error} />
          </Panel>
          <Panel title="Activity">
            <Facts items={[["Listings", Object.entries(data.stats.listings).map(([key, value]) => `${value} ${titleCase(key)}`).join(", ") || "0"], ["Units", data.stats.units], ["Orders", data.stats.orders], ["Returns", data.stats.returns], ["Rating", data.stats.rating ? `${data.stats.rating.average} (${data.stats.rating.count})` : "—"]]} />
          </Panel>
          <Panel title="History"><Timeline events={data.statusHistory} /></Panel>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Featured requests ---------------- */

export function AdminFeatured() {
  const [status, setStatus] = useState("pending");
  const query = useQuery({ queryKey: ["admin-featured", status], queryFn: async () => (await api.get("/admin/feature-requests", { params: { status } })).data.data as { id: string; days: number; note: string; status: string; adminNote: string | null; createdAt: string; product: { _id: string; title: string; slug: string; featuredUntil?: string } | null; showroom: { name: string; code?: string } | null }[] });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const action = useAction(["admin-featured"]);
  return (
    <div>
      <PageHeader title="Featured requests" description="Showrooms asking for a featured spot on the home page." />
      <Tabs value={status} onChange={setStatus} items={[{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Declined" }]} />
      <div className="mt-4 space-y-3">
        <ErrorBox error={query.error || action.error} />
        {query.isLoading ? <Loading /> : !query.data?.length ? <Empty icon={Sparkles} title="No requests" /> : query.data.map((row) => (
          <article key={row.id} className="flex flex-wrap items-center gap-3 rounded-[22px] bg-white p-4 ring-1 ring-line">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{row.product?.title || "Listing removed"}</p>
              <p className="text-[13px] text-muted">{row.showroom?.name} {row.showroom?.code ? `(${row.showroom.code})` : ""} · {row.days} days · {formatDate(row.createdAt)}{row.note ? ` · “${row.note}”` : ""}</p>
            </div>
            {row.product ? <a href={marketplaceUrl(`product/${row.product.slug}`)} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-brand-700">View</a> : null}
            {row.status === "pending" ? (
              <>
                <TextInput value={notes[row.id] || ""} onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })} placeholder="Note" className="h-9 max-w-[200px] py-1.5" />
                <Btn size="sm" busy={action.busy === `y${row.id}`} onClick={() => void action.run(`y${row.id}`, () => api.post(`/admin/feature-requests/${row.id}`, { approve: true, note: notes[row.id] || undefined }))}>Approve</Btn>
                <Btn size="sm" variant="danger" busy={action.busy === `n${row.id}`} onClick={() => void action.run(`n${row.id}`, () => api.post(`/admin/feature-requests/${row.id}`, { approve: false, note: notes[row.id] || undefined }))}>Decline</Btn>
              </>
            ) : <StatusPill status={row.status} />}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Support desk ---------------- */

export function AdminSupport() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("");
  const query = useQuery({ queryKey: ["admin-support", status, priority], queryFn: async () => (await api.get("/admin/support", { params: { status, priority } })).data.data as Ticket[], refetchInterval: 30_000 });
  if (id) return <AdminTicket id={id} />;
  return (
    <div>
      <PageHeader title="Support desk" description="Tickets from showrooms, partners and buyers." />
      <Tabs value={status} onChange={setStatus} items={[{ value: "open", label: "Open" }, { value: "pending", label: "Pending" }, { value: "waiting_on_user", label: "Waiting on user" }, { value: "resolved", label: "Resolved" }, { value: "closed", label: "Closed" }, { value: "", label: "All" }]} />
      <div className="mt-4 flex gap-2"><Select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-auto" aria-label="Priority"><option value="">Any priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></Select></div>
      <div className="mt-4">
        <ErrorBox error={query.error} />
        {query.isLoading ? <Loading /> : !query.data?.length ? <Empty icon={HeadphonesIcon} title="No tickets" /> : (
          <Table head={["Ticket", "From", "Subject", "Category", "Priority", "Replies", "Updated", "Status"]}>
            {query.data.map((ticket) => (
              <tr key={ticket.id} onClick={() => navigate(`/admin/support/${ticket.id}`)} className="cursor-pointer hover:bg-canvas">
                <td className="px-4 py-3 font-mono text-[13px] font-semibold">{ticket.number || "—"}</td>
                <td className="px-4 py-3">{ticket.user?.name}</td>
                <td className="max-w-[240px] truncate px-4 py-3">{ticket.subject}</td>
                <td className="px-4 py-3">{titleCase(ticket.category)}</td>
                <td className="px-4 py-3"><StatusPill status={ticket.priority} /></td>
                <td className="px-4 py-3">{ticket.replies ?? 0}</td>
                <td className="px-4 py-3 text-[13px] text-muted">{formatDateTime(ticket.lastActivityAt)}</td>
                <td className="px-4 py-3"><StatusPill status={ticket.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

function AdminTicket({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["admin-support", id], queryFn: async () => (await api.get(`/admin/support/${id}`)).data.data as Ticket & { showroom: { id: string; name: string; code: string | null; status: string } | null; assignedTo: { name: string } | null } });
  const [reply, setReply] = useState("");
  const [nextStatus, setNextStatus] = useState("waiting_on_user");
  const action = useAction(["admin-support"]);
  const data = query.data;
  const navigate = useNavigate();
  if (query.isLoading) return <Loading />;
  if (!data) return <ErrorBox error={query.error} />;
  const thread = [{ id: "first", fromStaff: false, author: data.user?.name || "User", body: data.body, attachments: data.attachments, at: data.createdAt }, ...(data.messages || [])];
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back="/admin/support" title={data.subject} description={`${data.number} · ${titleCase(data.category)} · from ${data.user?.name}`} actions={<><StatusPill status={data.priority} /><StatusPill status={data.status} /></>} />
      {data.showroom ? <div className="mb-4"><Notice action={<Btn size="sm" variant="secondary" onClick={() => navigate(`/admin/showrooms/${data.showroom!.id}`)}>Open showroom</Btn>}>Showroom: {data.showroom.name} {data.showroom.code ? `(${data.showroom.code})` : ""} · {titleCase(data.showroom.status)}</Notice></div> : null}
      <ol className="space-y-3">
        {thread.map((message) => (
          <li key={message.id} className={`rounded-[22px] p-4 ring-1 ${message.fromStaff ? "bg-brand-50 ring-brand-100" : "bg-white ring-line"}`}>
            <p className="flex justify-between gap-2 text-[13px]"><span className="font-semibold">{message.author}</span><span className="text-muted">{formatDateTime(message.at)}</span></p>
            <p className="mt-1.5 text-[14px] whitespace-pre-wrap">{message.body}</p>
            {message.attachments?.length ? <div className="mt-2 flex flex-wrap gap-2">{message.attachments.map((file) => <button key={file.key} type="button" onClick={() => void openPrivateFile(`/support/${id}/files?key=${encodeURIComponent(file.key)}`)} className="rounded-full bg-canvas px-3 py-1 text-[12px] font-semibold text-brand-700 ring-1 ring-line">{file.name}</button>)}</div> : null}
          </li>
        ))}
      </ol>
      <div className="mt-5 space-y-3 rounded-[22px] bg-white p-4 ring-1 ring-line">
        <TextArea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to the user" />
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Then set status" className="min-w-[200px]"><Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}><option value="waiting_on_user">Waiting on user</option><option value="pending">Pending (internal)</option><option value="resolved">Resolved</option><option value="closed">Closed</option></Select></Field>
          <Btn busy={action.busy === "reply"} disabled={!reply.trim()} onClick={() => void action.run("reply", () => api.post(`/admin/support/${id}/reply`, { body: reply, status: nextStatus })).then((done) => { if (done) { setReply(""); void query.refetch(); } })}>Send reply</Btn>
          <Btn variant="secondary" busy={action.busy === "resolve"} onClick={() => void action.run("resolve", () => api.patch(`/admin/support/${id}`, { status: "resolved" })).then(() => void query.refetch())}>Mark resolved</Btn>
          <Btn variant="ghost" busy={action.busy === "mine"} onClick={() => void action.run("mine", () => api.patch(`/admin/support/${id}`, { assignToMe: true })).then(() => void query.refetch())}>{data.assignedTo ? `Assigned: ${data.assignedTo.name}` : "Assign to me"}</Btn>
        </div>
        <ErrorBox error={action.error} />
      </div>
    </div>
  );
}
