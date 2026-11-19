import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, Store, type LucideIcon } from "lucide-react";
import { api } from "./api";

export type PanelKey = "admin" | "seller" | "partner";

export interface PanelInfo {
  key: PanelKey;
  role: string;
  label: string;
  path: string;
  icon: LucideIcon;
  links: { to: string; label: string; end?: boolean }[];
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
      { to: "/admin", label: "Overview", end: true },
      { to: "/admin/listings", label: "Listing review" },
      { to: "/admin/people", label: "Approvals" },
      { to: "/admin/configure", label: "Configure" },
    ],
  },
  {
    key: "seller",
    role: "business_seller",
    label: "Seller",
    path: "/seller",
    icon: Store,
    links: [
      { to: "/seller", label: "Dashboard", end: true },
      { to: "/seller/listings/new", label: "Add listing" },
      { to: "/seller/orders", label: "Orders" },
      { to: "/seller/storefront", label: "Storefront" },
    ],
  },
  {
    key: "partner",
    role: "service_partner",
    label: "Partner",
    path: "/partner",
    icon: Briefcase,
    links: [
      { to: "/partner", label: "Jobs", end: true },
      { to: "/partner/earnings", label: "Earnings" },
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
