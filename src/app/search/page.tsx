"use client";

import { useState } from "react";
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

interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
  type: string;
}

const typeBadge = (type: string): React.CSSProperties => {
  switch (type) {
    case "meeting":   return { background: "rgba(0,201,167,0.15)",   color: "#00c9a7",  border: "1px solid rgba(0,201,167,0.3)" };
    case "task":      return { background: "rgba(255,107,90,0.15)",  color: "#ff6b5a",  border: "1px solid rgba(255,107,90,0.3)" };
    case "decision":  return { background: "rgba(245,158,11,0.15)",  color: "#f59e0b",  border: "1px solid rgba(245,158,11,0.3)" };
    case "lane":      return { background: "rgba(0,180,216,0.15)",   color: "#00b4d8",  border: "1px solid rgba(0,180,216,0.3)" };
    case "idea":      return { background: "rgba(184,200,176,0.15)", color: "#b8c8b0",  border: "1px solid rgba(184,200,176,0.3)" };
    default:          return { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" };
  }
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError("");
    setSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflowX: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: BG, backgroundSize: "cover", backgroundPosition: "center" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto", padding: "48px 20px 100px" }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>← Back</Link>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 24 }}>Search</div>

        {/* Search form */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wiki, meetings, messages..."
            autoFocus
            style={{ flex: 1, padding: "14px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "#fff", fontSize: 15, outline: "none" }}
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            style={{ padding: "14px 20px", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, background: searching || !query.trim() ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #00c9a7, #00b4d8)", color: searching || !query.trim() ? "rgba(255,255,255,0.3)" : "#fff", cursor: searching || !query.trim() ? "not-allowed" : "pointer", flexShrink: 0 }}
          >
            {searching ? "..." : "Go"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(255,107,90,0.12)", border: "1px solid rgba(255,107,90,0.3)", borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: "#ff6b5a" }}>{error}</span>
          </div>
        )}

        {/* Searching spinner */}
        {searching && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(0,201,167,0.2)", borderTopColor: "#00c9a7", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* No results */}
        {!searching && searched && results.length === 0 && (
          <div style={glass}>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          </div>
        )}

        {/* Results */}
        {!searching && results.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
            {results.map((result, i) => (
              <div key={i} style={glass}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{result.title}</div>
                  <span style={{ ...typeBadge(result.type), fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, flexShrink: 0 }}>
                    {result.type}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: 8 }}>{result.snippet}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{result.path}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
