import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useSession } from "../store/session";
import { panel, panelsFor, type PanelKey } from "../lib/panels";
import { marketplaceUrl } from "../lib/config";
import { cn } from "../lib/utils";
import { Mark } from "./brand";
import { NotificationBell } from "./NotificationBell";

function Sidebar({ current, onNavigate, locked }: { current: PanelKey; onNavigate?: () => void; locked?: boolean }) {
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
        <div className="mx-3 mb-3 rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10">
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

      <nav className="scrollbar-none min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 pb-3" aria-label={`${info.label} navigation`}>
        {locked ? <p className="mx-1 mb-2 rounded-xl bg-white/5 px-3 py-2 text-[12px] text-white/60">Tools unlock once SureGad approves your account.</p> : null}
        {info.links.map((link) => (
          <div key={link.to}>
            {link.group ? <p className="px-3.5 pt-4 pb-1 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">{link.group}</p> : null}
            <NavLink
              to={link.to}
              end={link.end}
              onClick={onNavigate}
              aria-disabled={(locked && !link.to.endsWith("/support")) || undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition",
                  isActive ? "bg-brand-gradient text-white shadow-glow" : "text-white/70 hover:bg-white/10 hover:text-white",
                  locked && !link.to.endsWith("/support") && "pointer-events-none opacity-40",
                )
              }
            >
              <link.icon size={17} className="shrink-0" /> {link.label}
            </NavLink>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <a href={marketplaceUrl()} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-3.5 py-2 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
          Open marketplace <ExternalLink size={14} />
        </a>
        <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-2.5 ring-1 ring-white/10">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{profile?.displayName}</p>
            {profile?.email ? <p className="truncate text-[11px] text-white/50">{profile.email}</p> : null}
          </div>
          <button type="button" onClick={() => void logout().then(() => navigate("/login"))} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white hover:text-ink">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** True at the lg breakpoint, where the sidebar layout (and its bell) is shown. */
function useDesktop() {
  const query = "(min-width: 1024px)";
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}

/** Layout for every panel page: fixed sidebar on desktop, slide-in drawer on phones. */
export function PanelShell({ current, children, locked }: { current: PanelKey; children: ReactNode; locked?: boolean }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const info = panel(current);
  const desktop = useDesktop();
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen bg-ink lg:block">
        <Sidebar current={current} locked={locked} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white lg:hidden">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white"><Mark className="h-6 w-6" /></span>
          <span className="truncate font-display text-[16px] font-bold">{info.label} panel</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell panel={current} live={!desktop} />
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[84%] max-w-[300px] bg-ink shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute top-5 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white">
              <X size={18} />
            </button>
            <Sidebar current={current} locked={locked} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mb-4 hidden justify-end lg:flex">
          <NotificationBell panel={current} tone="light" live={desktop} />
        </div>
        {children}
      </main>
    </div>
  );
}

/** Page title row used across panels, with an optional back link. */
export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: string }) {
  const navigate = useNavigate();
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(back))} className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
            <ArrowLeft size={15} /> Back
          </button>
        ) : null}
        <h1 className="text-[clamp(24px,3vw,32px)]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[14px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
