"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no login");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-line bg-bg-elevated p-6 shadow-[var(--shadow)] sm:p-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.18em] text-brand uppercase">
          Lacoster Stock
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink">
          Entrar no estoque
        </h1>
        <p className="mt-2 text-sm text-muted">
          Use o usuário e senha definidos no ambiente.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Usuário</span>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-brand/30 transition focus:ring-4"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-brand/30 transition focus:ring-4"
            />
          </label>

          {error ? (
            <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand px-4 py-3.5 font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
