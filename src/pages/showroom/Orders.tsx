import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, FileUp, KeyRound, ShoppingBag, Truck } from "lucide-react";
import { api, downloadFile, openPrivateFile } from "../../lib/api";
import { uploadFile } from "../../lib/upload";
import { money, titleCase } from "../../lib/utils";
import { PageHeader } from "../../components/PanelShell";
import { Btn, Drawer, Empty, ErrorBox, Facts, Field, Loading, Notice, Panel, Pill, SearchBox, Select, StatusPill, Table, Tabs, TextInput, Timeline, formatDate, formatDateTime, useAction } from "../../components/kit";

export interface SubOrder {
  orderId: string;
  subOrderId: string;
  number: string;
  createdAt: string;
  status: string;
  allowed: string[];
  fulfillment: "delivery" | "pickup";
  amountPaise: number;
  items: { id: string; title: string; pricePaise: number; unitCode: string | null }[];
  buyer: { id: string; name: string };
  address: { name?: string; phone?: string; line1?: string; line2?: string; city?: string; district?: string; state?: string; pincode?: string } | null;
  rejectReason: string | null;
  delivery: {
    status: string;
    method: string;
    courier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    expectedAt: string | null;
    documents: { key: string; name: string; at: string }[];
    proof: { kind: string; note: string | null; at: string } | null;
    codeIssued: boolean;
    events: { status: string; note?: string; at: string }[];
  } | null;
  deliveryAllowed: string[];
  timeline: { status: string; note?: string; at: string }[];
  deliveredAt: string | null;
  payment?: { status: string; provider: string } | null;
  refunds?: { status: string; amountPaise: number; reason: string }[];
  returns?: { number: string; status: string; reason: string }[];
}

