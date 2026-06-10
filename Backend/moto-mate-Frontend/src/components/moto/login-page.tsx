import { useState } from "react";
import { toast } from "sonner";
import { apiClient, type AuthResponse } from "@/lib/api/client";

type Props = {
  onAuth: (result: AuthResponse) => void;
  onGuest: () => void;
};

export function LoginPage({ onAuth, onGuest }: Props) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [riderName, setRiderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result: AuthResponse;
      if (tab === "signup") {
        result = await apiClient.auth.register(email.trim(), password, riderName.trim());
        toast.success(`Welcome, ${result.riderName}!`);
      } else {
        result = await apiClient.auth.login(email.trim(), password);
        toast.success(`Welcome back, ${result.riderName}!`);
      }
      onAuth(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const clean = msg.replace(/^API \/api\/auth\/(login|register) → \d+: /, "");
      try {
        setError(JSON.parse(clean).error ?? clean);
      } catch {
        setError(clean);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F14] px-5">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="font-display text-4xl font-bold tracking-[0.3em] text-white">MOTONAV</div>
        <div className="mt-1 text-xs tracking-[0.2em] text-[#555]">MOTORCYCLE COMPANION</div>
      </div>

      <div className="w-full max-w-[380px]">
        {/* Tab switcher */}
        <div className="mb-5 flex overflow-hidden rounded-xl border border-[#1c1c1c] bg-[#0a0d11]">
          <button
            onClick={() => { setTab("signin"); setError(""); }}
            className={`flex-1 py-3 font-display text-xs tracking-widest transition-all ${
              tab === "signin" ? "bg-white text-black" : "text-[#666] hover:text-[#aaa]"
            }`}
          >
            SIGN IN
          </button>
          <button
            onClick={() => { setTab("signup"); setError(""); }}
            className={`flex-1 py-3 font-display text-xs tracking-widest transition-all ${
              tab === "signup" ? "bg-white text-black" : "text-[#666] hover:text-[#aaa]"
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === "signup" && (
            <div>
              <label className="mb-1 block font-display text-[10px] tracking-widest text-[#666]">
                RIDER NAME
              </label>
              <input
                className="input-mn w-full px-3 py-3 text-sm"
                placeholder="Your name"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                required
                minLength={2}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block font-display text-[10px] tracking-widest text-[#666]">
              EMAIL
            </label>
            <input
              type="email"
              className="input-mn w-full px-3 py-3 text-sm"
              placeholder="rider@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={tab === "signin" ? "email" : "new-password"}
            />
          </div>

          <div>
            <label className="mb-1 block font-display text-[10px] tracking-widest text-[#666]">
              PASSWORD
            </label>
            <input
              type="password"
              className="input-mn w-full px-3 py-3 text-sm"
              placeholder={tab === "signup" ? "Min 6 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 font-display text-sm font-bold text-black disabled:opacity-50 active:scale-[0.99] transition"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            ) : tab === "signin" ? (
              "SIGN IN"
            ) : (
              "CREATE ACCOUNT"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#1c1c1c]" />
          <span className="font-display text-[10px] tracking-widest text-[#444]">OR</span>
          <div className="h-px flex-1 bg-[#1c1c1c]" />
        </div>

        {/* Guest */}
        <button
          onClick={onGuest}
          className="w-full rounded-xl border border-[#1c1c1c] py-3 font-display text-xs tracking-widest text-[#777] transition hover:border-[#333] hover:text-[#aaa] active:scale-[0.99]"
        >
          CONTINUE AS GUEST
        </button>

        <p className="mt-4 text-center text-[11px] text-[#3a3a3a]">
          {tab === "signup"
            ? "Already have an account? Tap Sign In above."
            : "No account? Tap Create Account above."}
        </p>
      </div>
    </div>
  );
}
