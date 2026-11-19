import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Briefcase, Check, Eye, EyeOff, Loader2, ShieldCheck, Store } from "lucide-react";
import { api } from "../../lib/api";
import { marketplaceUrl } from "../../lib/config";
import { panelsFor } from "../../lib/panels";
import { cn } from "../../lib/utils";
import { useSession } from "../../store/session";
import { Logo } from "../../components/brand";

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative isolate hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-white/20 blur-[110px]" />
          <div className="absolute -right-24 -bottom-32 h-[28rem] w-[28rem] rounded-full bg-orchid/50 blur-[120px]" />
          <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(70%_70%_at_50%_40%,#000,transparent)]" />
        </div>
        <a href={marketplaceUrl()} className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold ring-1 ring-white/25 backdrop-blur hover:bg-white/25">
          <ArrowLeft size={15} /> Back to marketplace
        </a>
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-white/70 uppercase">SureGad Hub</p>
          <h1 className="mt-3 max-w-md text-[44px] leading-[1.05] font-extrabold">One place for sellers, partners and the SureGad team.</h1>
          <ul className="mt-8 space-y-3 text-[15px] text-white/85">
            {[
              [Store, "Sellers list devices, manage orders and their storefront"],
              [Briefcase, "Inspection partners take jobs and file reports"],
              [ShieldCheck, "Admins review listings and approve accounts"],
            ].map(([Icon, text]) => {
              const IconComponent = Icon as typeof Store;
              return (
                <li key={text as string} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20"><IconComponent size={17} /></span>
                  {text as string}
                </li>
              );
            })}
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

function TextField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5 text-[13px] font-semibold text-ink">
      {label}
      <input {...props} className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
    </label>
  );
}

function PasswordField({ value, onChange, autoComplete }: { value: string; onChange: (value: string) => void; autoComplete: string }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="block space-y-1.5 text-[13px] font-semibold text-ink">
      Password
      <span className="relative block">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={6}
          autoComplete={autoComplete}
          className="w-full rounded-2xl bg-white py-3 pr-12 pl-4 text-[15px] font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400"
        />
        <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-ink">
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

/** Single sign-in for every panel; the account's roles decide which panel opens. */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, ready, setToken } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    (location.state as { noAccess?: boolean } | null)?.noAccess ? "This account has no seller, partner or admin access." : "",
  );
  useEffect(() => {
    if (ready && profile && panelsFor(profile.roles).length) navigate("/", { replace: true });
  }, [ready, profile, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = (await api.post("/auth/panel-login", { email, password })).data.data.token as string;
      await setToken(token);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[30px]">Sign in</h2>
      <p className="mt-1.5 text-[14px] text-muted">Sellers, inspection partners and admins sign in here. We'll open the right panel for your account.</p>
      <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-4">
        <TextField label="Email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-danger ring-1 ring-red-100">{error}</p> : null}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3.5 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60">
          {busy ? <Loader2 size={17} className="animate-spin" /> : null} Sign in
        </button>
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

const ROLES = {
  seller: {
    panel: "showroom",
    title: "Seller",
    icon: Store,
    nameLabel: "Showroom or seller name",
    blurb: "List devices, handle orders and run your storefront page.",
    after: "Your showroom is reviewed by our team before listings go live.",
  },
  partner: {
    panel: "partner",
    title: "Inspection partner",
    icon: Briefcase,
    nameLabel: "Full name",
    blurb: "Inspect devices near you for buyers and earn per job.",
    after: "Jobs are offered once our team approves your partner profile.",
  },
} as const;

/** Sign-up for sellers and inspection partners. There is no admin sign-up. */
export function SignupPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const role: keyof typeof ROLES = params.get("as") === "partner" ? "partner" : "seller";
  const setToken = useSession((state) => state.setToken);
  const [form, setForm] = useState({ name: "", email: "", password: "", city: "Kochi", district: "Ernakulam" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const info = ROLES[role];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = (await api.post("/auth/panel-signup", { panel: info.panel, ...form })).data.data.token as string;
      await setToken(token);
      navigate(role === "partner" ? "/partner" : "/seller", { replace: true });
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
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
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setParams({ as: key }, { replace: true })}
              className={cn("relative rounded-3xl p-4 text-left ring-2 transition", active ? "bg-brand-50 ring-brand-500" : "bg-white ring-line hover:ring-brand-200")}
            >
              {active ? <span className="absolute top-3 right-3 grid h-5 w-5 place-items-center rounded-full bg-brand-gradient text-white"><Check size={12} strokeWidth={3} /></span> : null}
              <entry.icon size={20} className="text-brand-600" />
              <span className="mt-2 block text-[15px] font-semibold">{entry.title}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-muted">{entry.blurb}</span>
            </button>
          );
        })}
      </div>
      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
        <TextField label={info.nameLabel} required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextField label="Email" type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <PasswordField value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete="new-password" />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="City" required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <TextField label="District" required value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })} />
        </div>
        <p className="text-[12px] text-muted">{info.after}</p>
        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-danger ring-1 ring-red-100">{error}</p> : null}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3.5 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60">
          {busy ? <Loader2 size={17} className="animate-spin" /> : null} Create {role === "partner" ? "partner" : "seller"} account
        </button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">
        Already have an account? <Link to="/login" className="font-semibold text-brand-700">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
