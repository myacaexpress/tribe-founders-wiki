"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const BG = "linear-gradient(180deg, rgba(3,8,18,0.98) 0%, rgba(5,22,28,0.96) 20%, rgba(6,32,35,0.94) 35%, rgba(50,32,22,0.88) 55%, rgba(65,38,28,0.9) 70%, rgba(45,18,15,0.94) 85%, rgba(8,4,10,0.99) 100%), url('/bg-nature.jpg')";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  padding: 24,
  marginBottom: 12,
  boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
};

interface WatcherInfo {
  name: string;
  founder: string;
  type: string;
  targetPage: string;
  schedule: string;
  description: string;
  active: boolean;
  valid: boolean;
}

interface RunResult {
  name: string;
  success: boolean;
  message: string;
  error?: string;
  targetPage?: string;
  updatedAt?: string;
}

export default function WatchersPage() {
  const [watchers, setWatchers] = useState<WatcherInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWatchers();
  }, []);

  const fetchWatchers = async () => {
    try {
      const response = await fetch("/api/watchers/list");
      if (!response.ok) throw new Error("Failed to load watchers");
      const data = await response.json();
      const flat: WatcherInfo[] = (data.watchers || []).map((w: any) => ({
        name: w.name || "",
        founder: w.config?.founder || "",
        type: w.config?.type || "",
        targetPage: w.config?.targetPage || "",
        schedule: w.config?.schedule || "",
        description: w.config?.description || "",
        active: w.active !== false,
        valid: w.status === "configured",
      }));
      setWatchers(flat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchers");
    } finally {
      setLoading(false);
    }
  };

  const runAllWatchers = async () => {
    setRunning(true);
    setResults([]);
    setError("");
    try {
      const response = await fetch("/api/watchers/run", { method: "POST" });
      if (!response.ok) throw new Error("Failed to run watchers");
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run watchers");
    } finally {
      setRunning(false);
    }
  };

  const founderColor = (founder: string | undefined): string => {
    switch ((founder || "").toLowerCase()) {
      case "shawn":   return "#00c9a7";
      case "mark":    return "#ff6b5a";
      case "michael": return "#b8c8b0";
      default:        return "rgba(255,255,255,0.4)";
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflowX: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: BG, backgroundSize: "cover", backgroundPosition: "center" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto", padding: "48px 20px 100px" }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>← Back</Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Watchers</div>
          <button
            onClick={runAllWatchers}
            disabled={running || watchers.length === 0}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: 50,
              fontSize: 13,
              fontWeight: 700,
              background: running || watchers.length === 0
                ? "rgba(255,255,255,0.08)"
                : "linear-gradient(135deg, #00c9a7, #00b4d8)",
              color: running || watchers.length === 0 ? "rgba(255,255,255,0.3)" : "#fff",
              cursor: running || watchers.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {running ? "Running..." : "Run All"}
          </button>
        </div>

        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
          Monitors that update wiki pages automatically.
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(0,201,167,0.2)", borderTopColor: "#00c9a7", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(255,107,90,0.12)", border: "1px solid rgba(255,107,90,0.3)", borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: "#ff6b5a" }}>{error}</span>
          </div>
        )}

        {/* Results banner */}
        {results.length > 0 && (
          <div style={{ background: "rgba(0,201,167,0.1)", border: "1px solid rgba(0,201,167,0.3)", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#00c9a7", marginBottom: 10 }}>Run Complete</div>
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14, color: r.success ? "#00c9a7" : "#ff6b5a" }}>{r.success ? "✓" : "✗"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{r.name}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{r.message || r.error}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && watchers.length === 0 && !error && (
          <div style={glass}>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
              No watchers configured yet.
            </div>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 8 }}>
              Add .md files to the watchers/ directory in your repo.
            </div>
          </div>
        )}

        {/* Watcher cards */}
        {watchers.map((watcher, index) => (
          <div
            key={index}
            style={{
              ...glass,
              opacity: watcher.active ? 1 : 0.55,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 2 }}>
                  {watcher.name.replace(".md", "").replace(/-/g, " ")}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: founderColor(watcher.founder), textTransform: "capitalize" }}>
                  {watcher.founder || "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
                  background: watcher.active ? "rgba(0,201,167,0.15)" : "rgba(255,255,255,0.06)",
                  color: watcher.active ? "#00c9a7" : "rgba(255,255,255,0.35)",
                  border: watcher.active ? "1px solid rgba(0,201,167,0.3)" : "1px solid rgba(255,255,255,0.1)",
                }}>
                  {watcher.active ? "Active" : "Inactive"}
                </span>
                {watcher.schedule && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
                    background: "rgba(245,158,11,0.15)", color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}>
                    {watcher.schedule}
                  </span>
                )}
              </div>
            </div>

            {watcher.description && (
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 10 }}>
                {watcher.description}
              </div>
            )}

            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {watcher.type && <span>Type: {watcher.type}</span>}
              {watcher.targetPage && <span>→ {watcher.targetPage}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