const ACTION_LABELS: Record<string, string> = {
  accepted: "Accept order",
  rejected: "Reject",
  processing: "Start packing",
  ready_for_dispatch: "Ready for dispatch",
  dispatched: "Mark dispatched",
  cancelled: "Cancel order",
};

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q]);
  const query = useQuery({ queryKey: ["showroom-orders", status, search], queryFn: async () => (await api.get("/showroom/orders", { params: { status, q: search } })).data.data as SubOrder[], refetchInterval: 30_000 });
  const all = useQuery({ queryKey: ["showroom-orders", "counts"], queryFn: async () => (await api.get("/showroom/orders")).data.data as SubOrder[] });
  const openId = params.get("open");
  const opened = query.data?.find((row) => row.orderId === openId) || all.data?.find((row) => row.orderId === openId);
  const count = (statuses: string[]) => (all.data || []).filter((row) => statuses.includes(row.status)).length;
  const exporter = useAction();

  return (
    <div>
      <PageHeader title="Orders" description="Accept, pack and hand over orders. Each step is checked on the server and the buyer is notified." actions={<Btn variant="secondary" icon={Download} busy={exporter.busy === "csv"} onClick={() => void exporter.run("csv", () => downloadFile("/showroom/reports/sales?days=365", "sales.csv"))}>Export</Btn>} />
      <Tabs
        value={status}
        onChange={(value) => { setStatus(value); setParams(value ? { status: value } : {}); }}
        items={[
          { value: "", label: "All", count: all.data?.length },
          { value: "new", label: "New", count: count(["paid"]) },
          { value: "active", label: "To dispatch", count: count(["accepted", "confirmed", "processing", "ready_for_dispatch"]) },
          { value: "shipping", label: "In transit", count: count(["dispatched", "shipped"]) },
          { value: "completed", label: "Delivered", count: count(["delivered"]) },
          { value: "closed", label: "Closed", count: count(["rejected", "cancelled", "returned", "refunded"]) },
        ]}
      />
      <div className="mt-4"><SearchBox value={q} onChange={setQ} placeholder="Search by order number" /></div>
      <div className="mt-4">
        <ErrorBox error={query.error} />
        {query.isLoading ? <Loading /> : !query.data?.length ? <Empty icon={ShoppingBag} title="No orders here" body="Paid orders for your listings appear here." /> : (
          <Table head={["Order", "Items", "Buyer", "Fulfilment", "Amount", "Status", "Placed"]}>
            {query.data.map((row) => (
              <tr key={row.subOrderId} onClick={() => setParams({ ...(status ? { status } : {}), open: row.orderId })} className="cursor-pointer hover:bg-canvas">
                <td className="px-4 py-3 font-semibold">{row.number}</td>
                <td className="max-w-[240px] truncate px-4 py-3">{row.items.map((item) => item.title).join(", ")}</td>
                <td className="px-4 py-3">{row.buyer.name}</td>
                <td className="px-4 py-3">{row.fulfillment === "pickup" ? "Pickup" : row.delivery ? <StatusPill status={row.delivery.status} /> : "Delivery"}</td>
                <td className="px-4 py-3 font-semibold">{money(row.amountPaise)}</td>
                <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                <td className="px-4 py-3 text-[13px] text-muted">{formatDate(row.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {opened ? <OrderDrawer row={opened} onClose={() => { params.delete("open"); setParams(params); }} /> : null}
    </div>
  );
}

export function OrderDrawer({ row, onClose }: { row: SubOrder; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["showroom-orders", "detail", row.orderId, row.subOrderId], queryFn: async () => (await api.get(`/showroom/orders/${row.orderId}/${row.subOrderId}`)).data.data as SubOrder });
  const order = detail.data || row;
  const [note, setNote] = useState("");
  const action = useAction(["showroom-orders", "showroom-dashboard", "showroom-inventory", "showroom-deliveries"]);
  const base = `/showroom/orders/${order.orderId}/${order.subOrderId}`;
  const refresh = () => void detail.refetch();

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} title={`Order ${order.number}`} description={`Placed ${formatDateTime(order.createdAt)}`} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2"><StatusPill status={order.status} /><Pill tone="violet">{order.fulfillment === "pickup" ? "Showroom pickup" : "Delivery"}</Pill>{order.payment ? <Pill tone={order.payment.status === "captured" ? "green" : "amber"}>Payment {order.payment.status}</Pill> : null}</div>
        {order.rejectReason ? <Notice tone="red">Reason: {order.rejectReason}</Notice> : null}

        <Panel title="Items" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px]"><span className="min-w-0"><span className="block truncate font-semibold">{item.title}</span>{item.unitCode ? <span className="font-mono text-[12px] text-muted">{item.unitCode}</span> : null}</span><span className="font-semibold">{money(item.pricePaise)}</span></li>
            ))}
            <li className="flex justify-between px-5 py-3 text-[14px] font-semibold"><span>Total for your showroom</span><span>{money(order.amountPaise)}</span></li>
          </ul>
        </Panel>

        <Panel title="Buyer">
          <Facts items={[["Name", order.buyer.name], ...(order.address ? [["Deliver to", [order.address.name, order.address.phone].filter(Boolean).join(" · ")], ["Address", [order.address.line1, order.address.line2, order.address.city, order.address.district, order.address.pincode].filter(Boolean).join(", ")]] as [string, string][] : [])]} />
        </Panel>

        {order.allowed.length ? (
          <Panel title="Next step">
            <TextInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note to the buyer (required to reject or cancel)" />
            <div className="mt-3 flex flex-wrap gap-2">
              {order.allowed.map((to) => (
                <Btn key={to} size="sm" variant={to === "rejected" || to === "cancelled" ? "danger" : "primary"} busy={action.busy === to} onClick={() => {
                  if ((to === "rejected" || to === "cancelled") && !window.confirm("The unit goes back on sale and a refund is requested for the buyer. Continue?")) return;
                  void action.run(to, () => api.post(`${base}/status`, { to, note: note || undefined })).then((done) => { if (done) { setNote(""); refresh(); } });
                }}>{ACTION_LABELS[to] || titleCase(to)}</Btn>
              ))}
            </div>
          </Panel>
        ) : null}

        {order.fulfillment === "delivery" && order.delivery ? <DeliveryPanel order={order} base={base} onChanged={refresh} /> : null}
        {order.fulfillment === "pickup" && order.status === "ready_for_dispatch" ? <HandoverPanel base={base} onChanged={refresh} pickup /> : null}
        <ErrorBox error={action.error} />

        {order.refunds?.length || order.returns?.length ? (
          <Panel title="Refunds & returns">
            <ul className="space-y-2 text-[14px]">
              {order.refunds?.map((refund, index) => <li key={`r${index}`} className="flex justify-between gap-2"><span>Refund {money(refund.amountPaise)} — {refund.reason}</span><StatusPill status={refund.status} /></li>)}
              {order.returns?.map((ret) => <li key={ret.number} className="flex justify-between gap-2"><span>Return {ret.number} — {titleCase(ret.reason)}</span><StatusPill status={ret.status} /></li>)}
            </ul>
          </Panel>
        ) : null}

        <Panel title="Order timeline"><Timeline events={order.timeline} /></Panel>
      </div>
    </Drawer>
  );
}

