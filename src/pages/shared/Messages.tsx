import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCheck, ClipboardCheck, ImagePlus, Loader2, MessageCircle, Send, Tag } from "lucide-react";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { uploadFile } from "../../lib/upload";
import { cn, money } from "../../lib/utils";
import { useSession } from "../../store/session";
import { Btn, Empty, ErrorBox, Pill, SearchBox, StatusPill, Tabs, timeAgo, useAction } from "../../components/kit";

interface Offer { id: string; amountPaise: number; listPricePaise: number; status: string; createdBy: string }
interface ConversationRow {
  id: string;
  kind: "listing" | "inspection";
  role: "buying" | "selling" | "inspection";
  product: { id: string; title: string; image: string | null; pricePaise: number } | null;
  other: { id: string; name: string; online: boolean; lastSeenAt: string | null };
  lastPreview: string;
  lastMessageAt: string;
  lastFromMe: boolean;
  unread: number;
  offer: Offer | null;
}
interface Message { id: string; conversationId: string; senderId: string; kind: string; body: string; imageUrl: string | null; orderId: string | null; offer: Offer | null; readBy: string[]; createdAt: string }
interface ConversationDetail { id: string; kind: string; role: string; product: ConversationRow["product"]; other: ConversationRow["other"]; inspection: { id: string; number: string; status: string; mode: string; appointmentAt: string | null } | null; blockedByOther: boolean; blockedByMe: boolean }

/** Inbox + thread for sellers (buyer and partner chats) and partners (seller chats). Live over Socket.IO. */
export function MessagesPage({ basePath }: { basePath: string }) {
  const { id } = useParams();
  const [box, setBox] = useState("all");
  const [q, setQ] = useState("");
  const client = useQueryClient();
  const list = useQuery({ queryKey: ["chat-conversations"], queryFn: async () => (await api.get("/chat/conversations")).data.data as ConversationRow[] });

  useEffect(() => {
    let off = () => undefined as void;
    void getSocket().then((socket) => {
      if (!socket) return;
      const refresh = () => void client.invalidateQueries({ queryKey: ["chat-conversations"] });
      socket.on("chat:message", refresh);
      socket.on("chat:conversation", refresh);
      socket.on("chat:read", refresh);
      off = () => {
        socket.off("chat:message", refresh);
        socket.off("chat:conversation", refresh);
        socket.off("chat:read", refresh);
      };
    });
    return () => off();
  }, [client]);

  const rows = useMemo(() => (list.data || []).filter((row) => (box === "all" || (box === "unread" ? row.unread > 0 : row.role === box)) && (!q || `${row.other.name} ${row.product?.title || ""}`.toLowerCase().includes(q.toLowerCase()))), [list.data, box, q]);
  const count = (role: string) => (list.data || []).filter((row) => row.role === role).length;

  return (
    <div className="-mx-4 -my-6 grid h-[calc(100dvh-64px)] bg-white sm:-mx-6 lg:-mx-10 lg:-my-8 lg:h-[calc(100dvh-72px)] lg:grid-cols-[360px_minmax(0,1fr)] lg:rounded-tl-[28px] lg:ring-1 lg:ring-line">
      <aside className={cn("flex min-h-0 flex-col border-r border-line", id && "hidden lg:flex")}>
        <div className="space-y-3 border-b border-line p-4">
          <h1 className="text-[24px]">Messages</h1>
          <SearchBox value={q} onChange={setQ} placeholder="Search people or devices" />
          <Tabs value={box} onChange={setBox} items={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }, ...(count("selling") ? [{ value: "selling", label: "Buyers", count: count("selling") }] : []), ...(count("inspection") ? [{ value: "inspection", label: "Inspections", count: count("inspection") }] : [])]} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ErrorBox error={list.error} />
          {list.isLoading ? <p className="p-5 text-[14px] text-muted">Loading…</p> : !rows.length ? <div className="p-4"><Empty icon={MessageCircle} title="No conversations" body="Buyer and inspection chats appear here." /></div> : rows.map((row) => (
            <Link key={row.id} to={`${basePath}/messages/${row.id}`} className={cn("flex gap-3 border-b border-line/70 px-4 py-3 transition hover:bg-canvas", row.id === id && "bg-brand-50")}>
              <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 text-brand-500">
                {row.product?.image ? <img src={row.product.image} alt="" className="h-full w-full object-cover" /> : row.kind === "inspection" ? <ClipboardCheck size={20} /> : <MessageCircle size={20} />}
                {row.other.online ? <span className="absolute right-0.5 bottom-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-white" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="truncate font-semibold">{row.other.name}</span>{row.kind === "inspection" ? <Pill tone="violet">Inspection</Pill> : null}<span className="ml-auto shrink-0 text-[11px] text-muted">{timeAgo(row.lastMessageAt)}</span></span>
                <span className="block truncate text-[12px] text-muted">{row.product?.title}</span>
                <span className="flex items-center gap-2"><span className={cn("truncate text-[13px]", row.unread ? "font-semibold text-ink" : "text-muted")}>{row.lastFromMe ? "You: " : ""}{row.lastPreview || "No messages yet"}</span>{row.unread ? <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">{row.unread}</span> : null}</span>
              </span>
            </Link>
          ))}
        </div>
      </aside>
      <section className={cn("min-h-0", !id && "hidden lg:block")}>
        {id ? <Thread key={id} id={id} basePath={basePath} /> : <div className="grid h-full place-items-center p-8"><Empty icon={MessageCircle} title="Choose a conversation" body="Reply to buyers quickly — fast replies sell more devices." /></div>}
      </section>
    </div>
  );
}

