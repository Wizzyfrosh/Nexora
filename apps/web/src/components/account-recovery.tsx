"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/contexts/AuthContext";

const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const snapshot = () =>
  new URLSearchParams(window.location.hash.slice(1)).get("token");
const serverSnapshot = () => null;
export function AccountRecovery({
  mode,
}: {
  mode: "forgot" | "reset" | "verify";
}) {
  const token = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const title =
    mode === "forgot"
      ? "Recover your account"
      : mode === "reset"
        ? "Choose a new password"
        : "Verify your email";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode === "reset" && password !== confirm) {
      setError("Passwords must match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        await apiFetch("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setNotice(
          "If the account is eligible and email is configured, a reset link will be sent. Check your inbox and spam folder. You can request another link after a minute.",
        );
      } else if (mode === "reset") {
        await apiFetch("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token, password }),
        });
        setNotice(
          "Password changed. All existing sessions have ended. Sign in with your new password.",
        );
        setDone(true);
      } else if (token) {
        await apiFetch("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setNotice("Your email is verified.");
        setDone(true);
        await refreshUser();
      } else {
        const result = await apiFetch<{ delivery: string }>(
          "/auth/resend-verification",
          { method: "POST" },
        );
        setNotice(
          result.delivery === "UNAVAILABLE"
            ? "Email delivery is not configured. Contact the platform operator."
            : result.delivery === "ALREADY_VERIFIED"
              ? "Your email is already verified."
              : result.delivery === "QUEUED"
                ? "Verification email queued. This is not confirmation of inbox delivery."
                : "A recent request is already on record. Wait one minute before requesting another link.",
        );
      }
      if (mode !== "forgot" && token) {
        window.history.replaceState({}, "", window.location.pathname);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not complete this request. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    "w-full rounded-xl border bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500";
  return (
    <main className="min-h-screen bg-[#fbf8ff] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-md space-y-7">
        <Brand />
        <section className="rounded-3xl border border-violet-100 bg-white p-7 shadow-sm space-y-5">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-slate-600">
            {mode === "verify"
              ? "Confirm ownership of your email address. Opening a link alone does not verify it."
              : "Use a private email link to securely regain access."}
          </p>
          {notice && (
            <p role="status" className="rounded-xl bg-violet-50 p-4 text-sm">
              {notice}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          {!done && (
            <form onSubmit={submit} className="space-y-4">
              {mode === "forgot" && (
                <label className="block text-sm font-medium">
                  Email address
                  <input
                    className={inputClass + " mt-2"}
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {mode === "reset" && token && (
                <>
                  <label className="block text-sm font-medium">
                    New password
                    <input
                      className={inputClass + " mt-2"}
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <p className="text-xs text-slate-600">
                    Use at least 8 characters, including uppercase, lowercase
                    and a number.
                  </p>
                  <label className="block text-sm font-medium">
                    Confirm password
                    <input
                      className={inputClass + " mt-2"}
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </label>
                </>
              )}
              {mode === "reset" && !token ? (
                <p>
                  This link is missing or no longer available.{" "}
                  <Link
                    className="text-violet-700 underline"
                    href="/forgot-password"
                  >
                    Request a new link
                  </Link>
                  .
                </p>
              ) : mode === "verify" && !token && !user ? (
                <p>
                  <Link className="text-violet-700 underline" href="/login">
                    Sign in
                  </Link>{" "}
                  to request a verification email, or open the link from your
                  email.
                </p>
              ) : (
                <Button
                  className="w-full"
                  disabled={
                    busy || (mode === "verify" && !token && user?.emailVerified)
                  }
                  type="submit"
                >
                  {busy
                    ? "Working…"
                    : mode === "forgot"
                      ? "Request reset link"
                      : mode === "reset"
                        ? "Update password"
                        : token
                          ? "Confirm email address"
                          : user?.emailVerified
                            ? "Already verified"
                            : "Resend verification email"}
                </Button>
              )}
            </form>
          )}
          <Link
            href="/login"
            className="block text-sm text-violet-700 underline"
          >
            Back to sign in
          </Link>
          {mode === "verify" && (
            <Link
              href="/dashboard"
              className="block text-sm text-violet-700 underline"
            >
              Back to workspace
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}
