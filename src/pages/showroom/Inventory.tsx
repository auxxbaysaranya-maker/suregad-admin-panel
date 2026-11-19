import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, Download, Eye, History, Plus, Trash2 } from "lucide-react";
import { api, downloadFile } from "../../lib/api";
import { money, titleCase } from "../../lib/utils";
import { PageHeader } from "../../components/PanelShell";
import { Modal } from "../../components/Modal";
import { Btn, Drawer, Empty, ErrorBox, Facts, Field, Loading, Notice, Pager, Panel, SearchBox, Select, StatusPill, Table, Tabs, TextArea, TextInput, formatDate, formatDateTime, useAction } from "../../components/kit";

interface Unit {
  id: string;
  code: string;
  productId: string | null;
  status: string;
  allowed: string[];
  condition: string;
  imeiLast4: string | null;
  serialLast4: string | null;
  colour: string | null;
  storageGb: number | null;
  ramGb: number | null;
  batteryHealth: number | null;
  costPaise: number | null;
  pricePaise: number | null;
  notes: string;
  warranty: { months: number; provider: string; terms?: string; startsAt?: string; endsAt?: string };
  claims: { id: string; issue: string; status: string }[];
  soldAt: string | null;
  soldOrderId: string | null;
  rev: number;
  createdAt: string;
  listing: { id: string; title: string; listingCode: string | null } | null;
}

const STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "UNDER_INSPECTION", "DAMAGED", "RETURNED", "REPAIR", "UNLISTED"];

