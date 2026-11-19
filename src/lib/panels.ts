import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  ClipboardCheck,
  CreditCard,
  Crown,
  HeadphonesIcon,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MessageCircle,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Undo2,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { api } from "./api";

export type PanelKey = "admin" | "seller" | "partner";

export interface PanelLink {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Optional group heading shown above the link. */
  group?: string;
}

export interface PanelInfo {
  key: PanelKey;
  role: string;
  label: string;
  path: string;
  icon: LucideIcon;
  links: PanelLink[];
}

/** One panel per role. Order decides where a user with several roles lands first. */
export const PANELS: PanelInfo[] = [
  {
    key: "admin",
    role: "super_admin",
    label: "Super admin",
    path: "/admin",
    icon: BadgeCheck,
    links: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin/showrooms", label: "Showrooms", icon: Building2, group: "Review" },
      { to: "/admin/listings", label: "Listing review", icon: ListChecks },
      { to: "/admin/people", label: "Partners & people", icon: Users },
      { to: "/admin/featured", label: "Featured requests", icon: Sparkles },
      { to: "/admin/support", label: "Support desk", icon: HeadphonesIcon, group: "Operate" },
      { to: "/admin/configure", label: "Configure", icon: Settings },
    ],
  },
  {
    key: "seller",
    role: "business_seller",
    label: "Showroom",
    path: "/seller/dashboard",
    icon: Store,
    links: [
      { to: "/seller/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/seller/products", label: "Products", icon: Package, group: "Catalogue" },
      { to: "/seller/inventory", label: "Inventory", icon: Boxes },
      { to: "/seller/promotions", label: "Promotions", icon: Sparkles },
      { to: "/seller/orders", label: "Orders", icon: ShoppingBag, group: "Sales" },
      { to: "/seller/delivery", label: "Delivery", icon: Truck },
      { to: "/seller/returns", label: "Returns & warranty", icon: Undo2 },
      { to: "/seller/customers", label: "Customers", icon: Users },
      { to: "/seller/messages", label: "Messages", icon: MessageCircle },
      { to: "/seller/reviews", label: "Reviews", icon: Star },
      { to: "/seller/inspections", label: "Inspections", icon: ClipboardCheck, group: "Trust" },
      { to: "/seller/service-partners", label: "Service partners", icon: Wrench },
      { to: "/seller/payments", label: "Payments", icon: Wallet, group: "Business" },
      { to: "/seller/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/seller/subscription", label: "Subscription", icon: Crown },
      { to: "/seller/business-profile", label: "Business profile", icon: Building2 },
      { to: "/seller/settings", label: "Settings", icon: Settings },
      { to: "/seller/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    key: "partner",
    role: "service_partner",
    label: "Partner",
    path: "/partner",
    icon: Briefcase,
    links: [
      { to: "/partner", label: "Jobs", icon: ClipboardCheck, end: true },
      { to: "/partner/messages", label: "Messages", icon: MessageCircle },
      { to: "/partner/earnings", label: "Earnings", icon: CreditCard },
      { to: "/partner/support", label: "Support", icon: LifeBuoy },
    ],
  },
];

export function panelsFor(roles: string[] = []): PanelInfo[] {
  return PANELS.filter((panel) => roles.includes(panel.role));
}

export function panel(key: PanelKey): PanelInfo {
  return PANELS.find((entry) => entry.key === key)!;
}

/** Shorthand for a GET that returns `data`. */
export function useList<T>(key: string, url: string) {
  return useQuery({ queryKey: [key], queryFn: async () => (await api.get(url)).data.data as T });
}
