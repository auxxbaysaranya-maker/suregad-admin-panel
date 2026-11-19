/**
 * Deployment settings, read at build time.
 *
 * VITE_BASE_PATH       — where this panel is served from ("/" locally, "/suregad-admin-panel/" on GitHub Pages).
 * VITE_API_URL         — origin of the SureGad API, e.g. https://suregad-backend.onrender.com. Empty = same origin (dev proxy).
 * VITE_MARKETPLACE_URL — the buyer marketplace, for "View on marketplace" and chat links.
 */
export const BASE_PATH = import.meta.env.BASE_URL;
export const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
export const API_BASE = `${API_ORIGIN}/api/v1`;

const defaultMarketplace = import.meta.env.DEV ? "http://localhost:5173/" : "https://auxxbaysaranya-maker.github.io/suregad-frontend/";
export const MARKETPLACE_URL = (import.meta.env.VITE_MARKETPLACE_URL || defaultMarketplace).replace(/\/?$/, "/");

/** Path to a file in /public, respecting the base path. */
export function assetUrl(path: string): string {
  return `${BASE_PATH}${path.replace(/^\/+/, "")}`;
}

/** Absolute link into the buyer marketplace, e.g. marketplaceUrl("product/demo-1"). */
export function marketplaceUrl(path = ""): string {
  return `${MARKETPLACE_URL}${path.replace(/^\/+/, "")}`;
}
