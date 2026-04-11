"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BG = "linear-gradient(180deg, rgba(3,8,18,0.98) 0%, rgba(5,22,28,0.96) 20%, rgba(6,32,35,0.94) 35%, rgba(50,32,22,0.88) 55%, rgba(65,38,28,0.9) 70%, rgba(45,18,15,0.94) 85%, rgba(8,4,10,0.99) 100%), url('/bg-nature.jpg')";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  padding: 24,
  marginBottom: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
};

export default function AddPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [destination, setDestination] = useState<"lane" | "brainstorm" | "email">("lane");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          destination: destination === "email" ? "lane" : destination,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      const result = await response.json();
      setSuccessMessage(result.message || "Got it!");
      setSuccess(true);
      setContent("");

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("Error saving:", error);
      alert(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const destBtn = (id: "lane" | "brainstorm" | "email", label: string, activeColor: string, disabled = false): React.CSSProperties => ({
    flex: 1,
    padding: "12px 8px",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    border: destination === id ? `1px solid ${activeColor}44` : "1px solid rgba(255,255,255,0.1)",
    background: destination === id ? `${activeColor}18` : "rgba(255,255,255,0.05)",
    color: destination === id ? activeColor : "rgba(255,255,255,0.4)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    position: "relative",
  });

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflowX: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: BG, backgroundSize: "cover", backgroundPosition: "center" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto", padding: "48px 20px 100px", display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Back */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>← Back</Link>
        </div>

        {success ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 48, color: "#00c9a7" }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", textAlign: "center" }}>{successMessage}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Closing in a moment...</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 24 }}>
              What&apos;s on your mind?
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thought, idea, decision, or update..."
                disabled={loading}
                autoFocus
                rows={8}
                style={{ width: "100%", padding: "16px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, color: "#fff", fontSize: 15, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6 }}
              />

              {/* Destination */}
              <div style={glass}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>Save to</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setDestination("lane")} disabled={loading} style={destBtn("lane", "#00c9a7", "#00c9a7")}>
                    My Lane
                  </button>
                  <button type="button" onClick={() => setDestination("brainstorm")} disabled={loading} style={destBtn("brainstorm", "#ff6b5a", "#ff6b5a")}>
                    Brainstorm
                  </button>
                  <button type="button" disabled style={{ ...destBtn("email", "#f59e0b", "#f59e0b", true), position: "relative" as const }}>
                    Watch Email
                    <span style={{ position: "absolute", top: -8, right: -8, background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6 }}>soon</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 12 }}>
                <Link
                  href="/"
                  style={{ flex: 1, padding: "14px 24px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 50, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center" }}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  style={{ flex: 1, padding: "14px 24px", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700, background: "linear-gradient(135deg, #00c9a7, #00b4d8)", color: "#fff", boxShadow: "0 4px 20px rgba(0,201,167,0.3)", cursor: loading || !content.trim() ? "not-allowed" : "pointer", opacity: loading || !content.trim() ? 0.5 : 1 }}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
