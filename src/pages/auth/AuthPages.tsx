import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Briefcase, Check, Eye, EyeOff, Loader2, Mail, ShieldCheck, Store } from "lucide-react";
import { api } from "../../lib/api";
import { marketplaceUrl } from "../../lib/config";
import { panelsFor } from "../../lib/panels";
import { cn } from "../../lib/utils";
import { useSession, type SessionProfile } from "../../store/session";
import { Logo } from "../../components/brand";
import { toast } from "../../components/Toaster";
import { emailSignIn, emailSignUp, firebaseConfigured, firebaseMessage, firebaseSignOut, googleSignIn, passwordProblem, passwordStrength, resetPassword } from "../../lib/firebase";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative isolate hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-white/20 blur-[110px]" />
          <div className="absolute -right-24 -bottom-32 h-[28rem] w-[28rem] rounded-full bg-orchid/50 blur-[120px]" />
        </div>
        <a href={marketplaceUrl()} className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold ring-1 ring-white/25 backdrop-blur hover:bg-white/25">
          <ArrowLeft size={15} /> Back to marketplace
        </a>
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-white/70 uppercase">SureGad Hub</p>
          <h1 className="mt-3 max-w-md text-[44px] leading-[1.05] font-extrabold text-white">One place for sellers, partners and the SureGad team.</h1>
          <ul className="mt-8 space-y-3 text-[15px] text-white/85">
            {([
              [Store, "Showrooms list devices, manage orders and their store page"],
              [Briefcase, "Inspection partners take jobs and file reports"],
              [ShieldCheck, "Admins review listings and approve accounts"],
            ] as const).map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20"><Icon size={17} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-white/60">You only see the panels your account has access to.</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Logo className="h-9" />
            <a href={marketplaceUrl()} className="text-[13px] font-semibold text-muted hover:text-ink lg:hidden">Marketplace</a>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function TextField({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5 text-[13px] font-semibold text-ink">
      {label}
      <input {...props} aria-invalid={Boolean(error) || undefined} className={cn("w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400", error && "ring-red-300")} />
      {error ? <span className="block text-[12px] font-normal text-danger">{error}</span> : null}
    </label>
  );
}

function PasswordField({ label = "Password", value, onChange, autoComplete, error, meter }: { label?: string; value: string; onChange: (value: string) => void; autoComplete: string; error?: string; meter?: boolean }) {
  const [shown, setShown] = useState(false);
  const strength = passwordStrength(value);
  return (
    <label className="block space-y-1.5 text-[13px] font-semibold text-ink">
      {label}
      <span className="relative block">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error) || undefined}
          className={cn("w-full rounded-2xl bg-white py-3 pr-12 pl-4 text-[15px] font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400", error && "ring-red-300")}
        />
        <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-ink">
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {meter && value ? (
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < strength ? (strength <= 1 ? "bg-danger" : strength === 2 ? "bg-warning" : "bg-success") : "bg-line")} />)}
        </span>
      ) : null}
      {error ? <span className="block text-[12px] font-normal text-danger">{error}</span> : null}
    </label>
  );
}

function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3.5 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60">
      {busy ? <Loader2 size={17} className="animate-spin" /> : null} {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function GoogleButton({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="flex w-full items-center justify-center gap-2.5 rounded-full bg-white py-3.5 text-[15px] font-semibold text-ink ring-1 ring-line transition hover:ring-brand-300 disabled:opacity-60">
      {busy ? <Loader2 size={17} className="animate-spin" /> : <GoogleIcon />} {label}
    </button>
  );
}

function Divider() {
  return <div className="my-5 flex items-center gap-3 text-[12px] text-muted"><span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" /><span className="sr-only">continue with email</span></div>;
}

function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-danger ring-1 ring-red-100">{children}</p> : null;
}

function serverMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