function DeliveryPanel({ order, base, onChanged }: { order: SubOrder; base: string; onChanged: () => void }) {
  const delivery = order.delivery!;
  const [form, setForm] = useState({ method: delivery.method === "courier" ? "courier" : "self", courier: delivery.courier || "", trackingNumber: delivery.trackingNumber || "", trackingUrl: delivery.trackingUrl || "", expectedAt: delivery.expectedAt ? delivery.expectedAt.slice(0, 10) : "" });
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const action = useAction(["showroom-orders", "showroom-deliveries"]);
  const closed = ["DELIVERED", "RETURNED"].includes(delivery.status);

  return (
    <Panel title={<span className="flex items-center gap-2"><Truck size={17} /> Delivery</span>} actions={<StatusPill status={delivery.status} />}>
      <div className="space-y-5">
        {!closed ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Method">
              <Select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
                <option value="self">Our own delivery</option>
                <option value="courier">Courier partner</option>
              </Select>
            </Field>
            <Field label="Expected delivery"><TextInput type="date" value={form.expectedAt} onChange={(event) => setForm({ ...form, expectedAt: event.target.value })} /></Field>
            {form.method === "courier" ? (
              <>
                <Field label="Courier"><TextInput value={form.courier} onChange={(event) => setForm({ ...form, courier: event.target.value })} placeholder="Blue Dart, Delhivery…" /></Field>
                <Field label="Tracking number"><TextInput value={form.trackingNumber} onChange={(event) => setForm({ ...form, trackingNumber: event.target.value })} /></Field>
                <Field label="Tracking link" className="sm:col-span-2"><TextInput value={form.trackingUrl} onChange={(event) => setForm({ ...form, trackingUrl: event.target.value })} placeholder="https://" /></Field>
              </>
            ) : null}
            <div className="sm:col-span-2"><Btn size="sm" variant="secondary" busy={action.busy === "details"} onClick={() => void action.run("details", () => api.patch(`${base}/delivery`, { ...form, expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : "" })).then((done) => done && onChanged())}>Save delivery details</Btn></div>
          </div>
        ) : (
          <Facts items={[["Method", titleCase(delivery.method)], ["Courier", delivery.courier], ["Tracking", delivery.trackingNumber], ["Proof", delivery.proof ? `${titleCase(delivery.proof.kind)} · ${formatDateTime(delivery.proof.at)}` : "—"]]} />
        )}

        {order.deliveryAllowed.length ? (
          <div className="rounded-2xl bg-canvas p-4">
            <p className="mb-2 text-[13px] font-semibold">Update delivery stage</p>
            <TextInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (required for failed or returned)" />
            <div className="mt-3 flex flex-wrap gap-2">
              {order.deliveryAllowed.map((to) => (
                <Btn key={to} size="sm" variant={to === "FAILED" || to === "RETURNED" ? "danger" : "primary"} busy={action.busy === to} onClick={() => void action.run(to, () => api.post(`${base}/delivery/status`, { to, note: note || undefined })).then((done) => { if (done) { setNote(""); onChanged(); } })}>{titleCase(to.toLowerCase())}</Btn>
              ))}
            </div>
            {order.status === "paid" ? <p className="mt-2 text-[12px] text-muted">Accept the order first.</p> : null}
          </div>
        ) : null}

        {delivery.status === "OUT_FOR_DELIVERY" ? <HandoverPanel base={base} onChanged={onChanged} /> : null}

        <div>
          <p className="mb-2 text-[13px] font-semibold">Documents (invoice, shipping label)</p>
          <ul className="space-y-1 text-[14px]">
            {delivery.documents.map((doc) => <li key={doc.key}><button type="button" onClick={() => void openPrivateFile(`/files?key=${encodeURIComponent(doc.key)}`)} className="text-brand-700 hover:underline">{doc.name}</button> <span className="text-[12px] text-muted">{formatDate(doc.at)}</span></li>)}
          </ul>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => {
            const picked = event.target.files?.[0];
            if (!picked) return;
            setUploading(true);
            void action.run("doc", async () => {
              const { key } = await uploadFile(picked, "business_document");
              await api.post(`${base}/delivery/documents`, { key, name: picked.name.slice(0, 120) });
              onChanged();
            }).finally(() => { setUploading(false); if (file.current) file.current.value = ""; });
          }} />
          <Btn size="sm" variant="secondary" icon={FileUp} className="mt-2" busy={uploading} onClick={() => file.current?.click()}>Attach document</Btn>
        </div>

        <Timeline events={delivery.events} />
        <ErrorBox error={action.error} />
      </div>
    </Panel>
  );
}

