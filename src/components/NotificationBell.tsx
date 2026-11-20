import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { cn } from "../lib/utils";
import { timeAgo } from "./kit";
import { toast } from "./Toaster";
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

/**
 * Bell with unread count and a dropdown list (a full-width sheet on phones).
 * `live` makes this instance listen for real-time notifications and show them as toasts;
 * only one bell on the page should be live so each notification appears once.
 */
export function NotificationBell({ panel, tone = "dark", live = false }: { panel: PanelKey; tone?: "dark" | "light"; live?: boolean }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const count = useQuery({ queryKey: ["notifications-unread"], queryFn: async () => (await api.get("/me/notifications/unread-count")).data.data.count as number, refetchInterval: 60_000 });
  const list = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get("/me/notifications")).data.data as Note[], enabled: open });

  async function openNote(note: Note) {
    const id = note._id || note.id;
    if (id && !note.readAt) await api.post(`/me/notifications/${id}/read`).catch(() => undefined);
    void client.invalidateQueries({ queryKey: ["notifications-unread"] });
    void client.invalidateQueries({ queryKey: ["notifications"] });
    setOpen(false);
    const target = targetFor(note, panel);
    if (target) navigate(target);
  }
  const openRef = useRef(openNote);
  openRef.current = openNote;

  useEffect(() => {
    if (!live) return;
    let active = true;
    let cleanup = () => undefined as void;
    void getSocket().then((socket) => {
      if (!socket || !active) return;
      const onNote = (note: Note) => {
        void client.invalidateQueries({ queryKey: ["notifications-unread"] });
        void client.invalidateQueries({ queryKey: ["notifications"] });
        const id = note._id || note.id;
        toast({
          id: id ? `note-${id}` : undefined,
          tone: "info",
          icon: <BellRing size={20} />,
          title: note.title,
          description: note.body,
          duration: 7000,
          actions: targetFor(note, panel) ? [{ label: "Open", primary: true, onClick: () => { if (id) toast.dismiss(`note-${id}`); void openRef.current(note); } }] : undefined,
        });
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
  }, [client, live, panel]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function readAll() {
    await api.post("/me/notifications/read-all");
    void client.invalidateQueries({ queryKey: ["notifications-unread"] });
    void client.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications marked as read");
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
        <>
          {/* Dim the page on phones so the sheet reads as a layer. */}
          <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/30 sm:hidden" />
          <div
            role="dialog"
            aria-label="Notifications"
            className="fixed inset-x-3 top-[68px] z-50 flex max-h-[calc(100dvh-84px)] flex-col overflow-hidden rounded-3xl bg-white text-ink shadow-lift ring-1 ring-line sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:max-h-[70vh] sm:w-[380px]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="font-display text-[16px] font-bold">Notifications</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => void readAll()} disabled={!unread} className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold text-brand-700 hover:bg-brand-50 disabled:text-muted disabled:hover:bg-transparent"><CheckCheck size={14} /> Mark all read</button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-canvas sm:hidden"><X size={16} /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {list.isLoading ? <p className="p-5 text-[13px] text-muted">Loading…</p> : null}
              {!list.isLoading && !list.data?.length ? <p className="p-6 text-center text-[13px] text-muted">You're all caught up.</p> : null}
              {list.data?.map((note) => (
                <button key={note._id || note.id} type="button" onClick={() => void openNote(note)} className={cn("flex w-full gap-3 border-b border-line/70 px-4 py-3 text-left transition last:border-0 hover:bg-canvas", !note.readAt && "bg-brand-50/60")}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", note.readAt ? "bg-transparent" : "bg-brand-500")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold break-words">{note.title}</span>
                    <span className="mt-0.5 line-clamp-3 block text-[13px] break-words text-muted">{note.body}</span>
                    <span className="mt-1 block text-[11px] text-muted">{timeAgo(note.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
