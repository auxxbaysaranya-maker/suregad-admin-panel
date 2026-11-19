import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useSession } from "../store/session";
import { panel, panelsFor, type PanelKey } from "../lib/panels";
import { marketplaceUrl } from "../lib/config";
import { cn } from "../lib/utils";
import { Mark } from "./brand";

function Sidebar({ current, onNavigate }: { current: PanelKey; onNavigate?: () => void }) {
  const profile = useSession((state) => state.profile);
  const logout = useSession((state) => state.logout);
  const navigate = useNavigate();
  const info = panel(current);
  const others = panelsFor(profile?.roles).filter((entry) => entry.key !== current);
  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pt-6 pb-5">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white"><Mark className="h-8 w-8" /></span>
        <span>
          <span className="block font-display text-[17px] font-bold text-white">SureGad Hub</span>
          <span className="flex items-center gap-1.5 text-[12px] text-brand-200"><info.icon size={13} /> {info.label} panel</span>
        </span>
      </Link>

      {others.length ? (
        <div className="mx-3 mb-4 rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10">
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">Switch panel</p>
          <div className="grid gap-1">
            {[info, ...others].map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => {
                  onNavigate?.();
                  navigate(entry.path);
                }}
                className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition", entry.key === current ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white")}
              >
                <entry.icon size={15} /> {entry.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="space-y-1 px-3" aria-label={`${info.label} navigation`}>
        {info.links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) => cn("block rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition", isActive ? "bg-brand-gradient text-white shadow-glow" : "text-white/70 hover:bg-white/10 hover:text-white")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-2 p-3">
        <a href={marketplaceUrl()} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
          Open marketplace <ExternalLink size={14} />
        </a>
        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <p className="truncate text-[13px] font-semibold text-white">{profile?.displayName}</p>
          {profile?.email ? <p className="truncate text-[12px] text-white/50">{profile.email}</p> : null}
          <button
            type="button"
            onClick={() => void logout().then(() => navigate("/login"))}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-[13px] font-semibold text-white transition hover:bg-white hover:text-ink"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/** Layout for every panel page: fixed sidebar on desktop, slide-in drawer on phones. */
export function PanelShell({ current, children }: { current: PanelKey; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const info = panel(current);
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen bg-ink lg:block">
        <Sidebar current={current} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white lg:hidden">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white"><Mark className="h-6 w-6" /></span>
          <span className="font-display text-[16px] font-bold">{info.label} panel</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
          <Menu size={20} />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[84%] max-w-[300px] bg-ink shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute top-5 right-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white">
              <X size={18} />
            </button>
            <Sidebar current={current} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}

/** Page title row used across panels. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[clamp(26px,3vw,34px)]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[14px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