/** Proof of handover: the buyer's 6-digit code, or a photo with an explanation. */
function HandoverPanel({ base, onChanged, pickup }: { base: string; onChanged: () => void; pickup?: boolean }) {
  const [otp, setOtp] = useState("");
  const [photo, setPhoto] = useState<{ key: string; name: string } | null>(null);
  const [note, setNote] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const action = useAction(["showroom-orders", "showroom-deliveries", "showroom-dashboard"]);
  return (
    <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
      <p className="flex items-center gap-2 font-semibold text-brand-900"><KeyRound size={17} /> {pickup ? "Hand over at the showroom" : "Complete delivery"}</p>
      <p className="mt-1 text-[13px] text-brand-900/80">Ask the buyer for the 6-digit handover code shown in their SureGad orders.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <TextInput value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="123456" className="max-w-[160px] text-center font-mono tracking-[0.3em]" aria-label="Handover code" />
        <Btn busy={action.busy === "otp"} disabled={otp.length !== 6} onClick={() => void action.run("otp", () => api.post(`${base}/handover`, { otp })).then((done) => done && onChanged())}>Confirm handover</Btn>
      </div>
      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer font-semibold text-brand-800">Buyer can't share the code?</summary>
        <div className="mt-2 space-y-2">
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
            const picked = event.target.files?.[0];
            if (picked) void action.run("photo", async () => setPhoto({ key: (await uploadFile(picked, "business_document")).key, name: picked.name }));
          }} />
          <Btn size="sm" variant="secondary" busy={action.busy === "photo"} onClick={() => file.current?.click()}>{photo ? `Photo: ${photo.name}` : "Attach delivery photo"}</Btn>
          <TextInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why the code wasn't used" />
          <Btn size="sm" busy={action.busy === "proof"} disabled={!photo || note.trim().length < 3} onClick={() => void action.run("proof", () => api.post(`${base}/handover`, { photoKey: photo!.key, note })).then((done) => done && onChanged())}>Confirm with photo</Btn>
        </div>
      </details>
      <div className="mt-2"><ErrorBox error={action.error} /></div>
    </div>
  );
}

export function DeliveryPage() {
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<SubOrder | null>(null);
  const query = useQuery({ queryKey: ["showroom-deliveries", status], queryFn: async () => (await api.get("/showroom/deliveries", { params: { status } })).data.data as SubOrder[], refetchInterval: 30_000 });
  const stages = ["REQUESTED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"];
  return (
    <div>
      <PageHeader title="Delivery" description="Every order shipped to a buyer, from request to proof of delivery." />
      <div className="flex flex-wrap gap-2">
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-auto" aria-label="Stage">
          <option value="">All stages</option>
          {stages.map((stage) => <option key={stage} value={stage}>{titleCase(stage.toLowerCase())}</option>)}
        </Select>
      </div>
      <div className="mt-4">
        {query.isLoading ? <Loading /> : !query.data?.length ? <Empty icon={Truck} title="No deliveries" body="Orders with home delivery appear here once paid." /> : (
          <Table head={["Order", "Buyer", "City", "Courier", "Tracking", "Expected", "Stage"]}>
            {query.data.map((row) => (
              <tr key={row.subOrderId} onClick={() => setOpen(row)} className="cursor-pointer hover:bg-canvas">
                <td className="px-4 py-3 font-semibold">{row.number}</td>
                <td className="px-4 py-3">{row.buyer.name}</td>
                <td className="px-4 py-3">{row.address?.city || "—"}</td>
                <td className="px-4 py-3">{row.delivery?.method === "courier" ? row.delivery.courier || "Courier" : "Own delivery"}</td>
                <td className="px-4 py-3 font-mono text-[13px]">{row.delivery?.trackingNumber || "—"}</td>
                <td className="px-4 py-3 text-[13px]">{formatDate(row.delivery?.expectedAt)}</td>
                <td className="px-4 py-3"><StatusPill status={row.delivery?.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {open ? <OrderDrawer row={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
