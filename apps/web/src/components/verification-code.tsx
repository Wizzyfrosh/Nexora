"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck, ShieldCheck, ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { useAuth } from "@/lib/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";
import type { AccountMailResponse } from "@nexora/shared-types";

export function VerificationCode() {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    const timer = setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  async function act(resend: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (resend) {
        const result = await apiFetch<AccountMailResponse>(
          "/auth/resend-verification",
          { method: "POST" },
        );
        if (result.delivery === "ALREADY_VERIFIED") {
          setVerified(true);
          await refreshUser();
        } else if (result.delivery === "UNAVAILABLE")
          setError(
            "Email delivery is temporarily unavailable. Please try again later.",
          );
        else {
          setRemaining(60);
          if (result.delivery === "QUEUED") setCode("");
          setNotice(
            result.delivery === "QUEUED"
              ? "A new code is on its way. Check your inbox and spam folder."
              : "A code was recently requested. Check your inbox or wait a minute to resend.",
          );
        }
      } else {
        await apiFetch("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ code }),
        });
        setCode("");
        setVerified(true);
        await refreshUser();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not verify your email. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const done = verified || user?.emailVerified;
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,#ede2fb,transparent_60%)] bg-[#fbf8ff] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-lg">
        <Brand />
        <section className="mt-10 overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-100/50">
          <div className="h-2 bg-gradient-to-r from-violet-700 via-purple-400 to-amber-300" />
          <div className="p-7 sm:p-10">
            <div className="mb-7 inline-flex rounded-2xl bg-violet-50 p-4 text-violet-700">
              {done ? <ShieldCheck size={30} /> : <MailCheck size={30} />}
            </div>
            <p className="mb-3 text-xs font-bold tracking-[0.18em] text-violet-600">
              YOUR NEXT CHAPTER
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {done ? "You’re verified." : "Check your inbox."}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {done ? (
                "Your email is confirmed. Your Nexora workspace is ready for you."
              ) : (
                <>
                  Enter the six-digit code sent to{" "}
                  <strong className="break-all text-slate-900">
                    {user?.email || "your email address"}
                  </strong>
                  . The code expires 10 minutes after your request.
                </>
              )}
            </p>
            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-violet-50 p-4 text-sm text-violet-900"
              >
                {notice}
              </p>
            )}
            {done ? (
              <Link
                href="/dashboard"
                className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-violet-700 p-4 font-semibold text-white"
              >
                Open my workspace <ArrowRight size={18} />
              </Link>
            ) : user ? (
              <>
                <form
                  className="mt-7 space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void act(false);
                  }}
                >
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="verification-code"
                  >
                    Verification code
                  </label>
                  <input
                    id="verification-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                      )
                    }
                    aria-describedby="code-help"
                    className="w-full rounded-2xl border border-violet-200 bg-violet-50/40 px-4 py-5 text-center font-mono text-3xl tracking-[0.35em] text-violet-900 outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                    placeholder="000000"
                  />
                  <p
                    id="code-help"
                    className="text-xs leading-5 text-slate-500"
                  >
                    Use your newest code. Five incorrect attempts will lock that
                    code.
                  </p>
                  <button
                    type="submit"
                    disabled={busy || code.length !== 6}
                    className="w-full rounded-xl bg-violet-700 px-5 py-4 font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
                  >
                    {busy ? "Please wait…" : "Verify email"}
                  </button>
                </form>
                <div className="mt-6 text-center text-sm text-slate-500">
                  Didn’t receive it?{" "}
                  <button
                    type="button"
                    disabled={busy || remaining > 0}
                    onClick={() => void act(true)}
                    className="font-semibold text-violet-700 underline underline-offset-4 disabled:opacity-50"
                  >
                    {remaining ? `Resend in ${remaining}s` : "Resend code"}
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="mt-7 block font-semibold text-violet-700 underline"
              >
                Sign in to enter or request your code
              </Link>
            )}
            <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-6 text-slate-500">
              Keep your code private. We’ll never ask for it by phone or chat.
            </p>
          </div>
        </section>
        <Link
          href="/dashboard"
          className="mt-6 block text-center text-sm text-violet-700"
        >
          Back to workspace
        </Link>
      </div>
    </main>
  );
}