const cancelled = (error: unknown) => ["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes((error as { code?: string }).code || "");

/* ---------------- sign in ---------------- */

/** Single sign-in for every panel; the account's roles decide which panel opens. */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, ready, setToken, startFirebaseSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"" | "email" | "google">("");
  const [error, setError] = useState((location.state as { noAccess?: boolean } | null)?.noAccess ? "This account has no seller, partner or admin access." : "");
  useEffect(() => {
    if (ready && profile && panelsFor(profile.roles).length) navigate("/", { replace: true });
  }, [ready, profile, navigate]);

  async function enter(signedIn: SessionProfile) {
    if (!panelsFor(signedIn.roles).length) {
      // A marketplace-only account: don't leave it half signed in here.
      await useSession.getState().logout();
      setError("This account has no seller, partner or admin access. Sign up as a seller or partner below, or use the marketplace.");
      return;
    }
    toast.success(`Welcome, ${signedIn.displayName.split(" ")[0]}`);
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== "/login" ? from : "/", { replace: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!EMAIL.test(email.trim())) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setBusy("email");
    try {
      if (firebaseConfigured()) {
        const user = await emailSignIn(email, password);
        await enter(await startFirebaseSession(await user.getIdToken()));
      } else {
        const token = (await api.post("/auth/panel-login", { email, password })).data.data.token as string;
        await setToken(token);
        await enter(useSession.getState().profile!);
      }
    } catch (reason) {
      setError((reason as { code?: string }).code?.startsWith("auth/") ? firebaseMessage(reason) : serverMessage(reason));
      if (firebaseConfigured()) await firebaseSignOut().catch(() => undefined);
    } finally {
      setBusy("");
    }
  }

  async function google() {
    setError("");
    setBusy("google");
    try {
      const user = await googleSignIn();
      await enter(await startFirebaseSession(await user.getIdToken()));
    } catch (reason) {
      if (!cancelled(reason)) setError((reason as { code?: string }).code?.startsWith("auth/") ? firebaseMessage(reason) : serverMessage(reason));
    } finally {
      setBusy("");
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[30px]">Sign in</h2>
      <p className="mt-1.5 text-[14px] text-muted">Sellers, inspection partners and admins sign in here. We'll open the right panel for your account.</p>
      {firebaseConfigured() ? (
        <div className="mt-7">
          <GoogleButton label="Continue with Google" onClick={() => void google()} busy={busy === "google"} />
          <Divider />
        </div>
      ) : null}
      <form onSubmit={(event) => void submit(event)} className={cn("space-y-4", !firebaseConfigured() && "mt-7")} noValidate>
        <TextField label="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        {firebaseConfigured() ? <div className="-mt-1 text-right"><Link to="/forgot-password" state={{ email }} className="text-[13px] font-semibold text-brand-700">Forgot password?</Link></div> : null}
        <ErrorText>{error}</ErrorText>
        <Submit busy={busy === "email"}>Sign in</Submit>
      </form>
      <div className="mt-8 rounded-3xl bg-white p-5 ring-1 ring-line">
        <p className="text-[14px] font-semibold">New to SureGad Hub?</p>
        <p className="mt-0.5 text-[13px] text-muted">Create a seller or partner account. Admin accounts are created by the SureGad team.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/signup?as=seller" className="flex items-center justify-center gap-2 rounded-full bg-canvas py-2.5 text-[13px] font-semibold ring-1 ring-line hover:ring-brand-300"><Store size={15} /> Seller sign up</Link>
          <Link to="/signup?as=partner" className="flex items-center justify-center gap-2 rounded-full bg-canvas py-2.5 text-[13px] font-semibold ring-1 ring-line hover:ring-brand-300"><Briefcase size={15} /> Partner sign up</Link>
        </div>
      </div>
    </AuthLayout>
  );
}

/* ---------------- forgot password ---------------- */

export function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState(((location.state as { email?: string } | null)?.email || "").trim());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!EMAIL.test(email.trim())) return setError("Enter a valid email address.");
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (reason) {
      // Never reveal whether an account exists.
      if ((reason as { code?: string }).code === "auth/user-not-found") setSent(true);
      else setError(firebaseMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft size={15} /> Back to sign in</Link>
      <h2 className="mt-4 text-[30px]">Reset your password</h2>
      <p className="mt-1.5 text-[14px] text-muted">We'll email you a secure link to choose a new password.</p>
      {sent ? (
        <div className="mt-7 rounded-3xl bg-white p-6 text-center ring-1 ring-line">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Mail size={26} /></span>
          <p className="mt-4 text-[15px]">If an account exists for <strong className="break-all">{email.trim()}</strong>, a reset link is on its way.</p>
          <p className="mt-1 text-[13px] text-muted">It expires in about an hour. Check spam if it doesn't arrive.</p>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-4" noValidate>
          <TextField label="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <ErrorText>{error}</ErrorText>
          <Submit busy={busy}>Send reset link</Submit>
        </form>
      )}
    </AuthLayout>
  );
}

/* ---------------- sign up (sellers and partners only) ---------------- */

const ROLES = {
  seller: {
    panel: "showroom",
    title: "Showroom seller",
    icon: Store,
    nameLabel: "Showroom or business name",
    blurb: "List devices, handle orders and run your store page.",
    after: "Next you'll complete your showroom application. SureGad reviews it before you can sell.",
    home: "/seller/onboarding",
  },
  partner: {
    panel: "partner",
    title: "Inspection partner",
    icon: Briefcase,
    nameLabel: "Full name",
    blurb: "Inspect devices near you for buyers and earn per job.",
    after: "SureGad verifies every partner before jobs are offered.",
    home: "/partner",
  },
} as const;

