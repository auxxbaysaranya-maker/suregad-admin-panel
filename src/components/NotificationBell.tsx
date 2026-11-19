import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, X } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { cn } from "../lib/utils";
import { timeAgo } from "./kit";
import type { PanelKey } from "../lib/panels";

interface Note {
  _id?: string;
  id?: string;
  event: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  readAt?: string | null;
  createdAt: string;
}

/** Where a notification should take the user, per panel. */
function targetFor(note: Note, panel: PanelKey): string | null {
  const data = note.data || {};
  if (panel === "partner") {
    if (data.conversationId) return `/partner/messages/${data.conversationId}`;
    if (data.requestId) return `/partner/jobs/${data.requestId}`;
    if (data.ticketId) return `/partner/support/${data.ticketId}`;
    return null;
  }
  if (panel === "admin") {
    if (data.businessId) return `/admin/showrooms/${data.businessId}`;
    if (data.ticketId) return `/admin/support/${data.ticketId}`;
    if (note.event.startsWith("feature")) return "/admin/featured";
    return null;
  }
  if (data.conversationId) return `/seller/messages/${data.conversationId}`;
  if (data.returnId) return "/seller/returns";
  if (data.orderId) return `/seller/orders?open=${data.orderId}`;
  if (data.ticketId) return `/seller/support/${data.ticketId}`;
  if (data.unitId) return "/seller/returns?tab=warranty";
  if (data.productId) return `/seller/products/${data.productId}`;
  if (data.requestId) return "/seller/inspections";
  if (note.event.startsWith("showroom")) return "/seller/business-profile";
  if (note.event.startsWith("subscription")) return "/seller/subscription";
  return null;
}

export function NotificationBell({ panel, tone = "dark" }: { panel: PanelKey; tone?: "dark" | "light" }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Note | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const count = useQuery({ queryKey: ["notifications-unread"], queryFn: async () => (await api.get("/me/notifications/unread-count")).data.data.count as number, refetchInterval: 60_000 });
  const list = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get("/me/notifications")).data.data as Note[], enabled: open });

  useEffect(() => {
    let active = true;
    let cleanup = () => undefined as void;
    void getSocket().then((socket) => {
      if (!socket || !active) return;
      const onNote = (note: Note) => {
        void client.invalidateQueries({ queryKey: ["notifications-unread"] });
        void client.invalidateQueries({ queryKey: ["notifications"] });
        setToast(note);
      };
      socket.on("notification", onNote);
      cleanup = () => {
        socket.off("notification", onNote);
      };
    });
    return () => {
      active = false;
      cleanup();
    };
  }, [client]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function openNote(note: Note) {
    const id = note._id || note.id;
    if (id && !note.readAt) await api.post(`/me/notifications/${id}/read`).catch(() => undefined);
    void client.invalidateQueries({ queryKey: ["notifications-unread"] });
    void client.invalidateQueries({ queryKey: ["notifications"] });
    setOpen(false);
    setToast(null);
    const target = targetFor(note, panel);
    if (target) navigate(target);
  }

  async function readAll() {
    await api.post("/me/notifications/read-all");
    void client.invalidateQueries({ queryKey: ["notifications-unread"] });
    void client.invalidateQueries({ queryKey: ["notifications"] });
  }

  const unread = count.data || 0;
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className={cn("relative grid h-10 w-10 place-items-center rounded-full transition", tone === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-ink ring-1 ring-line hover:ring-brand-300")}
      >
        <Bell size={18} />
        {unread ? <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-3xl bg-white text-ink shadow-lift ring-1 ring-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-[16px] font-bold">Notifications</p>
            <button type="button" onClick={() => void readAll()} disabled={!unread} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 disabled:text-muted"><CheckCheck size={14} /> Mark all read</button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {list.isLoading ? <p className="p-5 text-[13px] text-muted">Loading…</p> : null}
            {!list.isLoading && !list.data?.length ? <p className="p-6 text-center text-[13px] text-muted">You're all caught up.</p> : null}
            {list.data?.map((note) => (
              <button key={note._id || note.id} type="button" onClick={() => void openNote(note)} className={cn("flex w-full gap-3 border-b border-line/70 px-4 py-3 text-left transition last:border-0 hover:bg-canvas", !note.readAt && "bg-brand-50/60")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", note.readAt ? "bg-transparent" : "bg-brand-500")} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{note.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{note.body}</span>
                  <span className="mt-1 block text-[11px] text-muted">{timeAgo(note.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {toast ? (
        <div role="status" className="fixed right-4 bottom-4 z-[70] flex w-[min(92vw,360px)] items-start gap-3 rounded-3xl bg-ink p-4 text-white shadow-lift">
          <button type="button" onClick={() => void openNote(toast)} className="min-w-0 flex-1 text-left">
            <span className="block text-[14px] font-semibold">{toast.title}</span>
            <span className="mt-0.5 line-clamp-2 block text-[13px] text-white/70">{toast.body}</span>
          </button>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10"><X size={14} /></button>
        </div>
      ) : null}
    </div>
  );
}
