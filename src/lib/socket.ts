import { io, type Socket } from "socket.io-client";
import { API_ORIGIN } from "./config";
import { authToken } from "./api";

let socket: Socket | null = null;
let connecting: Promise<Socket | null> | null = null;

/** One shared, authenticated Socket.IO connection (chat, typing, presence, notifications). */
export function getSocket(): Promise<Socket | null> {
  if (socket) return Promise.resolve(socket);
  if (connecting) return connecting;
  connecting = (async () => {
    const token = await authToken();
    if (!token) return null;
    socket = io(API_ORIGIN || undefined, {
      path: "/socket.io",
      // Fetch a fresh token on every (re)connect so Firebase tokens never go stale.
      auth: (callback) => {
        void authToken().then((fresh) => callback({ token: fresh || token }));
      },
      transports: ["websocket", "polling"],
      reconnectionDelayMax: 8000,
    });
    return socket;
  })().finally(() => {
    connecting = null;
  });
  return connecting;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
