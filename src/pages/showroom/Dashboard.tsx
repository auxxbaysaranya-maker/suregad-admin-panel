import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Boxes, ClipboardCheck, ExternalLink, IndianRupee, MessageCircle, Package, Plus, ShoppingBag, Star, Truck, Undo2 } from "lucide-react";
import { api } from "../../lib/api";
import { marketplaceUrl } from "../../lib/config";
import { money } from "../../lib/utils";
import { PageHeader } from "../../components/PanelShell";
import { Btn, ErrorBox, Loading, Panel, StatCard, StatusPill, formatDate } from "../../components/kit";

interface DashboardData {
  showroom: { name: string; code: string | null; slug: string };
  listings: Record<string, number>;
  units: Record<string, number>;
  inventoryCostPaise: number;
  orders: Record<string, number>;
  revenue30Paise: number;
  lifetimeRevenuePaise: number;
  actions: { toAccept: number; toDispatch: number; inTransit: number; returns: number; unreadMessages: number; pendingReview: number; inspections: number };
  lowStock: { id: string; title: string; available: number }[];
  rating: { average: number | null; count: number };
  daily: { date: string; revenuePaise: number; orders: number }[];
  recentOrders: { orderId: string; subOrderId: string; number: string; status: string; amountPaise: number; createdAt: string; title?: string }[];
}

export function ShowroomDashboard() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["showroom-dashboard"], queryFn: async () => (await api.get("/showroom/dashboard")).data.data as DashboardData, refetchInterval: 60_000 });
  const data = query.data;
  if (query.isLoading) return <Loading rows={6} />;
  if (!data) return <ErrorBox error={query.error} retry={() => void query.refetch()} />;
  const chart = data.daily.map((day) => ({ ...day, label: new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), rupees: day.revenuePaise / 100 }));
  const actions = [
    { label: "Orders to accept", value: data.actions.toAccept, to: "/seller/orders?status=new", icon: ShoppingBag, urgent: data.actions.toAccept > 0 },
    { label: "To pack & dispatch", value: data.actions.toDispatch, to: "/seller/orders?status=active", icon: Package },
    { label: "In transit", value: data.actions.inTransit, to: "/seller/delivery", icon: Truck },
    { label: "Open returns", value: data.actions.returns, to: "/seller/returns", icon: Undo2, urgent: data.actions.returns > 0 },
    { label: "Unread messages", value: data.actions.unreadMessages, to: "/seller/messages", icon: MessageCircle, urgent: data.actions.unreadMessages > 0 },
    { label: "Inspections running", value: data.actions.inspections, to: "/seller/inspections", icon: ClipboardCheck },
  ];
  return (
    <div>
      <PageHeader
        title={`Welcome back, ${data.showroom.name}`}
        description={data.showroom.code ? `Showroom ${data.showroom.code}` : undefined}
        actions={
          <>
            <a href={marketplaceUrl(`store/${data.showroom.slug}`)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold ring-1 ring-line hover:ring-brand-300"><ExternalLink size={16} /> Store page</a>
            <Btn icon={Plus} onClick={() => navigate("/seller/products/new")}>Add product</Btn>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={IndianRupee} label="Revenue, last 30 days" value={money(data.revenue30Paise)} hint={`${money(data.lifetimeRevenuePaise)} all time`} />
        <StatCard icon={Package} label="Live listings" value={data.listings.active || 0} hint={data.actions.pendingReview ? `${data.actions.pendingReview} waiting for review` : undefined} tone="green" onClick={() => navigate("/seller/products")} />
        <StatCard icon={Boxes} label="Units available" value={data.units.AVAILABLE || 0} hint={`${data.units.RESERVED || 0} reserved · ${data.units.SOLD || 0} sold`} tone="violet" onClick={() => navigate("/seller/inventory")} />
        <StatCard icon={Star} label="Rating" value={data.rating.average ?? "—"} hint={`${data.rating.count} review${data.rating.count === 1 ? "" : "s"}`} tone="amber" onClick={() => navigate("/seller/reviews")} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {actions.map((action) => (
          <Link key={action.label} to={action.to} className={`rounded-[20px] p-4 ring-1 transition hover:ring-brand-300 ${action.urgent ? "bg-brand-50 ring-brand-200" : "bg-white ring-line"}`}>
            <action.icon size={18} className={action.urgent ? "text-brand-600" : "text-muted"} />
            <p className="mt-2 font-display text-[24px] leading-none font-bold">{action.value}</p>
            <p className="mt-1 text-[12px] text-muted">{action.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Sales, last 14 days" description="Paid orders by day, excluding cancelled and refunded ones.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3a3fe0" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3a3fe0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8e5f4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5d5b78" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: "#5d5b78" }} tickLine={false} axisLine={false} width={64} tickFormatter={(value: number) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`} />
                <Tooltip formatter={(value) => [money(Number(value) * 100), "Revenue"]} contentStyle={{ borderRadius: 14, border: "1px solid #e8e5f4" }} />
                <Area type="monotone" dataKey="rupees" stroke="#3a3fe0" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Stock alerts" actions={<Link to="/seller/inventory" className="text-[13px] font-semibold text-brand-700">Inventory</Link>}>
          {data.lowStock.length ? (
            <ul className="space-y-2">
              {data.lowStock.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link to={`/seller/products/${item.id}`} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5 text-[14px] hover:ring-1 hover:ring-brand-200">
                    <AlertTriangle size={16} className={item.available ? "text-warning" : "text-danger"} />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="font-semibold">{item.available ? `${item.available} left` : "Out of stock"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-muted">All listings are above their low-stock level.</p>
          )}
        </Panel>
      </div>

      <Panel className="mt-5" title="Recent orders" actions={<Link to="/seller/orders" className="text-[13px] font-semibold text-brand-700">All orders</Link>} bodyClassName="p-0">
        {data.recentOrders.length ? (
          <ul className="divide-y divide-line">
            {data.recentOrders.map((order) => (
              <li key={order.subOrderId}>
                <Link to={`/seller/orders?open=${order.orderId}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-canvas">
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{order.number}</span><span className="block truncate text-[13px] text-muted">{order.title}</span></span>
                  <StatusPill status={order.status} />
                  <span className="w-24 text-right font-semibold">{money(order.amountPaise)}</span>
                  <span className="w-24 text-right text-[13px] text-muted">{formatDate(order.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-[14px] text-muted">No orders yet. Live listings with clear photos and fair prices sell faster.</p>
        )}
      </Panel>
    </div>
  );
}
