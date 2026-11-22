import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, Copy, Download, Eye, EyeOff, FileUp, ImagePlus, Package, Plus, Trash2 } from "lucide-react";
import { api, downloadFile } from "../../lib/api";
import { marketplaceUrl } from "../../lib/config";
import { cn, money, titleCase } from "../../lib/utils";
import { PageHeader } from "../../components/PanelShell";
import { Modal } from "../../components/Modal";
import { PhotoUploader, photosFromListing, readyKeys, type Photo } from "../../components/PhotoUploader";
import { MapPicker } from "../../components/MapPicker";
import { useShowroom } from "./shared";
import { Btn, Empty, ErrorBox, Field, Loading, Notice, Pager, Panel, Pill, SearchBox, Select, StatusPill, Tabs, TextArea, TextInput, Toggle, formatDateTime, useAction } from "../../components/kit";

export interface Listing {
  id: string;
  title: string;
  slug: string;
  listingCode?: string;
  description?: string;
  condition: string;
  itemType: "new" | "used" | "refurbished";
  pricePaise: number;
  categorySlug: string;
  specs: Record<string, string | number | undefined>;
  images: { key?: string; url?: string }[];
  status: string;
  published: boolean;
  onHold: boolean;
  rejectionReason: string | null;
  stockTracked: boolean;
  stock: { available: number; reserved: number; sold: number };
  lowStockThreshold: number | null;
  priceHistory: { pricePaise: number; reason: string; at: string }[];
  pickup: Pickup | null;
  promo: { promotionId: string; basePricePaise: number; endsAt: string } | null;
  views: number;
  warrantyMonths: number;
  returnWindowDays: number;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  createdAt: string;
}

