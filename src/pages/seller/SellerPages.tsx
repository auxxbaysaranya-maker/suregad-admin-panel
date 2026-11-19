import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, ExternalLink, ImagePlus, Loader2, MessageCircle, Package, PackageCheck, Plus, ShoppingBag, Store, Timer } from "lucide-react";
import { api } from "../../lib/api";
import { marketplaceUrl } from "../../lib/config";
import { useList } from "../../lib/panels";
import { cn, money, titleCase } from "../../lib/utils";
import { useSession } from "../../store/session";
import { Badge, Card, Empty, ErrorNote } from "../../components/ui";
import { PageHeader } from "../../components/PanelShell";
import { PhotoUploader, readyKeys, type Photo } from "../../components/PhotoUploader";
import { ManagePhotos } from "../../components/ManagePhotos";

interface MyListing {
  id: string;
  title: string;
  slug: string;
  status?: string;
  pricePaise: number;
  images?: { key?: string; url?: string }[];
  createdAt?: string;
}

const STATUS_TONE: Record<string, "slate" | "blue" | "green" | "amber" | "red"> = {
  active: "green",
  pending_review: "amber",
  draft: "slate",
  rejected: "red",
  reserved: "blue",
  sold: "blue",
};

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</span>
      <span>
        <span className="block font-display text-[26px] leading-none font-bold">{value}</span>
        <span className="mt-1 block text-[13px] text-muted">{label}</span>
      </span>
    </Card>
  );
}

