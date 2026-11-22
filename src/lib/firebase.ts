import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";

/**
 * Public Firebase web config. When it is missing the panel falls back to the API's
 * development panel login (only enabled on development deployments).
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export function firebaseConfigured() {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function firebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured()) return null;
  if (!app) app = initializeApp(config);
  return app;
}

export function firebaseAuth(): Auth | null {
  const firebase = firebaseApp();
  if (!firebase) return null;
  if (!auth) {
    auth = getAuth(firebase);
    void setPersistence(auth, browserLocalPersistence);
  }
  return auth;
}

function requireAuth() {
  const client = firebaseAuth();
  if (!client) throw new Error("Sign-in is not available right now. Please try again later.");
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
  const user = firebaseAuth()?.currentUser;
  return user ? user.getIdToken() : null;
}

/** Links in Firebase emails come back to this panel's sign-in page. */
function continueUrl(path = "login") {
  return new URL(`${import.meta.env.BASE_URL}${path}`, window.location.origin).toString();
}

/** At least 8 characters with a letter and a number. Returns a message, or null when it's fine. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use letters and at least one number.";
  if (/^(.)\1+$/.test(password) || /^(password|12345678|qwerty)/i.test(password)) return "That password is too easy to guess.";
  return null;
}

export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

export async function emailSignIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  return credential.user;
}

export async function emailSignUp(email: string, password: string, name?: string) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  if (name) await updateProfile(credential.user, { displayName: name }).catch(() => undefined);
  await sendEmailVerification(credential.user, { url: continueUrl("seller/onboarding") }).catch(() => undefined);
  return credential.user;
}

export async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(requireAuth(), provider);
  return credential.user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(requireAuth(), email.trim(), { url: continueUrl("login") });
}

export async function resendVerification() {
  const user = requireAuth().currentUser;
  if (!user) throw new Error("Sign in again to resend the email.");
  await sendEmailVerification(user, { url: continueUrl("seller/onboarding") });
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

/** Friendlier wording for the Firebase errors people actually hit; never reveals whether an email is registered. */
export function firebaseMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists. Sign in instead, or reset your password.",
    "auth/weak-password": "Choose a stronger password (at least 8 characters with letters and a number).",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/user-disabled": "This account has been disabled. Contact SureGad support.",
    "auth/popup-closed-by-user": "The Google window was closed before you finished signing in.",
    "auth/cancelled-popup-request": "The Google window was closed before you finished signing in.",
    "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    "auth/account-exists-with-different-credential": "This email already has an account with another sign-in method. Sign in with email and password.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/operation-not-allowed": "This sign-in method isn't enabled yet.",
  };
  if (map[code]) return map[code];
  return error instanceof Error ? error.message.replace(/^Firebase: /, "").replace(/\s*\(auth\/[^)]+\)\.?$/, "") : "Something went wrong. Try again.";
}
