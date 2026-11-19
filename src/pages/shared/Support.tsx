import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy, Paperclip, Plus } from "lucide-react";
import { api, openPrivateFile } from "../../lib/api";
import { uploadFile } from "../../lib/upload";
import { cn, titleCase } from "../../lib/utils";
import { PageHeader } from "../../components/PanelShell";
import { Modal } from "../../components/Modal";
import { Btn, Empty, ErrorBox, Field, Loading, Pill, Select, StatusPill, Table, TextArea, TextInput, formatDateTime, useAction } from "../../components/kit";

export interface Ticket {
  id: string;
  number: string | null;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  attachments: { key: string; name: string }[];
  messages?: { id: string; fromStaff: boolean; author: string; body: string; attachments: { key: string; name: string }[]; at: string }[];
  replies?: number;
  user?: { id: string; name: string };
  lastActivityAt: string;
  createdAt: string;
}

export const CATEGORIES = ["account", "verification", "listings", "orders", "payments", "delivery", "returns", "inspections", "subscription", "technical", "other"];

function AttachmentPicker({ files, setFiles }: { files: { key: string; name: string }[]; setFiles: (files: { key: string; name: string }[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => {
        const picked = event.target.files?.[0];
        if (!picked) return;
        setBusy(true);
        setError(null);
        void uploadFile(picked, "business_document").then(({ key }) => setFiles([...files, { key, name: picked.name.slice(0, 120) }])).catch(setError).finally(() => { setBusy(false); event.target.value = ""; });
      }} />
      <div className="flex flex-wrap items-center gap-2">
        {files.map((file) => <Pill key={file.key}>{file.name}</Pill>)}
        {files.length < 5 ? <Btn size="sm" variant="secondary" icon={Paperclip} busy={busy} onClick={() => input.current?.click()}>Attach file</Btn> : null}
      </div>
      <ErrorBox error={error} />
    </div>
  );
}

/** Support centre for sellers and partners: raise tickets, follow the thread, close when solved. */
export function SupportPage({ basePath }: { basePath: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ["support"], queryFn: async () => (await api.get("/support")).data.data as Ticket[] });
  const [creating, setCreating] = useState(false);
  if (id) return <TicketThread id={id} basePath={basePath} />;
  return (
    <div>
      <PageHeader title="Support" description="Questions about verification, orders, payments or inspections? Our team replies here." actions={<Btn icon={Plus} onClick={() => setCreating(true)}>New ticket</Btn>} />
      <ErrorBox error={list.error} />
      {list.isLoading ? <Loading /> : !list.data?.length ? <Empty icon={LifeBuoy} title="No tickets yet" body="Raise a ticket and SureGad support will reply in this thread." action={<Btn icon={Plus} onClick={() => setCreating(true)}>New ticket</Btn>} /> : (
        <Table head={["Ticket", "Subject", "Category", "Priority", "Status", "Updated"]}>
          {list.data.map((ticket) => (
            <tr key={ticket.id} onClick={() => navigate(`${basePath}/support/${ticket.id}`)} className="cursor-pointer hover:bg-canvas">
              <td className="px-4 py-3 font-mono text-[13px] font-semibold">{ticket.number}</td>
              <td className="max-w-[260px] truncate px-4 py-3">{ticket.subject}</td>
              <td className="px-4 py-3">{titleCase(ticket.category)}</td>
              <td className="px-4 py-3"><StatusPill status={ticket.priority} /></td>
              <td className="px-4 py-3"><StatusPill status={ticket.status} /></td>
              <td className="px-4 py-3 text-[13px] text-muted">{formatDateTime(ticket.lastActivityAt)}</td>
            </tr>
          ))}
        </Table>
      )}
      <NewTicket open={creating} onClose={() => setCreating(false)} onCreated={(ticket) => navigate(`${basePath}/support/${ticket.id}`)} />
    </div>
  );
}

