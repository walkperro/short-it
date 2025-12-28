"use client";

import { useEffect, useMemo, useState } from "react";
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
  teaser?: string | null;
  summary?: string | null;
  conviction?: string | null;
  macro_context?: string | null;
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

type Tab = "ideas" | "conviction" | "macro";

export default function AdminPage() {
  const [rows, setRows] = useState<IdeaRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("ideas");

  // create idea fields
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

  // editor selection
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const selected = useMemo(() => rows.find((r) => r.slug === selectedSlug) ?? null, [rows, selectedSlug]);

  const [editConviction, setEditConviction] = useState("");
  const [editMacro, setEditMacro] = useState("");

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

  useEffect(() => {
    if (selected) {
      setEditConviction(selected.conviction ?? "");
      setEditMacro(selected.macro_context ?? "");
    }
  }, [selected]);

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
      setStatus("draft");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveConvictionMacro(which: "conviction" | "macro") {
    if (!selectedSlug) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/ideas/${selectedSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          which === "conviction"
            ? { conviction: editConviction }
            : { macro_context: editMacro }
        ),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Update failed");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="mt-1 text-sm text-white/60">
            Post ideas, then edit Conviction / Macro per idea.
          </p>
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

      <div className="mt-6 flex gap-2">
        <TabBtn active={tab === "ideas"} onClick={() => setTab("ideas")}>Ideas</TabBtn>
        <TabBtn active={tab === "conviction"} onClick={() => setTab("conviction")}>Conviction</TabBtn>
        <TabBtn active={tab === "macro"} onClick={() => setTab("macro")}>Macro</TabBtn>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {tab === "ideas" ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Create Idea (LEVEL I)</h2>

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
            <TextArea label="Idea Thesis (LEVEL I)" value={summary} onChange={setSummary} rows={7} />
          </div>

          <button
            onClick={createIdea}
            disabled={busy}
            className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save Idea"}
          </button>
        </section>
      ) : null}

      {tab === "conviction" ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Edit Conviction (LEVEL II)</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-white/60">Select idea</div>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
              >
                <option value="">Choose…</option>
                {rows.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.ticker} — {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
              {selected ? (
                <>
                  <div className="text-white/90 font-medium">{selected.title}</div>
                  <div className="mt-1 text-xs text-white/50">
                    {selected.status.toUpperCase()} · {fmt(selected.published_at ?? selected.created_at)}
                  </div>
                </>
              ) : (
                "Pick an idea to edit."
              )}
            </div>
          </div>

          <div className="mt-4">
            <TextArea label="Conviction text" value={editConviction} onChange={setEditConviction} rows={10} />
          </div>

          <button
            onClick={() => saveConvictionMacro("conviction")}
            disabled={busy || !selectedSlug}
            className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save Conviction"}
          </button>
        </section>
      ) : null}

      {tab === "macro" ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Edit Macro (LEVEL III)</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-white/60">Select idea</div>
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
              >
                <option value="">Choose…</option>
                {rows.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.ticker} — {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
              {selected ? (
                <>
                  <div className="text-white/90 font-medium">{selected.title}</div>
                  <div className="mt-1 text-xs text-white/50">
                    {selected.status.toUpperCase()} · {fmt(selected.published_at ?? selected.created_at)}
                  </div>
                </>
              ) : (
                "Pick an idea to edit."
              )}
            </div>
          </div>

          <div className="mt-4">
            <TextArea label="Macro context" value={editMacro} onChange={setEditMacro} rows={10} />
          </div>

          <button
            onClick={() => saveConvictionMacro("macro")}
            disabled={busy || !selectedSlug}
            className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save Macro"}
          </button>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Recent Ideas</h2>
        <div className="mt-4 grid gap-3">
          {rows.map((r) => (
            <a
              key={r.id}
              href={`/ideas/${r.slug}`}
              className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:bg-black/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">
                  {r.title} <span className="text-white/60">({r.ticker})</span>
                </div>
                <div className="text-xs text-white/60">
                  {r.status.toUpperCase()} · {fmt(r.published_at ?? r.created_at)}
                </div>
              </div>
              <div className="mt-1 text-sm text-white/70">/ideas/{r.slug}</div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm transition border",
        active
          ? "border-white/20 bg-white/10 text-white"
          : "border-white/10 bg-black/30 text-white/70 hover:bg-black/40 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
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