/** Sign-up for sellers and inspection partners. There is no admin sign-up. */
export function SignupPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const role: keyof typeof ROLES = params.get("as") === "partner" ? "partner" : "seller";
  const { setToken, startFirebaseSession } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", city: "Kochi", district: "Ernakulam" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"" | "email" | "google">("");
  const info = ROLES[role];

  /** Adds the seller/partner role to the signed-in account; the server never grants admin. */
  async function enrol(name: string) {
    const profile = (await api.post("/auth/panel-enroll", { panel: info.panel, name })).data.data as SessionProfile;
    useSession.getState().setProfile(profile);
    toast.success("Account created", info.after);
    navigate(info.home, { replace: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Enter a name.";
    if (!EMAIL.test(form.email.trim())) next.email = "Enter a valid email address.";
    const weak = firebaseConfigured() ? passwordProblem(form.password) : form.password.length < 6 ? "Use at least 6 characters." : null;
    if (weak) next.password = weak;
    if (form.confirm !== form.password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy("email");
    try {
      if (firebaseConfigured()) {
        const user = await emailSignUp(form.email, form.password, form.name.trim());
        await startFirebaseSession(await user.getIdToken(true), form.name.trim());
        await enrol(form.name.trim());
      } else {
        const token = (await api.post("/auth/panel-signup", { panel: info.panel, name: form.name, email: form.email, password: form.password, city: form.city, district: form.district })).data.data.token as string;
        await setToken(token);
        navigate(info.home, { replace: true });
      }
    } catch (reason) {
      setErrors({ form: (reason as { code?: string }).code?.startsWith("auth/") ? firebaseMessage(reason) : serverMessage(reason) });
    } finally {
      setBusy("");
    }
  }

  async function google() {
    setErrors({});
    setBusy("google");
    try {
      const user = await googleSignIn();
      const profile = await startFirebaseSession(await user.getIdToken(), user.displayName || undefined);
      await enrol(form.name.trim() || profile.displayName);
    } catch (reason) {
      if (!cancelled(reason)) setErrors({ form: (reason as { code?: string }).code?.startsWith("auth/") ? firebaseMessage(reason) : serverMessage(reason) });
    } finally {
      setBusy("");
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[30px]">Create an account</h2>
      <p className="mt-1.5 text-[14px] text-muted">Choose how you'll work with SureGad.</p>
      <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
        {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((key) => {
          const entry = ROLES[key];
          const active = key === role;
          return (
            <button key={key} type="button" role="radio" aria-checked={active} onClick={() => setParams({ as: key }, { replace: true })} className={cn("relative rounded-3xl p-4 text-left ring-2 transition", active ? "bg-brand-50 ring-brand-500" : "bg-white ring-line hover:ring-brand-200")}>
              {active ? <span className="absolute top-3 right-3 grid h-5 w-5 place-items-center rounded-full bg-brand-gradient text-white"><Check size={12} strokeWidth={3} /></span> : null}
              <entry.icon size={20} className="text-brand-600" />
              <span className="mt-2 block text-[15px] font-semibold">{entry.title}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-muted">{entry.blurb}</span>
            </button>
          );
        })}
      </div>
      {firebaseConfigured() ? (
        <div className="mt-6">
          <GoogleButton label={`Sign up with Google as a ${role === "partner" ? "partner" : "seller"}`} onClick={() => void google()} busy={busy === "google"} />
          <Divider />
        </div>
      ) : null}
      <form onSubmit={(event) => void submit(event)} className={cn("space-y-4", !firebaseConfigured() && "mt-6")} noValidate>
        <TextField label={info.nameLabel} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={errors.name} />
        <TextField label="Email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} error={errors.email} />
        <PasswordField value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete="new-password" error={errors.password} meter={firebaseConfigured()} />
        <PasswordField label="Confirm password" value={form.confirm} onChange={(confirm) => setForm({ ...form, confirm })} autoComplete="new-password" error={errors.confirm} />
        {!firebaseConfigured() ? (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            <TextField label="District" value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })} />
          </div>
        ) : null}
        <p className="text-[12px] text-muted">{info.after}</p>
        <ErrorText>{errors.form}</ErrorText>
        <Submit busy={busy === "email"}>Create {role === "partner" ? "partner" : "seller"} account</Submit>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">Already have an account? <Link to="/login" className="font-semibold text-brand-700">Sign in</Link></p>
    </AuthLayout>
  );
}
