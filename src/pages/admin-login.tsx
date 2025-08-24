import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const next = typeof router.query.next === "string" ? router.query.next : "/admin";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/admin-login?next=${encodeURIComponent(next)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Inloggning misslyckades"); return; }
    router.replace(data.redirect || "/admin");
  }

  return (
    <Layout>
      <section className="mx-auto max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold">Admin-inloggning</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Lösenord</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border px-3 py-2" autoFocus />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="rounded-xl bg-black px-4 py-2 text-white hover:bg-black/90" type="submit">Logga in</button>
        </form>
      </section>
    </Layout>
  );
}
