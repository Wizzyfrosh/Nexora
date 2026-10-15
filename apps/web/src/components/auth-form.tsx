"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Brand } from "@/components/brand";
import "@/app/auth.css";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const { user, login, signup } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    try {
      if (registering)
        await signup({
          firstName: String(data.get("firstName") || "").trim(),
          lastName: String(data.get("lastName") || "").trim(),
          email,
          password,
        });
      else await login({ email, password });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-screen">
      <section className="auth-story">
        <Brand />
        <div>
          <span className="auth-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>
            A little website.
            <br />A <em>bigger</em>
            <br />
            business.
          </h2>
          <p>
            A home for your story. A space for your products.
            <br />A new way for customers to find you.
          </p>
          <div className="auth-story-card">
            <div>
              <span>n</span>
              <small>YOUR BUSINESS, BEAUTIFULLY ONLINE</small>
            </div>
            <strong>
              Good things
              <br />
              <em>are taking shape.</em>
            </strong>
            <div className="auth-card-shapes">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <small>Made for the people building something.</small>
      </section>
      <section className="auth-form-side">
        <Link href="/" className="auth-back">
          <ArrowLeft size={14} /> Back to Nexora
        </Link>
        <div className="auth-form-container">
          <span className="auth-eyebrow">
            {registering ? "LET’S MAKE IT YOURS" : "GOOD TO SEE YOU AGAIN"}
          </span>
          <h1>
            {registering ? "Your big idea starts here." : "Welcome back."}
          </h1>
          <p>
            {registering
              ? "Create your account and explore your 7-day trial."
              : "Your business workspace is right where you left it."}
          </p>
          <form onSubmit={submit}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            {registering && (
              <div className="auth-name-fields">
                <label>
                  First name
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    required
                    maxLength={80}
                    placeholder="Your first name"
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    required
                    maxLength={80}
                    placeholder="Your last name"
                  />
                </label>
              </div>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@yourbusiness.com"
              />
            </label>
            <label>
              Password
              <div className="auth-password">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    registering ? "new-password" : "current-password"
                  }
                  required
                  minLength={registering ? 8 : 1}
                  pattern={
                    registering
                      ? "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}"
                      : undefined
                  }
                  title={
                    registering
                      ? "At least 8 characters with an uppercase letter, lowercase letter and number"
                      : undefined
                  }
                  placeholder={
                    registering
                      ? "Create a strong password"
                      : "Enter your password"
                  }
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {registering && (
              <small className="auth-password-hint">
                At least 8 characters, including an uppercase letter, lowercase
                letter and number.
              </small>
            )}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : registering
                  ? "Create my workspace"
                  : "Sign in to your workspace"}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {registering ? "Already have an account?" : "New to Nexora?"}{" "}
            <Link href={registering ? "/login" : "/register"}>
              {registering ? "Log in" : "Start your free trial"}{" "}
              <ArrowUpRight size={12} />
            </Link>
          </p>
          <div className="auth-reassurance">
            <Check size={14} />
            {registering
              ? "No coding required. One step at a time."
              : "Your business. Your space. Your next chapter."}
          </div>
        </div>
        <p className="auth-footer">Nexora · Built for possibility.</p>
      </section>
    </main>
  );
}
