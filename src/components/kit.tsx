import * as Dialog from "@radix-ui/react-dialog";
import { Children, cloneElement, isValidElement, useState, type ButtonHTMLAttributes, type ReactElement, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, Search, X, type LucideIcon } from "lucide-react";
import { cn, titleCase } from "../lib/utils";
import { toast } from "./Toaster";

/* ---------------- formatting ---------------- */

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function formatDate(value?: string | Date | null) {
  return value ? dateFormat.format(new Date(value)) : "—";
}

export function formatDateTime(value?: string | Date | null) {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}

export function timeAgo(value?: string | Date | null) {
  if (!value) return "";
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

/* ---------------- status pills ---------------- */

type Tone = "slate" | "brand" | "green" | "amber" | "red" | "blue" | "violet";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-800 ring-brand-100",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
};

const STATUS_TONES: Record<string, Tone> = {
  active: "green",
  approved: "green",
  available: "green",
  delivered: "green",
  resolved: "green",
  refunded: "green",
  completed: "green",
  published: "green",
  paid: "brand",
  accepted: "brand",
  confirmed: "brand",
  processing: "brand",
  ready_for_dispatch: "violet",
  dispatched: "blue",
  shipped: "blue",
  in_transit: "blue",
  picked_up: "blue",
  out_for_delivery: "blue",
  requested: "amber",
  submitted: "amber",
  pending: "amber",
  pending_review: "amber",
  under_review: "violet",
  info_required: "amber",
  open: "amber",
  waiting_on_user: "violet",
  scheduled: "violet",
  reserved: "violet",
  under_inspection: "violet",
  repair: "amber",
  in_repair: "amber",
  pickup_scheduled: "violet",
  received: "blue",
  refund_requested: "violet",
  preparing: "brand",
  ready_for_pickup: "violet",
  draft: "slate",
  unlisted: "slate",
  archived: "slate",
  ended: "slate",
  closed: "slate",
  cancelled: "slate",
  sold: "blue",
  returned: "amber",
  rejected: "red",
  failed: "red",
  damaged: "red",
  suspended: "red",
  revoked: "red",
  escalated: "red",
  urgent: "red",
  high: "amber",
  normal: "slate",
  low: "slate",
};

export function Pill({ children, tone = "slate", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ring-1", TONES[tone], className)}>{children}</span>;
}

export function StatusPill({ status, label }: { status?: string | null; label?: string }) {
  if (!status) return null;
  const key = status.toLowerCase();
  return <Pill tone={STATUS_TONES[key] || "slate"}>{label || titleCase(key)}</Pill>;
}

/* ---------------- layout pieces ---------------- */

export function Panel({ title, description, actions, children, className, bodyClassName }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-[24px] bg-white ring-1 ring-line", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="font-display text-[17px] font-bold">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = "brand", onClick }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: "brand" | "green" | "amber" | "red" | "violet"; onClick?: () => void }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-600",
  }[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={cn("flex min-w-0 flex-col items-start gap-2.5 rounded-[22px] bg-white p-3.5 text-left ring-1 ring-line sm:flex-row sm:items-center sm:gap-4 sm:p-4", onClick && "transition hover:ring-brand-300")}>
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl sm:h-12 sm:w-12", tones)}><Icon size={20} /></span>
      <span className="min-w-0 max-w-full">
        <span className="block truncate font-display text-[clamp(18px,5vw,24px)] leading-none font-bold">{value}</span>
        <span className="mt-1 block text-[13px] text-muted">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12px] text-muted">{hint}</span> : null}
      </span>
    </Tag>
  );
}

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (value: T) => void; items: { value: T; label: string; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cn("-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1", className)}>
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition", value === item.value ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-line hover:ring-brand-300")}
        >
          {item.label}
          {item.count !== undefined ? <span className={cn("rounded-full px-1.5 text-[11px]", value === item.value ? "bg-white/20" : "bg-canvas")}>{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={cn("relative block min-w-[200px] flex-1", className)}>
      <span className="sr-only">{placeholder}</span>
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-full bg-white py-2.5 pr-4 pl-10 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
    </label>
  );
}

export function Empty({ title, body, icon: Icon = Inbox, action }: { title: string; body?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-dashed border-brand-200 bg-white px-6 py-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500"><Icon size={26} /></span>
      <h3 className="mt-4 text-[18px]">{title}</h3>
      {body ? <p className="mx-auto mt-1.5 max-w-md text-[14px] text-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-white ring-1 ring-line" />)}
    </div>
  );
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-red-200">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">{errorMessage(error)}</span>
      {retry ? <button type="button" onClick={retry} className="font-semibold underline">Retry</button> : null}
    </div>
  );
}

