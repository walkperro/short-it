"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type IdeaRow = {
  id: string;
  slug: string;
  title: string;
  ticker: string;
  direction: string;
  status: string;
  created_at: string;
  published_at: string | null;
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default function AdminPage() {
  const [rows, setRows] = useState<IdeaRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [teaser, setTeaser] = useState("");
  const [summary, setSummary] = useState("");
  const [conviction, setConviction] = useState("");
  const [macro, setMacro] = useState("");

  async function load() {
    setErr(null);
    const res = await fetch("/api/admin/ideas", { cache: "no-store" }).catch(() => null);
    if (!res) return setErr("Failed to load admin data.");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(json?.error ?? "Not authorized.");
    setRows(json.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createIdea() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug || null,
          title,
          ticker,
          direction,
          start_date: startDate,
          end_date: endDate,
          target_price: Number(targetPrice),
          status,
          teaser,
          summary,
          conviction,
          macro_context: macro,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Create failed");

      setSlug("");
      setTitle("");
      setTicker("");
      setTargetPrice("");
      setTeaser("");
      setSummary("");
      setConviction("");
      setMacro("");
      setStatus("draft");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="mt-1 text-sm text-white/60">Post Ideas + Conviction + Macro. Publish when ready.</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80" href="/ideas">
            View site
          </Link>
          <button onClick={load} className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-black">
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Create Idea</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Slug (optional)" value={slug} onChange={setSlug} placeholder="nvda-reaccel-setup" />
          <Field label="Title" value={title} onChange={setTitle} placeholder="Re-acceleration setup" />
          <Field label="Ticker" value={ticker} onChange={setTicker} placeholder="NVDA" />
          <Field label="Target price" value={targetPrice} onChange={setTargetPrice} placeholder="175" />
          <Field label="Start date" value={startDate} onChange={setStartDate} placeholder="2025-12-25" />
          <Field label="End date" value={endDate} onChange={setEndDate} placeholder="2026-01-25" />

          <div>
            <div className="mb-1 text-xs text-white/60">Direction</div>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-white/60">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <TextArea label="Teaser (public)" value={teaser} onChange={setTeaser} rows={4} />
          <TextArea label="Idea Thesis (LEVEL I)" value={summary} onChange={setSummary} rows={6} />
          <TextArea label="Conviction (LEVEL II)" value={conviction} onChange={setConviction} rows={7} />
          <TextArea label="Macro (LEVEL III)" value={macro} onChange={setMacro} rows={7} />
        </div>

        <button
          onClick={createIdea}
          disabled={busy}
          className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save Idea"}
        </button>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Recent Ideas</h2>
        <div className="mt-4 grid gap-3">
          {rows.map((r) => (
            <a
              key={r.id}
              href={`/ideas/${r.slug}`}
              className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-black/40 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">
                  {r.title} <span className="text-white/60">({r.ticker})</span>
                </div>
                <div className="text-xs text-white/60">{r.status.toUpperCase()} · {fmt(r.published_at ?? r.created_at)}</div>
              </div>
              <div className="mt-1 text-sm text-white/70">{r.direction.toUpperCase()} · /ideas/{r.slug}</div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder }: any) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-white/60">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows }: any) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-white/60">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
      />
    </label>
  );
}
