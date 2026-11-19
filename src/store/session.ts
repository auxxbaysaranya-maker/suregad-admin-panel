import { create } from "zustand";
import { api } from "../lib/api";
import { firebaseReady, firebaseSignOut } from "../lib/firebase";
import { closeSocket } from "../lib/socket";

export interface SessionProfile {
  id: string;
  displayName: string;
  email?: string;
  roles: string[];
  locale?: string;
  seller?: { slug?: string; displayName?: string; verified?: boolean } | null;
  businesses?: { _id: string; name: string; slug: string; verificationStatus: string }[];
  partner?: { _id: string; verificationStatus: string; name: string } | null;
  subscription?: { status?: string; planId?: string } | null;
}

type AuthMode = "firebase" | "panel";

interface SessionState {
  token: string | null;
  profile: SessionProfile | null;
  ready: boolean;
  /** Development panel login: an API token. */
  setToken: (token: string) => Promise<void>;
  /** Firebase sign-in: exchange the ID token for (or create) the SureGad account. */
  startFirebaseSession: (idToken: string) => Promise<SessionProfile>;
  refresh: () => Promise<void>;
  setProfile: (profile: SessionProfile) => void;
  logout: () => Promise<void>;
}

function remember(token: string, mode: AuthMode) {
  localStorage.setItem("sg_token", token);
  localStorage.setItem("sg_auth", mode);
}

function forget() {
  localStorage.removeItem("sg_token");
  localStorage.removeItem("sg_auth");
}

export const useSession = create<SessionState>((set, get) => ({
  token: localStorage.getItem("sg_token"),
  profile: null,
  ready: false,
  setToken: async (token) => {
    remember(token, "panel");
    set({ token });
    const profile = (await api.get("/auth/me")).data.data as SessionProfile;
    set({ profile, ready: true });
  },
  startFirebaseSession: async (idToken) => {
    remember(idToken, "firebase");
    set({ token: idToken });
    const profile = (await api.post("/auth/session", { token: idToken })).data.data as SessionProfile;
    set({ profile, ready: true });
    return profile;
  },
  refresh: async () => {
    if (localStorage.getItem("sg_auth") === "firebase") {
      const user = await firebaseReady();
      if (!user) {
        forget();
        set({ token: null, profile: null, ready: true });
        return;
      }
    }
    if (!get().token && !localStorage.getItem("sg_token")) {
      set({ ready: true, profile: null });
      return;
    }
    try {
      const profile = (await api.get("/auth/me")).data.data as SessionProfile;
      set({ profile, ready: true, token: localStorage.getItem("sg_token") });
    } catch {
      forget();
      set({ token: null, profile: null, ready: true });
    }
  },
  setProfile: (profile) => set({ profile }),
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* already signed out */
    }
    await firebaseSignOut().catch(() => undefined);
    closeSocket();
    forget();
    set({ token: null, profile: null });
  },
}));