export function Notice({ tone = "brand", icon: Icon, children, action }: { tone?: "brand" | "amber" | "red" | "green"; icon?: LucideIcon; children: ReactNode; action?: ReactNode }) {
  const tones = { brand: "bg-brand-50 text-brand-900 ring-brand-100", amber: "bg-amber-50 text-amber-900 ring-amber-200", red: "bg-red-50 text-red-800 ring-red-200", green: "bg-emerald-50 text-emerald-900 ring-emerald-200" }[tone];
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-[14px] ring-1", tones)}>
      {Icon ? <Icon size={18} className="shrink-0" /> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

/* ---------------- buttons & forms ---------------- */

export function Btn({ variant = "primary", size = "md", busy, icon: Icon, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "dark"; size?: "sm" | "md"; busy?: boolean; icon?: LucideIcon }) {
  const variants = {
    primary: "bg-brand-gradient text-white shadow-glow hover:brightness-110",
    secondary: "bg-white text-ink ring-1 ring-line hover:ring-brand-300",
    ghost: "text-ink-soft hover:bg-white hover:ring-1 hover:ring-line",
    danger: "bg-white text-danger ring-1 ring-red-200 hover:bg-red-50",
    dark: "bg-ink text-white hover:bg-ink-soft",
  }[variant];
  const sizes = size === "sm" ? "h-9 px-3.5 text-[13px]" : "h-11 px-5 text-[14px]";
  return (
    <button type="button" {...props} disabled={props.disabled || busy} className={cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50", variants, sizes, className)}>
      {busy ? <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" /> : Icon ? <Icon size={size === "sm" ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

const control = "w-full rounded-2xl bg-white px-4 py-2.5 text-[14px] ring-1 ring-line outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-400 disabled:bg-canvas disabled:text-muted";

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {error ? <span className="block text-[12px] text-danger">{error}</span> : hint ? <span className="block text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(control, "appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10", props.className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235d5b78' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", ...props.style }}>
      {children}
    </select>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "min-h-24 py-3", props.className)} />;
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-canvas p-4 ring-1 ring-line", disabled && "cursor-not-allowed opacity-60")}>
      <span>
        <span className="block text-[14px] font-semibold">{label}</span>
        {hint ? <span className="mt-0.5 block text-[13px] text-muted">{hint}</span> : null}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function Chips<T extends string>({ options, value, onChange, labels }: { options: readonly T[]; value: T[]; onChange: (value: T[]) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value.includes(option);
        return (
          <button key={option} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((item) => item !== option) : [...value, option])} className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 transition", on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-ink-soft ring-line hover:ring-brand-300")}>
            {labels?.[option] || titleCase(option)}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- tables ---------------- */

/**
 * Data table. On phones each row becomes a card: the first cell is the card title and the
 * other cells are shown as "label — value" pairs using the column headings.
 */
export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  const labels = head.map((cell) => (typeof cell === "string" ? cell : ""));
  const rows = Children.map(children, (row) => {
    if (!isValidElement<{ children?: ReactNode }>(row)) return row;
    let index = 0;
    const cells = Children.map(row.props.children, (cell) => {
      if (!isValidElement(cell)) return cell;
      const label = labels[index++] || "";
      return cloneElement(cell as ReactElement<Record<string, unknown>>, { "data-label": label });
    });
    return cloneElement(row, {}, cells);
  });
  return (
    <div className={cn("sg-table rounded-[22px] sm:overflow-x-auto sm:bg-white sm:ring-1 sm:ring-line", className)}>
      <table className="w-full text-left text-[14px] sm:min-w-[640px]">
        <thead className="hidden bg-canvas text-[12px] tracking-wide text-muted uppercase sm:table-header-group">
          <tr>{head.map((cell, index) => <th key={index} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{cell}</th>)}</tr>
        </thead>
        <tbody className="block space-y-2.5 sm:table-row-group sm:space-y-0 sm:divide-y sm:divide-line">{rows}</tbody>
      </table>
    </div>
  );
}

export function Pager({ page, hasMore, onChange, total }: { page: number; hasMore: boolean; onChange: (page: number) => void; total?: number }) {
  if (page === 1 && !hasMore) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-muted">
      <span>{total !== undefined ? `${total} total` : null}</span>
      <div className="flex items-center gap-2">
        <Btn size="sm" variant="secondary" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Btn>
        <span className="font-semibold text-ink">Page {page}</span>
        <Btn size="sm" variant="secondary" disabled={!hasMore} onClick={() => onChange(page + 1)}>Next <ChevronRight size={14} /></Btn>
      </div>
    </div>
  );
}

/* ---------------- side drawer ---------------- */

