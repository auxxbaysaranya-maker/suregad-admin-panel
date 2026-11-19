import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

/**
 * Firebase web config. When these are not set the panel falls back to the API's
 * email/password panel login (development deployments only).
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function firebaseConfigured() {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function firebaseAuth(): Auth | null {
  if (!firebaseConfigured()) return null;
  if (!app) app = initializeApp(config);
  if (!auth) auth = getAuth(app);
  return auth;
}

function requireAuth() {
  const client = firebaseAuth();
  if (!client) throw new Error("Firebase sign-in is not configured for this deployment.");
  return client;
}

/** Wait for Firebase to restore the persisted session after a page load. */
export function firebaseReady(): Promise<User | null> {
  const client = firebaseAuth();
  if (!client) return Promise.resolve(null);
  return client.authStateReady().then(() => client.currentUser);
}

/** A fresh ID token (Firebase refreshes it when it is close to expiry). */
export async function currentIdToken(): Promise<string | null> {
  const client = firebaseAuth();
  const user = client?.currentUser;
  return user ? user.getIdToken() : null;
}

export async function emailSignIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email, password);
  return credential.user;
}

export async function emailSignUp(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email, password);
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function googleSignIn() {
  const credential = await signInWithPopup(requireAuth(), new GoogleAuthProvider());
  return credential.user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(requireAuth(), email);
}

export async function resendVerification() {
  const user = requireAuth().currentUser;
  if (!user) throw new Error("Sign in again to resend the email.");
  await sendEmailVerification(user);
}

/** Reloads the Firebase user and returns whether the email is now verified (forces a fresh token). */
export async function refreshVerification(): Promise<boolean> {
  const user = requireAuth().currentUser;
  if (!user) return false;
  await reload(user);
  await user.getIdToken(true);
  return user.emailVerified;
}

export function firebaseEmailVerified(): boolean | null {
  const user = firebaseAuth()?.currentUser;
  return user ? user.emailVerified : null;
}

export async function firebaseSignOut() {
  const client = firebaseAuth();
  if (client) await signOut(client);
}

/** Friendlier wording for the Firebase errors people actually hit. */
export function firebaseMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "No account uses that email.",
    "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
    "auth/weak-password": "Use at least 6 characters for the password.",
    "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
    "auth/popup-closed-by-user": "The Google window was closed before signing in.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] || (error instanceof Error ? error.message : "Something went wrong. Try again.");
}
