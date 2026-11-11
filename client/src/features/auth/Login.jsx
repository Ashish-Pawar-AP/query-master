import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Sparkles,
  Mail,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Layers,
  Copy,
  Check,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "./useAuth.js";
import Button from "../../components/common/Button.jsx";
import Logo from "../../components/common/Logo.jsx";

// The brand panel is deliberately a fixed dark surface in both themes (like most split-screen
// auth pages), so it uses fixed colors rather than the theme tokens that flip in light mode.
const SQL = [
  [
    ["UPDATE", "k"],
    [" Employee", ""],
  ],
  [
    ["SET", "k"],
    ["   is_active = ", ""],
    ["1", "n"],
    [",", ""],
  ],
  [
    ["       department = ", ""],
    ["'Finance'", "s"],
  ],
  [
    ["WHERE", "k"],
    [" employee_id ", ""],
    ["IN", "k"],
    [" (", ""],
    ["'E101'", "s"],
    [", ", ""],
    ["'E102'", "s"],
    [");", ""],
  ],
];
const TONE = {
  k: "font-medium text-emerald-400",
  s: "text-amber-300",
  n: "text-sky-300",
  "": "text-slate-300",
};
const FEATURES = [
  [ShieldCheck, "Role-based access"],
  [Layers, "Reusable templates"],
  [Copy, "One-click copy"],
];

function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#07090F] p-12 lg:flex lg:w-[52%]">
      <div
        className="ambient-blob animate-blob-float -left-24 -top-24 h-[28rem] w-[28rem] bg-emerald-500/[0.14]"
        aria-hidden="true"
      />
      <div
        className="ambient-blob animate-blob-float -bottom-32 right-0 h-[26rem] w-[26rem] bg-sky-500/[0.10]"
        style={{ animationDelay: "-7s" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[length:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_40%_45%,black,transparent)]"
        aria-hidden="true"
      />

      <Logo
        size={36}
        className="relative"
        textClassName="text-base text-white"
      />

      <div className="relative max-w-lg">
        <h2 className="animate-fade-in-up text-4xl font-semibold leading-tight tracking-tight text-white">
          Every query.
          <br />
          <span className="text-gradient">One source of truth.</span>
        </h2>
        <p
          className="animate-fade-in-up mt-4 max-w-md text-sm leading-relaxed text-slate-400"
          style={{ animationDelay: "120ms" }}
        >
          Stop hunting through TXT files. Pick a template, fill in a few values,
          copy the SQL.
        </p>

        <div className="relative mt-8">
          <div className="animate-float overflow-hidden rounded-xl border border-white/10 bg-[#0B0F1A]/90 shadow-2xl backdrop-blur-xs">
            <div
              className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5"
              aria-hidden="true"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[11px] text-slate-500">
                update-employee.sql
              </span>
            </div>
            <pre
              className="sql-block px-5 py-4 text-[13px] leading-6"
              aria-label="Example generated SQL"
            >
              {SQL.map((line, i) => (
                <div
                  key={i}
                  className="animate-stagger-in"
                  style={{ animationDelay: `${500 + i * 260}ms` }}
                >
                  {line.map(([text, tone], j) => (
                    <span key={j} className={TONE[tone]}>
                      {text}
                    </span>
                  ))}
                  {i === SQL.length - 1 && (
                    <span className="animate-caret ml-0.5 text-emerald-400">
                      ▍
                    </span>
                  )}
                </div>
              ))}
            </pre>
          </div>
          <span
            className="animate-stagger-in absolute -bottom-4 right-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-[#07090F] px-3 py-1.5 text-xs font-medium text-emerald-400 shadow-glow-primary-sm"
            style={{ animationDelay: "1900ms" }}
          >
            <Check size={12} /> Copied to clipboard
          </span>
        </div>
      </div>

      <div className="relative flex flex-wrap gap-2">
        {FEATURES.map(([Icon, label], i) => (
          <span
            key={label}
            className="animate-stagger-in inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-xs"
            style={{ animationDelay: `${2100 + i * 120}ms` }}
          >
            <Icon size={12} className="text-emerald-400" /> {label}
          </span>
        ))}
      </div>
    </aside>
  );
}