function NewTicket({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (ticket: Ticket) => void }) {
  const [form, setForm] = useState({ subject: "", body: "", category: "other", priority: "normal" });
  const [files, setFiles] = useState<{ key: string; name: string }[]>([]);
  const action = useAction(["support"]);
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()} title="New support ticket" size="lg">
      <div className="space-y-4">
        <Field label="Subject"><TextInput value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category"><Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORIES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</Select></Field>
          <Field label="Priority"><Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent — money or a live order at risk</option></Select></Field>
        </div>
        <Field label="Describe the issue" hint="Include order numbers, SG codes or inspection numbers so we can find it fast."><TextArea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="min-h-32" /></Field>
        <AttachmentPicker files={files} setFiles={setFiles} />
        <ErrorBox error={action.error} />
        <Btn className="w-full" busy={action.busy === "create"} disabled={form.subject.trim().length < 3 || form.body.trim().length < 3} onClick={() => void action.run("create", async () => (await api.post("/support", { ...form, attachments: files })).data.data as Ticket).then((ticket) => { if (ticket) { onClose(); onCreated(ticket); } })}>Send to support</Btn>
      </div>
    </Modal>
  );
}

function TicketThread({ id, basePath }: { id: string; basePath: string }) {
  const ticket = useQuery({ queryKey: ["support", id], queryFn: async () => (await api.get(`/support/${id}`)).data.data as Ticket, refetchInterval: 30_000 });
  const [reply, setReply] = useState("");
  const [files, setFiles] = useState<{ key: string; name: string }[]>([]);
  const action = useAction(["support"]);
  const data = ticket.data;
  if (ticket.isLoading) return <Loading />;
  if (!data) return <ErrorBox error={ticket.error} />;
  const open = (key: string) => void openPrivateFile(`/support/${id}/files?key=${encodeURIComponent(key)}`);
  const thread = [{ id: "first", fromStaff: false, author: "You", body: data.body, attachments: data.attachments, at: data.createdAt }, ...(data.messages || [])];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={`${basePath}/support`} title={data.subject} description={`${data.number} · ${titleCase(data.category)}`} actions={<><StatusPill status={data.status} /><StatusPill status={data.priority} /></>} />
      <ol className="space-y-3">
        {thread.map((message) => (
          <li key={message.id} className={cn("rounded-[22px] p-4 ring-1", message.fromStaff ? "bg-brand-50 ring-brand-100" : "bg-white ring-line")}>
            <p className="flex items-center justify-between gap-2 text-[13px]"><span className="font-semibold">{message.author}</span><span className="text-muted">{formatDateTime(message.at)}</span></p>
            <p className="mt-1.5 text-[14px] whitespace-pre-wrap">{message.body}</p>
            {message.attachments?.length ? <div className="mt-2 flex flex-wrap gap-2">{message.attachments.map((file) => <button key={file.key} type="button" onClick={() => open(file.key)} className="inline-flex items-center gap-1 rounded-full bg-canvas px-3 py-1 text-[12px] font-semibold text-brand-700 ring-1 ring-line"><Paperclip size={12} /> {file.name}</button>)}</div> : null}
          </li>
        ))}
      </ol>
      {data.status !== "closed" ? (
        <div className="mt-5 space-y-3 rounded-[22px] bg-white p-4 ring-1 ring-line">
          <TextArea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to support" />
          <AttachmentPicker files={files} setFiles={setFiles} />
          <ErrorBox error={action.error} />
          <div className="flex flex-wrap justify-between gap-2">
            <Btn variant="secondary" busy={action.busy === "close"} onClick={() => void action.run("close", () => api.post(`/support/${id}/close`)).then(() => void ticket.refetch())}>Close ticket</Btn>
            <Btn busy={action.busy === "reply"} disabled={!reply.trim()} onClick={() => void action.run("reply", () => api.post(`/support/${id}/messages`, { body: reply, attachments: files })).then((done) => { if (done) { setReply(""); setFiles([]); void ticket.refetch(); } })}>Send reply</Btn>
          </div>
        </div>
      ) : <p className="mt-5 text-center text-[14px] text-muted">This ticket is closed. <Link to={`${basePath}/support`} className="font-semibold text-brand-700">Open a new one</Link> if you still need help.</p>}
    </div>
  );
}