export function Drawer({ open, onOpenChange, title, description, children, footer, wide }: { open: boolean; onOpenChange: (open: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_0.2s_ease]" />
        <Dialog.Content className={cn("fixed inset-y-0 right-0 z-[61] flex w-full flex-col bg-canvas shadow-2xl outline-none data-[state=open]:animate-[fade-in_0.2s_ease]", wide ? "max-w-3xl" : "max-w-xl")}>
          <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-[20px] font-bold">{title}</Dialog.Title>
              <Dialog.Description className={description ? "mt-0.5 text-[13px] text-muted" : "sr-only"}>{description || (typeof title === "string" ? title : "Details")}</Dialog.Description>
            </div>
            <Dialog.Close className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas ring-1 ring-line hover:bg-ink hover:text-white" aria-label="Close"><X size={18} /></Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer ? <div className="border-t border-line bg-white px-5 py-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------------- mutations ---------------- */

/**
 * Run an API call with busy/error state and refresh the given queries afterwards.
 * Every button that changes data goes through this, so failures are always shown.
 */
const SUCCESS: Record<string, string | null> = {
  save: "Changes saved",
  create: "Created",
  publish: "Listing updated",
  archive: "Archived",
  dup: "Duplicate created",
  import: "Import finished",
  add: "Units added",
  status: "Status updated",
  assign: "Listing updated",
  delete: "Removed",
  details: "Delivery details saved",
  otp: "Handover confirmed",
  proof: "Handover confirmed",
  photo: "Photo attached",
  doc: "Document uploaded",
  reply: "Reply sent",
  report: "Reported to SureGad",
  send: "Request sent",
  change: "Sent for verification",
  close: "Ticket closed",
  resolve: "Marked resolved",
  mine: "Assigned to you",
  csv: "Download ready",
  mv: "Download ready",
  export: "Download ready",
  sales: "Download ready",
  "chg-yes": "Change approved",
  "chg-no": "Change declined",
  start_review: "Review started",
  approve: "Showroom approved",
  request_info: "Information requested",
  reject: "Rejected",
  suspend: "Suspended",
  restore: "Restored",
  revoke: "Access revoked",
  accepted: "Order accepted",
  rejected: "Updated",
  processing: "Packing started",
  ready_for_dispatch: "Ready for dispatch",
  dispatched: "Marked dispatched",
  cancelled: "Order cancelled",
  approved: "Return approved",
  pickup_scheduled: "Pickup scheduled",
  received: "Return received",
  refund_requested: "Refund requested",
  unpublish: "Listings hidden",
  price: "Prices updated",
  threshold: "Alert level updated",
  ids: null,
};

/** Toast text for a finished action, or null for read-only actions (opening a file, revealing an IMEI). */
function successMessage(key: string): string | null {
  if (key in SUCCESS) return SUCCESS[key]!;
  if (/^(open|pref-)/.test(key)) return key.startsWith("pref-") ? "Preference saved" : null;
  if (/-pay$/.test(key)) return "Payment verified";
  if (/^ok/.test(key)) return "Document verified";
  if (/^no/.test(key)) return "Document rejected";
  if (/^a[a-f0-9]{24}$/.test(key)) return "Offer accepted";
  if (/^r[a-f0-9]{24}$/.test(key)) return "Offer declined";
  if (/^y[a-f0-9]{24}$/.test(key)) return "Approved";
  if (/^n[a-f0-9]{24}$/.test(key)) return "Declined";
  if (/^[A-Z_]+$/.test(key)) return "Delivery updated";
  if (key.startsWith("{")) return "Settings saved";
  return "Updated";
}

/**
 * Run an API call with busy/error state and refresh the given queries afterwards.
 * Every button that changes data goes through this, so results and failures are always shown (inline and as a toast).
 */
export function useAction(invalidate: string[] = [], options: { toast?: boolean } = {}) {
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  async function run<T>(key: string, task: () => Promise<T>, message?: string | null): Promise<T | undefined> {
    setBusy(key);
    setError(null);
    try {
      const result = await task();
      await Promise.all(invalidate.map((queryKey) => client.invalidateQueries({ queryKey: [queryKey] })));
      const text = message === undefined ? successMessage(key) : message;
      if (text && options.toast !== false) toast.success(text);
      return result;
    } catch (reason) {
      setError(reason);
      if (options.toast !== false) toast.error("That didn't work", errorMessage(reason));
      return undefined;
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, setError, run };
}

/** Small key/value list for detail panes. */
export function Facts({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value], index) => (
        <div key={index} className="min-w-0">
          <dt className="text-[12px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
          <dd className="mt-0.5 text-[14px] break-words">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Vertical event timeline (orders, deliveries, returns, verification history). */
export function Timeline({ events }: { events: { status: string; note?: string | null; at?: string | Date }[] }) {
  if (!events.length) return <p className="text-[13px] text-muted">No updates yet.</p>;
  return (
    <ol className="relative space-y-4 border-l-2 border-brand-100 pl-5">
      {[...events].reverse().map((event, index) => (
        <li key={index} className="relative">
          <span className={cn("absolute top-1 -left-[27px] h-3 w-3 rounded-full ring-4 ring-white", index === 0 ? "bg-brand-600" : "bg-brand-200")} />
          <p className="text-[14px] font-semibold">{titleCase(event.status.toLowerCase())}</p>
          {event.note ? <p className="text-[13px] text-muted">{event.note}</p> : null}
          <p className="text-[12px] text-muted">{formatDateTime(event.at)}</p>
        </li>
      ))}
    </ol>
  );
}