// Module scope so the inputs keep focus while typing (a component defined inside Login would
// be recreated on every keystroke).
// Floating-label field: the label sits inside the box like a placeholder; on click/focus (or once
// there is a value) it floats up, the icon lights up, an underline sweeps in, and the real
// placeholder hint fades in underneath. Pure Tailwind (peer / group-focus-within variants).
function Field({
  icon: Icon,
  activeIcon: ActiveIcon,
  active,
  label,
  hint,
  right,
  id,
  ...inputProps
}) {
  const Current = active && ActiveIcon ? ActiveIcon : Icon;
  return (
    <div className="group relative">
      <Current
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-[color,transform] duration-300 ease-out-back group-focus-within:scale-110 group-focus-within:text-primary-text"
      />
      <input
        id={id}
        {...inputProps}
        placeholder={hint}
        className="peer w-full rounded-xl border border-surface-border bg-surface/60 px-10 pb-2 pt-6 text-sm text-slate-100 outline-hidden transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent placeholder:transition-colors placeholder:duration-300 hover:border-slate-600 focus:border-primary-500/60 focus:bg-surface focus:ring-4 focus:ring-primary-500/15 focus:placeholder:text-slate-500 autofill:shadow-[inset_0_0_0_100px_rgb(var(--surface-default))] autofill:[-webkit-text-fill-color:rgb(var(--slate-100))]"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-10 top-2.5 origin-left text-[11px] font-medium text-slate-500 transition-all duration-300 ease-out-expo peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-primary-text"
      >
        {label}
      </label>
      <span
        className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 origin-center scale-x-0 rounded-full bg-linear-to-r from-transparent via-primary-400 to-transparent transition-transform duration-500 ease-out-expo peer-focus:scale-x-100"
        aria-hidden="true"
      />
      {right}
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const cardRef = useRef(null);
  const [failures, setFailures] = useState(0); // keys the error banner so it re-shakes on every failed attempt

  // Cursor-follow glow on the card; writes CSS variables directly so it never re-renders.
  function handlePointerMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to sign in. Check your credentials.",
      );
      setFailures((n) => n + 1);
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <BrandPanel />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
        <div
          className="ambient-blob animate-blob-float -right-20 -top-20 h-80 w-80 bg-primary-500/[0.08]"
          aria-hidden="true"
        />
        <div
          className="ambient-blob animate-blob-float -bottom-24 -left-16 h-72 w-72 bg-blue-500/[0.06]"
          style={{ animationDelay: "-6s" }}
          aria-hidden="true"
        />

        <div className="animate-fade-in-up relative w-full max-w-sm">
          <Logo
            size={36}
            className="mb-8 lg:hidden"
            textClassName="text-base text-slate-100"
          />

          <div className="gradient-border rounded-2xl">
            <div
              ref={cardRef}
              onPointerMove={handlePointerMove}
              className="group/card relative overflow-hidden rounded-2xl border border-surface-border-soft bg-surface-raised/90 shadow-panel backdrop-blur-xs"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 bg-[radial-gradient(360px_circle_at_var(--mx,50%)_var(--my,0%),rgb(16_185_129/0.10),transparent_65%)]"
                aria-hidden="true"
              />
              <form
                onSubmit={handleSubmit}
                className="relative space-y-5 p-7 sm:p-8"
              >
                <div
                  className="animate-stagger-in"
                  style={{ animationDelay: "80ms" }}
                >
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-text ring-1 ring-primary-500/25 shadow-glow-primary-sm">
                    <ShieldCheck size={20} className="animate-float" />
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
                    Welcome <span className="text-gradient">back</span>
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Sign in to search, generate and reuse SQL templates.
                  </p>
                </div>

                <div
                  className="animate-stagger-in"
                  style={{ animationDelay: "180ms" }}
                >
                  <Field
                    id="login-email"
                    icon={Mail}
                    label="Email address"
                    hint="you@company.com"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>

                <div
                  className="animate-stagger-in space-y-1.5"
                  style={{ animationDelay: "260ms" }}
                >
                  <Field
                    id="login-password"
                    icon={Lock}
                    activeIcon={LockOpen}
                    active={showPassword}
                    label="Password"
                    hint="Enter your password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    onKeyDown={(e) =>
                      setCapsOn(e.getModifierState?.("CapsLock") ?? false)
                    }
                    onKeyUp={(e) =>
                      setCapsOn(e.getModifierState?.("CapsLock") ?? false)
                    }
                    onBlur={() => setCapsOn(false)}
                    right={
                      <button
                        type="button"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-[color,background-color,transform] duration-200 hover:bg-primary-500/10 hover:text-primary-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-400 active:scale-90"
                      >
                        <span
                          key={showPassword ? "off" : "on"}
                          className="animate-fade-in"
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </span>
                      </button>
                    }
                  />
                  {capsOn && (
                    <p
                      className="animate-fade-in-up flex items-center gap-1.5 text-xs text-amber-400"
                      role="status"
                    >
                      <TriangleAlert size={12} /> Caps Lock is on
                    </p>
                  )}
                </div>

                {error && (
                  <div
                    key={failures}
                    role="alert"
                    className="animate-shake flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400"
                  >
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div
                  className="animate-stagger-in"
                  style={{ animationDelay: "340ms" }}
                >
                  <Button
                    type="submit"
                    size="lg"
                    className="group w-full rounded-xl py-3"
                    loading={loading}
                  >
                    {loading ? "Signing in…" : "Sign in"}
                    {!loading && (
                      <ArrowRight
                        size={15}
                        className="transition-transform duration-200 group-hover:translate-x-1"
                      />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            Internal enterprise tool — access is provisioned by your
            Administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