export function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const productId = params.get("productId") || "";
  const [tab, setTab] = useState<"units" | "alerts" | "history">("units");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Unit | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => setPage(1), [status, search, productId]);
  const query = useQuery({
    queryKey: ["showroom-inventory", status, search, productId, page],
    queryFn: async () => (await api.get("/showroom/inventory", { params: { status, q: search, productId, page, limit: 50 } })).data as { data: { units: Unit[]; counts: Record<string, number> }; meta: { total: number; hasMore: boolean } },
  });
  const alerts = useQuery({ queryKey: ["showroom-inventory", "alerts"], enabled: tab === "alerts", queryFn: async () => (await api.get("/showroom/inventory/alerts")).data.data as { id: string; title: string; listingCode: string | null; available: number; threshold: number; level: string }[] });
  const history = useQuery({ queryKey: ["showroom-inventory", "history"], enabled: tab === "history", queryFn: async () => (await api.get("/showroom/inventory/movements")).data.data as { id: string; unitCode: string; from: string | null; to: string; reason: string; at: string }[] });
  const counts = query.data?.data.counts || {};
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const units = query.data?.data.units || [];
  const exportAction = useAction();

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Every physical device you hold, by IMEI or serial. Buying reserves exactly one available unit, so nothing is sold twice."
        actions={
          <>
            <Btn variant="secondary" icon={Download} busy={exportAction.busy === "csv"} onClick={() => void exportAction.run("csv", () => downloadFile("/showroom/reports/inventory", "inventory.csv"))}>Export</Btn>
            <Btn icon={Plus} onClick={() => setAdding(true)}>Add units</Btn>
          </>
        }
      />
      <Tabs value={tab} onChange={setTab} items={[{ value: "units", label: "Units", count: total }, { value: "alerts", label: "Stock alerts" }, { value: "history", label: "Stock history" }]} />

      {tab === "units" ? (
        <>
          {productId ? (
            <div className="mt-4"><Notice action={<Btn size="sm" variant="secondary" onClick={() => setParams({})}>Show all</Btn>}>Showing units of one listing.</Notice></div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <SearchBox value={q} onChange={setQ} placeholder="Unit code, last 4 of IMEI/serial, colour" />
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-auto" aria-label="Status">
              <option value="">All statuses ({total})</option>
              {STATUSES.map((value) => <option key={value} value={value}>{titleCase(value.toLowerCase())} ({counts[value] || 0})</option>)}
            </Select>
          </div>
          <div className="mt-4">
            {query.isLoading ? <Loading /> : !units.length ? (
              <Empty icon={Boxes} title="No units" body="Add the devices you have in stock. Each one gets an SG-UNIT code." action={<Btn icon={Plus} onClick={() => setAdding(true)}>Add units</Btn>} />
            ) : (
              <Table head={["Unit", "Listing", "Identifier", "Condition", "Cost", "Status", "Updated"]}>
                {units.map((unit) => (
                  <tr key={unit.id} onClick={() => setOpen(unit)} className="cursor-pointer hover:bg-canvas">
                    <td className="px-4 py-3 font-mono text-[13px] font-semibold">{unit.code}</td>
                    <td className="max-w-[220px] truncate px-4 py-3">{unit.listing?.title || <span className="text-muted">Not on a listing</span>}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{unit.imeiLast4 ? `IMEI ••${unit.imeiLast4}` : unit.serialLast4 ? `S/N ••${unit.serialLast4}` : "—"}</td>
                    <td className="px-4 py-3">{titleCase(unit.condition)}{unit.colour ? ` · ${unit.colour}` : ""}</td>
                    <td className="px-4 py-3">{unit.costPaise !== null ? money(unit.costPaise) : "—"}</td>
                    <td className="px-4 py-3"><StatusPill status={unit.status} /></td>
                    <td className="px-4 py-3 text-[13px] text-muted">{formatDate(unit.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            )}
            <Pager page={page} hasMore={Boolean(query.data?.meta.hasMore)} total={query.data?.meta.total} onChange={setPage} />
          </div>
        </>
      ) : null}

      {tab === "alerts" ? (
        <div className="mt-4">
          {alerts.isLoading ? <Loading /> : !alerts.data?.length ? <Empty icon={AlertTriangle} title="No stock alerts" body="Every listing has more units than its alert level." /> : (
            <Table head={["Listing", "Code", "Available", "Alert at", ""]}>
              {alerts.data.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-semibold">{row.title}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{row.listingCode || "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={row.level === "out" ? "failed" : "pending"} label={row.level === "out" ? "Out of stock" : `${row.available} left`} /></td>
                  <td className="px-4 py-3">{row.threshold}</td>
                  <td className="px-4 py-3 text-right"><Btn size="sm" variant="secondary" icon={Plus} onClick={() => { setParams({ productId: row.id }); setTab("units"); setAdding(true); }}>Add stock</Btn></td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="mt-4">
          <div className="mb-3 flex justify-end"><Btn size="sm" variant="secondary" icon={Download} onClick={() => void exportAction.run("mv", () => downloadFile("/showroom/reports/movements?days=365", "stock-history.csv"))}>Export history</Btn></div>
          {history.isLoading ? <Loading /> : (
            <Table head={["When", "Unit", "From", "To", "Reason"]}>
              {(history.data || []).map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-[13px] text-muted">{formatDateTime(row.at)}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{row.unitCode}</td>
                  <td className="px-4 py-3">{row.from ? <StatusPill status={row.from} /> : "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={row.to} /></td>
                  <td className="px-4 py-3 text-[13px]">{titleCase(row.reason.replace(/^return_/, "return "))}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      ) : null}

      <AddUnitsModal open={adding} onClose={() => setAdding(false)} productId={productId} />
      {open ? <UnitDrawer unit={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function useStockListings() {
  return useQuery({ queryKey: ["showroom-products", "picker"], queryFn: async () => (await api.get("/showroom/products", { params: { limit: 100, sort: "updated" } })).data.data as { id: string; title: string; listingCode?: string; stockTracked: boolean; status: string }[] });
}

function AddUnitsModal({ open, onClose, productId }: { open: boolean; onClose: () => void; productId: string }) {
  const listings = useStockListings();
  const [target, setTarget] = useState(productId);
  const [form, setForm] = useState({ condition: "excellent", colour: "", storageGb: "", ramGb: "", cost: "", warrantyMonths: "", warrantyProvider: "showroom", notes: "" });
  const [identifiers, setIdentifiers] = useState("");
  const [result, setResult] = useState<{ created: string[]; errors: { index: number; message: string }[] } | null>(null);
  const action = useAction(["showroom-inventory", "showroom-products", "showroom-product", "showroom-dashboard"]);
  useEffect(() => setTarget(productId), [productId, open]);
  const lines = identifiers.split(/\n/).map((line) => line.trim()).filter(Boolean);

  async function submit() {
    const shared = {
      condition: form.condition,
      colour: form.colour || undefined,
      storageGb: form.storageGb ? Number(form.storageGb) : undefined,
      ramGb: form.ramGb ? Number(form.ramGb) : undefined,
      costPaise: form.cost ? Math.round(Number(form.cost) * 100) : undefined,
      notes: form.notes || undefined,
      warranty: form.warrantyMonths ? { months: Number(form.warrantyMonths), provider: form.warrantyProvider } : undefined,
    };
    const units = (lines.length ? lines : [""]).map((line) => {
      const value = line.replace(/\s/g, "");
      return /^\d{14,17}$/.test(value) ? { ...shared, imei: value } : value ? { ...shared, serial: line } : shared;
    });
    const response = await action.run("add", async () => (await api.post("/showroom/inventory/bulk", { productId: target || undefined, units })).data.data as { created: string[]; errors: { index: number; message: string }[] });
    if (response) {
      setResult(response);
      if (!response.errors.length) setIdentifiers("");
    }
  }

  return (
    <Modal open={open} onOpenChange={(next) => { if (!next) { onClose(); setResult(null); } }} title="Add units" description="Paste one IMEI (14–17 digits) or serial number per line. Each line becomes one unit." size="lg">
      <div className="space-y-4">
        <Field label="Listing">
          <Select value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="">Keep unassigned for now</option>
            {(listings.data || []).filter((row) => row.stockTracked && row.status !== "archived").map((row) => <option key={row.id} value={row.id}>{row.title}{row.listingCode ? ` (${row.listingCode})` : ""}</option>)}
          </Select>
        </Field>
        <Field label="IMEI / serial numbers" hint={`${lines.length || 1} unit${lines.length === 1 ? "" : "s"} will be added`}>
          <TextArea value={identifiers} onChange={(event) => setIdentifiers(event.target.value)} className="font-mono text-[13px]" placeholder={"356789012345678\n356789012345679"} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Condition">
            <Select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}>
              {["new", "like_new", "excellent", "good", "fair"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </Field>
          <Field label="Colour"><TextInput value={form.colour} onChange={(event) => setForm({ ...form, colour: event.target.value })} /></Field>
          <Field label="Cost per unit (₹)"><TextInput inputMode="decimal" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} /></Field>
          <Field label="Storage (GB)"><TextInput inputMode="numeric" value={form.storageGb} onChange={(event) => setForm({ ...form, storageGb: event.target.value })} /></Field>
          <Field label="RAM (GB)"><TextInput inputMode="numeric" value={form.ramGb} onChange={(event) => setForm({ ...form, ramGb: event.target.value })} /></Field>
          <Field label="Warranty (months)"><TextInput inputMode="numeric" value={form.warrantyMonths} onChange={(event) => setForm({ ...form, warrantyMonths: event.target.value })} /></Field>
        </div>
        <Field label="Notes (internal)"><TextInput value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        <ErrorBox error={action.error} />
        {result ? (
          <Notice tone={result.errors.length ? "amber" : "green"}>
            Added {result.created.length}: {result.created.join(", ") || "none"}.
            {result.errors.length ? <ul className="mt-1 list-disc pl-5 text-[13px]">{result.errors.map((error) => <li key={error.index}>Line {error.index + 1}: {error.message}</li>)}</ul> : null}
          </Notice>
        ) : null}
        <Btn className="w-full" busy={action.busy === "add"} onClick={() => void submit()}>Add {lines.length || 1} unit{lines.length > 1 ? "s" : ""}</Btn>
      </div>
    </Modal>
  );
}

function UnitDrawer({ unit: initial, onClose }: { unit: Unit; onClose: () => void }) {
  const [unit, setUnit] = useState(initial);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [ids, setIds] = useState<{ imei: string | null; serial: string | null } | null>(null);
  const [edit, setEdit] = useState({ colour: unit.colour || "", cost: unit.costPaise !== null ? String(unit.costPaise / 100) : "", notes: unit.notes, batteryHealth: unit.batteryHealth ? String(unit.batteryHealth) : "" });
  const listings = useStockListings();
  const history = useQuery({ queryKey: ["showroom-inventory", "unit-history", unit.id], queryFn: async () => (await api.get("/showroom/inventory/movements", { params: { unitId: unit.id } })).data.data as { id: string; from: string | null; to: string; reason: string; at: string }[] });
  const action = useAction(["showroom-inventory", "showroom-products", "showroom-product", "showroom-dashboard"]);
  const locked = ["SOLD", "RESERVED"].includes(unit.status);

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} title={unit.code} description={unit.listing?.title || "Not assigned to a listing"}>
      <div className="space-y-5">
        <Panel>
          <div className="mb-4 flex items-center justify-between"><StatusPill status={unit.status} /><span className="text-[12px] text-muted">Revision {unit.rev}</span></div>
          <Facts
            items={[
              ["IMEI", ids ? ids.imei || "—" : unit.imeiLast4 ? `•••• ${unit.imeiLast4}` : "—"],
              ["Serial", ids ? ids.serial || "—" : unit.serialLast4 ? `•••• ${unit.serialLast4}` : "—"],
              ["Condition", titleCase(unit.condition)],
              ["Storage / RAM", [unit.storageGb && `${unit.storageGb} GB`, unit.ramGb && `${unit.ramGb} GB RAM`].filter(Boolean).join(" · ") || "—"],
              ["Warranty", unit.warranty.months ? `${unit.warranty.months} months (${titleCase(unit.warranty.provider)})${unit.warranty.endsAt ? ` · until ${formatDate(unit.warranty.endsAt)}` : ""}` : "None"],
              ["Sold", unit.soldAt ? formatDate(unit.soldAt) : "—"],
            ]}
          />
          {!ids && (unit.imeiLast4 || unit.serialLast4) ? <Btn size="sm" variant="secondary" icon={Eye} className="mt-4" busy={action.busy === "ids"} onClick={() => void action.run("ids", async () => setIds((await api.get(`/showroom/inventory/${unit.id}/identifiers`)).data.data))}>Show full IMEI / serial</Btn> : null}
        </Panel>

        {unit.allowed.length ? (
          <Panel title="Change status">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={to} onChange={(event) => setTo(event.target.value)} aria-label="New status">
                <option value="">Choose…</option>
                {unit.allowed.map((value) => <option key={value} value={value}>{titleCase(value.toLowerCase())}</option>)}
              </Select>
              <TextInput value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (required)" />
            </div>
            <Btn className="mt-3" size="sm" busy={action.busy === "status"} disabled={!to || reason.trim().length < 2} onClick={() => void action.run("status", async () => {
              const next = (await api.post(`/showroom/inventory/${unit.id}/status`, { to, reason, rev: unit.rev })).data.data as Unit;
              setUnit({ ...unit, ...next });
              setTo("");
              setReason("");
              void history.refetch();
            })}>Update status</Btn>
          </Panel>
        ) : <Notice>{unit.status === "SOLD" ? "Sold units change only through returns." : "This unit is reserved by a checkout in progress."}</Notice>}

        {!locked ? (
          <Panel title="Listing">
            <Select value={unit.productId || ""} onChange={(event) => void action.run("assign", async () => {
              const next = (await api.post(`/showroom/inventory/${unit.id}/assign`, { productId: event.target.value || null })).data.data as Unit;
              const listing = listings.data?.find((row) => row.id === event.target.value);
              setUnit({ ...unit, ...next, listing: listing ? { id: listing.id, title: listing.title, listingCode: listing.listingCode || null } : null });
            })}>
              <option value="">Not on a listing</option>
              {(listings.data || []).filter((row) => row.stockTracked).map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
            </Select>
          </Panel>
        ) : unit.listing ? <p className="text-[14px]">Listing: <Link to={`/seller/products/${unit.listing.id}`} className="font-semibold text-brand-700">{unit.listing.title}</Link></p> : null}

        <Panel title="Details">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Colour"><TextInput value={edit.colour} onChange={(event) => setEdit({ ...edit, colour: event.target.value })} /></Field>
            <Field label="Battery health %"><TextInput inputMode="numeric" value={edit.batteryHealth} onChange={(event) => setEdit({ ...edit, batteryHealth: event.target.value })} /></Field>
            <Field label="Cost (₹)"><TextInput inputMode="decimal" value={edit.cost} onChange={(event) => setEdit({ ...edit, cost: event.target.value })} /></Field>
            <Field label="Notes" className="sm:col-span-2"><TextArea value={edit.notes} onChange={(event) => setEdit({ ...edit, notes: event.target.value })} className="min-h-16" /></Field>
          </div>
          <Btn className="mt-3" size="sm" busy={action.busy === "save"} onClick={() => void action.run("save", async () => {
            const next = (await api.patch(`/showroom/inventory/${unit.id}`, { colour: edit.colour || undefined, notes: edit.notes, costPaise: edit.cost ? Math.round(Number(edit.cost) * 100) : undefined, batteryHealth: edit.batteryHealth ? Number(edit.batteryHealth) : undefined, rev: unit.rev })).data.data as Unit;
            setUnit({ ...unit, ...next });
          })}>Save details</Btn>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><History size={16} /> History</span>}>
          <ul className="space-y-2 text-[13px]">
            {(history.data || []).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2"><span className="text-muted">{formatDateTime(row.at)}</span>{row.from ? <StatusPill status={row.from} /> : null}→<StatusPill status={row.to} /><span>{titleCase(row.reason)}</span></li>
            ))}
          </ul>
        </Panel>
        <ErrorBox error={action.error} />
        {["AVAILABLE", "UNLISTED", "DAMAGED"].includes(unit.status) ? (
          <Btn variant="danger" icon={Trash2} busy={action.busy === "delete"} onClick={() => window.confirm(`Remove ${unit.code} from inventory?`) && void action.run("delete", () => api.delete(`/showroom/inventory/${unit.id}`)).then((done) => done && onClose())}>Remove unit</Btn>
        ) : null}
      </div>
    </Drawer>
  );
}
