"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ExtractedItem {
  id: string;
  type: "task" | "decision" | "idea";
  text: string;
  owner?: string;
  confidence?: "high" | "medium";
  status: "pending" | "confirmed" | "edited" | "skipped";
}

interface MeetingReview {
  date: string;
  title: string;
  summary: string;
  items: ExtractedItem[];
}

const FOUNDER_COLORS: Record<string, string> = {
  shawn: "#00c9a7",
  mark: "#ff6b5a",
  michael: "#b8c8b0",
};

const TYPE_LABELS: Record<string, string> = {
  task: "Task",
  decision: "Decision",
  idea: "Idea",
};

const TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  task:     { bg: "rgba(0,201,167,0.12)",   color: "#00c9a7",  border: "rgba(0,201,167,0.3)"   },
  decision: { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24",  border: "rgba(251,191,36,0.3)"  },
  idea:     { bg: "rgba(167,139,250,0.12)", color: "#a78bfa",  border: "rgba(167,139,250,0.3)" },
};

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 20,
  marginBottom: 12,
};

export default function MeetingReviewPage() {
  const params = useParams();
  const router = useRouter();
  const dateParam = params.date as string;

  const [review, setReview] = useState<MeetingReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/meetings/${dateParam}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setReview(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load meeting");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateParam]);

  function updateItem(id: string, patch: Partial<ExtractedItem>) {
    setReview((r) =>
      r ? { ...r, items: r.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) } : r
    );
  }

  function startEdit(item: ExtractedItem) {
    setEditingId(item.id);
    setEditText(item.text);
  }

  function saveEdit(id: string) {
    updateItem(id, { text: editText, status: "edited" });
    setEditingId(null);
  }

  async function confirmAll() {
    if (!review) return;
    setSaving(true);
    setError(null);
    try {
      const toConfirm = review.items.filter((i) => i.status !== "skipped");
      const res = await fetch("/api/meetings/confirm-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateParam, items: toConfirm }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const BG = "linear-gradient(180deg, rgba(3,8,18,0.98) 0%, rgba(5,22,28,0.96) 100%)";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading meeting…</div>
      </div>
    );
  }

  if (!review) {
    return (
      <div style={{ minHeight: "100vh", background: BG, padding: "48px 20px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textDecoration: "none" }}>← Back</Link>
          <div style={{ marginTop: 32, color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
            {error ?? "Meeting not found."}
          </div>
        </div>
      </div>
    );
  }

  const pending = review.items.filter((i) => i.status === "pending").length;
  const confirmed = review.items.filter((i) => i.status !== "skipped").length;

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px 120px" }}>
        {/* Header */}
        <Link href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textDecoration: "none" }}>← Back</Link>
        <div style={{ marginTop: 20, marginBottom: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
            Meeting Review
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{review.title}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{review.date}</div>
        </div>

        {/* Summary */}
        {review.summary && (
          <div style={{ ...glass, marginTop: 16 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Summary</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", margin: 0 }}>{review.summary}</p>
          </div>
        )}

        {/* Confirm All bar */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 24 }}>
          <button
            onClick={confirmAll}
            disabled={saving}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: saving ? "rgba(0,201,167,0.3)" : "linear-gradient(135deg, #00c9a7, #00b4d8)", color: "#fff", border: "none", cursor: saving ? "default" : "pointer" }}
          >
            {saving ? "Saving…" : `Confirm All (${confirmed})`}
          </button>
          {pending > 0 && (
            <button
              onClick={() => review.items.forEach((i) => { if (i.status === "pending") updateItem(i.id, { status: "skipped" }); })}
              style={{ padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
            >
              Skip All
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,107,90,0.15)", border: "1px solid rgba(255,107,90,0.3)", color: "#ff6b5a", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Items by type */}
        {(["task", "decision", "idea"] as const).map((type) => {
          const items = review.items.filter((i) => i.type === type);
          if (!items.length) return null;
          const tc = TYPE_COLORS[type];
          return (
            <div key={type} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                {TYPE_LABELS[type]}s
              </div>
              {items.map((item) => {
                const skipped = item.status === "skipped";
                const confirmed = item.status === "confirmed" || item.status === "edited";
                return (
                  <div key={item.id} style={{ ...glass, opacity: skipped ? 0.4 : 1, marginBottom: 8 }}>
                    {editingId === item.id ? (
                      <div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <button onClick={() => saveEdit(item.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(0,201,167,0.2)", color: "#00c9a7", border: "1px solid rgba(0,201,167,0.3)", cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                          <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                            {TYPE_LABELS[type]}
                          </span>
                          {item.owner && (
                            <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: FOUNDER_COLORS[item.owner.toLowerCase()] ?? "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                              {item.owner}
                            </span>
                          )}
                          {confirmed && (
                            <span style={{ marginLeft: "auto", fontSize: 11, color: "#00c9a7" }}>✓ {item.status}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 10 }}>{item.text}</div>
                        {!skipped && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => updateItem(item.id, { status: "confirmed" })}
                              style={{ flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: confirmed ? "rgba(0,201,167,0.2)" : "rgba(0,201,167,0.08)", color: "#00c9a7", border: "1px solid rgba(0,201,167,0.2)", cursor: "pointer" }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => startEdit(item)}
                              style={{ flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => updateItem(item.id, { status: "skipped" })}
                              style={{ flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,107,90,0.08)", color: "rgba(255,107,90,0.7)", border: "1px solid rgba(255,107,90,0.15)", cursor: "pointer" }}
                            >
                              Skip
                            </button>
                          </div>
                        )}
                        {skipped && (
                          <button
                            onClick={() => updateItem(item.id, { status: "pending" })}
                            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
                          >
                            Undo Skip
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
