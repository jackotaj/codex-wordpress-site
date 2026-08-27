"use client";

import { FormEvent, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessCode: form.get("accessCode") }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Sign-in failed");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed");
      setPending(false);
    }
  }

  return <main className="login-shell"><form className="login-card" onSubmit={submit}><div className="login-brand"><span><Sparkle weight="fill" /></span><div><strong>Sarah</strong><small>Revenue Assistant</small></div></div><div><span className="eyebrow">SAFFORD HYUNDAI LEESBURG</span><h1>Manager access</h1><p>Enter the dealership pilot access code to review customer activity and approve actions.</p></div><label><span>Access code</span><input name="accessCode" type="password" autoComplete="current-password" minLength={32} required autoFocus /></label>{error ? <p className="login-error" role="alert">{error}</p> : null}<button type="submit" disabled={pending}>{pending ? "Signing in…" : "Open Sarah"}</button><small>Customer contact details remain in VinSolutions.</small></form></main>;
}