export function SellerDashboard() {
  const location = useLocation();
  const client = useQueryClient();
  const listings = useList<MyListing[]>("my-listings", "/me/listings");
  const orders = useList<{ _id: string; status: string }[]>("seller-orders", "/seller/orders");
  const [photosFor, setPhotosFor] = useState<MyListing | null>(null);
  const [archiving, setArchiving] = useState("");
  const flash = (location.state as { created?: boolean } | null)?.created;
  const rows = listings.data || [];
  const count = (status: string) => rows.filter((row) => row.status === status).length;

  async function archive(id: string) {
    setArchiving(id);
    try {
      await api.post(`/products/${id}/archive`);
      await client.invalidateQueries({ queryKey: ["my-listings"] });
    } finally {
      setArchiving("");
    }
  }

  return (
    <div>
      <PageHeader
        title="Seller dashboard"
        description="Your listings, orders and buyer chats in one place."
        actions={
          <>
            <a href={marketplaceUrl("chat?box=selling")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold ring-1 ring-line hover:ring-brand-300">
              <MessageCircle size={16} /> Buyer chats
            </a>
            <Link to="/seller/listings/new" className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-semibold text-white shadow-glow">
              <Plus size={16} /> Add listing
            </Link>
          </>
        }
      />
      {flash ? <p className="mb-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-[14px] text-emerald-800 ring-1 ring-emerald-200"><CheckCircle2 size={17} /> Listing submitted. It goes live after a quick review.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Package size={22} />} label="Live listings" value={count("active")} />
        <Stat icon={<Timer size={22} />} label="Waiting for review" value={count("pending_review")} />
        <Stat icon={<PackageCheck size={22} />} label="Sold" value={count("sold")} />
        <Stat icon={<ShoppingBag size={22} />} label="Orders" value={orders.data?.length ?? "—"} />
      </div>

      <div className="mt-9 mb-4 flex items-end justify-between">
        <h2 className="text-[22px]">Your listings</h2>
        <Link to="/seller/storefront" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700"><Store size={15} /> Edit storefront</Link>
      </div>
      {listings.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((index) => <div key={index} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : !rows.length ? (
        <Empty title="No listings yet" body="Add your first device. Listings with several clear photos get more chats." />
      ) : (
        <div className="overflow-hidden rounded-[24px] bg-white ring-1 ring-line">
          {rows.map((row, index) => (
            <div key={row.id} className={cn("flex flex-wrap items-center gap-4 p-4", index > 0 && "border-t border-line")}>
              <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50">
                {row.images?.[0]?.url ? <img src={row.images[0].url} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} className="text-brand-300" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <span className="font-display text-[16px] font-bold text-ink">{money(row.pricePaise)}</span>
                  <Badge tone={STATUS_TONE[row.status || ""] || "slate"}>{titleCase(row.status)}</Badge>
                  <span>{row.images?.length || 0} photo{row.images?.length === 1 ? "" : "s"}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPhotosFor(row)} disabled={row.status === "sold"} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-2 text-[13px] font-semibold text-brand-800 ring-1 ring-brand-100 hover:bg-brand-100 disabled:opacity-40">
                  <ImagePlus size={15} /> Photos
                </button>
                {["active", "reserved", "sold"].includes(row.status || "") ? (
                  <a href={marketplaceUrl(`product/${row.slug}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold ring-1 ring-line hover:ring-brand-300">
                    <ExternalLink size={14} /> View
                  </a>
                ) : null}
                {row.status !== "sold" ? (
                  <button type="button" onClick={() => void archive(row.id)} disabled={archiving === row.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-muted ring-1 ring-line hover:text-danger hover:ring-red-200">
                    {archiving === row.id ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />} Archive
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      {photosFor ? <ManagePhotos product={photosFor} open={Boolean(photosFor)} onOpenChange={(open) => !open && setPhotosFor(null)} /> : null}
    </div>
  );
}

const field = "w-full rounded-2xl bg-canvas px-4 py-3 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400";

function FormField({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={cn("block space-y-1.5 text-[13px] font-semibold text-ink", wide && "md:col-span-2")}>
      {label}
      {children}
    </label>
  );
}

export function NewListingPage() {
  const navigate = useNavigate();
  const profile = useSession((state) => state.profile);
  const [error, setError] = useState<unknown>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const uploading = photos.some((photo) => photo.status === "uploading");
  const [form, setForm] = useState({
    title: "",
    description: "",
    condition: "excellent",
    price: "",
    categorySlug: "smartphones",
    brand: "",
    model: "",
    storageGb: "128",
    ramGb: "8",
    colour: "",
    processor: "",
    city: "Kochi",
    district: "Ernakulam",
    pincode: "682001",
    imei: "",
  });
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (uploading) return;
    setSubmitting(true);
    try {
      const business = profile?.businesses?.[0];
      if (!business && !profile?.seller) {
        await api.post("/auth/seller", { displayName: profile?.displayName || "Seller", city: form.city, district: form.district, state: "Kerala" });
      }
      await api.post("/products", {
        categorySlug: form.categorySlug,
        sellerType: business ? "business" : "individual",
        businessId: business?._id,
        title: form.title,
        description: form.description,
        condition: form.condition,
        pricePaise: Math.round(Number(form.price) * 100),
        specs: {
          brand: form.brand,
          model: form.model,
          storageGb: Number(form.storageGb),
          ramGb: Number(form.ramGb),
          colour: form.colour || "Black",
          processor: form.processor || undefined,
        },
        imageKeys: readyKeys(photos),
        location: { city: form.city, district: form.district, state: "Kerala", pincode: form.pincode },
        imei: form.imei || undefined,
        submit: true,
      });
      navigate("/seller", { state: { created: true } });
    } catch (reason) {
      setError(reason);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add a listing" description="Each listing is one physical device. Add several clear photos — front, back, sides, screen on and any marks." />
      <form onSubmit={(event) => void submit(event)} className="space-y-5">
        <Card className="p-5 sm:p-6">
          <PhotoUploader photos={photos} setPhotos={setPhotos} max={10} />
        </Card>
        <Card className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
          <FormField label="Title" wide><input required minLength={4} value={form.title} onChange={set("title")} placeholder="e.g. iPhone 13 128 GB, Midnight" className={field} /></FormField>
          <FormField label="Price (₹)"><input required inputMode="numeric" value={form.price} onChange={set("price")} placeholder="42000" className={field} /></FormField>
          <FormField label="Category">
            <select value={form.categorySlug} onChange={set("categorySlug")} className={field}>
              <option value="smartphones">Smartphone</option>
              <option value="laptops">Laptop</option>
            </select>
          </FormField>
          <FormField label="Condition">
            <select value={form.condition} onChange={set("condition")} className={field}>
              <option value="like_new">Like new</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </FormField>
          <FormField label="Brand"><input required value={form.brand} onChange={set("brand")} className={field} /></FormField>
          <FormField label="Model"><input required value={form.model} onChange={set("model")} className={field} /></FormField>
          <FormField label="Storage (GB)"><input required inputMode="numeric" value={form.storageGb} onChange={set("storageGb")} className={field} /></FormField>
          <FormField label="RAM (GB)"><input required inputMode="numeric" value={form.ramGb} onChange={set("ramGb")} className={field} /></FormField>
          <FormField label="Colour"><input value={form.colour} onChange={set("colour")} className={field} /></FormField>
          <FormField label={form.categorySlug === "laptops" ? "Processor" : "Processor (optional)"}><input required={form.categorySlug === "laptops"} value={form.processor} onChange={set("processor")} className={field} /></FormField>
          <FormField label="IMEI / serial (optional, kept private)"><input value={form.imei} onChange={set("imei")} className={field} /></FormField>
          <FormField label="City"><input required value={form.city} onChange={set("city")} className={field} /></FormField>
          <FormField label="District"><input required value={form.district} onChange={set("district")} className={field} /></FormField>
          <FormField label="PIN code"><input required pattern="\d{6}" value={form.pincode} onChange={set("pincode")} className={field} /></FormField>
          <FormField label="Description" wide><textarea required minLength={10} rows={5} value={form.description} onChange={set("description")} placeholder="Battery health, accessories included, any repairs or marks…" className={cn(field, "resize-y")} /></FormField>
        </Card>
        {error ? <ErrorNote error={error} /> : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={uploading || submitting} className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 text-[15px] font-semibold text-white shadow-glow disabled:opacity-60">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {uploading ? "Waiting for photos…" : submitting ? "Submitting…" : "Submit for review"}
          </button>
          <Link to="/seller" className="text-[14px] font-semibold text-muted hover:text-ink">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

interface SellerOrder {
  _id: string;
  number: string;
  status: string;
  amountPaise: number;
  createdAt: string;
  fulfillment?: string;
  subOrders: { _id: string; status: string; items: { title?: string; pricePaise?: number }[] }[];
}

const NEXT_STEP: Record<string, { status: string; label: string } | undefined> = {
  paid: { status: "confirmed", label: "Confirm order" },
  confirmed: { status: "shipped", label: "Mark shipped / ready" },
  shipped: { status: "delivered", label: "Mark delivered" },
};

export function SellerOrdersPage() {
  const orders = useList<SellerOrder[]>("seller-orders-page", "/seller/orders");
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  async function advance(order: SellerOrder, subId: string, status: string) {
    setBusy(subId);
    try {
      await api.patch(`/seller/orders/${order._id}/suborders/${subId}`, { status });
      await client.invalidateQueries({ queryKey: ["seller-orders-page"] });
    } finally {
      setBusy("");
    }
  }
  return (
    <div>
      <PageHeader title="Orders" description="Paid orders that include your devices. Move each one through confirm, ship and deliver." />
      {orders.isLoading ? <div className="skeleton h-40 rounded-3xl" /> : null}
      {orders.isSuccess && !orders.data.length ? <Empty title="No orders yet" body="Paid orders appear here once a buyer checks out." /> : null}
      <div className="space-y-3">
        {(orders.data || []).map((order) => (
          <Card key={order._id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-[18px] font-bold">{order.number}</p>
                <p className="text-[13px] text-muted">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {titleCase(order.fulfillment || "pickup")}</p>
              </div>
              <Badge tone={order.status === "pending_payment" ? "amber" : order.status === "cancelled" ? "red" : "blue"}>{titleCase(order.status)}</Badge>
            </div>
            {order.subOrders.map((sub) => {
              const next = NEXT_STEP[sub.status];
              return (
                <div key={sub._id} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas p-4">
                  <div className="text-[14px]">
                    {sub.items.map((item, index) => <p key={index} className="font-semibold">{item.title} <span className="font-normal text-muted">· {money(item.pricePaise)}</span></p>)}
                    <p className="mt-1 text-[12px] text-muted">Status: {titleCase(sub.status)}</p>
                  </div>
                  {next ? (
                    <button type="button" disabled={busy === sub._id} onClick={() => void advance(order, sub._id, next.status)} className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow disabled:opacity-60">
                      {busy === sub._id ? <Loader2 size={14} className="animate-spin" /> : null} {next.label}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}
