import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, ExternalLink, ImageOff, Loader2, X } from "lucide-react";
import { api } from "../../lib/api";
import { marketplaceUrl } from "../../lib/config";
import { useList } from "../../lib/panels";
import { cn, money, titleCase } from "../../lib/utils";
import { Badge, Card, Empty } from "../../components/ui";
import { PageHeader } from "../../components/PanelShell";

type Metrics = Record<string, number | { _id: string; amount: number; count: number }[]>;

export function AdminHome() {
  const metrics = useList<Metrics>("metrics", "/admin/metrics");
  const payments = Array.isArray(metrics.data?.payments) ? metrics.data.payments : [];
  const cards: [string, string][] = [
    ["users", "Active users"],
    ["listings", "Listings"],
    ["orders", "Orders"],
    ["inspections", "Inspections"],
    ["reports", "Reports filed"],
    ["openDisputes", "Open disputes"],
    ["approvedPartners", "Approved partners"],
  ];
  return (
    <div>
      <PageHeader title="Platform overview" description="Live counts from the SureGad database." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map(([key, label]) => (
          <Card key={key} className="p-5">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="mt-1 font-display text-[30px] leading-none font-bold">{metrics.isLoading ? "…" : String(metrics.data?.[key] ?? "—")}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-5">
        <p className="font-semibold">Captured payments by type</p>
        <p className="text-[13px] text-muted">Amounts in rupees, after the gateway confirmed them.</p>
        <div className="mt-4 h-64">
          {payments.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payments.map((row) => ({ name: titleCase(row._id), rupees: row.amount / 100 }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e5f4" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => money(Number(value) * 100)} />
                <Bar dataKey="rupees" fill="#3a3fe0" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-[14px] text-muted">No captured payments yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

interface ReviewListing {
  id: string;
  title: string;
  slug: string;
  status?: string;
  pricePaise: number;
  condition?: string;
  city?: string;
  sellerType?: string;
  images?: { url?: string }[];
  description?: string;
}

export function AdminListings() {
  const [status, setStatus] = useState("pending_review");
  const listings = useList<ReviewListing[]>(`admin-listings-${status}`, `/admin/listings?status=${status}`);
  const client = useQueryClient();
  const moderate = useMutation({
    mutationFn: async (input: { id: string; status: "active" | "rejected" }) =>
      api.patch(`/admin/listings/${input.id}`, { status: input.status, reason: input.status === "rejected" ? "Does not meet listing standards." : undefined }),
    onSuccess: () => client.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("admin-listings") }),
  });
  return (
    <div>
      <PageHeader title="Listing review" description="New and edited listings wait here until approved. Check every photo before approving." />
      <div className="mb-5 flex flex-wrap gap-2">
        {[["pending_review", "Waiting"], ["active", "Live"], ["rejected", "Rejected"], ["expired", "Expired"], ["sold", "Sold"]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setStatus(key!)} className={cn("rounded-full px-4 py-2 text-[13px] font-semibold ring-1 transition", status === key ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:ring-brand-200")}>
            {label}
          </button>
        ))}
      </div>
      {listings.isLoading ? <div className="skeleton h-40 rounded-3xl" /> : null}
      {listings.isSuccess && !listings.data.length ? <Empty title="Nothing here" body={status === "pending_review" ? "New seller submissions land here before buyers can see them." : "No listings with this status."} /> : null}
      <div className="space-y-3">
        {(listings.data || []).map((listing) => (
          <Card key={listing.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex gap-2 overflow-x-auto">
                {(listing.images || []).slice(0, 4).map((image, index) => (
                  <img key={index} src={image.url} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-line" />
                ))}
                {!listing.images?.length ? <span className="grid h-20 w-20 place-items-center rounded-2xl bg-canvas text-muted ring-1 ring-line"><ImageOff size={20} /></span> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{listing.title}</p>
                <p className="mt-0.5 text-[13px] text-muted">{money(listing.pricePaise)} · {titleCase(listing.condition)} · {listing.sellerType === "business" ? "Showroom" : "Individual"} · {listing.city} · {listing.images?.length || 0} photos</p>
                {listing.description ? <p className="mt-2 line-clamp-2 text-[13px] text-ink-soft">{listing.description}</p> : null}
              </div>
              <Badge tone={listing.status === "active" ? "green" : listing.status === "rejected" ? "red" : "amber"}>{titleCase(listing.status)}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!["active", "sold", "expired"].includes(listing.status || "") ? (
                <button type="button" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: listing.id, status: "active" })} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
                  {moderate.isPending && moderate.variables?.id === listing.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                </button>
              ) : null}
              {!["rejected", "sold", "expired"].includes(listing.status || "") ? (
                <button type="button" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: listing.id, status: "rejected" })} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-danger ring-1 ring-red-200 disabled:opacity-60">
                  <X size={14} /> Reject
                </button>
              ) : null}
              {listing.status === "active" ? (
                <a href={marketplaceUrl(`product/${listing.slug}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold ring-1 ring-line">
                  <ExternalLink size={14} /> View live
                </a>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminPeople() {
  const businesses = useList<{ _id: string; name: string; verificationStatus: string; email?: string; address?: { city?: string } }[]>("admin-businesses", "/admin/businesses");
  const partners = useList<{ _id: string; name: string; verificationStatus: string; email?: string; address?: { city?: string } }[]>("admin-partners", "/admin/partners");
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  async function verify(kind: "businesses" | "partners", id: string, status: "approved" | "rejected") {
    setBusy(id + status);
    try {
      await api.patch(`/admin/${kind}/${id}/verification`, { status });
      await client.invalidateQueries({ queryKey: [kind === "businesses" ? "admin-businesses" : "admin-partners"] });
    } finally {
      setBusy("");
    }
  }
  const column = (title: string, kind: "businesses" | "partners", rows: { _id: string; name: string; verificationStatus: string; email?: string; address?: { city?: string } }[] = []) => (
    <section>
      <h2 className="mb-3 text-[20px]">{title}</h2>
      {!rows.length ? <Empty title="None yet" body="New sign-ups appear here." /> : null}
      <div className="space-y-3">
        {rows.map((item) => (
          <Card key={item._id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.name}</p>
                <p className="truncate text-[13px] text-muted">{[item.email, item.address?.city].filter(Boolean).join(" · ")}</p>
              </div>
              <Badge tone={item.verificationStatus === "approved" ? "green" : item.verificationStatus === "rejected" ? "red" : "amber"}>{titleCase(item.verificationStatus)}</Badge>
            </div>
            {item.verificationStatus === "pending" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={Boolean(busy)} onClick={() => void verify(kind, item._id, "approved")} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
                  {busy === item._id + "approved" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                </button>
                <button type="button" disabled={Boolean(busy)} onClick={() => void verify(kind, item._id, "rejected")} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white py-2 text-[13px] font-semibold text-danger ring-1 ring-red-200 disabled:opacity-60">
                  <X size={14} /> Reject
                </button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
  return (
    <div>
      <PageHeader title="Approvals" description="Showrooms can publish and partners receive jobs only after approval." />
      <div className="grid gap-8 lg:grid-cols-2">
        {column("Showrooms", "businesses", businesses.data)}
        {column("Inspection partners", "partners", partners.data)}
      </div>
    </div>
  );
}
