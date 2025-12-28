"use client";

import { useEffect, useMemo, useState } from "react";

type IdeaKind = "Equity" | "ETF" | "Commodity" | "Buy Option" | "Sell Option";
type Direction = "long" | "short";

type AdminIdea = {
  id: string;
  slug: string;
  idea_no?: number | null;
  created_at: string;
  published_at?: string | null;
  status: "draft" | "published";
  locked: boolean;

  kind: IdeaKind | null;
  ticker: string | null;
  direction: Direction | null;
  entry: number | null;
  reach: number | null;
  option_side: "call" | "put" | null;
  context: string | null;
};

const IDEA_KINDS: IdeaKind[] = ["Equity", "ETF", "Commodity", "Buy Option", "Sell Option"];

function isOptionKind(kind: IdeaKind | null) {
  return kind === "Buy Option" || kind === "Sell Option";
}

function fmtIdeaNo(n?: number | null) {
  if (!n) return "—";
  return String(n).padStart(3, "0");
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

export default function AdminClient() {
  const [drafts, setDrafts] = useState<AdminIdea[]>([]);
  const [published, setPublished] = useState<AdminIdea[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [editing, setEditing] = useState<AdminIdea | null>(null);

  const [kind, setKind] = useState<IdeaKind>("Equity");
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState<Direction>("long");
  const [entry, setEntry] = useState<string>("");
  const [reach, setReach] = useState<string>("");
  const [optionSide, setOptionSide] = useState<"call" | "put">("call");
  const [locked, setLocked] = useState(false);
  const [context, setContext] = useState("");

  const isOption = useMemo(() => isOptionKind(kind), [kind]);

  function resetForm() {
    setEditing(null);
    setKind("Equity");
    setTicker("");
    setDirection("long");
    setEntry("");
    setReach("");
    setOptionSide("call");
    setLocked(false);
    setContext("");
  }

  async function load() {
    setMsg(null);
    try {
      const d = await api<{ data: AdminIdea[] }>("/api/admin/ideas?status=draft");
      const p = await api<{ data: AdminIdea[] }>("/api/admin/ideas?status=published");
      setDrafts(d.data || []);
      setPublished(p.data || []);
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Failed to load." });
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toNumberOrNull(v: string) {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  async function save(status: "draft" | "published") {
    setMsg(null);

    const payload = {
      status,
      locked,
      kind,
      ticker: ticker.trim().toUpperCase(),
      direction: isOption ? null : direction,
      entry: toNumberOrNull(entry),
      reach: toNumberOrNull(reach),
      option_side: isOption ? optionSide : null,
      context: context.trim(),
    };

    if (!payload.ticker) {
      setMsg({ kind: "err", text: "Ticker is required." });
      return;
    }

    setBusy(true);
    try {
      if (editing?.slug) {
        await api(`/api/admin/ideas/${editing.slug}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMsg({ kind: "ok", text: status === "published" ? "Updated + published." : "Draft updated." });
      } else {
        await api(`/api/admin/ideas`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMsg({ kind: "ok", text: status === "published" ? "Published." : "Saved to drafts." });
      }

      resetForm();
      await load();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(i: AdminIdea) {
    setEditing(i);
    setKind((i.kind as IdeaKind) || "Equity");
    setTicker(i.ticker || "");
    setDirection((i.direction as Direction) || "long");
    setEntry(i.entry == null ? "" : String(i.entry));
    setReach(i.reach == null ? "" : String(i.reach));
    setOptionSide((i.option_side as any) || "call");
    setLocked(!!i.locked);
    setContext(i.context || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(i: AdminIdea) {
    if (!confirm("Delete this idea?")) return;
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/ideas/${i.slug}`, { method: "DELETE" });
      setMsg({ kind: "ok", text: "Deleted." });
      await load();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Delete failed." });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(i: AdminIdea, status: "draft" | "published") {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/ideas/${i.slug}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setMsg({ kind: "ok", text: status === "published" ? "Published." : "Moved to drafts." });
      await load();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Update failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-white/60">
            Create Ideas, save to drafts, publish, lock/unlock, edit, delete.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {msg ? (
        <div
          className={[
            "mt-5 rounded-2xl border p-4 text-sm",
            msg.kind === "err"
              ? "border-red-500/25 bg-red-500/10 text-red-200"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
          ].join(" ")}
        >
          {msg.text}
        </div>
      ) : null}

      {/* CREATE / EDIT */}
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">
            {editing ? `Edit Idea #${fmtIdeaNo(editing.idea_no)}` : "Create Idea"}
          </div>
          {editing ? (
            <button
              onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Type">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as IdeaKind)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
            >
              {IDEA_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ticker">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="NVDA"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
            />
          </Field>

          {!isOption ? (
            <Field label="Direction (non-option only)">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </Field>
          ) : (
            <Field label="Call/Put (options only)">
              <select
                value={optionSide}
                onChange={(e) => setOptionSide(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
              >
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </Field>
          )}

          <Field label="Entry">
            <input
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              inputMode="decimal"
              placeholder="175"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
            />
          </Field>

          <Field label="Reach">
            <input
              value={reach}
              onChange={(e) => setReach(e.target.value)}
              inputMode="decimal"
              placeholder="200"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
            />
          </Field>

          <div className="md:col-span-2">
            <label className="text-xs tracking-widest text-white/50">Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What to watch for..."
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white/90 outline-none focus:border-white/20"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Locked</div>
              <div className="text-xs text-white/60">
                If ON, free users see a blurred/locked card. Paid users see it unlocked.
              </div>
            </div>
            <button
              onClick={() => setLocked((v) => !v)}
              className={[
                "h-9 w-16 rounded-full border transition",
                locked
                  ? "border-emerald-500/30 bg-emerald-500/20"
                  : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
              aria-label="Toggle locked"
            >
              <span
                className={[
                  "block h-7 w-7 rounded-full bg-white transition",
                  locked ? "translate-x-7" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <button
            disabled={busy}
            onClick={() => save("draft")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10 disabled:opacity-60"
          >
            Save to drafts
          </button>
          <button
            disabled={busy}
            onClick={() => save("published")}
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            Publish
          </button>
        </div>
      </div>

      {/* DRAFTS */}
      <Section
        title={`Drafts (${drafts.length})`}
        subtitle="Edit these later or publish when ready."
      >
        {drafts.length ? (
          <div className="space-y-3">
            {drafts.map((i) => (
              <Row
                key={i.id}
                idea={i}
                onEdit={() => startEdit(i)}
                onDelete={() => remove(i)}
                onPrimary={() => setStatus(i, "published")}
                primaryLabel="Publish"
              />
            ))}
          </div>
        ) : (
          <Empty text="No drafts." />
        )}
      </Section>

      {/* PUBLISHED */}
      <Section
        title={`Published (${published.length})`}
        subtitle="Live ideas shown on the Ideas page."
      >
        {published.length ? (
          <div className="space-y-3">
            {published.map((i) => (
              <Row
                key={i.id}
                idea={i}
                onEdit={() => startEdit(i)}
                onDelete={() => remove(i)}
                onPrimary={() => setStatus(i, "draft")}
                primaryLabel="Unpublish"
              />
            ))}
          </div>
        ) : (
          <Empty text="No published ideas yet." />
        )}
      </Section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs tracking-widest text-white/50">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="mt-1 text-sm text-white/60">{subtitle}</div>
        </div>
      </div>
      <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">{text}</div>;
}

function Row({
  idea,
  onEdit,
  onDelete,
  onPrimary,
  primaryLabel,
}: {
  idea: AdminIdea;
  onEdit: () => void;
  onDelete: () => void;
  onPrimary: () => void;
  primaryLabel: string;
}) {
  const isOption = isOptionKind((idea.kind as any) || null);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs tracking-widest text-white/50">
            IDEA #{fmtIdeaNo(idea.idea_no)} • {idea.kind || "—"} • {idea.ticker || "—"} •{" "}
            {fmtDate(idea.status === "published" ? idea.published_at || idea.created_at : idea.created_at)}
          </div>

          <div className="mt-2 text-sm text-white/80">
            {isOption ? (
              <>
                <span className="font-semibold">{(idea.option_side || "—").toUpperCase()}</span>{" "}
                • Entry: {idea.entry ?? "—"} • Reach: {idea.reach ?? "—"}
              </>
            ) : (
              <>
                <span className="font-semibold">{(idea.direction || "—").toUpperCase()}</span>{" "}
                • Entry: {idea.entry ?? "—"} • Reach: {idea.reach ?? "—"}
              </>
            )}
            {" "}
            • {idea.locked ? <span className="text-brand-red font-semibold">LOCKED</span> : "Unlocked"}
          </div>

          {idea.context ? (
            <div className="mt-2 line-clamp-2 text-sm text-white/70">{idea.context}</div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
          >
            Edit
          </button>
          <button
            onClick={onPrimary}
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            {primaryLabel}
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/15"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