function Thread({ id, basePath }: { id: string; basePath: string }) {
  const me = useSession((state) => state.profile?.id) || "";
  const navigate = useNavigate();
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ["chat-conversation", id], queryFn: async () => (await api.get(`/chat/conversations/${id}`)).data.data as ConversationDetail });
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const action = useAction(["chat-conversations", "chat-conversation"]);

  useEffect(() => {
    let active = true;
    void api.get(`/chat/conversations/${id}/messages`).then((response) => {
      if (!active) return;
      setMessages(response.data.data as Message[]);
      setLoaded(true);
      void api.post(`/chat/conversations/${id}/read`).then(() => client.invalidateQueries({ queryKey: ["chat-conversations"] }));
    }).catch((reason) => setError(reason));
    let off = () => undefined as void;
    void getSocket().then((socket) => {
      if (!socket || !active) return;
      const onMessage = (payload: { conversationId: string; message: Message }) => {
        if (payload.conversationId !== id) return;
        setMessages((current) => (current.some((row) => row.id === payload.message.id) ? current : [...current, payload.message]));
        if (payload.message.senderId !== me) void api.post(`/chat/conversations/${id}/read`);
      };
      const onRead = (payload: { conversationId: string; readerId: string }) => {
        if (payload.conversationId !== id) return;
        setMessages((current) => current.map((row) => (row.readBy.includes(payload.readerId) ? row : { ...row, readBy: [...row.readBy, payload.readerId] })));
      };
      const onTyping = (payload: { conversationId: string; userId: string; typing: boolean }) => {
        if (payload.conversationId === id && payload.userId !== me) setTyping(payload.typing);
      };
      socket.on("chat:message", onMessage);
      socket.on("chat:read", onRead);
      socket.on("chat:typing", onTyping);
      off = () => {
        socket.off("chat:message", onMessage);
        socket.off("chat:read", onRead);
        socket.off("chat:typing", onTyping);
      };
    });
    return () => {
      active = false;
      off();
    };
  }, [id, me, client]);

  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [messages.length, typing]);

  function signalTyping() {
    void getSocket().then((socket) => socket?.emit("chat:typing", { conversationId: id, typing: true }));
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => void getSocket().then((socket) => socket?.emit("chat:typing", { conversationId: id, typing: false })), 2500);
  }

  async function send(body: { body?: string; imageKey?: string }) {
    setSending(true);
    setError(null);
    try {
      const message = (await api.post(`/chat/conversations/${id}/messages`, body)).data.data as Message;
      setMessages((current) => (current.some((row) => row.id === message.id) ? current : [...current, message]));
      setText("");
      void getSocket().then((socket) => socket?.emit("chat:typing", { conversationId: id, typing: false }));
    } catch (reason) {
      setError(reason);
    } finally {
      setSending(false);
    }
  }

  const info = detail.data;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" onClick={() => navigate(`${basePath}/messages`)} aria-label="Back to inbox" className="grid h-10 w-10 place-items-center rounded-full hover:bg-canvas lg:hidden"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{info?.other.name || "…"}</p>
          <p className="truncate text-[12px] text-muted">{typing ? "typing…" : info?.other.online ? "Online" : info?.other.lastSeenAt ? `Last seen ${timeAgo(info.other.lastSeenAt)}` : ""}</p>
        </div>
        {info?.inspection ? <Pill tone="violet">{info.inspection.number} · {info.inspection.mode === "online" ? "Online" : "Physical"}</Pill> : null}
      </header>
      {info?.product ? (
        <div className="flex items-center gap-3 border-b border-line bg-canvas px-4 py-2.5 text-[13px]">
          {info.product.image ? <img src={info.product.image} alt="" className="h-10 w-10 rounded-xl object-cover" /> : null}
          <span className="min-w-0 flex-1 truncate font-semibold">{info.product.title}</span>
          <span className="font-semibold">{money(info.product.pricePaise)}</span>
          {info.inspection ? <StatusPill status={info.inspection.status} /> : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-canvas/60 px-4 py-4">
        {!loaded ? <p className="text-center text-[13px] text-muted">Loading messages…</p> : null}
        {messages.map((message) => {
          const mine = message.senderId === me;
          if (message.kind === "system") return <p key={message.id} className="mx-auto max-w-md rounded-2xl bg-white px-3 py-2 text-center text-[12px] text-muted ring-1 ring-line">{message.body}</p>;
          const seen = mine && message.readBy.some((reader) => reader !== me);
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-[20px] px-3.5 py-2 text-[14px] shadow-sm", mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white ring-1 ring-line")}>
                {message.imageUrl ? <a href={message.imageUrl} target="_blank" rel="noreferrer"><img src={message.imageUrl} alt="Shared" className="mb-1 max-h-64 rounded-xl" /></a> : null}
                {message.offer ? (
                  <div className={cn("mb-1 rounded-xl p-2.5", mine ? "bg-white/15" : "bg-brand-50")}>
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold"><Tag size={13} /> Offer</p>
                    <p className="font-display text-[20px] font-bold">{money(message.offer.amountPaise)}</p>
                    <p className="text-[12px] opacity-80">Listed at {money(message.offer.listPricePaise)} · {message.offer.status}</p>
                    {message.offer.status === "pending" && message.offer.createdBy !== me ? (
                      <div className="mt-2 flex gap-2">
                        <Btn size="sm" busy={action.busy === `a${message.offer.id}`} onClick={() => void action.run(`a${message.offer!.id}`, () => api.post(`/chat/offers/${message.offer!.id}/respond`, { action: "accept" })).then(() => void api.get(`/chat/conversations/${id}/messages`).then((response) => setMessages(response.data.data)))}>Accept</Btn>
                        <Btn size="sm" variant="secondary" busy={action.busy === `r${message.offer.id}`} onClick={() => void action.run(`r${message.offer!.id}`, () => api.post(`/chat/offers/${message.offer!.id}/respond`, { action: "reject" })).then(() => void api.get(`/chat/conversations/${id}/messages`).then((response) => setMessages(response.data.data)))}>Decline</Btn>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {message.kind !== "offer" && !(message.imageUrl && message.body === "Photo") ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", mine ? "text-white/70" : "text-muted")}>
                  {new Date(message.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  {mine ? (seen ? <CheckCheck size={12} aria-label="Read" /> : <Check size={12} aria-label="Sent" />) : null}
                </p>
              </div>
            </div>
          );
        })}
        {typing ? <p className="text-[12px] text-muted">{info?.other.name} is typing…</p> : null}
        <div ref={bottom} />
      </div>
      <div className="border-t border-line bg-white p-3">
        <ErrorBox error={error || action.error} />
        {info?.blockedByOther || info?.blockedByMe ? <p className="p-2 text-center text-[13px] text-muted">This conversation is blocked.</p> : (
          <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); if (text.trim()) void send({ body: text.trim() }); }}>
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
              const picked = event.target.files?.[0];
              if (!picked) return;
              setSending(true);
              void uploadFile(picked, "chat_image").then(({ key }) => send({ imageKey: key, body: text.trim() || undefined })).catch((reason) => { setError(reason); setSending(false); });
              event.target.value = "";
            }} />
            <button type="button" onClick={() => file.current?.click()} aria-label="Attach photo" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-canvas text-muted ring-1 ring-line hover:text-brand-600"><ImagePlus size={18} /></button>
            <textarea
              value={text}
              rows={1}
              onChange={(event) => { setText(event.target.value); signalTyping(); }}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (text.trim()) void send({ body: text.trim() }); } }}
              placeholder="Write a message"
              aria-label="Message"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] bg-canvas px-4 py-2.5 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button type="submit" disabled={sending || !text.trim()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-glow disabled:opacity-50">{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
          </form>
        )}
      </div>
    </div>
  );
}
