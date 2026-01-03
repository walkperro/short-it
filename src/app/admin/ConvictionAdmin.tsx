"use client";

import { useEffect, useMemo, useState } from "react";

type IdeaPick = {
  id: string;
  slug: string;
  idea_no?: number | null;
  ticker: string | null;
  kind: string | null;
  published_at?: string | null;
  created_at: string;
  status: "draft" | "published";
};

type AdminConviction = {
  id: string;
  idea_id: string;
  idea_slug: string;
  idea_no?: number | null;
  ticker: string | null;
  kind: string | null;
  status: "draft" | "published";
  body: string | null;
  created_at: string;
  published_at?: string | null;
};

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

export default function ConvictionAdmin() {
  const [ideas, setIdeas] = useState<IdeaPick[]>([]);
  const [drafts, setDrafts] = useState<AdminConviction[]>([]);
  const [published, setPublished] = useState<AdminConviction[]>([]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [editing, setEditing] = useState<AdminConviction | null>(null);
  const [ideaId, setIdeaId] = useState<string>("");
  const [body, setBody] = useState<string>("");

  const ideaById = useMemo(() => {
    const m = new Map<string, IdeaPick>();
    ideas.forEach((i) => m.set(i.id, i));
    return m;
  }, [ideas]);

  function resetForm() {
    setEditing(null);
    setIdeaId("");
    setBody("");
  }

  async function loadAll() {
    setMsg(null);
    try {
      const i = await api<{ data: IdeaPick[] }>("/api/admin/ideas?status=published");
      setIdeas(i.data || []);

      const d = await api<{ data: AdminConviction[] }>("/api/admin/convictions?status=draft");
      const p = await api<{ data: AdminConviction[] }>("/api/admin/convictions?status=published");
      setDrafts(d.data || []);
      setPublished(p.data || []);
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Failed to load." });
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function cleanStr(v: string) {
    const t = v.trim();
    return t ? t : null;
  }

  async function save(status: "draft" | "published") {
    setMsg(null);

    if (!editing && !ideaId) {
      setMsg({ kind: "err", text: "Select an idea first." });
      return;
    }

    const payload = {
      status,
      idea_id: editing ? editing.idea_id : ideaId,
      body: cleanStr(body),
    };

    setBusy(true);
    try {
      if (editing?.id) {
        await api(`/api/admin/convictions/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMsg({ kind: "ok", text: status === "published" ? "Updated + published." : "Draft updated." });
      } else {
        await api(`/api/admin/convictions`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMsg({ kind: "ok", text: status === "published" ? "Published." : "Saved to drafts." });
      }

      resetForm();
      await loadAll();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: AdminConviction) {
    setEditing(c);
    setIdeaId(c.idea_id);
    setBody(c.body || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(c: AdminConviction) {
    if (!confirm("Delete this conviction?")) return;
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/convictions/${c.id}`, { method: "DELETE" });
      setMsg({ kind: "ok", text: "Deleted." });
      await loadAll();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Delete failed." });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(c: AdminConviction, status: "draft" | "published") {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/convictions/${c.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setMsg({ kind: "ok", text: status === "published" ? "Published." : "Moved to drafts." });
      await loadAll();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Update failed." });
    } finally {
      setBusy(false);
    }
  }

  const selectedIdea = (ideaId && ideaById.get(ideaId)) || (editing ? ideaById.get(editing.idea_id) : null);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.35em] text-white/40">LEVEL II</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Conviction</h2>
          <p className="mt-1 text-sm text-white/60">
            Select an idea, write the conviction, save draft or publish.
          </p>
        </div>
        <button
          onClick={loadAll}
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
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">
            {editing
              ? `Edit Conviction for Idea #${fmtIdeaNo(editing.idea_no)}`
              : "Create Conviction"}
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

        <div className="mt-5 grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs tracking-widest text-white/50">
              Select Idea to Write Conviction About
            </label>
            <select
              value={ideaId}
              onChange={(e) => setIdeaId(e.target.value)}
              disabled={!!editing}
              className={[
                "mt-2 w-full rounded-2xl border px-4 py-3 text-white outline-none",
                editing
                  ? "border-white/5 bg-black/20 text-white/40"
                  : "border-white/10 bg-black/40 focus:border-white/20",
              ].join(" ")}
            >
              <option value="">— Select —</option>
              {ideas.map((i) => (
                <option key={i.id} value={i.id}>
                  #{fmtIdeaNo(i.idea_no)} • {i.ticker || "—"} • {i.kind || "—"} • {fmtDate(i.published_at || i.created_at)}
                </option>
              ))}
            </select>

            {selectedIdea ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/80">
                Selected: <span className="font-semibold">{selectedIdea.ticker || "—"}</span>{" "}
                <span className="text-white/40">•</span> {selectedIdea.kind || "—"}{" "}
                <span className="text-white/40">•</span> IDEA #{fmtIdeaNo(selectedIdea.idea_no)}
              </div>
            ) : null}
          </div>

          <div>
            <label className="text-xs tracking-widest text-white/50">
              Conviction (big box)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the full conviction thesis, reasoning, catalysts, invalidation..."
              rows={10}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white/90 outline-none focus:border-white/20"
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
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
      </div>

      {/* DRAFTS */}
      <Section title={`Drafts (${drafts.length})`} subtitle="Conviction drafts (not visible to users).">
        {drafts.length ? (
          <div className="space-y-3">
            {drafts.map((c) => (
              <Row
                key={c.id}
                c={c}
                onEdit={() => startEdit(c)}
                onDelete={() => remove(c)}
                onPrimary={() => setStatus(c, "published")}
                primaryLabel="Publish"
              />
            ))}
          </div>
        ) : (
          <Empty text="No drafts." />
        )}
      </Section>

      {/* PUBLISHED */}
      <Section title={`Published (${published.length})`} subtitle="Published convictions (visible on /conviction for members).">
        {published.length ? (
          <div className="space-y-3">
            {published.map((c) => (
              <Row
                key={c.id}
                c={c}
                onEdit={() => startEdit(c)}
                onDelete={() => remove(c)}
                onPrimary={() => setStatus(c, "draft")}
                primaryLabel="Unpublish"
              />
            ))}
          </div>
        ) : (
          <Empty text="No published convictions yet." />
        )}
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div>
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-sm text-white/60">{subtitle}</div>
      </div>
      <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">{text}</div>;
}

function Row({
  c,
  onEdit,
  onDelete,
  onPrimary,
  primaryLabel,
}: {
  c: AdminConviction;
  onEdit: () => void;
  onDelete: () => void;
  onPrimary: () => void;
  primaryLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs tracking-widest text-white/50">
            IDEA #{fmtIdeaNo(c.idea_no)} • {c.kind || "—"} • {c.ticker || "—"} •{" "}
            {fmtDate(c.status === "published" ? c.published_at || c.created_at : c.created_at)}
          </div>
          {c.body ? (
            <div className="mt-2 line-clamp-2 text-sm text-white/80">
              {c.body}
            </div>
          ) : (
            <div className="mt-2 text-sm text-white/50">— No text —</div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onEdit} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10">
            Edit
          </button>
          <button onClick={onPrimary} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:opacity-90">
            {primaryLabel}
          </button>
          <button onClick={onDelete} className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/15">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