const TABS = [
  { value: "", label: "All" },
  { value: "active", label: "Live" },
  { value: "pending_review", label: "In review" },
  { value: "draft", label: "Drafts" },
  { value: "rejected", label: "Rejected" },
  { value: "unpublished", label: "Hidden" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

export function ProductsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<"" | "price" | "threshold">("");
  const [importOpen, setImportOpen] = useState(false);
  const action = useAction(["showroom-products", "showroom-dashboard"]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => setPage(1), [status, search, itemType, sort]);
  const params = new URLSearchParams({ status, q: search, itemType, sort, page: String(page), limit: "25" });
  const query = useQuery({ queryKey: ["showroom-products", params.toString()], queryFn: async () => (await api.get(`/showroom/products?${params}`)).data as { data: Listing[]; meta: { total: number; hasMore: boolean } } });
  const rows = query.data?.data || [];
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  async function runBulk(kind: string, extra: Record<string, unknown> = {}) {
    const result = await action.run(kind, async () => (await api.post("/showroom/products/bulk", { ids: selected, action: kind, ...extra })).data.data as { updated: number; results: { ok: boolean; message?: string }[] });
    if (result) {
      const failed = result.results.filter((row) => !row.ok);
      if (failed.length) action.setError(new Error(`${result.updated} updated, ${failed.length} skipped: ${failed[0]?.message}`));
      else setSelected([]);
      setBulk("");
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Every listing in your showroom. Stock is counted from the units in Inventory."
        actions={
          <>
            <Btn variant="secondary" icon={Download} busy={action.busy === "export"} onClick={() => void action.run("export", () => downloadFile("/showroom/products/export.csv", "listings.csv"))}>Export CSV</Btn>
            <Btn variant="secondary" icon={FileUp} onClick={() => setImportOpen(true)}>Import CSV</Btn>
            <Btn icon={Plus} onClick={() => navigate("/seller/products/new")}>Add product</Btn>
          </>
        }
      />
      <Tabs value={status} onChange={setStatus} items={TABS} />
      <div className="mt-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search title, model or SG-LIST code" />
        <Select value={itemType} onChange={(event) => setItemType(event.target.value)} className="w-auto">
          <option value="">All types</option>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </Select>
        <Select value={sort} onChange={(event) => setSort(event.target.value)} className="w-auto" aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="updated">Recently updated</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="stock_asc">Lowest stock</option>
          <option value="views">Most viewed</option>
        </Select>
      </div>

      {selected.length ? (
        <div className="sticky top-16 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-ink p-3 text-white lg:top-3">
          <span className="px-2 text-[14px] font-semibold">{selected.length} selected</span>
          <Btn size="sm" variant="secondary" busy={action.busy === "publish"} onClick={() => void runBulk("publish")}>Publish</Btn>
          <Btn size="sm" variant="secondary" busy={action.busy === "unpublish"} onClick={() => void runBulk("unpublish")}>Hide</Btn>
          <Btn size="sm" variant="secondary" onClick={() => setBulk("price")}>Change price</Btn>
          <Btn size="sm" variant="secondary" onClick={() => setBulk("threshold")}>Low-stock level</Btn>
          <Btn size="sm" variant="danger" busy={action.busy === "archive"} onClick={() => window.confirm(`Archive ${selected.length} listing(s)? Available units become unlisted.`) && void runBulk("archive")}>Archive</Btn>
          <button type="button" onClick={() => setSelected([])} className="ml-auto px-2 text-[13px] text-white/70 hover:text-white">Clear</button>
        </div>
      ) : null}
      <div className="mt-4"><ErrorBox error={action.error || query.error} /></div>

      <div className="mt-4">
        {query.isLoading ? (
          <Loading />
        ) : !rows.length ? (
          <Empty icon={Package} title="No listings here" body="Add a product, then add its units in Inventory so buyers can order." action={<Btn icon={Plus} onClick={() => navigate("/seller/products/new")}>Add product</Btn>} />
        ) : (
          <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
            <div className="flex items-center gap-3 border-b border-line bg-canvas px-4 py-2.5 text-[12px] font-semibold text-muted uppercase">
              <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} className="h-4 w-4 accent-brand-600" />
              <span className="flex-1">Listing</span>
              <span className="hidden w-28 sm:block">Stock</span>
              <span className="w-24 text-right">Price</span>
            </div>
            {rows.map((row) => (
              <div key={row.id} className={cn("flex items-center gap-3 border-b border-line px-4 py-3 last:border-0", selected.includes(row.id) && "bg-brand-50/50")}>
                <input type="checkbox" aria-label={`Select ${row.title}`} checked={selected.includes(row.id)} onChange={() => setSelected(selected.includes(row.id) ? selected.filter((id) => id !== row.id) : [...selected, row.id])} className="h-4 w-4 accent-brand-600" />
                <Link to={`/seller/products/${row.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50">{row.images[0]?.url ? <img src={row.images[0].url} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={18} className="text-brand-300" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{row.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                      {row.listingCode ? <span className="font-mono">{row.listingCode}</span> : null}
                      <StatusPill status={row.status} />
                      {!row.published ? <Pill>Hidden</Pill> : null}
                      {row.onHold ? <Pill tone="red">On hold</Pill> : null}
                      <Pill tone="violet">{titleCase(row.itemType)}</Pill>
                      {row.promo ? <Pill tone="green">On offer</Pill> : null}
                    </span>
                  </span>
                </Link>
                <span className="hidden w-28 text-[13px] sm:block">
                  {row.stockTracked ? (
                    <><span className={cn("font-semibold", row.stock.available === 0 ? "text-danger" : row.stock.available <= (row.lowStockThreshold ?? 2) ? "text-warning" : "")}>{row.stock.available} available</span><span className="block text-muted">{row.stock.sold} sold</span></>
                  ) : <span className="text-muted">Single device</span>}
                </span>
                <span className="w-24 text-right font-semibold">{money(row.pricePaise)}{row.promo ? <span className="block text-[12px] font-normal text-muted line-through">{money(row.promo.basePricePaise)}</span> : null}</span>
              </div>
            ))}
          </div>
        )}
        <Pager page={page} hasMore={Boolean(query.data?.meta.hasMore)} total={query.data?.meta.total} onChange={setPage} />
      </div>

      <BulkValueModal kind={bulk} onClose={() => setBulk("")} busy={Boolean(action.busy)} onSubmit={(extra) => void runBulk(bulk === "price" ? "price" : "threshold", extra)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function BulkValueModal({ kind, onClose, onSubmit, busy }: { kind: "" | "price" | "threshold"; onClose: () => void; onSubmit: (extra: Record<string, unknown>) => void; busy: boolean }) {
  const [mode, setMode] = useState("percent");
  const [value, setValue] = useState("");
  return (
    <Modal open={Boolean(kind)} onOpenChange={(open) => !open && onClose()} title={kind === "price" ? "Change prices" : "Low-stock alert level"} size="sm">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const number = Number(value);
          if (!Number.isFinite(number)) return;
          if (kind === "price") onSubmit({ priceMode: mode, value: mode === "percent" ? number : Math.round(number * 100) });
          else onSubmit({ value: number });
        }}
      >
        {kind === "price" ? (
          <Field label="How">
            <Select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="percent">Change by percent (use − to reduce)</option>
              <option value="amount">Change by rupees (use − to reduce)</option>
              <option value="set">Set exact price (₹)</option>
            </Select>
          </Field>
        ) : null}
        <Field label={kind === "price" ? (mode === "percent" ? "Percent" : "Rupees") : "Alert when available units are at or below"}>
          <TextInput value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" required placeholder={kind === "price" ? "-5" : "2"} />
        </Field>
        <p className="text-[12px] text-muted">Listings with a running promotion are skipped. Every change is recorded in price history.</p>
        <Btn type="submit" busy={busy} className="w-full">Apply</Btn>
      </form>
    </Modal>
  );
}

const CSV_TEMPLATE = "categorySlug,title,description,itemType,condition,price,brand,model,storageGb,ramGb,colour,processor,warrantyMonths,returnWindowDays,imei,serial,cost\nsmartphones,iPhone 13 128GB Blue,Refurbished by our technicians with a new battery.,refurbished,excellent,42999,Apple,iPhone 13,128,4,Blue,,6,7,356789012345678,,36000\n";

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const action = useAction(["showroom-products", "showroom-dashboard"]);
  return (
    <Modal open={open} onOpenChange={(next) => { if (!next) { onClose(); setResult(null); } }} title="Import listings from CSV" description="One row per listing. Optional imei/serial/cost columns add one unit to that listing." size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" variant="secondary" icon={Download} onClick={() => { const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = "suregad-listings-template.csv"; link.click(); URL.revokeObjectURL(url); }}>Download template</Btn>
          <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const picked = event.target.files?.[0]; if (picked) void picked.text().then(setText); }} />
          <Btn size="sm" variant="secondary" icon={FileUp} onClick={() => file.current?.click()}>Choose file</Btn>
        </div>
        <TextArea value={text} onChange={(event) => setText(event.target.value)} className="min-h-48 font-mono text-[12px]" placeholder="Paste CSV here or choose a file" />
        <ErrorBox error={action.error} />
        {result ? (
          <Notice tone={result.errors.length ? "amber" : "green"}>
            {result.created} listing(s) created.
            {result.errors.length ? <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5 text-[13px]">{result.errors.map((error) => <li key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</li>)}</ul> : null}
          </Notice>
        ) : null}
        <Btn className="w-full" busy={action.busy === "import"} disabled={text.trim().length < 10} onClick={() => void action.run("import", async () => setResult((await api.post("/showroom/products/import", { csv: text })).data.data))}>Import</Btn>
      </div>
    </Modal>
  );
}

/* ---------------- create / edit ---------------- */

export interface Pickup {
  lat: number;
  lng: number;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

type PickupDraft = { mode: "showroom" | "custom"; point: { lat: number; lng: number } | null; city: string; district: string; state: string; pincode: string };

/** A listing has its own pickup point when it is more than ~100 m from the showroom pin. */
function differsFromShowroom(pickup: Pickup | null, showroom: { lat: number; lng: number } | null | undefined) {
  if (!pickup) return false;
  if (!showroom) return true;
  return Math.abs(pickup.lat - showroom.lat) > 0.001 || Math.abs(pickup.lng - showroom.lng) > 0.001;
}

interface UnitDraft { imei: string; serial: string; colour: string; cost: string }

function specsForm(listing?: Listing) {
  const specs = listing?.specs || {};
  return {
    brand: String(specs.brand || ""),
    model: String(specs.model || ""),
    storageGb: String(specs.storageGb || "128"),
    ramGb: String(specs.ramGb || "8"),
    colour: String(specs.colour || ""),
    processor: String(specs.processor || ""),
    displayInches: String(specs.displayInches || ""),
  };
}

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id && id !== "new");
  const detail = useQuery({ queryKey: ["showroom-product", id], enabled: editing, queryFn: async () => (await api.get(`/showroom/products/${id}`)).data.data as { listing: Listing; units: { id: string; code: string; status: string; imeiLast4: string | null; serialLast4: string | null }[] } });
  const listing = detail.data?.listing;
  const [form, setForm] = useState({ categorySlug: "smartphones", title: "", description: "", itemType: "used", condition: "excellent", price: "", warrantyMonths: "0", returnWindowDays: "7", lowStockThreshold: "", deliveryAvailable: true, pickupAvailable: true, ...specsForm() });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [units, setUnits] = useState<UnitDraft[]>([{ imei: "", serial: "", colour: "", cost: "" }]);
  const [ready, setReady] = useState(!editing);
  const showroom = useShowroom();
  const [pickup, setPickup] = useState<PickupDraft>({ mode: "showroom", point: null, city: "", district: "", state: "Kerala", pincode: "" });
  const [pickupTouched, setPickupTouched] = useState(false);
  const [pickupError, setPickupError] = useState("");
  const action = useAction(["showroom-products", "showroom-product", "showroom-dashboard", "showroom-inventory"]);
  const updatePickup = (patch: Partial<PickupDraft>) => {
    setPickup((current) => ({ ...current, ...patch }));
    setPickupTouched(true);
    setPickupError("");
  };

  useEffect(() => {
    if (!listing || ready) return;
    setForm({
      categorySlug: listing.categorySlug,
      title: listing.title,
      description: listing.description || "",
      itemType: listing.itemType,
      condition: listing.condition,
      price: String((listing.promo?.basePricePaise || listing.pricePaise) / 100),
      warrantyMonths: String(listing.warrantyMonths || 0),
      returnWindowDays: String(listing.returnWindowDays || 0),
      lowStockThreshold: listing.lowStockThreshold === null ? "" : String(listing.lowStockThreshold),
      deliveryAvailable: listing.deliveryAvailable,
      pickupAvailable: listing.pickupAvailable,
      ...specsForm(listing),
    });
    setPhotos(photosFromListing(listing.images));
    if (listing.pickup && differsFromShowroom(listing.pickup, showroom.data?.location)) {
      setPickup({ mode: "custom", point: { lat: listing.pickup.lat, lng: listing.pickup.lng }, city: listing.pickup.city, district: listing.pickup.district, state: listing.pickup.state, pincode: listing.pickup.pincode });
    }
    setReady(true);
  }, [listing, ready, showroom.data]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });
  const uploading = photos.some((photo) => photo.status === "uploading");
  const specs = {
    brand: form.brand,
    model: form.model,
    storageGb: Number(form.storageGb),
    ramGb: Number(form.ramGb),
    colour: form.colour || "Black",
    processor: form.processor || undefined,
    displayInches: form.displayInches ? Number(form.displayInches) : undefined,
  };

  /** The pickup to send: a custom point, null to go back to the showroom address, or undefined for "unchanged". */
  function pickupPayload(): Pickup | null | undefined | false {
    if (pickup.mode === "showroom") return editing ? (pickupTouched ? null : undefined) : undefined;
    if (!pickup.point) return (setPickupError("Tap the map to place the pickup point."), false);
    if (pickup.city.trim().length < 2 || pickup.district.trim().length < 2) return (setPickupError("Enter the pickup city and district."), false);
    if (!/^[1-9][0-9]{5}$/.test(pickup.pincode.trim())) return (setPickupError("Enter a 6-digit PIN code."), false);
    if (editing && !pickupTouched) return undefined;
    return { lat: pickup.point.lat, lng: pickup.point.lng, city: pickup.city.trim(), district: pickup.district.trim(), state: pickup.state.trim() || "Kerala", pincode: pickup.pincode.trim() };
  }

  async function save(submit: boolean) {
    const pickupValue = pickupPayload();
    if (pickupValue === false) return;
    const base = {
      ...(pickupValue !== undefined ? { pickup: pickupValue } : {}),
      title: form.title,
      description: form.description,
      itemType: form.itemType,
      condition: form.itemType === "new" ? undefined : form.condition,
      pricePaise: Math.round(Number(form.price) * 100),
      warrantyMonths: Number(form.warrantyMonths) || 0,
      returnWindowDays: Number(form.returnWindowDays) || 0,
      deliveryAvailable: form.deliveryAvailable,
      pickupAvailable: form.pickupAvailable,
      lowStockThreshold: form.lowStockThreshold === "" ? (editing ? null : undefined) : Number(form.lowStockThreshold),
      specs,
    };
    if (editing && listing) {
      const result = await action.run("save", async () => {
        const body: Record<string, unknown> = { ...base };
        if (listing.promo) delete body.pricePaise;
        await api.patch(`/showroom/products/${listing.id}`, body);
        const keys = readyKeys(photos);
        const before = listing.images.map((image) => image.key).join("|");
        if (keys.length && keys.join("|") !== before) await api.put(`/products/${listing.id}/images`, { imageKeys: keys });
        return true;
      });
      if (result) void detail.refetch();
      return;
    }
    const created = await action.run("create", async () =>
      (await api.post("/showroom/products", {
        ...base,
        categorySlug: form.categorySlug,
        imageKeys: readyKeys(photos),
        submit,
        units: units.filter((unit) => unit.imei || unit.serial).map((unit) => ({ imei: unit.imei || undefined, serial: unit.serial || undefined, colour: unit.colour || undefined, costPaise: unit.cost ? Math.round(Number(unit.cost) * 100) : undefined })),
      })).data.data as { listing: Listing; unitErrors: { index: number; message: string }[] },
    );
    if (created) {
      if (created.unitErrors.length) action.setError(new Error(`Listing saved. Some units were not added: ${created.unitErrors.map((error) => `#${error.index + 1} ${error.message}`).join("; ")}`));
      navigate(`/seller/products/${created.listing.id}`, { replace: true });
    }
  }

  if (editing && (detail.isLoading || !ready)) return <Loading rows={5} />;
  if (editing && !listing) return <ErrorBox error={detail.error || new Error("Listing not found.")} />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back="/seller/products"
        title={editing ? listing!.title : "Add product"}
        description={editing ? listing!.listingCode || undefined : "Create the listing, then add each physical unit with its IMEI or serial."}
        actions={editing && listing ? <ListingActions listing={listing} onChanged={() => void detail.refetch()} /> : null}
      />
      {listing?.rejectionReason && listing.status === "rejected" ? <div className="mb-4"><Notice tone="red">Rejected by SureGad: {listing.rejectionReason}. Edit and publish to send it for review again.</Notice></div> : null}
      {listing?.onHold ? <div className="mb-4"><Notice tone="red">This listing is hidden while your showroom is suspended.</Notice></div> : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Panel title="Photos" description="The first photo is the cover. Clear photos from several angles sell faster.">
            <PhotoUploader photos={photos} setPhotos={setPhotos} />
          </Panel>
          <Panel title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={form.categorySlug} onChange={set("categorySlug")} disabled={editing}>
                  <option value="smartphones">Smartphone</option>
                  <option value="laptops">Laptop</option>
                </Select>
              </Field>
              <Field label="Type">
                <Select value={form.itemType} onChange={set("itemType")}>
                  <option value="new">New (sealed)</option>
                  <option value="refurbished">Refurbished</option>
                  <option value="used">Used</option>
                </Select>
              </Field>
              <Field label="Title" className="sm:col-span-2"><TextInput value={form.title} onChange={set("title")} placeholder="iPhone 13 128GB Midnight" required /></Field>
              <Field label="Description" className="sm:col-span-2"><TextArea value={form.description} onChange={set("description")} placeholder="Condition, what's in the box, battery health, any marks." /></Field>
              {form.itemType !== "new" ? (
                <Field label="Condition">
                  <Select value={form.condition} onChange={set("condition")}>
                    <option value="like_new">Like new</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </Select>
                </Field>
              ) : null}
              <Field label="Price (₹)" hint={listing?.promo ? "A promotion is running. End it to change the price." : undefined}><TextInput inputMode="decimal" value={form.price} onChange={set("price")} disabled={Boolean(listing?.promo)} required /></Field>
            </div>
          </Panel>
          <Panel title="Specifications">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand"><TextInput value={form.brand} onChange={set("brand")} required /></Field>
              <Field label="Model"><TextInput value={form.model} onChange={set("model")} required /></Field>
              <Field label="Storage (GB)"><TextInput inputMode="numeric" value={form.storageGb} onChange={set("storageGb")} /></Field>
              <Field label="RAM (GB)"><TextInput inputMode="numeric" value={form.ramGb} onChange={set("ramGb")} /></Field>
              <Field label="Colour"><TextInput value={form.colour} onChange={set("colour")} /></Field>
              {form.categorySlug === "laptops" ? (
                <>
                  <Field label="Processor"><TextInput value={form.processor} onChange={set("processor")} required /></Field>
                  <Field label="Screen (inches)"><TextInput inputMode="decimal" value={form.displayInches} onChange={set("displayInches")} /></Field>
                </>
              ) : null}
            </div>
          </Panel>
          {!editing ? (
            <Panel title="Units in stock" description="One row per physical device. IMEI/serial must be unique across SureGad. You can add more later in Inventory.">
              <div className="space-y-2">
                {units.map((unit, index) => (
                  <div key={index} className="grid gap-2 rounded-2xl bg-canvas p-3 sm:grid-cols-[1fr_1fr_0.8fr_0.7fr_auto]">
                    <TextInput aria-label={`Unit ${index + 1} IMEI`} placeholder={form.categorySlug === "laptops" ? "IMEI (if any)" : "IMEI"} inputMode="numeric" value={unit.imei} onChange={(event) => setUnits(units.map((row, at) => (at === index ? { ...row, imei: event.target.value.replace(/\D/g, "") } : row)))} />
                    <TextInput aria-label={`Unit ${index + 1} serial`} placeholder="Serial number" value={unit.serial} onChange={(event) => setUnits(units.map((row, at) => (at === index ? { ...row, serial: event.target.value } : row)))} />
                    <TextInput aria-label={`Unit ${index + 1} colour`} placeholder="Colour" value={unit.colour} onChange={(event) => setUnits(units.map((row, at) => (at === index ? { ...row, colour: event.target.value } : row)))} />
                    <TextInput aria-label={`Unit ${index + 1} cost`} placeholder="Cost ₹" inputMode="decimal" value={unit.cost} onChange={(event) => setUnits(units.map((row, at) => (at === index ? { ...row, cost: event.target.value } : row)))} />
                    <button type="button" aria-label={`Remove unit ${index + 1}`} onClick={() => setUnits(units.filter((_, at) => at !== index))} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-danger"><Trash2 size={16} /></button>
                  </div>
                ))}
                <Btn size="sm" variant="secondary" icon={Plus} onClick={() => setUnits([...units, { imei: "", serial: "", colour: "", cost: "" }])}>Add unit</Btn>
              </div>
            </Panel>
          ) : null}
          <Panel title="Pickup location" description="Where buyers collect the device and where it shows up in nearby searches. Your showroom address is used unless you choose another point.">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pickup location">
              {([
                ["showroom", "Showroom address", showroom.data?.address?.city ? `${showroom.data.address.line1 || ""} ${showroom.data.address.city}`.trim() : "From your business profile"],
                ["custom", "Different pickup point", "Pick a spot on the map"],
              ] as const).map(([mode, title, hint]) => (
                <button key={mode} type="button" role="radio" aria-checked={pickup.mode === mode} onClick={() => updatePickup({ mode, ...(mode === "custom" && !pickup.point && showroom.data?.location ? { point: showroom.data.location, city: showroom.data.address?.city || "", district: showroom.data.address?.district || "", state: showroom.data.address?.state || "Kerala", pincode: showroom.data.address?.pincode || "" } : {}) })} className={cn("rounded-2xl p-3.5 text-left ring-2 transition", pickup.mode === mode ? "bg-brand-50 ring-brand-500" : "bg-white ring-line hover:ring-brand-200")}>
                  <span className="block text-[14px] font-semibold">{title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">{hint}</span>
                </button>
              ))}
            </div>
            {pickup.mode === "custom" ? (
              <div className="mt-4 space-y-3">
                <MapPicker value={pickup.point} onChange={(point) => updatePickup({ point })} height={240} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="City"><TextInput value={pickup.city} onChange={(event) => updatePickup({ city: event.target.value })} /></Field>
                  <Field label="District"><TextInput value={pickup.district} onChange={(event) => updatePickup({ district: event.target.value })} /></Field>
                  <Field label="State"><TextInput value={pickup.state} onChange={(event) => updatePickup({ state: event.target.value })} /></Field>
                  <Field label="PIN code"><TextInput inputMode="numeric" maxLength={6} value={pickup.pincode} onChange={(event) => updatePickup({ pincode: event.target.value.replace(/D/g, "") })} /></Field>
                </div>
                <p className="text-[12px] text-muted">Buyers see only the approximate area until they order. Moving your phone never changes this point.</p>
              </div>
            ) : null}
            {pickupError ? <p className="mt-3 text-[13px] text-danger">{pickupError}</p> : null}
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Selling terms">
            <div className="space-y-4">
              <Field label="Warranty (months)" hint="0 for no warranty. Starts when the unit is sold."><TextInput inputMode="numeric" value={form.warrantyMonths} onChange={set("warrantyMonths")} /></Field>
              <Field label="Return window (days)" hint="0 uses your showroom's default policy."><TextInput inputMode="numeric" value={form.returnWindowDays} onChange={set("returnWindowDays")} /></Field>
              <Field label="Low-stock alert at" hint="Blank uses your showroom setting."><TextInput inputMode="numeric" value={form.lowStockThreshold} onChange={set("lowStockThreshold")} /></Field>
              <Toggle checked={form.deliveryAvailable} onChange={(deliveryAvailable) => setForm({ ...form, deliveryAvailable })} label="Delivery" />
              <Toggle checked={form.pickupAvailable} onChange={(pickupAvailable) => setForm({ ...form, pickupAvailable })} label="Showroom pickup" />
            </div>
          </Panel>
          <ErrorBox error={action.error} />
          <div className="grid gap-2">
            {editing ? (
              <Btn busy={action.busy === "save"} disabled={uploading} onClick={() => void save(false)}>Save changes</Btn>
            ) : (
              <>
                <Btn busy={action.busy === "create"} disabled={uploading} onClick={() => void save(true)}>Submit for review</Btn>
                <Btn variant="secondary" disabled={uploading || Boolean(action.busy)} onClick={() => void save(false)}>Save as draft</Btn>
              </>
            )}
            <p className="text-[12px] text-muted">Title, description and spec changes go back to SureGad review. Price and stock changes apply immediately.</p>
          </div>
          {editing && listing ? (
            <>
              <Panel title="Stock" actions={<Link to={`/seller/inventory?productId=${listing.id}`} className="text-[13px] font-semibold text-brand-700">Manage units</Link>}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(["available", "reserved", "sold"] as const).map((key) => (
                    <div key={key} className="rounded-2xl bg-canvas p-3"><p className="font-display text-[22px] font-bold">{listing.stock[key]}</p><p className="text-[12px] text-muted">{titleCase(key)}</p></div>
                  ))}
                </div>
                <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-[13px]">
                  {detail.data?.units.map((unit) => (
                    <li key={unit.id} className="flex items-center justify-between gap-2"><span className="font-mono">{unit.code}</span><span className="text-muted">{unit.imeiLast4 ? `IMEI ••${unit.imeiLast4}` : unit.serialLast4 ? `S/N ••${unit.serialLast4}` : ""}</span><StatusPill status={unit.status} /></li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Price history">
                <ul className="space-y-2 text-[13px]">
                  {[...listing.priceHistory].reverse().map((row, index) => (
                    <li key={index} className="flex items-center justify-between gap-2"><span className="font-semibold">{money(row.pricePaise)}</span><span className="truncate text-muted">{titleCase(row.reason.split(":")[0])}</span><span className="text-muted">{formatDateTime(row.at)}</span></li>
                  ))}
                  {!listing.priceHistory.length ? <li className="text-muted">No changes recorded.</li> : null}
                </ul>
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ListingActions({ listing, onChanged }: { listing: Listing; onChanged: () => void }) {
  const navigate = useNavigate();
  const action = useAction(["showroom-products", "showroom-dashboard"]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {["active", "reserved", "sold"].includes(listing.status) && listing.published ? (
        <a href={marketplaceUrl(`product/${listing.slug}`)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold ring-1 ring-line hover:ring-brand-300"><Eye size={16} /> View</a>
      ) : null}
      <Btn variant="secondary" icon={listing.published && listing.status !== "draft" ? EyeOff : Eye} busy={action.busy === "publish"} onClick={() => void action.run("publish", () => api.post(`/showroom/products/${listing.id}/publish`, { published: !(listing.published && listing.status !== "draft") })).then(onChanged)}>
        {listing.published && listing.status !== "draft" ? "Hide" : "Publish"}
      </Btn>
      <Btn variant="secondary" icon={Copy} busy={action.busy === "dup"} onClick={() => void action.run("dup", async () => (await api.post(`/showroom/products/${listing.id}/duplicate`)).data.data as Listing).then((copy) => copy && navigate(`/seller/products/${copy.id}`))}>Duplicate</Btn>
      <Btn variant="danger" icon={Archive} busy={action.busy === "archive"} onClick={() => window.confirm("Archive this listing? Available units become unlisted.") && void action.run("archive", () => api.post(`/showroom/products/${listing.id}/archive`)).then((done) => done && navigate("/seller/products"))}>Archive</Btn>
      {action.error ? <p className="w-full text-[13px] text-danger">{(action.error as Error).message}</p> : null}
    </div>
  );
}
